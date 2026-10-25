import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = process.cwd();
const outputs = ['grill-with-docs', 'spec', 'tickets', 'goal-plan', 'wayfinder'];
const schemaSources = {
  'project-design-schema': 'common/schemas/project-design.schema.json',
  'change-design-schema': 'common/schemas/change-design.schema.json',
  'design-package-schema': 'specdev-p-prototype/assets/design-package.schema.json',
  'prototype-browser-evidence-schema': 'common/schemas/prototype-browser-evidence.schema.json',
};

function inline(content: string, tag: string): string {
  const open = `<${tag}>\n`, close = `\n</${tag}>`;
  assert.equal(content.split(`\n${open}`).length - 1, 1, `one ${tag}`);
  return content.slice(content.indexOf(open) + open.length, content.indexOf(close)).trim();
}

test('all existing design consumers retain exact schemas and executable-independent handoff rules', async () => {
  for (const name of outputs) {
    const content = await readFile(join(root, `template/canonical/canonical-specdev-${name}.md`), 'utf8');
    for (const [tag, source] of Object.entries(schemaSources)) {
      const embedded = inline(content, tag).replace(/^```json\n/, '').replace(/\n```$/, '');
      assert.deepEqual(JSON.parse(embedded), JSON.parse(await readFile(join(root, 'template/workflows/specdev', source), 'utf8')), `${name}: ${tag}`);
    }
    const contract = inline(content, 'design-portability');
    for (const required of ['designDigest', 'prototype digest', 'record_digest', 'candidate_count_override', 'case.entry', 'gateway-request.json', 'pending', 'FILE', '不能计算摘要', '不能调用网关', 'owner', 'revision-written', 'Design Conformance', 'derived-readonly']) assert.ok(contract.includes(required), `${name}: ${required}`);
    assert.doesNotMatch(content, /(?:design-artifacts|publish-design|validate-design-package|materialize-prototype)\.mjs|design-knowledge-gateway\.md/);
    assert.doesNotMatch(contract, /<Path>|\{roots\./);
    assert.match(contract, /specdev\/design\/revisions/);
    assert.match(contract, /旧确认失效/);
    assert.match(content, /Outcome: active\|completed\|cancelled/);
    assert.match(content, /specdev\/changes\/archive\/\{change\}/);
    assert.doesNotMatch(content, /^<(?:status-template|status-schema|change-status-template|change-status-schema)>$/m);
    assert.match(content, /FILE: specdev\/changes\/\{change\}\/README\.md/);
  }
});

test('all portable SpecDev consumers include the complete shared research and citation contract', async () => {
  const policy = (await readFile(join(root, 'template/references/research-and-reuse/research-contract.md'), 'utf8')).trim();
  for (const name of outputs) {
    const content = await readFile(join(root, `template/canonical/canonical-specdev-${name}.md`), 'utf8');
    assert.equal(inline(content, 'shared-research-and-reuse-research-contract'), policy, `${name}: shared policy must survive standalone compilation`);
  }
});

test('isolated design canonical generation is deterministic and fails on missing shared or schema dependencies', async () => {
  const target = await mkdtemp(join(tmpdir(), 'specdev-canonical-design-'));
  try {
    await mkdir(join(target, 'scripts'), { recursive: true });
    await mkdir(join(target, 'template/canonical'), { recursive: true });
    await cp(join(root, 'scripts/generate-specdev-canonical.mjs'), join(target, 'scripts/generate-specdev-canonical.mjs'));
    await cp(join(root, 'template/workflows/specdev'), join(target, 'template/workflows/specdev'), { recursive: true });
    await cp(join(root, 'template/references'), join(target, 'template/references'), { recursive: true });
    const run = (check = false) => spawnSync(process.execPath, [join(target, 'scripts/generate-specdev-canonical.mjs'), ...(check ? ['--check'] : [])], { cwd: target, encoding: 'utf8', timeout: 60000 });
    let result = run();
    assert.equal(result.status, 0, result.stderr);
    result = run(true);
    assert.equal(result.status, 0, result.stderr);
    for (const name of outputs) assert.equal(await readFile(join(target, `template/canonical/canonical-specdev-${name}.md`), 'utf8'), await readFile(join(root, `template/canonical/canonical-specdev-${name}.md`), 'utf8'));
    const policy = 'template/references/research-and-reuse/research-contract.md';
    await rm(join(target, policy));
    result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /research-contract\.md/);
    await cp(join(root, policy), join(target, policy));
    await rm(join(target, 'template/workflows/specdev/common/schemas/change-design.schema.json'));
    result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /change-design\.schema\.json/);
  } finally { await rm(target, { recursive: true, force: true }); }
});

test('optional orchestration in canonical retains both host targets without native install paths', async () => {
  for (const name of outputs) {
    const content = await readFile(join(root, `template/canonical/canonical-specdev-${name}.md`), 'utf8');
    for (const mode of ['herdr', 'orca']) {
      const contract = inline(content, `shared-coordination-modes-${mode}`);
      assert.doesNotMatch(contract, /\.(?:agents|claude)\/skills\/|roots\.skills|<Path>/);
      assert.match(contract, /通用智能体.*Claude/);
      assert.match(contract, /guide/);
      assert.match(contract, /fallback|回退/);
    }
    assert.match(content, /selection: preferred/);
    assert.match(content, /fallback: \[lead\]/);
    assert.doesNotMatch(content, /command\/(?:coordination-init|handoff)/);
    assert.match(content, /网页环境只记录本次选择，不宣称持久化/);
    assert.match(content, /无本地写入能力时输出完整交接内容/);
  }
});
