#!/usr/bin/env node

import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

function usage() {
  return `Usage: node scripts/self-test.mjs --root <skill-root>\n\n` +
    `Run deterministic scanner fixtures plus generated-Skill validator success and failure cases.\n\n` +
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
  return { root: path.resolve(root) };
}

async function findExpectedFiles(root) {
  const result = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const abs = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(abs);
      else if (entry.isFile() && entry.name === 'expected.json') result.push(abs);
    }
  }
  await visit(root);
  return result;
}

function runNode(script, args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', timeout: options.timeout ?? 60000, maxBuffer: 64 * 1024 * 1024,
    cwd: options.cwd,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(actual, expected, label) {
  for (const value of expected ?? []) {
    assert(actual.includes(value), `${label}: expected ${JSON.stringify(value)} in ${JSON.stringify(actual)}`);
  }
}

function assertFixture(inventory, expected, fixtureName) {
  if (expected.topology) assert(inventory.topology === expected.topology, `${fixtureName}: topology expected ${expected.topology}, got ${inventory.topology}`);
  if (expected.minimumModules) assert(inventory.modules.length >= expected.minimumModules, `${fixtureName}: expected at least ${expected.minimumModules} modules, got ${inventory.modules.length}`);
  assertIncludes(inventory.summary.languages, expected.languages, `${fixtureName} summary.languages`);
  assertIncludes(inventory.summary.adapters, expected.adapters, `${fixtureName} summary.adapters`);
  for (const value of expected.absentAdapters ?? []) assert(!inventory.summary.adapters.includes(value), `${fixtureName}: adapter ${value} must be absent`);
  assertIncludes(inventory.summary.frameworks, expected.frameworks, `${fixtureName} summary.frameworks`);
  assertIncludes(inventory.summary.buildSystems, expected.buildSystems, `${fixtureName} summary.buildSystems`);
  assertIncludes(inventory.summary.testSystems, expected.testSystems, `${fixtureName} summary.testSystems`);
  assertIncludes((inventory.ciCommands ?? []).map((item) => item.responsibility), expected.ciResponsibilities, `${fixtureName} ciResponsibilities`);
  if (expected.module) {
    const module = inventory.modules.find((item) => item.path === expected.module.path);
    assert(module, `${fixtureName}: module ${expected.module.path} not found`);
    for (const key of ['languages', 'frameworks', 'buildSystems', 'testSystems', 'runtimes', 'applicationTypes']) {
      assertIncludes(module[key] ?? [], expected.module[key], `${fixtureName} module.${key}`);
    }
  }
  assert(inventory.scan.truncated === false, `${fixtureName}: scan unexpectedly truncated`);
  assert(inventory.modules.every((module) => Array.isArray(module.evidence)), `${fixtureName}: every module must contain evidence`);
}

async function writeGeneratedFixture(projectRoot) {
  await mkdir(path.join(projectRoot, 'src'), { recursive: true });
  await writeFile(path.join(projectRoot, 'package.json'), `${JSON.stringify({
    name: 'generated-validation-fixture', private: true,
    dependencies: { vue: '^3.5.0' }, devDependencies: { typescript: '^5.9.0', vite: '^7.0.0' },
  }, null, 2)}\n`);
  await writeFile(path.join(projectRoot, 'tsconfig.json'), '{"compilerOptions":{"strict":true},"include":["src"]}\n');
  await writeFile(path.join(projectRoot, 'src', 'App.vue'), '<script setup lang="ts">const value = 1</script>\n<template><main>{{ value }}</main></template>\n');

  const canonical = path.join(projectRoot, '.agents', 'skills', 'engineering-standards');
  await mkdir(path.join(canonical, 'references', 'project'), { recursive: true });
  await mkdir(path.join(canonical, 'references', 'rules'), { recursive: true });
  await mkdir(path.join(canonical, 'references', 'typescript', 'frameworks'), { recursive: true });
  await writeFile(path.join(canonical, 'SKILL.md'), `---\nname: engineering-standards\ndescription: Generated fixture standards.\n---\n\n# Engineering Standards\n\nRead [profile](references/project/00-project-profile.md), [modules](references/project/01-module-map.md), [decisions](references/project/02-decisions-and-exceptions.md), [review](references/project/review-checklist.md), [rules](references/rules/core.md), [TypeScript](references/typescript/language.md), and [Vue](references/typescript/frameworks/vue.md).\n`);
  await writeFile(path.join(canonical, 'references', 'project', '00-project-profile.md'), '# Project Profile\n\nVue fixture.\n');
  await writeFile(path.join(canonical, 'references', 'project', '01-module-map.md'), '# Module Map\n\n- module:. uses TypeScript and Vue.\n');
  await writeFile(path.join(canonical, 'references', 'project', '02-decisions-and-exceptions.md'), '# Decisions and Exceptions\n\nNo exceptions.\n');
  await writeFile(path.join(canonical, 'references', 'project', 'review-checklist.md'), '# Review Checklist\n\n- Verify scope.\n');
  const rule = `# Core Rules\n\n### CORE-001 Validated boundary\nScope: repository\nLevel: MUST\nSource: repository-fact\nApplies when: external input enters the application.\nRule: Validate external input before domain use.\nRationale: Preserve trusted internal models.\nVerification: Review boundary tests.\nException: Recorded project exception only.\n`;
  await writeFile(path.join(canonical, 'references', 'rules', 'core.md'), rule);
  await writeFile(path.join(canonical, 'references', 'typescript', 'language.md'), rule.replace('CORE-001', 'TS-001'));
  await writeFile(path.join(canonical, 'references', 'typescript', 'frameworks', 'vue.md'), rule.replace('CORE-001', 'VUE-001'));
  return canonical;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`self-test: ${error.message}\n\n${usage()}`);
    process.exitCode = 2; return;
  }
  if (args.help) { process.stdout.write(usage()); return; }

  const scanner = path.join(args.root, 'scripts', 'discover-project.mjs');
  const generatedValidator = path.join(args.root, 'scripts', 'validate-generated-skill.mjs');
  const manifestScript = path.join(args.root, 'scripts', 'sync-manifest.mjs');
  const fixtureRoot = path.join(args.root, 'examples');
  const tempRoots = [];
  try {
    const expectedFiles = await findExpectedFiles(fixtureRoot);
    assert(expectedFiles.length >= 6, `expected at least 6 fixtures, found ${expectedFiles.length}`);
    for (const expectedPath of expectedFiles) {
      const fixtureDir = path.dirname(expectedPath);
      const fixtureName = path.relative(fixtureRoot, fixtureDir).split(path.sep).join('/');
      const expected = JSON.parse(await readFile(expectedPath, 'utf8'));
      const first = runNode(scanner, ['--root', fixtureDir]);
      assert(first.status === 0, `${fixtureName}: scanner failed: ${(first.stderr || first.stdout).trim()}`);
      const second = runNode(scanner, ['--root', fixtureDir]);
      assert(second.status === 0, `${fixtureName}: second scanner run failed`);
      assert(first.stdout === second.stdout, `${fixtureName}: scanner output is not deterministic`);
      const inventory = JSON.parse(first.stdout);
      assertFixture(inventory, expected, fixtureName);
      process.stdout.write(`self-test: fixture OK ${fixtureName}\n`);
    }

    const missing = runNode(scanner, ['--root', path.join(args.root, 'examples', 'does-not-exist')]);
    assert(missing.status !== 0, 'scanner must fail for a missing root');

    const outputTemp = await mkdtemp(path.join(os.tmpdir(), 'standards-builder-output-'));
    tempRoots.push(outputTemp);
    const copiedFixture = path.join(outputTemp, 'fixture');
    await cp(path.join(args.root, 'examples', 'typescript', 'vue-vite'), copiedFixture, { recursive: true });
    const writeResult = runNode(scanner, ['--root', copiedFixture, '--output', '.inventory/project.json', '--pretty']);
    assert(writeResult.status === 0, `scanner safe output failed: ${writeResult.stderr}`);
    const outputInventory = JSON.parse(await readFile(path.join(copiedFixture, '.inventory', 'project.json'), 'utf8'));
    assert(outputInventory.summary.frameworks.includes('vue'), 'safe output inventory lost Vue detection');
    const escapeTarget = path.join(outputTemp, 'escape.json');
    const escapeResult = runNode(scanner, ['--root', copiedFixture, '--output', '../escape.json']);
    assert(escapeResult.status !== 0, 'scanner must reject output escaping root');
    try { await readFile(escapeTarget, 'utf8'); throw new Error('scanner wrote an escaping output file'); }
    catch (error) { if (error.message === 'scanner wrote an escaping output file') throw error; }
    process.stdout.write('self-test: scanner safety OK\n');

    const managedTemp = await mkdtemp(path.join(os.tmpdir(), 'standards-builder-managed-'));
    tempRoots.push(managedTemp);
    await cp(path.join(args.root, 'examples', 'typescript', 'vue-vite'), managedTemp, { recursive: true });
    await mkdir(path.join(managedTemp, 'speculo', '.speculo'), { recursive: true });
    await mkdir(path.join(managedTemp, 'speculo', 'skills', 'noise', 'examples'), { recursive: true });
    await writeFile(path.join(managedTemp, 'speculo', '.speculo', 'workspace.json'), '{"schema_version":1}\n');
    await writeFile(path.join(managedTemp, 'speculo', 'skills', 'noise', 'examples', 'go.mod'), 'module noise.invalid\n\ngo 1.24\n');
    await writeFile(path.join(managedTemp, 'speculo', 'skills', 'noise', 'examples', 'Cargo.toml'), '[package]\nname = "noise"\nversion = "0.0.0"\n');
    await mkdir(path.join(managedTemp, '.agents', 'skills', 'engineering-standards'), { recursive: true });
    await writeFile(path.join(managedTemp, '.agents', 'skills', 'engineering-standards', 'SKILL.md'), '---\nname: engineering-standards\ndescription: existing\n---\n');
    const managedResult = runNode(scanner, ['--root', managedTemp]);
    assert(managedResult.status === 0, `managed-root exclusion scan failed: ${managedResult.stderr}`);
    const managedInventory = JSON.parse(managedResult.stdout);
    assert(!managedInventory.summary.languages.includes('go') && !managedInventory.summary.languages.includes('rust'), 'managed Speculo/Agent skill assets polluted project language detection');
    assert(managedInventory.existingStandards.includes('.agents/skills/engineering-standards/SKILL.md'), 'managed standards entrypoint was not preserved as evidence');
    process.stdout.write('self-test: managed asset exclusion OK\n');

    const generatedTemp = await mkdtemp(path.join(os.tmpdir(), 'standards-builder-generated-'));
    tempRoots.push(generatedTemp);
    const canonical = await writeGeneratedFixture(generatedTemp);
    const valid = runNode(generatedValidator, ['--root', generatedTemp, '--strict']);
    assert(valid.status === 0, `valid generated Skill was rejected: ${(valid.stderr || valid.stdout).trim()}`);
    await writeFile(path.join(canonical, 'references', 'typescript', 'frameworks', 'react.md'), '# React\n');
    const wrongFramework = runNode(generatedValidator, ['--root', generatedTemp, '--strict']);
    assert(wrongFramework.status !== 0, 'strict validator must reject an unselected React rule in a Vue-only project');
    await rm(path.join(canonical, 'references', 'typescript', 'frameworks', 'react.md'));
    const wrapper = path.join(generatedTemp, '.agents', 'skills', 'typescript-standards');
    await mkdir(wrapper, { recursive: true });
    await writeFile(path.join(wrapper, 'SKILL.md'), '---\nname: typescript-standards\ndescription: alias\n---\n\nRoute to engineering-standards.\nSecond body line.\n');
    const badWrapper = runNode(generatedValidator, ['--root', generatedTemp, '--strict']);
    assert(badWrapper.status !== 0, 'validator must reject a multi-line compatibility wrapper');
    process.stdout.write('self-test: generated Skill validator OK\n');

    const manifest = runNode(manifestScript, ['--root', args.root, '--check']);
    assert(manifest.status === 0, `manifest check failed: ${(manifest.stderr || manifest.stdout).trim()}`);
    process.stdout.write('self-test: manifest OK\n');
    process.stdout.write(`self-test: OK (${expectedFiles.length} fixtures)\n`);
  } catch (error) {
    process.stderr.write(`self-test: ERROR: ${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  } finally {
    for (const tempRoot of tempRoots) await rm(tempRoot, { recursive: true, force: true });
  }
}

await main();
