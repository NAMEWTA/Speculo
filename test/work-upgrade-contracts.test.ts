import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
const read = async (file: string) => (await readFile(join(process.cwd(), file), 'utf8')).replaceAll('\r\n', '\n');
const entry = (workflow: string, work: string) => read(`template/workflows/${workflow}/${work}/SKILL.md`);
// These are source-contract regressions, not a claim of real model execution.
test('all 39 stable Work identities are registered once', async () => {
 const {readAssetCatalog}=await import('../src/assets.js');const c=await readAssetCatalog(join(process.cwd(),'template'));
 const works=c.assets.filter(a=>a.kind==='work-skill');assert.equal(works.length,39);assert.equal(new Set(works.map(w=>w.id)).size,39);
 for(const w of works)assert.match(await read('template/'+w.entry),/speculo-kind: work-skill/);
});
test('triage assesses requests and Delivery owns all delivery branches', async () => {
  const triage = await entry('specdev', 'specdev-t-triage'), delivery = await entry('specdev', 'specdev-d-delivery');
  for (const mode of ['queue','capture','intake']) assert.ok(triage.includes(`| ${mode} |`));
  for (const mode of ['reconcile','publish','pr-delivery','ci-security','release-preflight','release','recover']) {
    assert.ok(delivery.includes(`| ${mode} |`)); assert.ok(!triage.includes(`| ${mode} |`));
  }
  assert.match(triage, /不创建 change/); assert.match(triage, /不等于 Ticket Ready/);
  assert.match(delivery, /不创建空记录/);
  const transport = await read('template/workflows/specdev/common/rules/github-operations.md');
  assert.match(transport, /--apply/); assert.match(transport, /授权/);
});
test('architecture report is a terminal Work result, not mandatory interview or implementation', async () => {
  const text = await entry('specdev', 'specdev-r-review-architecture');
  assert.match(text, /`report`（默认）/);
  assert.match(text, /候选保持 `unselected`/);
  assert.match(text, /只有用户已经选择一个候选并请求深入设计/);
  assert.match(text, /报告不授权访谈、建票或实施/);
  assert.match(text, /报告完成不是产品交付/);
  assert.doesNotMatch(text, /热核级|审查语言必须使用/);
  const template = await read('template/workflows/specdev/specdev-r-review-architecture/assets/architecture-review-template.md');
  assert.match(template, /report 到此完成/); assert.match(template, /无高置信候选也可交付/);
});
test('unproven diagnosis relaxation is not enabled by documentation refactoring', async () => {
  const text = await entry('specdev', 'specdev-d-diagnose-bugs');
  assert.match(text, /假设表保持为空/); assert.match(text, /不得继续阅读代码来构造根因理论/);
  assert.match(text, /生成 3–5 个/); assert.match(text, /剩余每个元素被移除都会使回路变绿/);
  assert.match(text, /D 不编写生产修复/);
});
test('review reuse binds all inputs, requires original evidence, and never bypasses E2E', async () => {
  const text = await read('template/workflows/specdev/common/skills/code-review/references/result-reuse.md');
  for (const marker of ['fixed_point', 'head', 'diff', '规范', '标准', 'ADR', 'Skill', '工具', '环境', '实际实现者/reviewer 身份', '派遣/返回与 Lead 核验', '原报告', '不跳过当前 workspace/集成/E2E/授权检查']) assert.ok(text.includes(marker), marker);
  assert.match(text, /request-changes、skipped:no-spec.*不能|不能把 request-changes、skipped:no-spec/);
  assert.match(text, /旧报告\/旧完成证据不覆盖/);
});
test('OPS local views do not enter deployment or secret-reading branches', async () => {
  const view = await entry('ops', 'ops-v-inventory-view');
  assert.match(view, /不读取 workspace-and-authorization、部署布局或凭据协议/);
  assert.doesNotMatch(view, /<Path>[^<]*(workspace-and-authorization|persistence-and-secrets|deployment-layout)\.md<\/Path>/);
  assert.match(view, /不连接或修改目标/); assert.match(view, /不回写 status.json/);
  const root = await read('template/workflows/ops/common/rules/domain-runtime.md');
  assert.match(root, /V 本地资产视图.*不加载执行或凭据分支/);
  assert.doesNotMatch(root, /writable_root_justification|compose --wait/);
  const layout = await read('template/workflows/ops/common/rules/deployment-layout.md');
  assert.match(layout, /writable_root_justification/); assert.match(layout, /Compose >=2.30/);
  const recovery = await read('template/workflows/ops/common/rules/recovery.md');
  assert.match(recovery, /started-without-terminal 保持 unknown/); assert.match(recovery, /project-maintenance 不重跑任何业务动作/);
});
test('repeat Learning init preserves existing state and retention publication remains C-owned', async () => {
  const init = await entry('learning', 'learning-i-init-setup');
  assert.match(init, /不能重置 active、位置、课程、原答、掌握证据或知识内容/);
  assert.doesNotMatch(init, /- 没有 active Change/);
  const review = await entry('learning', 'learning-r-review');
  assert.match(review, /没有真实间隔.*不伪造通过/);
  assert.match(review, /R 不直接写 context，不自动激活 C 或 A/);
  assert.match(review, /learning-c-consolidate.*用户确认后/);
  const goal = await entry('learning', 'learning-g-goal');
  assert.match(goal, /仅澄清计划范围，不生成教学问题/);
  assert.match(goal, /每单元 ≤15 节与每课最多10问/);
});
test('handoff is pointer-based and does not create new authority or replay unknown effects', async () => {
  const text = await read('template/references/handoff/handoff-contract.md') + await read('template/references/handoff/domain-context.md');
  for (const marker of ['下一安全动作', '未闭合动作', '真实授权来源', '当前 owner', '摘要', '不复制整套 Spec', '不是新授权', '不能包装成新 task 再试']) assert.ok(text.includes(marker));
});
test('Dev to OPS handoff uses existing spec fields and separate completion owners', async () => {
  const text = await read('template/workflows/specdev/common/rules/deployment-handoff.md');
  assert.match(text, /代码 revision 不能替代构件 digest/);
  assert.match(text, /deployments\[\]\.notes/);
  assert.match(text, /OPS 不修改 SpecDev Ticket、Map、Goal Plan 或状态/);
  assert.match(text, /文档指针不是执行权限/);
  const schema = JSON.parse(await read('template/workflows/ops/common/schemas/spec.schema.json'));
  assert.equal(schema.properties.deployments.items.properties.notes.items.type, 'string');
  assert.ok(schema.properties.resource_updates.properties.projects.items.properties.source.properties.revision);
  assert.equal(schema.properties.handoff, undefined);
});
test('retro remediation does not add automatic prompt, knowledge or remote writes', async () => {
  const text = await read('template/references/retrospective/retrospective-contract.md');
  for (const kind of ['code-defect', 'deterministic-check-gap', 'context-pointer', 'judgment-rule', 'environment-discovery']) assert.ok(text.includes(kind));
  assert.match(text, /只提出建议，不直接改 AGENTS/);
  assert.match(text, /不创建远程 Issue/);
  const draft = await read('template/references/retrospective/references/issue-drafting-sop.md');
  assert.match(draft, /"regression"/); assert.match(draft, /不写文件、不调用 `gh`、不创建 issue/);
});
test('OPS installed self-check verifies static assets without implying target acceptance', () => {
  const run = spawnSync(process.execPath, ['template/workflows/ops/common/tools/validate-ops.mjs', '--self-check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /no state inferred or target contacted/);
});
