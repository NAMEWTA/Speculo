/** Read-only admission and real-entry regressions; no network or user state. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { engineeringRecords, validateEngineeringRecord, validateEngineeringArtifacts, validateEngineeringPackage } from '../engineering-evidence.mjs';
import { resolveReviewScope } from '../review-scope.mjs';

const workflow = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const cli = join(workflow, 'common/tools/validate-specdev.mjs');
function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), 'specdev-engineering-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const fence = record => '\n```json specdev-engineering-evidence\n' + JSON.stringify(record, null, 2) + '\n```\n';
const measurement = () => ({ checkpoint: 'baseline-revision', entrypoint: 'node public-cli.mjs', environment: 'isolated test host', clock: 'process start to ready', workload: 'deterministic fixture', workload_digest: 'a'.repeat(64), unit: 'ms', direction: 'lower', cache: 'cold', excluded_costs: ['external model network'], samples: [20, 22, 21] });
const performance = () => ({ version: 1, kind: 'performance', checkpoint: 'baseline-revision', evidence: ['observed measurement output'], operation: 'open project', outcome: 'baseline', uncertainty: 'Synthetic workload; no live model latency measured.', baseline: measurement() });
const documentation = () => ({ version: 1, kind: 'documentation', checkpoint: 'documentation-revision', evidence: ['observed command output'], owner_paths: ['README owner'], outcome: 'verified', visible_behavior_changed: false, behavior_verification: 'not-applicable', claims: [{ subject: 'example runs', method: 'command', state: 'verified', evidence: ['example stdout'], command: 'node example.mjs', executed: true, exit_code: 0, output: ['actual expected output'] }] });
const incident = () => ({ version: 1, kind: 'incident', checkpoint: 'incident-revision', evidence: ['sanitized incident log'], facts: ['request timed out'], unknowns: ['remote effect unknown'], next_checks: ['read remote marker'], feedback_loop_ready: false, root_cause_confirmed: false });
function change(t) {
  const project=temporary(t), state=join(project,'.agents/speculo/.speculo');
  const root = join(state,'specdev/changes/2026-10-11-engineering');
  mkdirSync(root,{recursive:true});
  writeFileSync(join(state,'workspace.json'),readFileSync(join(workflow,'../../.speculo/workspace.json')));
  writeFileSync(join(state,'specdev/config.json'),readFileSync(join(workflow,'specdev-i-init-setup/assets/config-template.json')));
  writeFileSync(join(root, 'README.md'), '# Engineering investigation\nOutcome: active\n');
  return root;
}
function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.error, undefined);
  return { ...result, output: result.stdout + result.stderr };
}
function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000, env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' } }).trim();
}
function repository(t) {
  const root = temporary(t);
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'SpecDev fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'commit.gpgsign', 'false');
  function commit(name) {
    writeFileSync(join(root, name + '.txt'), name + '\n');
    git(root, 'add', '--', name + '.txt');
    git(root, 'commit', '-m', name);
    return git(root, 'rev-parse', 'HEAD');
  }
  return { root, a: commit('a'), b: commit('b'), c: commit('c'), commit };
}

for (const factory of [performance, documentation, incident]) {
  test(`accepts a consistent ${factory().kind} observation`, () => assert.deepEqual(validateEngineeringRecord(factory()), []));
}
for (const [name, mutate] of [
  ['unknown version', r => r.version = 2],
  ['empty evidence', r => r.evidence = []],
  ['empty samples', r => r.baseline.samples = []],
  ['string samples', r => r.baseline.samples = ['20']],
  ['negative samples', r => r.baseline.samples = [-1]],
  ['infinite samples', r => r.baseline.samples = [Infinity]],
  ['missing endpoint', r => r.baseline.entrypoint = ''],
  ['unknown cache', r => r.baseline.cache = 'automatic'],
  ['placeholder digest', r => r.baseline.workload_digest = 'replace-me'],
]) test(`performance rejects ${name}`, () => {
  const record = performance(); mutate(record);
  assert.ok(validateEngineeringRecord(record).length);
});
test('inconclusive performance can honestly record missing measurements', () => {
  const record = performance(); record.outcome = 'inconclusive'; delete record.baseline;
  assert.deepEqual(validateEngineeringRecord(record), []);
});
test('an improvement requires comparable samples and behavior verification', () => {
  const record = performance(); record.outcome = 'improved'; record.behavior_verification = 'passed';
  record.candidate = { ...measurement(), checkpoint: 'candidate-revision', samples: [10, 12, 11] };
  assert.deepEqual(validateEngineeringRecord(record), []);
  record.candidate.samples = [30, 32, 31];
  assert.match(validateEngineeringRecord(record).join('\n'), /arithmetic means/);
  record.candidate.samples = [10, 12, 11]; record.behavior_verification = 'not-run';
  assert.match(validateEngineeringRecord(record).join('\n'), /behavior verification/);
});
for (const field of ['entrypoint', 'environment', 'clock', 'workload_digest', 'unit', 'direction', 'cache', 'excluded_costs']) {
  test(`performance comparison cannot silently change ${field}`, () => {
    const r = performance(); r.outcome = 'improved'; r.behavior_verification = 'passed';
    r.candidate = { ...measurement(), checkpoint: 'candidate', samples: [1], [field]: field === 'excluded_costs' ? [] : 'different' };
    assert.match(validateEngineeringRecord(r).join('\n'), new RegExp(`comparison changes ${field}`));
  });
}
for (const [name, mutate] of [
  ['unexecuted command', r => r.claims[0].executed = false],
  ['nonzero exit', r => r.claims[0].exit_code = 1],
  ['missing output', r => r.claims[0].output = []],
  ['unverified aggregate', r => { r.claims[0].state = 'unverified'; r.claims[0].reason = 'no access'; }],
  ['visible behavior without evidence', r => r.visible_behavior_changed = true],
]) test(`documentation rejects ${name}`, () => {
  const r = documentation(); mutate(r); assert.ok(validateEngineeringRecord(r).length);
});
test('documentation permits honest partial verification', () => {
  const r = documentation(); r.outcome = 'partial'; r.claims[0].state = 'unverified'; r.claims[0].reason = 'environment unavailable';
  assert.deepEqual(validateEngineeringRecord(r), []);
});
test('incident observation cannot assert readiness or confirmed cause', () => {
  for (const field of ['feedback_loop_ready', 'root_cause_confirmed']) {
    const r = incident(); r[field] = true; assert.match(validateEngineeringRecord(r).join('\n'), /must not assert/);
  }
});
test('fence parser ignores nested examples and checks torn or malformed selected records', () => {
  assert.deepEqual(engineeringRecords('````markdown\n' + fence(performance()) + '````\n'), { records: [], errors: [] });
  assert.equal(engineeringRecords(fence(performance())).records.length, 1);
  assert.ok(engineeringRecords('```json specdev-engineering-evidence\n{\n```\n').errors.length);
  assert.ok(engineeringRecords('```json specdev-engineering-evidence\n{}').errors.length);
  assert.ok(validateEngineeringRecord(null).length);
  assert.ok(validateEngineeringRecord([]).length);
});
test('legacy unmarked reports remain unchanged and require no new record', t => {
  const root = change(t), file = join(root, 'architecture-review.md');
  writeFileSync(file, '# Historical report\nUnstructured, retained bytes.\n');
  const before = readFileSync(file);
  assert.deepEqual(validateEngineeringArtifacts(root), []);
  assert.deepEqual(readFileSync(file), before);
});
test('record ownership is checked without creating absent artifacts', t => {
  const root = change(t); const before = readdirSync(root);
  assert.match(validateEngineeringArtifacts(root, 'performance').join('\n'), /missing evidence/);
  assert.deepEqual(readdirSync(root), before);
  writeFileSync(join(root, 'architecture-review.md'), fence(documentation()));
  assert.match(validateEngineeringArtifacts(root).join('\n'), /engineering\/owner/);
});
test('symlinked observation owners cannot read outside a change', t => {
  const root = change(t), outside = join(dirname(root), 'outside.md');
  writeFileSync(outside, fence(performance()));
  try { symlinkSync(outside, join(root, 'architecture-review.md')); }
  catch (e) { if (e.code === 'EPERM') return t.skip('host does not permit fixture symlinks'); throw e; }
  assert.match(validateEngineeringArtifacts(root).join('\n'), /symlinked evidence owners/);
});
test('all specialized branches are discoverable from their unchanged owner entries', () => {
  assert.deepEqual(validateEngineeringPackage(workflow), []);
});
test('real validator accepts measurements and rejects the controlled regression', t => {
  const root = change(t), status = readFileSync(join(root, 'README.md'));
  const file = join(root, 'architecture-review.md'), record = performance();
  writeFileSync(file, '# Measurement\n' + fence(record));
  const good = run(['--engineering', 'performance', root]); assert.equal(good.status, 0, good.output);
  record.baseline.samples = []; writeFileSync(file, '# Measurement\n' + fence(record));
  const bad = run(['--engineering', 'performance', root]); assert.equal(bad.status, 1, bad.output); assert.match(bad.output, /samples/);
  assert.deepEqual(readFileSync(join(root, 'README.md')), status);
});
test('ordinary real validation also rejects malformed marked observations', t => {
  const root = change(t); writeFileSync(join(root, 'architecture-review.md'), '```json specdev-engineering-evidence\n{\n```');
  const result = run([root]); assert.equal(result.status, 1); assert.match(result.output, /engineering\/fence/);
});
test('specialist CLI admission requires its existing artifact and exclusive flags', t => {
  const root = change(t);
  for (const args of [ ['--engineering', 'performance', root], ['--engineering', 'wrong', root], ['--engineering', 'performance', '--self-check'], ['--engineering', 'performance', '--engineering', 'performance', root] ]) {
    const r = run(args); assert.notEqual(r.status, 0, JSON.stringify(args));
  }
  assert.deepEqual(readdirSync(root), ['README.md']);
});
test('real documentation validation does not accept an unexecuted command', t => {
  const root = change(t); mkdirSync(join(root, 'evidence'));
  const file = join(root, 'evidence/direct-spec.md'), record = documentation();
  writeFileSync(file, '# Document checks\n' + fence(record));
  const good = run(['--engineering', 'documentation', root]); assert.equal(good.status, 0, good.output);
  record.claims[0].executed = false; writeFileSync(file, fence(record));
  const bad = run(['--engineering', 'documentation', root]); assert.equal(bad.status, 1); assert.match(bad.output, /verified command/);
});
test('incident stage cannot advance a diagnosis without its actual red feedback contract', t => {
  const root = change(t), file = join(root, 'diagnosis.md');
  let body = readFileSync(join(workflow, 'specdev-d-diagnose-bugs/assets/diagnosis-template.md'), 'utf8')
    .replace('change: <YYYY-MM-DD-topic>', 'change: 2026-10-11-engineering')
    .replace('status: reproducing', 'status: blocked').replace('cleanup_status: pending', 'cleanup_status: clean')
    .replace('updated_at: <ISO-8601>', 'updated_at: 2026-10-11T00:00:00Z')
    .replace(/<Path>[^\n]+?<\/Path>/g, 'not-applicable') + fence(incident());
  writeFileSync(file, body);
  const good = run(['--stage', 'diagnosis', '--engineering', 'incident', root]); assert.equal(good.status, 0, good.output);
  body = body.replace('status: blocked', 'status: root-cause-confirmed'); writeFileSync(file, body);
  const bad = run(['--stage', 'diagnosis', root]); assert.equal(bad.status, 1); assert.match(bad.output, /requires ready feedback loop/);
});
test('single commit selection excludes later HEAD work', t => {
  const r = repository(t), scope = resolveReviewScope({ repo: r.root, mode: 'commit', commit: r.b });
  assert.equal(scope.head_sha, r.b); assert.equal(scope.fixed_point, r.a); assert.deepEqual(scope.changed_paths, ['b.txt']);
});
test('no-diff is a read-only outcome, not an approval or failed reference', t => {
  const r = repository(t), before = git(r.root, 'status', '--porcelain');
  const result = run(['--review-scope', '--repo', r.root, '--mode', 'range', '--base', r.c, '--head', r.c]);
  assert.equal(result.status, 0, result.output);
  const scope = JSON.parse(result.stdout); assert.equal(scope.outcome, 'no-diff'); assert.equal(scope.diff_bytes, 0); assert.deepEqual(scope.changed_paths, []);
  assert.equal(Object.hasOwn(scope, 'approved'), false); assert.equal(git(r.root, 'status', '--porcelain'), before);
});
test('new HEAD invalidates a frozen review digest', t => {
  const r = repository(t), first = resolveReviewScope({ repo: r.root, mode: 'baseline', base: r.a, head: 'HEAD' });
  r.commit('d'); const next = resolveReviewScope({ repo: r.root, mode: 'baseline', base: r.a, head: 'HEAD' });
  assert.notEqual(first.head_sha, next.head_sha); assert.notEqual(first.diff_sha256, next.diff_sha256);
});
test('PR selection requires both exact observed remote SHAs', t => {
  const r = repository(t);
  assert.equal(resolveReviewScope({ repo: r.root, mode: 'pr', base: r.a, head: r.c }).head_sha, r.c);
  assert.throws(() => resolveReviewScope({ repo: r.root, mode: 'pr', base: r.a, head: 'HEAD' }), /exact remotely observed/);
});
test('invalid refs and ambiguous comparison options are refused', t => {
  const r = repository(t);
  for (const options of [
    { mode: 'range', base: 'not-a-ref', head: r.c }, { mode: 'range', base: '--all', head: r.c },
    { mode: 'commit', commit: r.a }, { mode: 'commit', commit: r.b, head: r.c },
    { mode: 'commit', commit: r.b, parent: 3 }, { mode: 'range', base: r.a, head: r.c, parent: 1 },
  ]) assert.throws(() => resolveReviewScope({ repo: r.root, ...options }));
  assert.notEqual(run(['--review-scope', '--repo', r.root, '--repo', r.root]).status, 0);
});
test('merge commit requires an explicit parent', t => {
  const r = repository(t); git(r.root, 'checkout', '-b', 'side', r.a); const side = r.commit('side');
  git(r.root, 'checkout', 'main'); git(r.root, 'merge', '--no-ff', 'side', '-m', 'merge'); const merge = git(r.root, 'rev-parse', 'HEAD');
  assert.throws(() => resolveReviewScope({ repo: r.root, mode: 'commit', commit: merge }), /explicit --parent/);
  assert.equal(resolveReviewScope({ repo: r.root, mode: 'commit', commit: merge, parent: 2 }).fixed_point, side);
  assert.equal(resolveReviewScope({ repo: r.root, mode: 'commit', commit: merge, parent: 1 }).fixed_point, r.c);
});
test('range comparison and merge-base comparison have distinct semantics', t => {
  const r = repository(t); git(r.root, 'checkout', '-b', 'side', r.a); const side = r.commit('side');
  const baseline = resolveReviewScope({ repo: r.root, mode: 'baseline', base: r.c, head: side });
  const range = resolveReviewScope({ repo: r.root, mode: 'range', base: r.c, head: side });
  assert.deepEqual(baseline.changed_paths, ['side.txt']); assert.deepEqual(range.changed_paths, ['b.txt', 'c.txt', 'side.txt']);
});
test('fifteen Work IDs match the current registry and persisted schema versions match their contracts', () => {
  const entries = readdirSync(workflow).filter(name => /^specdev-[a-z]-/.test(name)); assert.equal(entries.length, 15);
  const ids = entries.map(name => /speculo-id: (.+)$/m.exec(readFileSync(join(workflow, name, 'SKILL.md'), 'utf8'))?.[1]);
  assert.deepEqual(ids.sort(), ['archive-and-consolidate','code-review','diagnose-bugs','goal-plan','grill-with-docs','implement','init-setup','learn','prototype','retro','review-architecture','spec','tickets','triage','wayfinder'].map(id => 'specdev/' + id).sort());
  for (const [file, version] of [['config', 7], ['status', 5], ['change-status', 6], ['goal-plan', 8], ['implementation-plan', 3], ['execution-context', 1], ['execution-record', 1]]) {
    const schema = JSON.parse(readFileSync(join(workflow, 'common/schemas', `${file}.schema.json`), 'utf8'));
    assert.equal(schema.properties.schema_version.const, version);
  }
});

test('review scope ignores configured external diff and forced color', t => {
  const r = repository(t), sentinel = join(r.root, 'unexpected-diff-effect');
  const plain = resolveReviewScope({ repo: r.root, mode: 'range', base: r.a, head: r.c });
  git(r.root, 'config', 'color.ui', 'always');
  git(r.root, 'config', 'diff.external', `node -e "require('fs').writeFileSync('${sentinel.replaceAll('\\', '/')}', 'bad')"`);
  const scope = resolveReviewScope({ repo: r.root, mode: 'range', base: r.a, head: r.c });
  assert.equal(scope.diff_sha256, plain.diff_sha256); assert.equal(existsSync(sentinel), false);
});
test('specialist validation errors do not create remote ledgers or reopen completed states', t => {
  const root = change(t), statusPath = join(root, 'README.md');
  const status = readFileSync(statusPath, 'utf8').replace('Outcome: active', 'Outcome: completed');
  writeFileSync(statusPath, status); const before = readFileSync(statusPath);
  const r = run(['--engineering', 'performance', root]); assert.notEqual(r.status, 0);
  assert.deepEqual(readFileSync(statusPath), before); assert.deepEqual(readdirSync(root), ['README.md']);
});
test('correcting a candidate preserves historical incident observation bytes', t => {
  const root = change(t), original = fence(incident()), file = join(root, 'diagnosis.md');
  writeFileSync(file, original);
  assert.deepEqual(validateEngineeringArtifacts(root, 'incident'), []);
  const subsequent = { ...incident(), checkpoint: 'later-source', facts: ['new read-only evidence'] };
  writeFileSync(file, original + fence(subsequent));
  assert.deepEqual(validateEngineeringArtifacts(root, 'incident'), []);
  assert.ok(readFileSync(file, 'utf8').startsWith(original));
});
test('a valid-looking measurement in another owner does not satisfy requested performance', t => {
  const root = change(t); mkdirSync(join(root, 'evidence'));
  writeFileSync(join(root, 'evidence/direct-spec.md'), fence(performance()));
  const r = run(['--engineering', 'performance', root]); assert.equal(r.status, 1);
  assert.match(r.output, /engineering\/owner/); assert.match(r.output, /missing evidence/);
});
