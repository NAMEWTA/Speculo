#!/usr/bin/env node
/** Validate files the installer actually ships, not an AI's reasoning or task status. */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAssetCatalog, validateSkill } from '../dist/src/assets.js';
import { discoverHubCatalog } from '../dist/src/hub-catalog.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = await readAssetCatalog(join(root, 'template'));
const hub = await discoverHubCatalog(root);
const errors = [];
let markdownFiles = 0;
let authorSkills = 0;

async function inspect(path) {
  const content = await readFile(path, 'utf8');
  markdownFiles++;
  if (basename(path) === 'SKILL.md' && path.includes(join('.agents', 'skills'))) {
    authorSkills++;
    errors.push(...validateSkill(content, basename(dirname(path))).map(error => `${path}: ${error}`));
  }
  // Examples are not source links. External URLs and in-document fragments are not fetched.
  const prose = content.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '').replace(/`[^`\n]*`/g, '');
  for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
    const file = target.split('#')[0].split('?')[0];
    if (!file || /[{}$]/.test(file)) continue;
    try { await access(resolve(dirname(path), decodeURIComponent(file))); }
    catch { errors.push(`${path}: missing linked file ${file}`); }
  }
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) await inspect(path);
  }
}

for (const directory of ['template', 'skills-hub', '.agents/skills', 'docs']) await walk(join(root, directory));
for (const file of ['AGENTS.md', 'README.md', 'README-ZH.md', 'THIRD-PARTY-NOTICES.md']) await inspect(join(root, file));
assert.equal(errors.length, 0, errors.join('\n'));
console.log(`validate-assets: ${catalog.assets.length} installed entries, ${hub.size} Hub packages, ${authorSkills} author skill; ${markdownFiles} Markdown files checked`);
