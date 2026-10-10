import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { initSpeculo } from '../src/index.js';
import { discoverWorkflowCatalog } from '../src/workflows.js';
import { fingerprintTree } from '../src/manifest.js';
import { validateMediaState } from '../src/media-state.js';
const packageRoot = process.cwd(), tools = 'template/workflows/media/common';
async function fixture(fn: (root: string) => Promise<void>): Promise<void> { const root = await mkdtemp(join(tmpdir(), 'speculo-media-')); try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); } }
test('media: passive discovery does not create a Change', async () => fixture(async target => {
  const before = await fingerprintTree(target), catalog = await discoverWorkflowCatalog(packageRoot); assert.ok(catalog.has('media'));
  const index = await readFile(join(packageRoot, 'template/workflows/media/INDEX.md'), 'utf8'); assert.match(index, /被动/); assert.doesNotMatch(index, /AUTO-INDEX-START/);
  assert.equal(await fingerprintTree(target), before);
}));
test('media: isolated install, seven pointer Skills, byte-preserving refresh and invalid-state rejection', async () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ['media'] }, agentSkills: { mode: 'set', workflowIds: ['media'], templateNames: [] } });
  const installed = join(target, 'speculo'), state = join(installed, '.speculo/media');
  const manifest = JSON.parse(await readFile(join(installed, '.speculo/install.json'), 'utf8')) as { workflows: string[] }; assert.deepEqual(manifest.workflows, ['media']);
  const catalog = await readFile(join(installed, '.speculo/catalog.md'), 'utf8'); assert.match(catalog, /workflows\/media\/INDEX.md/); assert.doesNotMatch(catalog, /workflows\/learning\/INDEX.md/);
  assert.equal((await readdir(join(target, '.agents/skills'))).filter(x => x.startsWith('media-')).length, 7);
  const name = '2026-10-10-demo'; await mkdir(join(state, 'changes', name), { recursive: true });
  await writeFile(join(state, 'status.json'), JSON.stringify({ schema_version: 1, workflow: 'media', active: [name], completed: [] }));
  await writeFile(join(state, 'changes', name, '.status.json'), JSON.stringify({ schema_version: 1, change: name, status: 'active', current_work: null, works_run: ['media/brief'], revision: 1, blockers: [], updated_at: '2026-10-10T00:00:00Z' }));
  await writeFile(join(state, 'changes', name, 'evidence.bin'), Buffer.from([0, 255, 1, 2])); await writeFile(join(state, 'context', 'creator.md'), 'User-owned profile\n');
  const before = await fingerprintTree(state); await initSpeculo(target, { packageRoot }); assert.equal(await fingerprintTree(state), before); await validateMediaState(installed);
  await writeFile(join(state, 'status.json'), JSON.stringify({ schema_version: 99, workflow: 'media', active: [name], completed: [] }));
  const invalid = await fingerprintTree(installed); await assert.rejects(initSpeculo(target, { packageRoot }), /media-state/); assert.equal(await fingerprintTree(installed), invalid);
}));
test('media: local primitive failure-path suite', () => {
  const result = spawnSync(process.execPath, ['--test', `${tools}/tests/media-tools.test.mjs`], { encoding: 'utf8', timeout: 60000 }); assert.equal(result.status, 0, result.stdout + result.stderr);
});
test('media: package contract and generated documents are current', () => {
  for (const args of [[`${tools}/tools/validate-media.mjs`, '--workflow-root', 'template/workflows/media'], ['scripts/generate-media-canonical.mjs', '--check']]) {
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 30000 }); assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});
