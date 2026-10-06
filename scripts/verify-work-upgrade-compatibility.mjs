#!/usr/bin/env node
/** One-off baseline/candidate refresh rehearsal in disposable fixtures.
 * Explicit baseline checkout required. Never pass a real installed state root.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSpeculo } from '../dist/src/index.js';
import { doctorSpeculo } from '../dist/src/doctor.js';
import { fingerprintTree } from '../dist/src/manifest.js';
import { resolvePathReference } from '../dist/src/paths.js';

const candidate = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = (data) => createHash('sha256').update(data).digest('hex');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
async function put(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.isBuffer(value) ? value : typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
}
async function fileTree(root, path = '') {
  const rows = [];
  for (const entry of (await readdir(join(root, path), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path ? `${path}/${entry.name}` : entry.name;
    if (entry.isDirectory()) rows.push(...await fileTree(root, name));
    else { assert.ok(entry.isFile(), `nonregular fixture source: ${name}`); rows.push({ path: name, sha256: digest(await readFile(join(root, name))) }); }
  }
  return rows;
}
async function run(baseline) {
  assert.notEqual(baseline, candidate, 'baseline and candidate must be distinct checkouts');
  // This revision changes assets, not CLI execution. The same built API is
  // therefore valid for exercising both exact package asset trees.
  assert.deepEqual(await fileTree(join(candidate, 'src')), await fileTree(join(baseline, 'src')), 'CLI sources changed: use separately built baseline and candidate instead');
  const all = { workflowIds: ['specdev', 'ops', 'learning', 'person'] };
  const outcomes = [];
  for (const layout of ['project-root', 'nested-project']) {
    const fixture = await mkdtemp(join(tmpdir(), 'speculo-upgrade-rehearsal-'));
    const target = layout === 'project-root' ? fixture : join(fixture, 'parent', 'nested', 'project');
    const root = join(target, 'speculo'), state = join(root, '.speculo');
    try {
      await mkdir(target, { recursive: true });
      await put(join(target, '.speculo', 'unrelated.txt'), 'unrelated state root: preserve\n');
      await initSpeculo(target, { packageRoot: baseline, selection: all });
      const config = await json(join(root, 'config.json')); config.language = 'en-US';
      await put(join(root, 'config.json'), config);
      const change = '2026-10-06-fixture-upgrade';
      const status = await json(join(baseline, 'template/workflows/specdev/I-init-setup/change-status-template.json'));
      Object.assign(status, { change, current_work: 'specdev/orchestrate-implementation', created_at: '2026-10-06T00:00:00Z', updated_at: '2026-10-06T00:00:00Z' });
      Object.assign(status.leadership, { current: 'fixture-owner', assigned_at: '2026-10-06T00:00:00Z' });
      const global = await json(join(state, 'specdev/status.json')); global.active.push({ change });
      await put(join(state, 'specdev/status.json'), global);
      const owned = {
        [`specdev/changes/${change}/.status.json`]: status,
        [`specdev/changes/${change}/CONTEXT.md`]: '# Fixture terminology\n\nDo not rename.\n',
        [`specdev/changes/${change}/ticket/T-01.md`]: '---\nschema_version: 3\nstatus: draft\n---\n\nLegacy fixture; no execution claim.\n',
        [`specdev/changes/${change}/opaque.bin`]: Buffer.from([0, 255, 128, 13, 10, 1]),
        'ops/private/fixture.json': '{"secret_ref":"SYNTHETIC-TEST-ONLY"}\n',
        'ops/records/tasks/fixture/started.json': '{"fixture":"started-only; never replay"}\n',
        'learning/fixture-answers.md': '# Synthetic original answer\r\nKeep bytes.  \r\n',
        'person/fixture-evidence.bin': Buffer.from([255, 0, 10, 13]),
      };
      for (const [path, data] of Object.entries(owned)) await put(join(state, path), data);
      const expected = Object.fromEntries(await Promise.all(Object.keys(owned).map(async (path) => [path, { hash: digest(await readFile(join(state, path))), mode: (await lstat(join(state, path))).mode & 0o777 }])));
      const check = async (phase) => {
        for (const [path, record] of Object.entries(expected)) {
          assert.equal(digest(await readFile(join(state, path))), record.hash, `${phase}: ${path}`);
          if (process.platform !== 'win32') assert.equal((await lstat(join(state, path))).mode & 0o777, record.mode, `${phase}: mode ${path}`);
        }
        assert.equal((await json(join(root, 'config.json'))).language, 'en-US');
        assert.equal((await json(join(state, 'specdev/status.json'))).active[0].change, change);
        assert.equal(await resolvePathReference(target, '<Path>{roots.state}/specdev/status.json</Path>'), join(state, 'specdev/status.json'));
        assert.equal(await readFile(join(target, '.speculo/unrelated.txt'), 'utf8'), 'unrelated state root: preserve\n');
        assert.equal((await doctorSpeculo(target)).healthy, true);
      };
      // Refresh only SpecDev, deliberately leaving other installed workflows at
      // baseline; this is a supported mixed managed-asset installation.
      await initSpeculo(target, { packageRoot: candidate, selection: { workflowIds: ['specdev'] } });
      await check('mixed-refresh');
      assert.equal(await readFile(join(root, 'workflows/ops/README.md'), 'utf8'), await readFile(join(baseline, 'template/workflows/ops/README.md'), 'utf8'));
      await initSpeculo(target, { packageRoot: candidate, selection: all });
      await check('candidate-refresh');
      const before = await fingerprintTree(root);
      await mkdir(join(target, '.speculo-init.lock'));
      await assert.rejects(initSpeculo(target, { packageRoot: candidate, selection: all }), (error) => error.blockers?.some((blocker) => blocker.code === 'refresh-locked'));
      assert.equal(await fingerprintTree(root), before);
      await rm(join(target, '.speculo-init.lock'), { recursive: true }); // owned test fixture only
      const statePath = join(state, 'specdev/status.json'), validState = await readFile(statePath);
      await put(statePath, { schema_version: 999, workflow: 'specdev', active: [], archived: [] });
      const invalidTree = await fingerprintTree(root);
      await assert.rejects(initSpeculo(target, { packageRoot: candidate, selection: all }));
      assert.equal(await fingerprintTree(root), invalidTree, 'unknown schema must preserve previous installation');
      await put(statePath, validState);
      await initSpeculo(target, { packageRoot: baseline, selection: all });
      await check('static-rollback');
      assert.equal(await readFile(join(root, 'workflows/ops/README.md'), 'utf8'), await readFile(join(baseline, 'template/workflows/ops/README.md'), 'utf8'));
      assert.deepEqual((await readdir(target)).filter((name) => name.startsWith('.speculo-init-')), []);
      outcomes.push({ layout, status: 'passed', preserved_files: Object.keys(owned).length, phases: ['mixed-refresh', 'candidate-refresh', 'lock-refusal', 'unknown-schema-refusal', 'static-rollback'] });
    } finally { await rm(fixture, { recursive: true, force: true }); }
  }
  return { scope: 'disposable local refresh fixtures; no target deployment or Agent behavior certification', platform: process.platform, node: process.version, outcomes };
}
try {
  if (process.argv.length !== 4 || process.argv[2] !== '--baseline-checkout') throw new Error('usage: node scripts/verify-work-upgrade-compatibility.mjs --baseline-checkout PATH_TO_PINNED_BASELINE');
  console.log(JSON.stringify(await run(resolve(process.argv[3])), null, 2));
} catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
