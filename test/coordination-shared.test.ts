import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, type TestContext } from 'node:test';
import { initSpeculo } from '../src/index.js';
import { readProjectCoordination } from '../src/coordination.js';
import { doctorSpeculo } from '../src/doctor.js';
import { readAssetCatalog } from '../src/assets.js';
import { fingerprintTree } from '../src/manifest.js';

const source = join(process.cwd(), 'template');
const relativeScript = 'references/coordination/scripts/validate-dispatch.mjs';
const dispatch = await import(pathToFileURL(join(source, relativeScript)).href);
const session = '20261018T080000Z';
const task = '001-plan';
const taskText = (kind = 'planning', id = task) => `---
schema_version: 2
session: ${session}
task: ${id}
kind: ${kind}
---
# Task
## Goal
Lead assigns this task to a worker; deliver the requested artifact.
## Inputs
Read the actual selected Skill and the preceding task's REPORT, if any.
## Workspace and Scope
Use the fixture root. Only the assigned output and REPORT are writable.
## Acceptance
Lead checks the requested artifact. Business state uses its original owner.
## Return
Write REPORT.md in this task directory and notify the actual tool channel.
`;
const reportText = (id = task, status = 'completed') => `# Result
Session: ${session}
Task: ${id}
Status: ${status}
## 聚焦交接
The assigned artifact is returned for Lead verification.
## 产物与验证
Fixture only; no external tool, model or business gate was executed.
## 问题与下一步
Lead verifies the actual artifact and coordinates its original owner.
`;
async function fixture(t: TestContext, scopeRoot = 'data/coordination') {
  const projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'speculo-shared-dispatch-')));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  const dir = join(projectRoot, scopeRoot, 'sessions', session, task);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'TASK.md'), taskText());
  const input = { projectRoot, scopeRoot, session, task, stage: 'dispatch' };
  return { projectRoot, dir, input, check: (extra = {}) => dispatch.validateDispatch({ ...input, ...extra }) };
}

test('shared v2 accepts arbitrary purposes and explicit roots without a workflow or change', async t => {
  for (const scope of ['data/coordination', 'data/learning/changes/2026-10-18-explanation']) {
    const f = await fixture(t, scope);
    for (const kind of ['planning', 'tickets', 'explanation', 'review', 'handoff', '课程总结']) {
      await writeFile(join(f.dir, 'TASK.md'), taskText(kind));
      const before = await fingerprintTree(f.projectRoot);
      assert.deepEqual(f.check().errors, []);
      assert.equal(await fingerprintTree(f.projectRoot), before);
    }
    await writeFile(join(f.dir, 'REPORT.md'), reportText());
    assert.deepEqual(f.check({ stage: 'return' }).errors, []);
    assert.match(f.check().errors.join(), /already delivered/);
    for (const status of ['blocked', 'failed', 'cancelled']) {
      await writeFile(join(f.dir, 'REPORT.md'), reportText(task, status));
      assert.deepEqual(f.check({ stage: 'return' }).errors, []);
    }
  }
});

test('a cross-workflow fixture chain keeps one global session and independent task identities', async t => {
  const f = await fixture(t);
  const stages = [
    ['001-plan', 'planning', 'Codex / user-selected model', 'requested planning inputs'],
    ['002-tickets', 'tickets', 'Grok / user-selected model', '../001-plan/REPORT.md'],
    ['003-explain', 'explanation', 'user-selected model / Learning Skill', '../002-tickets/REPORT.md'],
    ['004-review', 'review', 'PI / user-selected model', '../003-explain/REPORT.md'],
  ];
  for (const [id, kind, executor, previous] of stages) {
    const dir = join(f.projectRoot, f.input.scopeRoot, 'sessions', session, id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'TASK.md'), taskText(kind, id).replace('Read the actual selected Skill and the preceding task\'s REPORT, if any.', `Executor: ${executor}. Input: ${previous}.`));
    assert.deepEqual(f.check({ task: id }).errors, []);
    await writeFile(join(dir, 'REPORT.md'), reportText(id));
    assert.deepEqual(f.check({ task: id, stage: 'return' }).errors, []);
  }
  // These checks authenticate file structure, not the example providers or their execution.
  await assert.rejects(readFile(join(f.projectRoot, 'data/specdev/status.json')), { code: 'ENOENT' });
});

