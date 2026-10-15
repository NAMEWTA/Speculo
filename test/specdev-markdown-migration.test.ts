import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, cp, chmod, symlink, lstat, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { initSpeculo } from '../src/index.js';
import { validateStructuredRuntime } from '../src/structured.js';
import { pathExists } from '../src/utils.js';
import { writeDesignFixture, designValidator, designTools } from './helpers/design-fixture.js';
import { attachReviewFixture } from './helpers/review-fixture.js';
const repository = process.cwd(), name = '2026-10-14-conversion';
const tools = () => import(pathToFileURL(join(repository, 'scripts/migrate-specdev-markdown.mjs')).href);
async function fixture(installed = false) {
  const projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'speculo-md-convert-')));
  if (installed) await initSpeculo(projectRoot, { packageRoot: repository, selection: { workflowIds: ['specdev', 'learning', 'ops', 'person', 'media'] } });
  const stateRoot = installed ? join(projectRoot, '.agents/speculo/.speculo') : join(projectRoot, 'data');
  const specdevRoot = join(stateRoot, 'specdev'), change = join(specdevRoot, 'changes', name);
  await mkdir(change, { recursive: true });
  const status = JSON.parse(await readFile(join(repository, 'test/fixtures/specdev-legacy-change-v6.json'), 'utf8'));
  Object.assign(status, { change: name, created_at: '2026-10-14T00:00:00Z', updated_at: '2026-10-14T00:00:00Z', blockers: ['Still requires tests'], deviations: ['Preserve unknown result'] });
  status.leadership = { current: 'session:original', epoch: 1, assigned_at: '2026-10-14T00:00:00Z', history: [] };
  await writeFile(join(change, '.status.json'), JSON.stringify(status, null, 3) + '\r\n');
  await writeFile(join(specdevRoot, 'status.json'), JSON.stringify({ schema_version: 5, workflow: 'specdev', active: [{ change: name }], archived: [] }));
  await writeFile(join(change, 'README.md'), '# Existing context\n\nThis exact paragraph stays.\n');
  await writeFile(join(change, 'unknown.bin'), Buffer.from([0, 255, 6, 0])); await chmod(join(change, 'unknown.bin'), 0o640);
  await mkdir(join(specdevRoot, 'archive/2026-09/2026-09-10-history'), { recursive: true });
  await writeFile(join(specdevRoot, 'archive/2026-09/2026-09-10-history/.status.json'), '{"old":"frozen arbitrary bytes"}\r\n');
  const endedPid = Number(execFileSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }));
  await writeFile(join(projectRoot, 'handoff.md'), `Host: ${hostname()}\nPIDs: ${endedPid}\nWriters: stopped\nObserved: fixture child process exited synchronously; all fixture writers inventoried.\n`);
  await writeFile(join(projectRoot, 'approval.md'), 'No plan approved yet.');
  const input = { projectRoot, stateRoot, sourceVersion: 'fixture-old-tool-v6', owner: 'maintainer:fixture', id: 'fixture-conversion' };
  const options = { owner: input.owner, apply: true, backupRoot: join(projectRoot, 'conversion-backup'), writerPids: [endedPid], writerHost: hostname(), handoffSource: 'handoff.md', approvalSource: 'approval.md' };
  return { ...input, options, change, specdevRoot, status };
}
async function approve(plan: any, f: Awaited<ReturnType<typeof fixture>>) {
  const { conversionPlanDigest } = await tools();
  await writeFile(join(f.projectRoot, 'approval.md'), `# Synthetic fixture approval, not real user authority\nPlan: ${plan.id}\nOwner: ${plan.owner}\nInput-SHA256: ${plan.inputSha256}\nPlan-SHA256: ${conversionPlanDigest(plan)}\n`);
}

