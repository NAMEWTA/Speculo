import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const repo = process.cwd();
const workflow = 'template/workflows/learning';
const validatorPath = join(repo, workflow, 'Q-question/tools/validate-exploration.mjs');
const generatorPath = join(repo, 'scripts/generate-learning-canonical.mjs');
const validator = (): Promise<any> => import(pathToFileURL(validatorPath).href);
const generator = (): Promise<any> => import(pathToFileURL(generatorPath).href);
const artifact = 'inquiry/explorations/EX-001-agent.md';
function mapFixture(): any {
  return { schema_version: 1, questions: [{
    id: 'P-001', parent_id: null, origin: 'inference', trigger: 'user asks about tool timeouts',
    dimension: 'failure', why_it_matters: 'A missing response leaves the operation outcome unknown.',
    gap_kind: 'potential', status: 'exploring', evidence_status: 'unverified', evidence: [],
    artifact, conclusion: '', verification: 'Simulate response loss after a controlled write and inspect side effects.',
  }] };
}
function recordFixture(status = 'active', ids = ['P-001']) {
  return `---\nexploration_id: EX-001-agent\nmode: explore\nstatus: ${status}\nquestion_ids: [${ids.join(', ')}]\n---\n\n# Exploration\n\n## Scope\n\nHypothetical tool timeout, not a reported incident.\n\n## Discovery\n\nP-001: distinguish failed request from unknown outcome; the normal demo hides this window.\n\n## Deep Dive\n\nCheck operation identity and service guarantees before deciding whether to repeat a write.\n\n## Verification\n\nProposed test only: lose the response after the effect, then examine recovery behavior.\n\n## Next\n\nStop for service-contract evidence rather than declaring a reliable production system.\n`;
}
async function temporary(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'learning-inquiry-'));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}
async function writeFixture(root: string, map = mapFixture(), record = recordFixture()) {
  await mkdir(join(root, 'inquiry/explorations'), { recursive: true });
  await writeFile(join(root, artifact), record);
  await writeFile(join(root, 'inquiry/question-map.json'), JSON.stringify(map));
}
function run(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [validatorPath, '--change-dir', root, '--map', 'inquiry/question-map.json', ...args], { encoding: 'utf8' });
}

test('explore validates independently without fabricating learner answers', async () => {
  const { validateExploration, validateQuestionMap } = await validator();
  assert.equal(validateExploration(recordFixture(), mapFixture()).valid, true);
  assert.equal(validateQuestionMap({ schema_version: 1, questions: [] }).valid, true);
  const result = validateExploration(recordFixture(), mapFixture(), { expectedCount: 2 });
  assert.equal(result.valid, false);
  assert.match(result.scope, /not teaching quality/);
});

test('explore rejects learner protocol, duplicate metadata, wrong mode and wrong order', async () => {
  const { validateExploration } = await validator();
  const invalid = [
    recordFixture().replace('mode: explore', 'mode: tutor'),
    recordFixture().replace('mode: explore', 'mode: explore\nmode: explore'),
    recordFixture().replace('## Next', '## Wrong'),
    recordFixture().replace('## Scope', '## Verification'),
    recordFixture().replace('question_ids: [P-001]', 'question_ids: [P-001, P-001]'),
    recordFixture() + '\nResponse: ready\n', recordFixture() + '\nSubmission: ready\n',
    recordFixture() + '\n### A1\nInvented learner answer\n', recordFixture() + '\nverdict: correct\n',
  ];
  for (const text of invalid) assert.equal(validateExploration(text, mapFixture()).valid, false);
});

test('hidden examples cannot supply the required sections or a second protocol', async () => {
  const { validateExploration } = await validator();
  const withExample = recordFixture().replace('## Deep Dive', '```md\nResponse: ready\n### A1\n```\n\n## Deep Dive');
  assert.equal(validateExploration(withExample, mapFixture()).valid, true);
  assert.equal(validateExploration(recordFixture().replace('## Verification', '<!-- ## Verification -->'), mapFixture()).valid, false);
  assert.equal(validateExploration(recordFixture().replace('## Next', '<!-- unclosed\n## Next'), mapFixture()).valid, false);
  assert.equal(validateExploration(recordFixture().replace(/\n/g, '\r\n'), mapFixture()).valid, true);
});