test('shared validation rejects malformed identities, versions and paths without touching evidence', async t => {
  const f = await fixture(t);
  for (const text of [
    taskText().replace('schema_version: 2', 'schema_version: 1'),
    taskText().replace('schema_version: 2', 'schema_version: 3'),
    taskText().replace('kind: planning', 'kind: planning\nkind: review'),
    taskText().replace('kind: planning', 'kind: ""'),
    taskText().replace('kind: planning', 'kind: [planning]'),
    taskText().replace('kind: planning', 'kind: planning\nauthorization: granted'),
    taskText('planning', '002-wrong'),
    taskText().replace('## Acceptance', '## Not-Acceptance'),
  ]) {
    await writeFile(join(f.dir, 'TASK.md'), text);
    const before = await fingerprintTree(f.projectRoot);
    assert.ok(f.check().errors.length, text);
    assert.equal(await fingerprintTree(f.projectRoot), before);
  }
  await writeFile(join(f.dir, 'TASK.md'), taskText());
  for (const extra of [{scopeRoot:'../escape'}, {scopeRoot:f.projectRoot}, {scopeRoot:'data/Coordination'}, {session:'20260230T080000Z'}, {task:'../task'}, {stage:'execute'}]) assert.ok(f.check(extra).errors.length);
  await symlink(join(f.projectRoot, 'data/coordination'), join(f.projectRoot, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.ok(f.check({scopeRoot:'linked'}).errors.length);
  await mkdir(join(f.dir, '..', '001-collision'));
  assert.match(f.check().errors.join(), /occupied/);
});

test('report validation cannot replay a dispatch', async t => {
  const f = await fixture(t);
  for (const report of [reportText('002-other'), reportText(task, 'idle'), reportText().replace('Status: completed', 'Status: completed\nStatus: failed')]) {
    await writeFile(join(f.dir, 'REPORT.md'), report);
    assert.ok(f.check({stage:'return'}).errors.length);
    assert.match(f.check().errors.join('\n'), /already delivered/);
  }
  await writeFile(join(f.dir, 'REPORT.md'), reportText());
  assert.deepEqual(f.check({stage:'return'}).errors, []);
});

test('task directory allows only TASK.md and, at return, REPORT.md', async t => {
  const f = await fixture(t);
  for (const name of ['session-locator.json', 'MANIFEST.json', 'packet.sha256', 'outbound.zip', 'notes.tar', 'bundle.tar.gz', 'SESSION.md', 'ACCEPTANCE.md', 'TASK.md.tmp', 'history-01.jsonl']) {
    await writeFile(join(f.dir, name), 'x\n');
    assert.match(f.check().errors.join('\n'), /task directory may contain only TASK\.md; found /, name);
    await rm(join(f.dir, name));
  }
  for (const directory of ['raw', 'extracted']) {
    await mkdir(join(f.dir, directory));
    assert.match(f.check().errors.join('\n'), new RegExp(`found ${directory}`));
    await rm(join(f.dir, directory), { recursive: true });
  }
  assert.deepEqual(f.check().errors, []);
  await writeFile(join(f.dir, 'REPORT.md'), reportText());
  assert.deepEqual(f.check({ stage: 'return' }).errors, []);
  await writeFile(join(f.dir, 'REPORT.md'), reportText().replace('Status: completed\n', 'Status: completed\nSession log: /var/log/worker.jsonl\n'));
  assert.deepEqual(f.check({ stage: 'return' }).errors, []);
  await writeFile(join(f.dir, 'REPORT.md'), reportText());
  await writeFile(join(f.dir, 'session-locator.json'), '{}\n');
  assert.match(f.check({ stage: 'return' }).errors.join('\n'), /TASK\.md and REPORT\.md; found session-locator\.json/);
});

test('dispatch and handoff specs no longer require locator, checksum, manifest or log snapshot files', async () => {
  async function filesIn(root: string): Promise<string[]> {
    const found: string[] = [];
    async function visit(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await visit(path);
        else found.push(path);
      }
    }
    await visit(root);
    return found;
  }
  const roots = [
    join(process.cwd(), 'template/references/coordination'),
    join(process.cwd(), 'template/references/handoff'),
    join(process.cwd(), 'template/commands/handoff'),
  ];
  const paths = [join(process.cwd(), 'docs/agent-handoffs.md'), ...(await Promise.all(roots.map(filesIn))).flat()];
  const forbidden = [/session-locator/, /\.sha256/i, /MANIFEST\.json/, /\.history-/, /Source SHA-256/, /SESSION\.md/, /ACCEPTANCE\.md/, /SHA-256/];
  for (const path of paths) {
    const text = await readFile(path, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, path);
  }
  const mentions = [
    'template/workflows/specdev/common/rules/path-reference-contract.md',
    'template/workflows/specdev/common/rules/workflow-state-and-lifecycle.md',
    'template/workflows/specdev/common/tools/README.md',
    'template/workflows/specdev/specdev-i-implement/assets/evidence-template.md',
  ];
  for (const relative of mentions) {
    const text = (await readFile(join(process.cwd(), relative), 'utf8')).replaceAll('owner-or-session-locator', '').replaceAll('actual-session-locator', '');
    assert.doesNotMatch(text, /session-locator/, relative);
  }
  await assert.rejects(readFile(join(process.cwd(), 'template/references/coordination/session-locator.schema.json')), { code: 'ENOENT' });
});

test('shared CLI is standalone with only core references and runtime', async t => {
  const f = await fixture(t);
  const methods = join(f.projectRoot, 'methods');
  await cp(join(source, 'references'), join(methods, 'references'), {recursive:true});
  await cp(join(source, 'lib'), join(methods, 'lib'), {recursive:true});
  const script = join(methods, relativeScript);
  const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], {encoding:'utf8'});
  const args = ['--repo', f.projectRoot, '--scope-root', f.input.scopeRoot, '--session', session, '--task', task];
  assert.equal(run('--help').status, 0);
  assert.equal(run(...args, '--stage', 'dispatch').status, 0);
  assert.equal(run(...args, '--stage', 'return').status, 1);
  for (const extra of [[], ['--stage','unknown'], ['--stage','dispatch','--scope-root','another']]) assert.equal(run(...args, ...extra).status, 2);
  await assert.rejects(readFile(join(methods, 'workflows/specdev/SKILL.md')), {code:'ENOENT'});
});

