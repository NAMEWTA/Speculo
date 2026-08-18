#!/usr/bin/env node

import { lstat, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function usage() {
  return `Usage: node scripts/sync-manifest.mjs --root <skill-root> [--check | --write]\n\n` +
    `Validate or regenerate manifest.txt. The manifest lists every package file except itself.\n\n` +
    `Options:\n` +
    `  --root <path>  Skill root (required)\n` +
    `  --check        Fail when manifest.txt is stale (default)\n` +
    `  --write        Rewrite manifest.txt deterministically\n` +
    `  --help         Show this help\n`;
}

function parseArgs(argv) {
  const result = { root: null, mode: 'check' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--check') { result.mode = 'check'; continue; }
    if (arg === '--write') { result.mode = 'write'; continue; }
    if (arg === '--root') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--root requires a value');
      result.root = value;
      i += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!result.root) throw new Error('--root is required');
  return result;
}

function toPosix(value) { return value.split(path.sep).join('/'); }

async function collectFiles(rootReal) {
  const result = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue;
      const absolute = path.join(directory, entry.name);
      const relative = toPosix(path.relative(rootReal, absolute));
      if (entry.isSymbolicLink()) throw new Error(`symlink is not allowed in the skill package: ${relative}`);
      if (entry.isDirectory()) { await visit(absolute); continue; }
      if (!entry.isFile()) continue;
      if (relative === 'manifest.txt') continue;
      result.push(relative);
    }
  }
  await visit(rootReal);
  return result.sort((a, b) => a.localeCompare(b, 'en'));
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`sync-manifest: ${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (args.help) { process.stdout.write(usage()); return; }
  try {
    const rootReal = await realpath(path.resolve(args.root));
    if (!(await stat(rootReal)).isDirectory()) throw new Error('--root is not a directory');
    const manifestPath = path.join(rootReal, 'manifest.txt');
    const expected = `${(await collectFiles(rootReal)).join('\n')}\n`;
    if (args.mode === 'write') {
      const info = await lstat(rootReal);
      if (!info.isDirectory()) throw new Error('--root is not a directory');
      await writeFile(manifestPath, expected, 'utf8');
      process.stdout.write(`sync-manifest: wrote ${toPosix(path.relative(rootReal, manifestPath))}\n`);
      return;
    }
    let actual;
    try { actual = await readFile(manifestPath, 'utf8'); }
    catch (error) {
      if (error?.code === 'ENOENT') throw new Error('manifest.txt is missing; run with --write');
      throw error;
    }
    if (actual !== expected) {
      const actualSet = new Set(actual.split(/\r?\n/).filter(Boolean));
      const expectedSet = new Set(expected.split(/\r?\n/).filter(Boolean));
      const missing = [...expectedSet].filter((item) => !actualSet.has(item));
      const stale = [...actualSet].filter((item) => !expectedSet.has(item));
      const detail = [
        missing.length ? `missing: ${missing.slice(0, 20).join(', ')}` : null,
        stale.length ? `stale: ${stale.slice(0, 20).join(', ')}` : null,
        !missing.length && !stale.length ? 'entries are not in deterministic order or newline format differs' : null,
      ].filter(Boolean).join('; ');
      throw new Error(`manifest.txt is stale (${detail}); run with --write`);
    }
    process.stdout.write(`sync-manifest: OK (${expected.split('\n').filter(Boolean).length} files)\n`);
  } catch (error) {
    process.stderr.write(`sync-manifest: ${error.message}\n`);
    process.exitCode = 1;
  }
}

await main();