test('explore requires a real focus in the owned question map', async () => {
  const { validateExploration } = await validator();
  const missing = mapFixture(); missing.questions = [];
  assert.equal(validateExploration(recordFixture(), missing).valid, false);
  const other = mapFixture(); other.questions[0].artifact = 'inquiry/explorations/EX-002-agent.md';
  assert.equal(validateExploration(recordFixture(), other).valid, false);
  assert.equal(validateExploration(recordFixture(), mapFixture(), { artifact: 'inquiry/explorations/EX-002-agent.md' }).valid, false);
});

test('closing a round retains explicit unresolved evidence rather than pretending mastery', async () => {
  const { validateExploration } = await validator();
  assert.equal(validateExploration(recordFixture('closed'), mapFixture()).valid, false);
  const map = mapFixture(); map.questions[0].status = 'needs_evidence';
  assert.equal(validateExploration(recordFixture('closed'), map).valid, true);
  map.questions[0].status = 'resolved';
  assert.equal(validateExploration(recordFixture('closed'), map).valid, false);
  Object.assign(map.questions[0], { conclusion: 'The contract requires reconciliation before another write.', evidence_status: 'supported', evidence: ['sources.md#service-contract'] });
  assert.equal(validateExploration(recordFixture('closed'), map).valid, true);
});

test('map rejects duplicate IDs, missing parents and cycles', async () => {
  const { validateQuestionMap } = await validator();
  for (const mutate of [
    (m: any) => m.questions.push({ ...m.questions[0] }),
    (m: any) => { m.questions[0].parent_id = 'P-999'; },
    (m: any) => { m.questions[0].parent_id = 'P-001'; },
    (m: any) => { m.questions[0].parent_id = 'P-002'; m.questions.push({ ...m.questions[0], id: 'P-002', parent_id: 'P-001' }); },
  ]) { const m = mapFixture(); mutate(m); assert.equal(validateQuestionMap(m).valid, false); }
});

test('long acyclic histories are validated without recursive stack growth', async () => {
  const { validateQuestionMap } = await validator();
  const q = mapFixture().questions[0];
  const questions = Array.from({ length: 2000 }, (_, i) => ({ ...q, id: `P-${String(i + 1).padStart(3, '0')}`, parent_id: i ? `P-${String(i).padStart(3, '0')}` : null }));
  assert.equal(validateQuestionMap({ schema_version: 1, questions }).valid, true);
});

test('map requires provenance for observed gaps and supported/tested claims', async () => {
  const { validateQuestionMap } = await validator();
  for (const patch of [{ gap_kind: 'observed' }, { evidence_status: 'supported' }, { evidence_status: 'tested', evidence: ['test record'] }, { status: 'mastered' }, { mastered: true }]) {
    const m = mapFixture(); Object.assign(m.questions[0], patch);
    assert.equal(validateQuestionMap(m).valid, false);
  }
});

test('map preserves unknown extension fields and never mutates supplied history', async () => {
  const { validateQuestionMap } = await validator();
  const m = mapFixture(); m.future = { retained: true }; m.questions[0].future = ['x'];
  const before = JSON.stringify(m);
  assert.equal(validateQuestionMap(m).valid, true);
  assert.equal(JSON.stringify(m), before);
});

