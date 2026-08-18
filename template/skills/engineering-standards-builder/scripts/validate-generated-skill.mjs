#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CANONICAL_REL = '.agents/skills/engineering-standards';
const REQUIRED_PROJECT_REFERENCES = [
  'references/project/00-project-profile.md',
  'references/project/01-module-map.md',
  'references/project/02-decisions-and-exceptions.md',
  'references/project/review-checklist.md',
];
const ADAPTERS = new Set(['typescript', 'java', 'go', 'rust']);

function usage() {
  return `Usage: node scripts/validate-generated-skill.mjs --root <project-root> [options]\n\n` +
    `Validate .agents/skills/engineering-standards and optional compatibility wrappers.\n\n` +
    `Options:\n` +
    `  --root <path>       Project root (required)\n` +
    `  --inventory <path>  Project Inventory JSON below --root; auto-discover when omitted\n` +
    `  --strict            Require every detected adapter/framework and reject unselected ones\n` +
    `  --help              Show this help\n`;
}

function parseArgs(argv) {
  const result = { root: null, inventory: null, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--strict') { result.strict = true; continue; }
    if (arg === '--root' || arg === '--inventory') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--root') result.root = value;
      else result.inventory = value;
      i += 1; continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!result.root) throw new Error('--root is required');
  return result;
}

function toPosix(value) { return value.split(path.sep).join('/'); }
function isInside(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return null;
  const values = {};
  for (const line of text.slice(4, end).split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { values, body: text.slice(end + 5) };
}

function markdownLinks(text) {
  const result = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) result.push(match[1].trim());
  return result;
}

function isExternal(link) { return /^(?:[a-z]+:|#|\/\/)/i.test(link); }

async function collectTree(rootAbs) {
  const files = [];
  const directories = [];
  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    directories.push({ abs: dir, entries });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`symlink is not allowed in generated Skill: ${toPosix(path.relative(rootAbs, abs))}`);
      if (entry.isDirectory()) { await visit(abs); continue; }
      if (entry.isFile()) files.push(abs);
    }
  }
  await visit(rootAbs);
  return { files, directories };
}