async function addPlannedWorkspace(f: Awaited<ReturnType<typeof fixture>>) {
  const git = (args: string[]) => execFileSync('git', ['-C', f.projectRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-b', 'main']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'disposable conversion fixture']);
  f.status.worktrees = [{
    ticket_id: 'T-01', owner: 'session:original', implementation_owner: 'session:original', integration_owner: 'session:original',
    provider: 'git', base_sha: git(['rev-parse', 'HEAD']), parent_branch: 'main', branch: 'main', workspace_ref: 'current',
    source_checkpoint: null, status: 'planned', updated_at: '2026-10-14T00:00:00Z',
    integration: {
      status: 'pending', parent_ref: null, parent_before_sha: null, source_sha: null, candidate_sha: null,
      candidate_tree_sha: null, candidate_branch: null, candidate_workspace_ref: null, result_sha: null, method: null,
      conflict_paths: [], verification: 'pending', full_suite: { required: true, status: 'pending', reason: null, evidence: null },
      e2e: { required: false, status: 'not-required', reason: 'Not scheduled in this fixture', evidence: null },
      evidence: `<Path>{roots.state}/specdev/changes/${name}/evidence/T-01.md</Path>`, attempts: 0, promotion_status: 'pending',
    },
  }];
  await writeFile(join(f.change, '.status.json'), JSON.stringify(f.status));
  await mkdir(join(f.change, 'evidence'));
}

test('conversion plan rejects malformed UTF-8 in rewritten Markdown without changing any source', async t => {
  for (const locator of ['README.md', 'evidence/T-01.md']) {
    await t.test(locator, async () => {
      const f = await fixture();
      try {
        if (locator.startsWith('evidence/')) await addPlannedWorkspace(f);
        const target = join(f.change, locator), { inventory, planConversion } = await tools();
        for (const malformed of [Buffer.from([0xe9]), Buffer.from([0xf0, 0x9f]), Buffer.from([0xc0, 0xaf])]) {
          await writeFile(target, Buffer.concat([Buffer.from('# Original context\r\n'), malformed, Buffer.from('\r\n')]));
          const before = await inventory(f.projectRoot);
          await assert.rejects(planConversion(f), (error: Error) => {
            assert.match(error.message, /invalid UTF-8/); assert.ok(error.message.includes(target), error.message); return true;
          });
          assert.deepEqual(await inventory(f.projectRoot), before);
          assert.equal(await pathExists(f.options.backupRoot), false);
          assert.equal(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')), false);
        }
      } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
    });
  }
});

test('conversion preserves Unicode, BOM, CRLF and Markdown modes through apply and resume', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture();
  try {
    await addPlannedWorkspace(f);
    const originals = [
      { path: 'README.md', mode: 0o640, bytes: Buffer.from('\ufeff# 原有上下文\r\n\r\nCafé / café / e\u0301 / 🧭 / � 均为原文。\r\n') },
      { path: 'evidence/T-01.md', mode: 0o600, bytes: Buffer.from('\ufeff# 原有证据\r\n\r\n观察记录：完整保留 Unicode 与换行。\r\n') },
    ];
    for (const original of originals) { await writeFile(join(f.change, original.path), original.bytes); await chmod(join(f.change, original.path), original.mode); }
    const { inventory, planConversion, applyConversion } = await tools(), before = await inventory(f.projectRoot), plan = await planConversion(f);
    assert.deepEqual(await inventory(f.projectRoot), before);
    for (const original of originals) {
      const action = plan.actions.find((action: any) => action.path === `changes/${name}/${original.path}`);
      assert.deepEqual(Buffer.from(action.content, 'base64').subarray(0, original.bytes.length), original.bytes);
      assert.equal(action.mode, original.mode);
    }
    await approve(plan, f);
    const readmeAction = plan.actions.findIndex((action: any) => action.path === `changes/${name}/README.md`);
    await assert.rejects(applyConversion(plan, { ...f.options, hook: (point: string) => { if (point === `action:${readmeAction}`) throw Error('fixture Markdown write interrupted'); } }), /fixture Markdown write interrupted/);
    assert.ok(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')));
    assert.equal((await applyConversion(plan, f.options)).state, 'completed');
    for (const original of originals) {
      assert.deepEqual((await readFile(join(f.change, original.path))).subarray(0, original.bytes.length), original.bytes);
      assert.equal((await lstat(join(f.change, original.path))).mode & 0o7777, original.mode);
      assert.deepEqual(await readFile(join(f.options.backupRoot, f.id, 'before/changes', name, original.path)), original.bytes);
    }
    assert.equal((await applyConversion(plan, f.options)).state, 'completed');
    assert.equal(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')), false);
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('conversion plan is read-only; apply preserves originals, modes, links, history and owner facts', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture();
  try {
    await symlink('unknown.bin', join(f.change, 'local-link'));
    const { inventory, planConversion, applyConversion } = await tools(), before = await inventory(f.projectRoot), original = await readFile(join(f.change, '.status.json'));
    const plan = await planConversion(f); assert.deepEqual(await inventory(f.projectRoot), before);
    await approve(plan, f);
    const receipt = await applyConversion(plan, f.options); assert.equal(receipt.state, 'completed');
    assert.equal(await pathExists(join(f.specdevRoot, 'status.json')), false); assert.equal(await pathExists(join(f.change, '.status.json')), false);
    assert.equal(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')), false);
    assert.deepEqual(await readFile(join(f.change, 'conversion/fixture-conversion-status.original.json')), original);
    assert.match(await readFile(join(f.change, 'README.md'), 'utf8'), /This exact paragraph stays\.[\s\S]*Outcome: active[\s\S]*Owner: session:original/);
    assert.match(await readFile(join(f.change, 'conversion/fixture-conversion-facts.md'), 'utf8'), /Still requires tests/);
    assert.equal((await lstat(join(f.change, 'unknown.bin'))).mode & 0o777, 0o640); assert.ok((await lstat(join(f.change, 'local-link'))).isSymbolicLink());
    assert.equal(await readFile(join(f.specdevRoot, 'archive/2026-09/2026-09-10-history/.status.json'), 'utf8'), '{"old":"frozen arbitrary bytes"}\r\n');
    assert.equal((await applyConversion(plan, f.options)).state, 'completed');
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('conversion rejects live writers, unknown schema/fields, partial scope, input drift and existing backup', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture();
  try {
    const { inventory, planConversion, applyConversion } = await tools(), before = await inventory(f.specdevRoot), plan = await planConversion(f);
    await assert.rejects(applyConversion(plan, f.options), /approval evidence must bind/);
    await approve(plan, f);
    await assert.rejects(applyConversion(plan, { ...f.options, writerPids: [process.pid] }), /demonstrably exited/);
    assert.deepEqual(await inventory(f.specdevRoot), before);
    await writeFile(join(f.change, '.status.json'), JSON.stringify({ ...f.status, unknown_fact: 'never discard' }));
    await assert.rejects(planConversion(f), /unknown fields/);
    await writeFile(join(f.change, '.status.json'), JSON.stringify({ ...f.status, schema_version: 99 })); await assert.rejects(planConversion(f), /unknown fields/);
    await writeFile(join(f.change, '.status.json'), JSON.stringify(f.status));
    await mkdir(join(f.specdevRoot, 'changes/2026-10-14-unindexed')); await assert.rejects(planConversion(f), /every active/); await rm(join(f.specdevRoot, 'changes/2026-10-14-unindexed'), { recursive: true });
    await assert.rejects(applyConversion(plan, f.options), /drift/);
    const fresh = await planConversion(f); await approve(fresh, f); await mkdir(join(f.options.backupRoot, f.id)); await assert.rejects(applyConversion(fresh, f.options), /destination exists/);
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('conversion interruption at each mutation resumes the exact original operation', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  for (const point of ['pending-created', 'action:0', 'action:1', 'action:2', 'action:3', 'action:4', 'action:5', 'validated']) {
    const f = await fixture();
    try {
      const { planConversion, applyConversion } = await tools(), plan = await planConversion(f);
      await approve(plan, f);
      await assert.rejects(applyConversion(plan, { ...f.options, hook: (p: string) => { if (p === point) throw Error('fixture crash'); } }), /fixture crash/);
      assert.ok(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')));
      assert.equal((await applyConversion(plan, f.options)).state, 'completed', point);
      assert.equal(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')), false);
    } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
  }
});

test('legacy completed requires actual completed acceptance, never only the old enum', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture();
  try {
    const { inventory, planConversion, applyConversion } = await tools();
    f.status.change_status = 'completed'; f.status.completed_at = '2026-10-14T01:00:00Z'; f.status.blockers = [];
    await writeFile(join(f.change, '.status.json'), JSON.stringify(f.status));
    const before = await inventory(f.specdevRoot), invalid = await planConversion(f);
    await approve(invalid, f);
    await assert.rejects(applyConversion(invalid, f.options), /completion evidence|acceptance|scope|stage/);
    assert.deepEqual(await inventory(f.specdevRoot), before);
    await writeFile(join(f.change, 'README.md'), '# Completed work\n\n<a id="scope"></a>\n## Scope\nOne verified behavior.\n\n<a id="acceptance"></a>\n## Acceptance\n- [x] AC-1: Result is observable.\n\n<a id="verification"></a>\n## Verification\n| AC | Result | Evidence |\n|---|---|---|\n| AC-1 | passed | verification.md |\n\n## Next Steps\nHand over to the authorized archive owner.\n');
    await writeFile(join(f.change, 'verification.md'), '# Observed verification\n\nMethod: isolated fixture\nSource: user:fixture-request\nObserved: expected behavior returned exact result\nResult: passed\n');
    attachReviewFixture(f.projectRoot,f.change);
    const plan = await planConversion({ ...f, id: 'completed-verified' });
    await approve(plan, f);
    assert.equal((await applyConversion(plan, f.options)).state, 'completed');
    assert.match(await readFile(join(f.change, 'README.md'), 'utf8'), /^Outcome: completed$/m);
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('partial conversion rolls back exact source; backup damage and new business writes prevent recovery', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture();
  try {
    const { inventory, planConversion, applyConversion, recoverConversion } = await tools(), before = await inventory(f.specdevRoot), plan = await planConversion(f);
    await approve(plan, f);
    await assert.rejects(applyConversion(plan, { ...f.options, hook: (p: string) => { if (p === 'action:4') throw Error('fixture crash'); } }), /fixture crash/);
    await writeFile(join(f.change, 'new-business.md'), 'new writer facts');
    await assert.rejects(recoverConversion(plan, { ...f.options, mode: 'rollback' }), /prohibit rollback/); await rm(join(f.change, 'new-business.md'));
    const backupFile = join(f.options.backupRoot, f.id, 'before/changes', name, 'unknown.bin'), bytes = await readFile(backupFile);
    await writeFile(backupFile, 'corrupted'); await assert.rejects(applyConversion(plan, f.options), /backup corrupt/); await writeFile(backupFile, bytes);
    assert.equal((await recoverConversion(plan, { ...f.options, mode: 'rollback' })).state, 'rolled-back'); assert.deepEqual(await inventory(f.specdevRoot), before);
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('a genuinely killed conversion process resumes only its original pending operation', { skip: process.platform === 'win32' }, async () => {
  const f = await fixture();
  try {
    const { planConversion, applyConversion } = await tools(), plan = await planConversion(f);
    await approve(plan, f);
    const program = `import {applyConversion} from ${JSON.stringify(pathToFileURL(join(repository, 'scripts/migrate-specdev-markdown.mjs')).href)}; await applyConversion(${JSON.stringify(plan)}, {...${JSON.stringify(f.options)}, hook:point=>{if(point==='action:4')process.kill(process.pid,'SIGKILL')}});`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', program], { encoding: 'utf8', timeout: 30000 });
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    assert.ok(await pathExists(join(f.options.backupRoot, f.id, 'process.lock')));
    assert.equal((await applyConversion(plan, f.options)).state, 'completed');
    assert.equal(await pathExists(join(f.options.backupRoot, f.id, 'process.lock')), false);
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('rollback can itself resume after each restored file or removed directory', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  for (let step = 0; step < 8; step++) {
    const f = await fixture();
    try {
      const { inventory, planConversion, applyConversion, recoverConversion } = await tools(), plan = await planConversion(f), before = await inventory(f.specdevRoot);
      await approve(plan, f);
      await assert.rejects(applyConversion(plan, { ...f.options, hook: (p: string) => { if (p === 'action:5') throw Error('fixture crash'); } }), /fixture crash/);
      await assert.rejects(recoverConversion(plan, { ...f.options, mode: 'rollback', hook: (p: string) => { if (p === `rollback:${step}`) throw Error('rollback crash'); } }), /rollback crash/);
      assert.equal((await recoverConversion(plan, { ...f.options, mode: 'rollback' })).state, 'rolled-back');
      assert.deepEqual(await inventory(f.specdevRoot), before);
      assert.equal((await recoverConversion(plan, { ...f.options, mode: 'rollback' })).state, 'rolled-back');
    } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
  }
});

test('resume preserves pending when original approval or installation identity changes', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture();
  try {
    const { planConversion, applyConversion } = await tools(), plan = await planConversion(f); await approve(plan, f);
    await assert.rejects(applyConversion(plan, { ...f.options, hook: (p: string) => { if (p === 'pending-created') throw Error('fixture crash'); } }), /fixture crash/);
    const original = await readFile(join(f.projectRoot, 'approval.md')); await writeFile(join(f.projectRoot, 'approval.md'), Buffer.concat([original, Buffer.from('Changed source text\n')]));
    await assert.rejects(applyConversion(plan, f.options), /approval or writer handoff evidence drift/); await writeFile(join(f.projectRoot, 'approval.md'), original);
    await mkdir(join(f.projectRoot, '.agents/speculo/.speculo'), { recursive: true }); await writeFile(join(f.projectRoot, '.agents/speculo/.speculo/workspace.json'), '{"new":"installation"}');
    await assert.rejects(applyConversion(plan, f.options), /installation identity changed/);
    assert.ok(await pathExists(join(f.specdevRoot, '.markdown-conversion-pending')));
    await rm(join(f.projectRoot, '.agents'), { recursive: true });
    assert.equal((await applyConversion(plan, f.options)).state, 'completed');
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('installation rejects legacy active/pending and validates README without global status', { skip: process.platform === 'win32' ? 'conversion requires proven POSIX mode/link fidelity; Windows is plan-only' : false }, async () => {
  const f = await fixture(true);
  try {
    const { planConversion, applyConversion, inventory } = await tools();
    const prototype = await writeDesignFixture(f.change);
    const legacyName = '2026-09-11-legacy-design', legacyRoot = join(f.specdevRoot, 'archive/2026-09', legacyName);
    await mkdir(legacyRoot, { recursive: true });
    await writeFile(join(legacyRoot, '.status.json'), JSON.stringify({ ...f.status, change: legacyName, change_status: 'archived', archived: true, archive_path: `<Path>{roots.state}/specdev/archive/2026-09/${legacyName}</Path>` }));
    const legacyPrototype = await writeDesignFixture(legacyRoot), legacyBefore = await inventory(legacyRoot);
    for (const domain of ['docs', 'learning', 'ops', 'person', 'media']) {
      await mkdir(join(f.stateRoot, domain), { recursive: true });
      await writeFile(join(f.stateRoot, domain, 'user-owned.bin'), Buffer.from([0, 255, 42, 0]));
    }
    await mkdir(join(f.specdevRoot, 'research'), { recursive: true }); await writeFile(join(f.specdevRoot, 'research/unowned.md'), '# Research\nDo not change this provenance.\n');
    const designBefore = await inventory(join(f.specdevRoot, 'design')), prototypeBefore = await inventory(join(f.change, 'prototypes'));
    const approvalBefore = await readFile(join(f.change, 'LOG.md')), changeDesignBefore = await readFile(join(f.change, 'DESIGN.md'));
    const before = await inventory(join(f.projectRoot, '.agents/speculo'));
    await assert.rejects(initSpeculo(f.projectRoot, { packageRoot: repository, selection: { workflowIds: ['specdev'] } }), /blocked/); assert.deepEqual(await inventory(join(f.projectRoot, '.agents/speculo')), before);
    const plan = await planConversion(f); await approve(plan, f); await applyConversion(plan, f.options);
    const other = await Promise.all(['docs', 'learning', 'ops', 'person', 'media'].map(domain => inventory(join(f.stateRoot, domain)))), original = await inventory(f.specdevRoot);
    await writeFile(join(f.specdevRoot, '.markdown-conversion-pending'), '{"unknown":"owner"}');
    await assert.rejects(initSpeculo(f.projectRoot, { packageRoot: repository, selection: { workflowIds: ['learning'] } }), /blocked/);
    await rm(join(f.specdevRoot, '.markdown-conversion-pending'));
    for (let i = 0; i < 2; i++) {
      await initSpeculo(f.projectRoot, { packageRoot: repository, selection: { workflowIds: ['specdev', 'learning', 'ops', 'person', 'media'] } });
      assert.deepEqual(await inventory(f.specdevRoot), original); assert.deepEqual(await Promise.all(['docs', 'learning', 'ops', 'person', 'media'].map(domain => inventory(join(f.stateRoot, domain)))), other);
      assert.deepEqual(await inventory(join(f.specdevRoot, 'design')), designBefore); assert.deepEqual(await inventory(join(f.change, 'prototypes')), prototypeBefore);
      assert.deepEqual(await readFile(join(f.change, 'LOG.md')), approvalBefore); assert.deepEqual(await readFile(join(f.change, 'DESIGN.md')), changeDesignBefore);
      await (await designValidator()).validate(prototype); await (await designTools()).validateChangeDesign(join(f.change, 'DESIGN.md'));
      assert.deepEqual(await inventory(legacyRoot), legacyBefore); await (await designValidator()).validate(legacyPrototype); await (await designTools()).validateChangeDesign(join(legacyRoot, 'DESIGN.md'));
    }
    await writeFile(join(f.change, 'README.md'), '# Invalid\n'); await assert.rejects(validateStructuredRuntime(join(f.projectRoot, '.agents/speculo'), ['specdev']), /Outcome/);
  } finally { await rm(f.projectRoot, { recursive: true, force: true }); }
});

test('SpecDev seed is optional while other required seeds and malformed declarations fail closed', async () => {
  const project = await mkdtemp(join(tmpdir(), 'speculo-optional-seed-')), pkg = await mkdtemp(join(tmpdir(), 'speculo-seed-package-'));
  try {
    await initSpeculo(project, { packageRoot: repository, selection: { workflowIds: ['specdev'] } });
    assert.equal(await pathExists(join(project, '.agents/speculo/.speculo/specdev')), false);
    await cp(join(repository, 'template'), join(pkg, 'template'), { recursive: true }); await cp(join(repository, 'package.json'), join(pkg, 'package.json'));
    await rm(join(pkg, 'template/workflows/person/_state'), { recursive: true, force: true });
    await assert.rejects(initSpeculo(project, { packageRoot: pkg, selection: { workflowIds: ['person'] } }), /missing required _state/);
    const contractPath = join(pkg, 'template/workflows/specdev/runtime-contract.json'), contract = JSON.parse(await readFile(contractPath, 'utf8'));
    await writeFile(contractPath, JSON.stringify({ ...contract, state_seed: 'sometimes' })); await assert.rejects(initSpeculo(project, { packageRoot: pkg, selection: { workflowIds: ['specdev'] } }), /state_seed/);
  } finally { await rm(project, { recursive: true, force: true }); await rm(pkg, { recursive: true, force: true }); }
});