test('invalid shapes fail closed without throwing or accepting unsafe paths', async () => {
  const { validateQuestionMap, validateExploration, safeRelative } = await validator();
  for (const value of [null, [], {}, { schema_version: 2, questions: [] }, { schema_version: 1, questions: [null] }]) assert.equal(validateQuestionMap(value).valid, false);
  assert.equal(validateExploration(null, mapFixture()).valid, false);
  for (const value of ['', '../x', 'inquiry/../x', '/absolute', 'C:/outside', 'inquiry\\x', 'inquiry//x', 'inquiry/./x', 'inquiry/\u0000x']) assert.equal(safeRelative(value), false);
  const m = mapFixture(); m.questions[0].artifact = 'lessons/L-001.md';
  assert.equal(validateQuestionMap(m).valid, false);
});

test('CLI validates an actual artifact and map and remains read-only', async () => temporary(async (root) => {
  await writeFixture(root);
  const before = await readFile(join(root, artifact), 'utf8');
  const mapBefore = await readFile(join(root, 'inquiry/question-map.json'), 'utf8');
  const result = run(root, '--file', artifact, '--expected-count', '1');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).valid, true);
  assert.equal(run(root).status, 0);
  assert.equal(await readFile(join(root, artifact), 'utf8'), before);
  assert.equal(await readFile(join(root, 'inquiry/question-map.json'), 'utf8'), mapBefore);
}));

test('CLI validates candidates before publication while checking actual references', async () => temporary(async (root) => {
  await writeFixture(root);
  await writeFile(join(root, 'inquiry/candidate.md'), recordFixture());
  await rm(join(root, artifact));
  assert.equal(run(root, '--file', 'inquiry/candidate.md', '--artifact', artifact).status, 0);
  const m = mapFixture(); m.questions.push({ ...m.questions[0], id: 'P-002', artifact: 'inquiry/IQ-002-old-batch-01.md' });
  await writeFile(join(root, 'inquiry/question-map.json'), JSON.stringify(m));
  assert.equal(run(root, '--file', 'inquiry/candidate.md', '--artifact', artifact).status, 1);
}));

test('CLI refuses traversal, malformed inputs and ambiguous flags', async () => temporary(async (root) => {
  await writeFixture(root);
  for (const args of [
    ['--file', '../outside.md'], ['--file', artifact, '--file', artifact],
    ['--file', artifact, '--expected-count', '0'], ['--file', artifact, '--expected-count', '2'],
    ['--file', artifact, '--expected-count', '1.0'], ['--unknown', 'x'], ['--artifact', artifact],
  ]) assert.equal(run(root, ...args).status, 1);
  await writeFile(join(root, 'inquiry/question-map.json'), '{broken');
  assert.equal(run(root, '--file', artifact).status, 1);
}));

test('CLI refuses input and destination symlinks', { skip: process.platform === 'win32' }, async () => temporary(async (root) => {
  await writeFixture(root);
  await symlink(join(root, artifact), join(root, 'inquiry/link.md'));
  assert.equal(run(root, '--file', 'inquiry/link.md', '--artifact', artifact).status, 1);
  await writeFile(join(root, 'inquiry/candidate.md'), recordFixture());
  await rm(join(root, artifact));
  await writeFile(join(root, 'outside.md'), 'sentinel');
  await symlink(join(root, 'outside.md'), join(root, artifact));
  assert.equal(run(root, '--file', 'inquiry/candidate.md', '--artifact', artifact).status, 1);
  assert.equal(await readFile(join(root, 'outside.md'), 'utf8'), 'sentinel');
}));

test('CLI requires a real nonempty test evidence file before allowing tested', async () => temporary(async (root) => {
  const m = mapFixture(); Object.assign(m.questions[0], { evidence_status: 'tested', evidence: ['inquiry/evidence/run.md'], test_evidence: 'inquiry/evidence/run.md' });
  await writeFixture(root, m);
  assert.equal(run(root, '--file', artifact).status, 1);
  await mkdir(join(root, 'inquiry/evidence'));
  await writeFile(join(root, 'inquiry/evidence/run.md'), '');
  assert.equal(run(root, '--file', artifact).status, 1);
  await writeFile(join(root, 'inquiry/evidence/run.md'), 'Operator-supplied fixture record; authenticity is not certified.');
  const result = run(root, '--file', artifact);
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).scope, /not teaching quality/);
}));