function sectionForOffset(text, offset) {
  const headings = [...text.matchAll(/^#{1,3}\s+.+$/gm)].map((match) => ({ index: match.index, text: match[0] }));
  const previous = headings.filter((heading) => heading.index <= offset).at(-1);
  const next = headings.find((heading) => heading.index > offset);
  return {
    title: previous?.text ?? '<document>',
    text: text.slice(previous?.index ?? 0, next?.index ?? text.length),
  };
}

async function loadInventory(args, rootReal) {
  if (args.inventory) {
    const inventoryAbs = path.resolve(rootReal, args.inventory);
    if (!isInside(rootReal, inventoryAbs)) throw new Error(`--inventory escapes --root: ${args.inventory}`);
    return JSON.parse(await readFile(inventoryAbs, 'utf8'));
  }
  const discoverScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'discover-project.mjs');
  const result = spawnSync(process.execPath, [discoverScript, '--root', rootReal], { encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`automatic project discovery failed: ${(result.stderr || result.stdout).trim()}`);
  return JSON.parse(result.stdout);
}

async function validateWrapper(projectRoot, wrapperRel, errors) {
  const wrapperRoot = path.join(projectRoot, wrapperRel);
  if (!existsSync(wrapperRoot)) return;
  const info = await stat(wrapperRoot);
  if (!info.isDirectory()) { errors.push(`${wrapperRel} must be a directory`); return; }
  const entries = await readdir(wrapperRoot, { withFileTypes: true });
  const nonSkillEntries = entries.filter((entry) => entry.name !== 'SKILL.md');
  if (nonSkillEntries.length > 0) errors.push(`${wrapperRel} compatibility wrapper must contain only SKILL.md`);
  const skillPath = path.join(wrapperRoot, 'SKILL.md');
  if (!existsSync(skillPath)) { errors.push(`${wrapperRel}/SKILL.md is missing`); return; }
  const text = await readFile(skillPath, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) { errors.push(`${wrapperRel}/SKILL.md frontmatter is malformed`); return; }
  const expectedName = path.basename(wrapperRoot);
  if (fm.values.name !== expectedName) errors.push(`${wrapperRel}/SKILL.md name must be ${expectedName}`);
  const bodyLines = fm.body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (bodyLines.length !== 1) errors.push(`${wrapperRel}/SKILL.md body must be exactly one non-empty routing line`);
  if (!fm.body.includes('engineering-standards')) errors.push(`${wrapperRel}/SKILL.md does not route to engineering-standards`);
  if (fm.body.length > 400) errors.push(`${wrapperRel}/SKILL.md contains too much content for a compatibility wrapper`);
  if (/typescript-(?:-)?standards\/SKILL\.md/.test(fm.body) && !/engineering-standards/.test(fm.body)) errors.push(`${wrapperRel}/SKILL.md may form a wrapper loop`);
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`validate-generated-skill: ${error.message}\n\n${usage()}`);
    process.exitCode = 2; return;
  }
  if (args.help) { process.stdout.write(usage()); return; }

  const errors = [];
  const warnings = [];
  try {
    const rootReal = await realpath(path.resolve(args.root));
    if (!(await stat(rootReal)).isDirectory()) throw new Error('--root is not a directory');
    const canonicalRoot = path.join(rootReal, CANONICAL_REL);
    if (!existsSync(canonicalRoot)) throw new Error(`${CANONICAL_REL} is missing`);
    const canonicalReal = await realpath(canonicalRoot);
    if (!isInside(rootReal, canonicalReal)) throw new Error(`${CANONICAL_REL} resolves outside project root`);
    const { files, directories } = await collectTree(canonicalReal);
    for (const directory of directories) {
      if (directory.entries.length === 0) errors.push(`empty generated directory: ${toPosix(path.relative(rootReal, directory.abs))}`);
    }
    const fileSet = new Set(files);
    const mainSkill = path.join(canonicalReal, 'SKILL.md');
    if (!fileSet.has(mainSkill)) errors.push(`${CANONICAL_REL}/SKILL.md is missing`);
    else {
      const text = await readFile(mainSkill, 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm) errors.push(`${CANONICAL_REL}/SKILL.md frontmatter is malformed`);
      else {
        if (fm.values.name !== 'engineering-standards') errors.push(`canonical frontmatter name must be engineering-standards, found ${fm.values.name ?? '<missing>'}`);
        if (!fm.values.description) errors.push('canonical frontmatter description is missing');
      }
      if (/typescript-(?:-)?standards\/SKILL\.md/.test(text)) errors.push('canonical Skill must not route back to a compatibility alias');
    }

    for (const required of REQUIRED_PROJECT_REFERENCES) {
      const abs = path.join(canonicalReal, required);
      if (!fileSet.has(abs)) errors.push(`required generated reference is missing: ${required}`);
    }

    for (const file of files.filter((item) => item.endsWith('.md'))) {
      const rel = toPosix(path.relative(canonicalReal, file));
      const text = await readFile(file, 'utf8');
      if (/\{\{[A-Z0-9_]+\}\}|<PROJECT_NAME>|<REPOSITORY_ROOT>/.test(text)) errors.push(`${rel}: unresolved template placeholder`);
      for (let link of markdownLinks(text)) {
        if (isExternal(link)) continue;
        if (link.startsWith('<') && link.endsWith('>')) link = link.slice(1, -1);
        const targetPart = link.split('#')[0].split('?')[0];
        if (!targetPart) continue;
        const target = path.resolve(path.dirname(file), decodeURIComponent(targetPart));
        if (!isInside(canonicalReal, target)) {
          errors.push(`${rel}: link escapes canonical Skill: ${link}`);
          continue;
        }
        if (!existsSync(target)) errors.push(`${rel}: broken local link: ${link}`);
      }

      if (!rel.startsWith('references/project/')) {
        for (const levelMatch of text.matchAll(/^Level:\s*(MUST|SHOULD)\s*$/gm)) {
          const section = sectionForOffset(text, levelMatch.index);
          for (const field of ['Scope:', 'Source:', 'Rule:', 'Verification:']) {
            if (!section.text.includes(field)) errors.push(`${rel} ${section.title}: ${levelMatch[1]} rule is missing ${field}`);
          }
        }
      }
    }

    const inventory = await loadInventory(args, rootReal);
    const detectedAdapters = new Set(inventory?.summary?.adapters ?? []);
    const generatedReferenceRoot = path.join(canonicalReal, 'references');
    const generatedAdapters = new Set();
    if (existsSync(generatedReferenceRoot)) {
      for (const entry of await readdir(generatedReferenceRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && ADAPTERS.has(entry.name)) generatedAdapters.add(entry.name);
      }
    }
    for (const adapter of generatedAdapters) {
      if (!detectedAdapters.has(adapter)) {
        const message = `generated adapter ${adapter} has no matching Project Inventory signal`;
        if (args.strict) errors.push(message); else warnings.push(message);
      }
    }
    for (const adapter of detectedAdapters) {
      if (!generatedAdapters.has(adapter)) {
        const message = `detected adapter ${adapter} is missing from generated references`;
        if (args.strict) errors.push(message); else warnings.push(message);
      }
    }

    const detectedFrameworks = new Set(inventory?.summary?.frameworks ?? []);
    const frameworkContracts = [
      ['vue', 'typescript', 'references/typescript/frameworks/vue.md'],
      ['react', 'typescript', 'references/typescript/frameworks/react.md'],
      ['spring-boot', 'java', 'references/java/frameworks/spring-boot.md'],
    ];
    for (const [framework, requiredAdapter, rel] of frameworkContracts) {
      const present = fileSet.has(path.join(canonicalReal, rel));
      const frameworkDetected = detectedFrameworks.has(framework);
      const adapterDetected = detectedAdapters.has(requiredAdapter);
      if (present && (!frameworkDetected || !adapterDetected)) {
        const message = `generated framework rule ${framework} has no matching ${requiredAdapter} adapter and framework signal`;
        if (args.strict) errors.push(message); else warnings.push(message);
      }
      if (!present && frameworkDetected && adapterDetected) {
        const message = `detected framework ${framework} is missing generated rule ${rel}`;
        if (args.strict) errors.push(message); else warnings.push(message);
      }
    }

    for (const wrapper of [
      '.agents/skills/typescript-standards',
      '.agents/skills/typescript--standards',
      '.claude/skills/engineering-standards',
      '.claude/skills/typescript-standards',
    ]) await validateWrapper(rootReal, wrapper, errors);

    // Detect substantial duplicate canonical copies under known agent roots.
    for (const baseRel of ['.agents/skills', '.claude/skills']) {
      const base = path.join(rootReal, baseRel);
      if (!existsSync(base)) continue;
      for (const entry of await readdir(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(base, entry.name, 'SKILL.md');
        if (!existsSync(candidate) || candidate === mainSkill) continue;
        const text = await readFile(candidate, 'utf8');
        const fm = parseFrontmatter(text);
        if (fm?.values?.name === 'engineering-standards' && fm.body.trim().length > 400) {
          errors.push(`substantial duplicate engineering-standards content found at ${toPosix(path.relative(rootReal, candidate))}`);
        }
      }
    }

    if ((inventory?.scan?.truncated ?? false) === true) warnings.push('Project Inventory scan was truncated; adapter selection requires manual verification');
    for (const item of inventory?.conflicts ?? []) warnings.push(`Project Inventory conflict: ${item.scope ?? 'repository'} ${item.type}`);
  } catch (error) {
    errors.push(error.stack ?? error.message);
  }

  for (const warning of warnings) process.stderr.write(`validate-generated-skill: WARN: ${warning}\n`);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`validate-generated-skill: ERROR: ${error}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`validate-generated-skill: OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}\n`);
}

await main();