test('core, Learning and OPS installations expose common commands and preserve coordination data on refresh', async t => {
  for (const workflowIds of [[], ['learning'], ['ops']]) {
    const root = await mkdtemp(join(tmpdir(), 'speculo-shared-install-'));
    t.after(() => rm(root, {recursive:true, force:true}));
    const options = {packageRoot:process.cwd(), selection:{workflowIds}, skills:{mode:'set' as const, assetIds:['command/coordination-init','command/handoff']}};
    const installed = await initSpeculo(root, options);
    assert.deepEqual(installed.exposure.assetIds, ['command/coordination-init','command/handoff']);
    const methods = join(root, '.agents/speculo'), state = join(methods, '.speculo');
    await assert.rejects(readFile(join(methods, 'workflows/specdev/SKILL.md')), {code:'ENOENT'});
    for (const file of ['commands/coordination-init/COMMAND.md', 'references/handoff/handoff-contract.md', relativeScript]) assert.ok((await readFile(join(methods,file))).length);
    const choices = '{"schema_version":2,"defaults":{"mode":"cli","selection":"preferred","interaction":"headless","fallback":["host"]},"rules":[]}\n';
    const retained = new Map([
      ['coordination/project.json', choices],
      [`coordination/sessions/${session}/${task}/TASK.md`, taskText()],
      ['commands/handoff/2026-10-18-workspace-session.md', '# Existing session summary\nUser context preserved.\n'],
    ]);
    for (const [file, bytes] of retained) {
      await mkdir(join(state, file, '..'), {recursive:true});
      await writeFile(join(state,file), bytes);
    }
    await initSpeculo(root, options);
    for (const [file, bytes] of retained) assert.equal(await readFile(join(state,file),'utf8'), bytes);
    const catalog = await readAssetCatalog(methods);
    assert.deepEqual(await readProjectCoordination(state,catalog), JSON.parse(choices));
  }
});

test('refresh preserves v1 coordination bytes and doctor reports the unsupported configuration', async t => {
  const root = await mkdtemp(join(tmpdir(), 'speculo-old-coordination-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const options = {packageRoot:process.cwd(), selection:{workflowIds:[]}};
  await initSpeculo(root, options);
  const state = join(root, '.agents/speculo/.speculo'), file = join(state, 'coordination/project.json');
  const old = '{"schema_version":1,"defaults":{"mode":"orca","fallback":["lead"]},"rules":[]}\n';
  await mkdir(join(state, 'coordination'), {recursive:true});
  await writeFile(file, old);
  await initSpeculo(root, options);
  assert.equal(await readFile(file, 'utf8'), old);
  const doctor = await doctorSpeculo(root);
  assert.ok(doctor.checks.some(check => !check.ok && check.id === 'catalog-and-coordination' && /expected schema 2/.test(check.message)));
  assert.equal(await readFile(file, 'utf8'), old);
});

test('shared handoff is explicitly routed and domain state remains separate from its mutable summary', async () => {
  const read = (file:string) => readFile(join(source,file),'utf8');
  const command = await read('commands/handoff/COMMAND.md');
  const contract = await read('references/handoff/handoff-contract.md');
  assert.match(command, /references\}\/handoff\/handoff-contract\.md/);
  for (const rule of ['只有用户明确要求', '未归档 change', 'handoff.md', '多个 change', '无 change', '已有会话报告永不覆盖', '用户补充', '漂移', '部分失败', '推进审批或归档']) assert.ok(contract.includes(rule), rule);
  for (const workflow of ['learning','specdev','ops','person','media']) {
    const activation = await read(`workflows/${workflow}/common/rules/activation-and-memory.md`);
    assert.match(activation, /coordination\/coordination-contract\.md/);
    assert.match(activation, /handoff\/handoff-contract\.md/);
  }
  const setup = await read('workflows/specdev/specdev-i-init-setup/SKILL.md');
  assert.doesNotMatch(setup, /保存项目级偏好|Herdr \/ Orca \/ CLI/);
  const shared = await read('references/coordination/coordination-contract.md');
  assert.doesNotMatch(shared, /\{roots.workflows\}\/specdev/);
  assert.match(shared, /Worker 可直接写入/);
});