test('closed exploration records cannot be silently replaced by a candidate', async () => temporary(async (root) => {
  const m = mapFixture(); m.questions[0].status = 'deferred';
  await writeFixture(root, m, recordFixture('closed'));
  await writeFile(join(root, 'inquiry/candidate.md'), recordFixture('closed').replace('Proposed test only', 'Fabricated success'));
  assert.equal(run(root, '--file', 'inquiry/candidate.md', '--artifact', artifact).status, 1);
  assert.equal(run(root, '--file', artifact).status, 0);
}));

async function sourceFixture(root: string) {
  const { documents } = await generator();
  const paths = new Set<string>(documents.flatMap((d: any) => [d.entry, ...d.sources.map((s: any) => s.path)]));
  for (const path of paths) { await mkdir(dirname(join(root, path)), { recursive: true }); await cp(join(repo, path), join(root, path)); }
}

test('canonical generation closes both capabilities over shared source rules', async () => {
  const { compileLearning, auditCanonical } = await generator();
  const outputs = await compileLearning(repo);
  assert.equal(outputs.size, 2);
  for (const [path, content] of outputs) {
    assert.deepEqual(auditCanonical(content), []);
    assert.equal(await readFile(join(repo, path), 'utf8'), content);
    assert.match(content, /为什么|为何/);
    assert.match(content, /验证/);
    assert.match(content, /FILE:/);
    assert.match(content, /没有文件工具/);
  }
  assert.match(outputs.get('template/canonical/canonical-learning-lesson.md'), /30–40/);
  assert.match(outputs.get('template/canonical/canonical-learning-question.md'), /mode=tutor\|explore/);
});

test('canonical extraction rejects missing/duplicate blocks and unresolved dependencies', async () => {
  const { extractBlock } = await generator();
  const valid = '<!-- portable:x:start -->\n## Rule\nReal content.\n<!-- portable:x:end -->';
  assert.match(extractBlock(valid, 'x'), /Real content/);
  for (const value of ['', valid + valid, valid.replace('Real content.', '<Path>{roots.state}/x</Path>'), valid.replace('Real content.', '<!-- portable:y:start -->')]) assert.throws(() => extractBlock(value, 'x'));
});

test('shared rule edits regenerate both outputs and check mode is read-only', async () => temporary(async (root) => {
  const { generateLearning, compileLearning } = await generator();
  await sourceFixture(root);
  await generateLearning({ root });
  const first = await compileLearning(root);
  await generateLearning({ root });
  assert.deepEqual(await compileLearning(root), first);
  const rule = join(root, workflow, 'common/rules/inquiry-depth-policy.md');
  await writeFile(rule, (await readFile(rule, 'utf8')).replace('<!-- portable:depth:end -->', '共享规则变更测试。\n<!-- portable:depth:end -->'));
  await assert.rejects(generateLearning({ root, check: true }), /stale/);
  for (const [path, content] of first) assert.equal(await readFile(join(root, path), 'utf8'), content);
  await generateLearning({ root });
  const second = await compileLearning(root);
  for (const content of second.values()) assert.match(content, /共享规则变更测试/);
  await generateLearning({ root, check: true });
}));

test('canonical audit rejects leaked source paths and incomplete persistence', async () => {
  const { compileLearning, auditCanonical } = await generator();
  const source = [...(await compileLearning(repo)).values()][0];
  for (const content of [source + '\n<Path>{roots.state}/x</Path>', source + '\nhttps://example.invalid', source.replaceAll('FILE:', 'fragment:'), source + '\nai-workspace/../escape', source + '\n{{unexpanded}}']) assert.ok(auditCanonical(content).length);
});

