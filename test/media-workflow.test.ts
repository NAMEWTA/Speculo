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
import { RefreshBlockedError } from '../src/refresh.js';
import { doctorSpeculo } from '../src/doctor.js';

const packageRoot = process.cwd();
const tools = 'template/workflows/media/common';
const mediaOptions = { packageRoot, selection: { workflowIds: ['media'] } };
const changeName = '2026-10-10-demo';

async function fixture(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'speculo-media-'));
  try { await fn(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

async function installation(target: string): Promise<void> {
  const result = await initSpeculo(target, mediaOptions);
  assert.equal(result.target, target);
  assert.equal(result.mode, 'init');
  assert.equal(result.refresh.status, 'initialized');
  await assertManifest(target);
}

async function assertManifest(target: string, workflows = ['media']): Promise<void> {
  const manifest = JSON.parse(await readFile(join(target, 'speculo/.speculo/install.json'), 'utf8'));
  assert.equal(manifest.schema_version, 3);
  assert.deepEqual(manifest.workflows, workflows);
}

async function seedRuntime(target: string): Promise<string> {
  const state = join(target, 'speculo/.speculo/media');
  await mkdir(join(state, 'changes', changeName), { recursive: true });
  await writeFile(join(state, 'status.json'), JSON.stringify({ schema_version: 1, workflow: 'media', active: [changeName], completed: [] }));
  await writeFile(join(state, 'changes', changeName, '.status.json'), JSON.stringify({
    schema_version: 1, change: changeName, status: 'active', current_work: null,
    works_run: ['media/brief'], revision: 1, blockers: [], updated_at: '2026-10-10T00:00:00Z',
  }));
  await writeFile(join(state, 'changes', changeName, 'evidence.bin'), Buffer.from([0, 255, 1, 2]));
  await writeFile(join(state, 'context', 'creator.md'), 'User-owned profile\r\nKeep trailing bytes.  \r\n');
  return state;
}

function runNode(args: string[]): void {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test('media: passive discovery does not create a Change', async () => fixture(async target => {
  const before = await fingerprintTree(target);
  const catalog = await discoverWorkflowCatalog(packageRoot);
  assert.ok(catalog.has('media'));
  const index = await readFile(join(packageRoot, 'template/workflows/media/INDEX.md'), 'utf8');
  assert.match(index, /被动/);
  assert.doesNotMatch(index, /AUTO-INDEX-START/);
  assert.equal(await fingerprintTree(target), before);
}));

test('media: isolated install persists its manifest and seven pointer Skills before returning', async () => fixture(async target => {
  const result = await initSpeculo(target, {
    ...mediaOptions,
    agentSkills: { mode: 'set', workflowIds: ['media'], templateNames: [] },
  });
  assert.equal(result.mode, 'init');
  assert.equal(result.agentSkills.works, 7);
  await assertManifest(target);
  const catalog = await readFile(join(target, 'speculo/.speculo/catalog.md'), 'utf8');
  assert.match(catalog, /workflows\/media\/INDEX.md/);
  assert.doesNotMatch(catalog, /workflows\/learning\/INDEX.md/);
  assert.deepEqual((await readdir(join(target, '.agents/skills'))).filter(x => x.startsWith('media-')).sort(), [
    'media-b-brief', 'media-d-deconstruct', 'media-h-hand-drawn', 'media-i-init-setup',
    'media-p-publish-draft', 'media-r-retro', 'media-v-video',
  ]);
  assert.equal((await doctorSpeculo(target)).healthy, true);
}));

test('media: repeated refresh preserves runtime bytes and durable installation metadata', async () => fixture(async target => {
  await installation(target);
  const state = await seedRuntime(target);
  const before = await fingerprintTree(state);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await initSpeculo(target, { packageRoot });
    assert.equal(result.mode, 'refresh');
    assert.equal(result.refresh.status, 'updated');
    await assertManifest(target);
    assert.equal(await fingerprintTree(state), before);
    await validateMediaState(join(target, 'speculo'));
    assert.equal((await doctorSpeculo(target)).healthy, true);
  }
}));

for (const [label, invalid] of [
  ['unknown version', { schema_version: 99, workflow: 'media', active: [], completed: [] }],
  ['unknown field', { schema_version: 1, workflow: 'media', active: [], completed: [], foreign: true }],
] as const) {
  test(`media: rejects ${label} through structured blockers without changing the project`, async () => fixture(async target => {
    await installation(target);
    const state = await seedRuntime(target);
    await writeFile(join(state, 'status.json'), JSON.stringify(invalid));
    const before = await fingerprintTree(target);
    await assert.rejects(initSpeculo(target, { packageRoot }), (error: unknown) => {
      assert.ok(error instanceof RefreshBlockedError);
      assert.ok(error.blockers.some(blocker =>
        blocker.code === 'structured-state-conflict' && /media-state:/.test(blocker.message)),
      JSON.stringify(error.blockers));
      return true;
    });
    assert.equal(await fingerprintTree(target), before);
    await assertManifest(target);
    assert.deepEqual((await readdir(target)).filter(name => name.startsWith('.speculo-init')), []);
  }));
}

test('media: installed runtime validator does not require excluded package seeds and stays read-only', async () => fixture(async target => {
  await installation(target);
  const state = await seedRuntime(target);
  const workflow = join(target, 'speculo/workflows/media');
  assert.ok(!(await readdir(workflow)).includes('_state'));
  const before = await fingerprintTree(target);
  const validator = join(workflow, 'common/tools/validate-media.mjs');
  runNode([validator, '--state-root', state]);
  assert.equal(await fingerprintTree(target), before);
  await writeFile(join(state, 'status.json'), JSON.stringify({ schema_version: 99, workflow: 'media', active: [], completed: [] }));
  const invalid = await fingerprintTree(target);
  const result = spawnSync(process.execPath, [validator, '--state-root', state], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /state-version/);
  assert.equal(await fingerprintTree(target), invalid);
}));

test('media: coexists with Learning without replacing either workflow', async () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ['learning', 'media'] } });
  await assertManifest(target, ['learning', 'media']);
  const catalog = await readFile(join(target, 'speculo/.speculo/catalog.md'), 'utf8');
  assert.match(catalog, /workflows\/learning\/INDEX.md/);
  assert.match(catalog, /workflows\/media\/INDEX.md/);
  await initSpeculo(target, { packageRoot });
  await assertManifest(target, ['learning', 'media']);
  assert.equal((await doctorSpeculo(target)).healthy, true);
}));

test('media: local primitive failure-path suite', () => {
  runNode(['--test', `${tools}/tests/media-tools.test.mjs`]);
});

test('media: package contract and generated documents are current', () => {
  runNode([`${tools}/tools/validate-media.mjs`, '--workflow-root', 'template/workflows/media']);
  runNode(['scripts/generate-media-canonical.mjs', '--check']);
});
