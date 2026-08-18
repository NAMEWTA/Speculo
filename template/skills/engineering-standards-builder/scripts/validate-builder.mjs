#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

function usage() {
  return `Usage: node scripts/validate-builder.mjs --root <skill-root>\n\n` +
    `Validate the builder package: identity, links, reachability, manifest, fixtures, templates and script help.\n\n` +
    `Options:\n  --root <path>  Skill root (required)\n  --help         Show this help\n`;
}

function parseArgs(argv) {
  let root = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--root') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--root requires a value');
      root = value; i += 1; continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!root) throw new Error('--root is required');
  return { root };
}

function toPosix(value) { return value.split(path.sep).join('/'); }

async function collect(rootReal) {
  const files = [];
  const directories = [];
  async function visit(directory) {
    const relDir = toPosix(path.relative(rootReal, directory)) || '.';
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    directories.push({ abs: directory, rel: relDir, entries });
    for (const entry of entries) {
      const abs = path.join(directory, entry.name);
      const rel = toPosix(path.relative(rootReal, abs));
      if (entry.isSymbolicLink()) throw new Error(`symlink is not allowed: ${rel}`);
      if (entry.isDirectory()) { await visit(abs); continue; }
      if (entry.isFile()) files.push({ abs, rel, name: entry.name });
    }
  }
  await visit(rootReal);
  return { files, directories };
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return null;
  const result = {};
  for (const line of text.slice(4, end).split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) result[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { values: result, body: text.slice(end + 5) };
}

function markdownLinks(text) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    let target = match[1].trim();
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    const titleIndex = target.search(/\s+["']/);
    if (titleIndex >= 0) target = target.slice(0, titleIndex);
    links.push(target);
  }
  return links;
}

function isExternalLink(link) {
  return /^(?:[a-z]+:|#|\/\/)/i.test(link);
}

function normalizeLinkTarget(sourceAbs, link) {
  const withoutAnchor = link.split('#')[0].split('?')[0];
  if (!withoutAnchor) return null;
  let decoded;
  try { decoded = decodeURIComponent(withoutAnchor); } catch { decoded = withoutAnchor; }
  return path.resolve(path.dirname(sourceAbs), decoded);
}

async function computeManifest(rootReal, files) {
  return `${files.map((file) => file.rel).filter((rel) => rel !== 'manifest.txt' && !rel.endsWith('/.DS_Store')).sort((a, b) => a.localeCompare(b, 'en')).join('\n')}\n`;
}

function failLines(errors, warnings) {
  if (warnings.length) {
    process.stderr.write(warnings.map((item) => `validate-builder: WARN: ${item}\n`).join(''));
  }
  if (errors.length) {
    process.stderr.write(errors.map((item) => `validate-builder: ERROR: ${item}\n`).join(''));
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`validate-builder: OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}\n`);
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`validate-builder: ${error.message}\n\n${usage()}`);
    process.exitCode = 2; return;
  }
  if (args.help) { process.stdout.write(usage()); return; }

  const errors = [];
  const warnings = [];
  try {
    const rootReal = await realpath(path.resolve(args.root));
    if (!(await stat(rootReal)).isDirectory()) throw new Error('--root is not a directory');
    const { files, directories } = await collect(rootReal);
    const fileByAbs = new Map(files.map((file) => [file.abs, file]));
    const fileByRel = new Map(files.map((file) => [file.rel, file]));

    for (const directory of directories) {
      if (directory.entries.length === 0) errors.push(`empty directory: ${directory.rel}`);
    }

    const skillFile = fileByRel.get('SKILL.md');
    if (!skillFile) errors.push('SKILL.md is missing');
    else {
      const skillText = await readFile(skillFile.abs, 'utf8');
      const frontmatter = parseFrontmatter(skillText);
      if (!frontmatter) errors.push('SKILL.md frontmatter is missing or malformed');
      else {
        const expectedName = path.basename(rootReal);
        if (frontmatter.values.name !== expectedName) errors.push(`frontmatter name must equal directory name (${expectedName}), found ${frontmatter.values.name ?? '<missing>'}`);
        if (frontmatter.values.name !== 'engineering-standards-builder') errors.push('stable Skill ID must remain engineering-standards-builder for drop-in replacement');
        if (!frontmatter.values.description) errors.push('frontmatter description is missing');
        if (/[<>]/.test(frontmatter.values.description ?? '')) errors.push('frontmatter description must not contain angle brackets');
      }
      const completionCount = (skillText.match(/\*\*完成标准\*\*/g) ?? []).length;
      if (completionCount < 7) errors.push(`SKILL.md must define completion criteria for all seven stages; found ${completionCount}`);
    }

    const localMarkdownFiles = files.filter((file) => /\.md(?:\.template)?$/.test(file.name) || file.name === 'SKILL.md.template');
    const linkGraph = new Map();
    for (const file of localMarkdownFiles) {
      const text = await readFile(file.abs, 'utf8');
      const targets = [];
      for (const link of markdownLinks(text)) {
        if (isExternalLink(link)) continue;
        const targetAbs = normalizeLinkTarget(file.abs, link);
        if (!targetAbs) continue;
        if (!targetAbs.startsWith(`${rootReal}${path.sep}`) && targetAbs !== rootReal) {
          errors.push(`${file.rel}: local link escapes skill root: ${link}`);
          continue;
        }
        if (!existsSync(targetAbs)) {
          const templateTarget = `${targetAbs}.template`;
          if (!(file.rel.endsWith('.template') && existsSync(templateTarget))) {
            errors.push(`${file.rel}: broken local link: ${link}`);
            continue;
          }
        }
        try {
          const info = await lstat(targetAbs);
          if (info.isSymbolicLink()) errors.push(`${file.rel}: link resolves through a symlink: ${link}`);
        } catch { /* exists check already reported */ }
        targets.push(targetAbs);
      }
      linkGraph.set(file.abs, targets);
      if (!file.rel.startsWith('templates/') && /\{\{[A-Z0-9_]+\}\}/.test(text)) {
        errors.push(`${file.rel}: unresolved template placeholder outside templates/`);
      }
    }

    // All references must be reachable from the main entry through explicit Markdown links.
    if (skillFile) {
      const reachable = new Set();
      const queue = [skillFile.abs];
      while (queue.length) {
        const current = queue.shift();
        if (reachable.has(current)) continue;
        reachable.add(current);
        for (const target of linkGraph.get(current) ?? []) {
          if (fileByAbs.has(target) && /\.md(?:\.template)?$/.test(path.basename(target))) queue.push(target);
        }
      }
      for (const file of files.filter((item) => item.rel.startsWith('references/') && item.rel.endsWith('.md'))) {
        if (!reachable.has(file.abs)) errors.push(`orphan reference not reachable from SKILL.md: ${file.rel}`);
      }
    }

    const allowedReferenceRoots = new Set(['rules', 'typescript', 'java', 'go', 'rust']);
    for (const file of files.filter((item) => item.rel.startsWith('references/'))) {
      const first = file.rel.split('/')[1];
      if (!allowedReferenceRoots.has(first)) errors.push(`unexpected top-level reference group: ${file.rel}`);
    }
    for (const required of ['references/rules', 'references/typescript', 'references/java', 'references/go', 'references/rust']) {
      if (!directories.some((directory) => directory.rel === required)) errors.push(`required reference directory missing: ${required}`);
    }

    const allDocsText = (await Promise.all(files.filter((file) => file.rel.endsWith('.md')).map((file) => readFile(file.abs, 'utf8')))).join('\n');
    for (const script of files.filter((file) => file.rel.startsWith('scripts/') && file.rel.endsWith('.mjs'))) {
      if (!allDocsText.includes(script.name)) errors.push(`script is not referenced by Skill documentation: ${script.rel}`);
      const result = spawnSync(process.execPath, [script.abs, '--help'], { encoding: 'utf8', timeout: 15000 });
      if (result.status !== 0) errors.push(`${script.rel} --help failed: ${(result.stderr || result.stdout).trim()}`);
      if (!/Usage:/.test(result.stdout)) errors.push(`${script.rel} --help does not print a Usage section`);
    }

    const templateFiles = files.filter((file) => file.rel.startsWith('templates/') && file.rel !== 'templates/README.md');
    const templateIndex = fileByRel.get('templates/README.md');
    if (!templateIndex) errors.push('templates/README.md is missing');
    else {
      const indexText = await readFile(templateIndex.abs, 'utf8');
      for (const file of templateFiles) {
        if (!indexText.includes(file.name)) errors.push(`template is not indexed in templates/README.md: ${file.rel}`);
      }
    }

    const fixtureExpectations = files.filter((file) => file.name === 'expected.json' && file.rel.startsWith('examples/'));
    if (fixtureExpectations.length < 6) errors.push(`at least six fixture contracts are required; found ${fixtureExpectations.length}`);
    for (const requiredPrefix of ['examples/typescript/', 'examples/java/', 'examples/go/', 'examples/rust/', 'examples/polyglot/']) {
      if (!fixtureExpectations.some((file) => file.rel.startsWith(requiredPrefix))) errors.push(`missing fixture family: ${requiredPrefix}`);
    }
    for (const fixture of fixtureExpectations) {
      try { JSON.parse(await readFile(fixture.abs, 'utf8')); }
      catch (error) { errors.push(`${fixture.rel}: invalid expected.json (${error.message})`); }
    }
    const selfTest = fileByRel.get('scripts/self-test.mjs');
    if (selfTest) {
      const text = await readFile(selfTest.abs, 'utf8');
      if (!text.includes('expected.json')) errors.push('self-test.mjs must discover fixture expected.json files');
    }

    const manifestFile = fileByRel.get('manifest.txt');
    if (!manifestFile) errors.push('manifest.txt is missing');
    else {
      const expected = await computeManifest(rootReal, files);
      const actual = await readFile(manifestFile.abs, 'utf8');
      if (actual !== expected) errors.push('manifest.txt is stale; run sync-manifest.mjs --write');
    }

    const flatReferenceFiles = files.filter((file) => /^references\/[^/]+\.md$/.test(file.rel));
    if (flatReferenceFiles.length) errors.push(`references must be grouped by rules/language: ${flatReferenceFiles.map((file) => file.rel).join(', ')}`);

    if (!warnings.length && files.length > 180) warnings.push(`package contains ${files.length} files; verify progressive disclosure remains focused`);
  } catch (error) {
    errors.push(error.stack ?? error.message);
  }
  failLines(errors, warnings);
}

await main();