test('canonical generation refuses source and output-directory symlinks', { skip: process.platform === 'win32' }, async () => temporary(async (root) => {
  const { generateLearning } = await generator();
  await sourceFixture(root);
  const outside = join(root, 'outside'); await mkdir(outside);
  await symlink(outside, join(root, 'template/canonical'));
  await assert.rejects(generateLearning({ root }), /symlink/);
  await rm(join(root, 'template/canonical'));
  const source = join(root, workflow, 'common/rules/inquiry-depth-policy.md');
  const backup = join(outside, 'source.md'); await cp(source, backup); await rm(source); await symlink(backup, source);
  await assert.rejects(generateLearning({ root }), /symlink/);
}));

test('a broken second capability does not publish the first candidate', async () => temporary(async (root) => {
  const { generateLearning, compileLearning } = await generator();
  await sourceFixture(root); await generateLearning({ root });
  const before = await compileLearning(root);
  const q = join(root, workflow, 'Q-question/Q-question.md');
  await writeFile(q, (await readFile(q, 'utf8')).replace('<!-- portable:question:end -->', ''));
  await assert.rejects(generateLearning({ root }));
  for (const [path, content] of before) assert.equal(await readFile(join(root, path), 'utf8'), content);
}));

test('native source contracts preserve mode ownership, lesson boundaries and mine budgets', async () => {
  const get = (path: string) => readFile(join(repo, workflow, path), 'utf8');
  assert.match(await get('Q-question/Q-question.md'), /mode=tutor\|explore/);
  const tutor = await get('Q-question/references/tutor-mode.md');
  for (const marker of ['Response: pending', 'Response: ready', '--before', 'Explain (English)', '实际 n']) assert.ok(tutor.includes(marker));
  assert.match(await get('common/skills/socratic-questioning/SKILL.md'), /本批实际 n 题/);
  assert.match(await get('common/rules/questioning-policy.md'), /最多两批 10 问/);
  assert.match(await get('G-goal/references/coverage-bar.md'), /mine_unit_cap=15/);
  assert.doesNotMatch(await get('L-lesson/lesson-template.md'), /## Learner Answers|Response:/);
  const pkg = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['generate-canonical'].includes('generate-learning-canonical.mjs'));
  assert.ok(pkg.scripts['validate-assets'].includes('generate-learning-canonical.mjs --check'));
});

test('semantic scenarios are explicitly unevaluated specifications, not synthetic observations', async () => {
  const cases = JSON.parse(await readFile(join(repo, 'test/fixtures/learning-inquiry-scenarios.json'), 'utf8'));
  assert.equal(cases.length, 24);
  assert.equal(new Set(cases.map((c: any) => c.id)).size, cases.length);
  for (const c of cases) {
    for (const key of ['id', 'workflow', 'trigger', 'expected']) assert.equal(typeof c[key], 'string');
    assert.equal(c.workflow, 'learning'); assert.equal(c.evaluation_status, 'not-evaluated');
    assert.ok(Array.isArray(c.forbidden_behavior));
    assert.equal(c.observed_result, undefined);
  }
});

// Full checkout integration: the local connector-only fixture does not include this maintainer tool.
test('generated learning documents pass the repository isolated-persistence auditor',
  { skip: !existsSync(join(repo, 'skills/speculo-write-canonical/scripts/build-canonical.mjs')) },
  async () => temporary(async (root) => {
    const { generateLearning } = await generator();
    await sourceFixture(root); await generateLearning({ root });
    const result = spawnSync(process.execPath, [join(repo, 'skills/speculo-write-canonical/scripts/build-canonical.mjs'),
      '--repo', root, '--audit-dir', 'template/canonical'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));

test('malformed or mismatched published metadata blocks replacement', async () => temporary(async (root) => {
  for (const before of [recordFixture().replace('status: active', 'status: active\nstatus: invalid'),
    recordFixture().replace('EX-001-agent', 'EX-002-other')]) {
    await writeFixture(root, mapFixture(), before);
    await writeFile(join(root, 'inquiry/candidate.md'), recordFixture());
    assert.equal(run(root, '--file', 'inquiry/candidate.md', '--artifact', artifact).status, 1);
  }
}));
