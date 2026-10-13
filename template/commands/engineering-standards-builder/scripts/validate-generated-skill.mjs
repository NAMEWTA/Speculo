#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROUTER_REL = '.agents/skills/engineering-standards';
const OWNERSHIP_FILE = 'generated-skill-set.json';
const REQUIRED_PROJECT_REFERENCES = [
  'references/project/00-project-profile.md',
  'references/project/01-module-map.md',
  'references/project/02-decisions-and-exceptions.md',
  'references/project/03-skill-map.md',
  'references/project/04-source-and-template-map.md',
  'references/project/review-checklist.md',
];
const ADAPTERS = new Set(['typescript', 'java', 'go', 'rust']);
const ROLES = new Set(['router', 'domain']);

function usage() {
  return `Usage: node scripts/validate-generated-skill.mjs --root <project-root> [options]\n\n` +
    `Validate the Builder-owned project Skill Set and optional compatibility wrappers.\n\n` +
    `Options:\n` +
    `  --root <path>       Project root (required)\n` +
    `  --inventory <path>  Project Inventory JSON below --root; auto-discover when omitted\n` +
    `  --strict            Reject generated language/framework content without project signals\n` +
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
      i += 1;
      continue;
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
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    let target = match[1].trim();
    if (target.startsWith('<')) {
      const close = target.indexOf('>');
      if (close >= 0) target = target.slice(1, close);
    } else {
      const titleIndex = target.search(/\s+["']/);
      if (titleIndex >= 0) target = target.slice(0, titleIndex);
    }
    links.push(target);
  }
  return links;
}

function isExternal(link) { return /^(?:[a-z]+:|#|\/\/)/i.test(link); }

function linkTarget(sourceAbs, link) {
  const withoutAnchor = link.split('#')[0].split('?')[0];
  if (!withoutAnchor) return null;
  let decoded;
  try { decoded = decodeURIComponent(withoutAnchor); }
  catch { decoded = withoutAnchor; }
  return path.resolve(path.dirname(sourceAbs), decoded);
}

async function collectTree(rootAbs) {
  const files = [];
  const directories = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    directories.push({ abs: directory, entries });
    for (const entry of entries) {
      const abs = path.join(directory, entry.name);
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
  const result = spawnSync(process.execPath, [discoverScript, '--root', rootReal], {
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`automatic project discovery failed: ${(result.stderr || result.stdout).trim()}`);
  return JSON.parse(result.stdout);
}

function validateExactKeys(value, allowed, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label} contains unsupported field: ${key}`);
  }
}

async function validateWrapper(projectRoot, wrapperRel, ownedPaths, errors) {
  if (ownedPaths.has(wrapperRel)) return;
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
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`validate-generated-skill: ${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (args.help) { process.stdout.write(usage()); return; }

  const errors = [];
  const warnings = [];
  try {
    const rootReal = await realpath(path.resolve(args.root));
    if (!(await stat(rootReal)).isDirectory()) throw new Error('--root is not a directory');

    const routerRoot = path.join(rootReal, ROUTER_REL);
    if (!existsSync(routerRoot)) throw new Error(`${ROUTER_REL} is missing`);
    const routerReal = await realpath(routerRoot);
    if (!isInside(rootReal, routerReal)) throw new Error(`${ROUTER_REL} resolves outside project root`);

    const ownershipPath = path.join(routerReal, OWNERSHIP_FILE);
    if (!existsSync(ownershipPath)) throw new Error(`${ROUTER_REL}/${OWNERSHIP_FILE} is missing`);
    let ownership;
    try { ownership = JSON.parse(await readFile(ownershipPath, 'utf8')); }
    catch (error) { throw new Error(`${ROUTER_REL}/${OWNERSHIP_FILE} is invalid JSON: ${error.message}`); }

    validateExactKeys(ownership, new Set(['schema_version', 'generator', 'skills']), OWNERSHIP_FILE, errors);
    if (ownership.schema_version !== 1) errors.push(`${OWNERSHIP_FILE} schema_version must be 1`);
    if (ownership.generator !== 'engineering-standards-builder') errors.push(`${OWNERSHIP_FILE} generator must be engineering-standards-builder`);
    if (!Array.isArray(ownership.skills) || ownership.skills.length === 0) errors.push(`${OWNERSHIP_FILE} skills must be a non-empty array`);

    const entries = Array.isArray(ownership.skills) ? ownership.skills : [];
    const names = new Set();
    const ownedPaths = new Set();
    const routers = [];
    for (const [index, entry] of entries.entries()) {
      const label = `${OWNERSHIP_FILE} skills[${index}]`;
      validateExactKeys(entry, new Set(['name', 'path', 'role']), label, errors);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry?.name ?? '')) errors.push(`${label} name must be kebab-case`);
      const expectedPath = `.agents/skills/${entry?.name}`;
      if (entry?.path !== expectedPath) errors.push(`${label} path must equal ${expectedPath}`);
      if (!ROLES.has(entry?.role)) errors.push(`${label} role must be router or domain`);
      if (names.has(entry?.name)) errors.push(`${label} duplicates name ${entry?.name}`);
      if (ownedPaths.has(entry?.path)) errors.push(`${label} duplicates path ${entry?.path}`);
      names.add(entry?.name);
      ownedPaths.add(entry?.path);
      if (entry?.role === 'router') routers.push(entry);
    }
    if (routers.length !== 1) errors.push(`${OWNERSHIP_FILE} must contain exactly one router`);
    else if (routers[0].name !== 'engineering-standards' || routers[0].path !== ROUTER_REL) {
      errors.push(`${OWNERSHIP_FILE} router must be engineering-standards at ${ROUTER_REL}`);
    }

    const ownedRoots = [];
    const ownedMainSkills = new Map();
    const allOwnedFiles = [];
    for (const entry of entries) {
      if (typeof entry?.path !== 'string' || typeof entry?.name !== 'string') continue;
      const skillRoot = path.resolve(rootReal, entry.path);
      if (!isInside(rootReal, skillRoot)) { errors.push(`${entry.path} escapes project root`); continue; }
      if (!existsSync(skillRoot)) { errors.push(`owned Skill is missing: ${entry.path}`); continue; }
      const skillReal = await realpath(skillRoot);
      if (!isInside(rootReal, skillReal)) { errors.push(`${entry.path} resolves outside project root`); continue; }
      const info = await stat(skillReal);
      if (!info.isDirectory()) { errors.push(`${entry.path} must be a directory`); continue; }

      const tree = await collectTree(skillReal);
      ownedRoots.push(skillReal);
      for (const directory of tree.directories) {
        if (directory.entries.length === 0) errors.push(`empty generated directory: ${toPosix(path.relative(rootReal, directory.abs))}`);
      }
      allOwnedFiles.push(...tree.files);
      const mainSkill = path.join(skillReal, 'SKILL.md');
      ownedMainSkills.set(entry.name, mainSkill);
      if (!tree.files.includes(mainSkill)) { errors.push(`${entry.path}/SKILL.md is missing`); continue; }
      const text = await readFile(mainSkill, 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm) errors.push(`${entry.path}/SKILL.md frontmatter is malformed`);
      else {
        if (fm.values.name !== entry.name) errors.push(`${entry.path}/SKILL.md name must be ${entry.name}`);
        if (!fm.values.description) errors.push(`${entry.path}/SKILL.md description is missing`);
      }
    }

    const routerFiles = new Set(allOwnedFiles.filter((file) => isInside(routerReal, file)));
    for (const required of REQUIRED_PROJECT_REFERENCES) {
      if (!routerFiles.has(path.join(routerReal, required))) errors.push(`required router reference is missing: ${required}`);
    }

    const routerMain = path.join(routerReal, 'SKILL.md');
    const routerLinkTargets = new Set();
    const evidenceLinks = new Set();
    const sourceMapPath = path.join(routerReal, 'references/project/04-source-and-template-map.md');

    for (const file of allOwnedFiles.filter((item) => item.endsWith('.md'))) {
      const rel = toPosix(path.relative(rootReal, file));
      const text = await readFile(file, 'utf8');
      if (/\{\{[A-Z0-9_]+\}\}|<PROJECT_NAME>|<REPOSITORY_ROOT>/.test(text)) errors.push(`${rel}: unresolved template placeholder`);
      for (const link of markdownLinks(text)) {
        if (isExternal(link)) continue;
        const target = linkTarget(file, link);
        if (!target) continue;
        if (!isInside(rootReal, target)) { errors.push(`${rel}: link escapes project root: ${link}`); continue; }
        if (!existsSync(target)) { errors.push(`${rel}: broken project link: ${link}`); continue; }
        const directInfo = await lstat(target);
        if (directInfo.isSymbolicLink()) { errors.push(`${rel}: link target must not be a symlink: ${link}`); continue; }
        const targetReal = await realpath(target);
        if (!isInside(rootReal, targetReal)) { errors.push(`${rel}: link resolves outside project root: ${link}`); continue; }
        if (file === routerMain) routerLinkTargets.add(targetReal);
        if (file === sourceMapPath && !ownedRoots.some((ownedRoot) => isInside(ownedRoot, targetReal))) {
          if (!directInfo.isFile()) errors.push(`${rel}: project evidence link must target a file: ${link}`);
          else evidenceLinks.add(targetReal);
        }
      }

      const routerProjectPrefix = toPosix(path.relative(rootReal, path.join(routerReal, 'references/project')));
      if (!rel.startsWith(`${routerProjectPrefix}/`)) {
        for (const levelMatch of text.matchAll(/^Level:\s*(MUST|SHOULD)\s*$/gm)) {
          const section = sectionForOffset(text, levelMatch.index);
          for (const field of ['Scope:', 'Source:', 'Rule:', 'Verification:']) {
            if (!section.text.includes(field)) errors.push(`${rel} ${section.title}: ${levelMatch[1]} rule is missing ${field}`);
          }
        }
      }
    }

    if (existsSync(sourceMapPath) && evidenceLinks.size === 0) {
      errors.push('04-source-and-template-map.md must link to at least one real project file outside the generated Skill Set');
    }

    for (const entry of entries.filter((item) => item?.role === 'domain')) {
      const mainSkill = ownedMainSkills.get(entry.name);
      if (mainSkill && existsSync(mainSkill)) {
        const mainReal = await realpath(mainSkill);
        if (!routerLinkTargets.has(mainReal)) errors.push(`router SKILL.md does not link to domain Skill: ${entry.name}`);
      }
    }

    if (existsSync(routerMain)) {
      const routerText = await readFile(routerMain, 'utf8');
      if (/typescript-(?:-)?standards\/SKILL\.md/.test(routerText)) errors.push('router Skill must not route back to a compatibility alias');
    }

    const inventory = await loadInventory(args, rootReal);
    const detectedAdapters = new Set(inventory?.summary?.adapters ?? []);
    const generatedReferenceRoot = path.join(routerReal, 'references');
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

    const detectedFrameworks = new Set(inventory?.summary?.frameworks ?? []);
    const frameworkContracts = [
      ['vue', 'typescript', 'references/typescript/frameworks/vue.md'],
      ['react', 'typescript', 'references/typescript/frameworks/react.md'],
      ['spring-boot', 'java', 'references/java/frameworks/spring-boot.md'],
    ];
    for (const [framework, requiredAdapter, rel] of frameworkContracts) {
      const present = routerFiles.has(path.join(routerReal, rel));
      if (present && (!detectedFrameworks.has(framework) || !detectedAdapters.has(requiredAdapter))) {
        const message = `generated framework rule ${framework} has no matching ${requiredAdapter} adapter and framework signal`;
        if (args.strict) errors.push(message); else warnings.push(message);
      }
    }

    for (const wrapper of [
      '.agents/skills/typescript-standards',
      '.agents/skills/typescript--standards',
      '.claude/skills/engineering-standards',
      '.claude/skills/typescript-standards',
    ]) await validateWrapper(rootReal, wrapper, ownedPaths, errors);

    for (const baseRel of ['.agents/skills', '.claude/skills']) {
      const base = path.join(rootReal, baseRel);
      if (!existsSync(base)) continue;
      for (const entry of await readdir(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(base, entry.name, 'SKILL.md');
        if (!existsSync(candidate) || candidate === routerMain) continue;
        const text = await readFile(candidate, 'utf8');
        const fm = parseFrontmatter(text);
        if (fm?.values?.name === 'engineering-standards' && fm.body.trim().length > 400) {
          errors.push(`substantial duplicate engineering-standards content found at ${toPosix(path.relative(rootReal, candidate))}`);
        }
      }
    }

    if ((inventory?.scan?.truncated ?? false) === true) warnings.push('Project Inventory scan was truncated; source coverage requires manual verification');
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
