import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const methodRoot = resolve('template');
const validator = join(methodRoot, 'workflows/specdev/common/tools/validate-specdev.mjs');
const name = '2026-10-14-root-closure';

function fixture(t: { after(fn: () => void): void }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'specdev-root-closure-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

// Observe the whole input, including directories, Git metadata and nonstandard modes.
function snapshot(root: string) {
  const entries: { path: string; mode: number; kind: string; content?: string }[] = [];
  function visit(path: string) {
    const stat = lstatSync(path);
    const entry = { path: relative(root, path), mode: stat.mode & 0o7777 };
    if (stat.isDirectory()) {
      entries.push({ ...entry, kind: 'directory' });
      for (const child of readdirSync(path).sort()) visit(join(path, child));
    } else if (stat.isSymbolicLink()) entries.push({ ...entry, kind: 'symlink', content: readlinkSync(path) });
    else entries.push({ ...entry, kind: 'file', content: createHash('sha256').update(readFileSync(path)).digest('hex') });
  }
  visit(root);
  return entries;
}

function ownership(owner: string) {
  return `## Ownership\nOwner: ${owner}\nEvidence: #handoff\n\n<a id="handoff"></a>\n## Original session\nSession: ${owner}\nSource: isolated fixture assignment\nObserved: original owner continues this task\n`;
}

function writeChange(project: string, owner = 'fixture-owner') {
  const change = join(project, 'facts/specdev/changes', name);
  mkdirSync(change, { recursive: true });
  writeFileSync(join(change, 'README.md'), `# Direct scoped request\nOutcome: active\n\n${ownership(owner)}\n<a id="scope"></a>\n## Scope\nExpose the current package value.\n\n<a id="acceptance"></a>\n## Acceptance\n- AC-1: the response equals the package value.\n\n## Current Work\n- [ ] Implement the accepted response.\n\n<a id="verification"></a>\n## Verification\nImplementation and actual verification remain pending.\n\n## Next Steps\nImplement the response and verify AC-1.\n`);
  chmodSync(join(change, 'README.md'), 0o640);
  return change;
}

function consume(cwd: string, change: string, project: string, stage = 'spec', state = 'facts') {
  return spawnSync(process.execPath, [validator, '--repo', project, '--method-root', methodRoot, '--state-root', state, '--stage', stage, change], { cwd, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
}

test('archive-ready rejects a cancelled Ticket while its owning change remains active without changing any input', t => {
  const project = fixture(t), change = writeChange(project);
  mkdirSync(join(change, 'ticket'));
  writeFileSync(join(change, 'ticket/T-01.md'), '---\nid: T-01\nstatus: cancelled\n---\n# Optional task\nOnly this Ticket was cancelled; the original change remains active.\n');
  chmodSync(join(change, 'ticket/T-01.md'), 0o600);
  const before = snapshot(project);
  const result = consume(project, change, project, 'archive-ready');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /change is still active/);
  assert.deepEqual(snapshot(project), before);
});

test('unsupported archived authority cannot become a whole-change cancellation or gain an archive receipt', t => {
  const project = fixture(t), change = join(project, 'facts/specdev/changes/archive', name);
  mkdirSync(join(change, 'evidence'), { recursive: true });
  writeFileSync(join(change, '.status.json'), '{"change_status":"archived","historical":"unsupported authority"}\r\n');
  writeFileSync(join(change, 'README.md'), '# Historical record\nAn optional Ticket was cancelled. No whole-change cancellation was requested.\n');
  writeFileSync(join(change, 'evidence/original.txt'), 'Original historical evidence\r\n');
  chmodSync(join(change, '.status.json'), 0o640);
  chmodSync(join(change, 'evidence/original.txt'), 0o600);
  const before = snapshot(project);
  const historical = consume(project, change, project, 'archived');
  assert.equal(historical.status, 1, historical.stdout + historical.stderr);
  assert.match(historical.stderr, /mixed-protocol/);
  assert.deepEqual(snapshot(project), before);
  const cancellation = consume(project, change, project, 'archive-ready');
  assert.equal(cancellation.status, 1, cancellation.stdout + cancellation.stderr);
  assert.match(cancellation.stderr, /mixed-protocol/);
  assert.deepEqual(snapshot(project), before);
  assert.equal(existsSync(join(change, 'archive-receipt.md')), false);
});

test('direct Work from monorepo subdirectories respects explicit roots across real linked worktrees without writing either tree', t => {
  const sandbox = fixture(t), main = join(sandbox, 'main'), linked = join(sandbox, 'linked');
  mkdirSync(join(main, 'packages/api'), { recursive: true });
  mkdirSync(join(main, 'packages/web'), { recursive: true });
  writeFileSync(join(main, 'packages/api/value.txt'), 'api\n');
  writeFileSync(join(main, 'packages/web/value.txt'), 'web\n');
  function git(args: string[]) {
    const result = spawnSync('git', args, { cwd: main, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  git(['init', '-b', 'main']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['add', 'packages']);
  git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture packages']);
  git(['worktree', 'add', '-b', 'fixture-linked', linked]);
  assert.equal(lstatSync(join(linked, '.git')).isFile(), true);
  const mainChange = writeChange(main, 'main-owner'), linkedChange = writeChange(linked, 'linked-owner');
  assert.equal(existsSync(join(main, '.agents')), false);
  assert.equal(existsSync(join(linked, '.agents')), false);
  const before = snapshot(sandbox);
  for (const [project, change] of [[main, mainChange], [linked, linkedChange]]) {
    const cwd = join(project, 'packages/api');
    const valid = consume(cwd, relative(cwd, change), '../..');
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    assert.deepEqual(snapshot(sandbox), before);
  }
  const cwd = join(linked, 'packages/api');
  for (const invoke of [
    () => consume(cwd, linkedChange, main),
    () => consume(cwd, mainChange, linked),
    () => consume(cwd, linkedChange, linked, 'spec', join(main, 'facts')),
    () => consume(cwd, linkedChange, cwd),
  ]) {
    const result = invoke();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /path-unsafe|identity-conflict|outside the declared state root/);
    assert.deepEqual(snapshot(sandbox), before);
  }
});
