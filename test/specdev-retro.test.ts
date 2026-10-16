import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, rename, symlink, readdir, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const tool = join(process.cwd(), 'template/workflows/specdev/common/tools/validate-retro.mjs');
const methodRoot = join(process.cwd(), 'template');
const load = () => import(pathToFileURL(tool).href);
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const reportId = '2026-10-15-ci-session', upgradeId = '2026-10-16-skill-upgrade', sourceId = '2026-10-14-feature';
const skillPath = '.agents/skills/project-checks/SKILL.md';
const originalSkill = '---\nname: project-checks\ndescription: Find project checks.\n---\n\nRead the project config.\n';
const candidateSkill = originalSkill + '\nInspect CI wiring before proposing another check.\n';
const quote = 'The check command existed, but CI did not run it.';
const date = '2026-10-15T12:00:00Z';
const reportHeadings = ['Scope', 'Evidence', 'Findings', 'Acceptance', 'Routes', 'F-001'];
const planHeadings = ['Scope', 'Decisions', 'Changes', 'Validation', 'Archive'];
const markdown = (meta: any, sections: string[]) => '---\n' + Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n') + '\n---\n\n' + sections.map(s => `## ${s}\n\nObserved evidence and specific reasoning.\n` + (s === 'Evidence' ? (meta.sources ?? []).map((e: any) => `\n${e.id} / ${e.change ?? 'session'} / ${e.locator}\n\n> ${e.quote.replaceAll('\n', '\n> ')}\n`).join('') : '')).join('\n');
async function save(path: string, value: string | Buffer) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, value); }
async function saveJSON(path: string, value: any) { await save(path, JSON.stringify(value, null, 2) + '\n'); }

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const repo = await mkdtemp(join(tmpdir(), 'speculo-retro-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const options = { projectRoot: repo, methodRoot, stateRoot: 'data' };
  const retroRoot = join(repo, 'data/specdev/retro'), reportRoot = join(retroRoot, reportId), planRoot = join(retroRoot, upgradeId);
  const sourceRoot = join(repo, 'data/specdev/changes', sourceId);
  await save(join(sourceRoot, 'README.md'), '# Source\n\nOutcome: completed\n');
  await save(join(sourceRoot, 'evidence/log.md'), quote);
  await save(join(reportRoot, 'sources/E-001.md'), quote);
  await save(join(repo, skillPath), originalSkill);
  await save(join(planRoot, 'candidates/project-checks/SKILL.md'), candidateSkill);
  const report: any = {
    schema_version: 2, artifact: 'retrospective', id: reportId, owner: 'session:author', status: 'completed', outcome: 'findings', updated_at: date,
    sources: [{ id: 'E-001', kind: 'change', change: sourceId, locator: 'evidence/log.md', snapshot: 'sources/E-001.md', sha256: sha(quote), quote }],
    findings: [{ id: 'F-001', category: 'automated-checks', severity: 'high', evidence: ['E-001'], remediation_axis: 'context-pointer' }],
  };
  const writeReport = () => save(join(reportRoot, 'RETRO.md'), markdown(report, reportHeadings));
  await writeReport();
  const plan: any = {
    schema_version: 1, artifact: 'retro-upgrade', id: upgradeId, owner: 'session:maintainer', created_at: date,
    inputs: [{ report: reportId, sha256: sha(await readFile(join(reportRoot, 'RETRO.md'))) }],
    decisions: [{ report: reportId, finding: 'F-001', disposition: 'adopt', reason: 'Reuse the existing checker and document its discovery.', targets: [skillPath] }],
    changes: [{ path: skillPath, action: 'update', owner: 'project', before_sha256: sha(originalSkill), after_sha256: sha(candidateSkill), candidate: 'candidates/project-checks/SKILL.md' }],
    archive_reports: [reportId],
  };
  const writePlan = () => save(join(planRoot, 'PLAN.md'), markdown(plan, planHeadings));
  await writePlan();
  const api = await load();
  const check = (kind = 'upgrade', stage = 'record', extra: any = {}) => api.validateRetro({ ...options, kind, id: kind === 'report' ? reportId : upgradeId, stage, ...extra });
  const approve = async () => {
    const approvalText = `User confirmed upgrade ${upgradeId}, its candidate changes and archive list.`;
    await save(join(planRoot, 'approval/request.md'), approvalText);
    await saveJSON(join(planRoot, 'approval.json'), { schema_version: 1, source: 'session:user-confirmation:turn-4', snapshot: 'approval/request.md', sha256: sha(approvalText), quote: approvalText, confirmed_at: date, plan_sha256: sha(await readFile(join(planRoot, 'PLAN.md'))) });
  };
  const execute = async (status = 'verified') => {
    const results = [];
    for (let i = 0; i < plan.changes.length; i++) {
      const change = plan.changes[i], content = await readFile(join(planRoot, change.candidate));
      await save(join(repo, change.path), content);
      const evidence = `evidence/check-${i}.txt`, output = 'Inspected expected trigger and neighboring non-trigger; references exist.\n';
      await save(join(planRoot, evidence), output);
      results.push({ path: change.path, result: 'passed', sha256: sha(content), evidence, evidence_sha256: sha(output), method: 'fixture inspection', observed: 'The candidate and its references match the approved change.', command: null, exit: null });
    }
    const receipt = { schema_version: 1, plan_sha256: sha(await readFile(join(planRoot, 'PLAN.md'))), approval_sha256: sha(await readFile(join(planRoot, 'approval.json'))), status, results };
    await saveJSON(join(planRoot, 'execution.json'), receipt); return receipt;
  };
  return { repo, options, retroRoot, reportRoot, planRoot, sourceRoot, report, plan, writeReport, writePlan, approve, execute, check, api };
}
const noErrors = (result: any) => assert.deepEqual(result.errors, [], JSON.stringify(result));
const rejects = (result: any, pattern: RegExp) => assert.match(result.errors.join('\n'), pattern);

test('independent reports preserve quotations and source changes without creating a review change', async t => {
  const f = await fixture(t);
  noErrors(f.check('report'));
  assert.deepEqual(f.api.listRetroReports(f.options).reports, [reportId]);
  assert.deepEqual(await readdir(join(f.repo, 'data/specdev/changes')), [sourceId]);
  const before = await readFile(join(f.sourceRoot, 'README.md'));
  f.report.sources[0].quote = 'Not in the original captured excerpt'; await f.writeReport();
  rejects(f.check('report'), /quote is not verbatim/);
  f.report.sources[0].quote = quote; f.report.findings[0].evidence = ['E-999']; await f.writeReport();
  rejects(f.check('report'), /unknown evidence/);
  assert.deepEqual(await readFile(join(f.sourceRoot, 'README.md')), before);
});

test('session, no-findings and insufficient-evidence reports have honest source requirements', async t => {
  const f = await fixture(t);
  f.report.sources[0] = { ...f.report.sources[0], kind: 'session', change: null, locator: 'session:current:turn-3' }; await f.writeReport();
  noErrors(f.check('report')); assert.match(f.check('report').warnings.join('\n'), /provenance/);
  f.report.outcome = 'no-findings'; f.report.findings = []; await f.writeReport(); noErrors(f.check('report'));
  f.report.sources = []; await f.writeReport(); rejects(f.check('report'), /evidence is required/);
  f.report.outcome = 'insufficient-evidence'; await f.writeReport(); noErrors(f.check('report'));
});

test('discovery is read-only, excludes upgrade/archive objects and rejects duplicate identities', async t => {
  const f = await fixture(t);
  const before = JSON.stringify(f.api.retroInventory(f.repo));
  const run = spawnSync(process.execPath, [tool, '--list', '--repo', f.repo, '--method-root', methodRoot, '--state-root', 'data'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr); assert.deepEqual(JSON.parse(run.stdout).reports, [reportId]);
  assert.equal(JSON.stringify(f.api.retroInventory(f.repo)), before);
  await mkdir(join(f.retroRoot, 'archive', reportId), { recursive: true });
  rejects(f.check('report'), /duplicate retro identity/);
  await rm(join(f.retroRoot, 'archive', reportId), { recursive: true });
  await rename(f.reportRoot, join(f.retroRoot, 'archive', reportId));
  assert.deepEqual(f.api.listRetroReports(f.options).reports, []);
});

test('a malformed report is reported without hiding independent valid reports', async t => {
  const f = await fixture(t);
  await save(join(f.retroRoot, '2026-10-15-broken/RETRO.md'), 'Malformed report');
  const result = f.api.listRetroReports(f.options);
  assert.deepEqual(result.reports, [reportId]);
  assert.equal(result.issues[0].id, '2026-10-15-broken');
  noErrors(f.check('report'));
  const run = spawnSync(process.execPath, [tool, '--list', '--repo', f.repo, '--method-root', methodRoot, '--state-root', 'data'], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.deepEqual(JSON.parse(run.stdout).reports, [reportId]);
});

test('empty projects return no candidates without initialization', async t => {
  const f = await fixture(t);
  await rm(join(f.repo, 'data'), { recursive: true });
  assert.deepEqual(f.api.listRetroReports(f.options), { reports: [], issues: [] });
  assert.ok(!(await readdir(f.repo)).includes('data'));
});

test('plans require complete decisions, frozen inputs and genuine new/update/retain changes', async t => {
  const f = await fixture(t); noErrors(f.check());
  f.plan.decisions = []; await f.writePlan(); rejects(f.check(), /missing disposition/);
  f.plan.decisions = [{ report: reportId, finding: 'F-001', disposition: 'adopt', reason: 'Evidence', targets: [skillPath] }];
  f.plan.inputs.push({ ...f.plan.inputs[0] }); await f.writePlan(); rejects(f.check(), /duplicate/);
  f.plan.inputs.pop(); f.plan.inputs[0].sha256 = '0'.repeat(64); await f.writePlan(); rejects(f.check(), /input report digest drift/);
  f.plan.inputs[0].sha256 = sha(await readFile(join(f.reportRoot, 'RETRO.md')));
  f.plan.changes[0].after_sha256 = f.plan.changes[0].before_sha256;
  await save(join(f.planRoot, f.plan.changes[0].candidate), originalSkill); await f.writePlan(); rejects(f.check(), /should be retain/);
  f.plan.changes[0].action = 'retain'; await f.writePlan(); noErrors(f.check());
});

test('unconfirmed plans cannot apply or archive and confirmation is bound to exact candidate content', async t => {
  const f = await fixture(t), before = JSON.stringify(f.api.retroInventory(f.repo));
  rejects(f.check('upgrade', 'apply'), /required path does not exist/);
  rejects(f.check('report', 'archive-ready', { upgrade: upgradeId }), /target digest drift|approval/);
  assert.equal(JSON.stringify(f.api.retroInventory(f.repo)), before);
  await f.approve(); noErrors(f.check('upgrade', 'apply'));
  f.plan.decisions[0].reason = 'Changed decision after approval'; await f.writePlan();
  rejects(f.check('upgrade', 'apply'), /approved plan digest drift/);
  await f.approve(); await save(join(f.planRoot, f.plan.changes[0].candidate), candidateSkill + '\nUnapproved content\n');
  rejects(f.check('upgrade', 'apply'), /candidate digest drift/);
});

test('existing Skills are verified against real bytes and failed commands block completion', async t => {
  const f = await fixture(t); await f.approve(); await f.execute(); noErrors(f.check('upgrade', 'verified'));
  await save(join(f.repo, skillPath), candidateSkill + 'concurrent change'); rejects(f.check('upgrade', 'verified'), /target digest drift/);
  await save(join(f.repo, skillPath), candidateSkill);
  const receipt = JSON.parse(await readFile(join(f.planRoot, 'execution.json'), 'utf8'));
  receipt.results[0].command = 'node project-check.mjs'; receipt.results[0].exit = 1; await saveJSON(join(f.planRoot, 'execution.json'), receipt);
  rejects(f.check('upgrade', 'verified'), /command failed/);
});

test('missing Skills can be created only after a matching plan is approved', async t => {
  const f = await fixture(t);
  await rm(join(f.repo, skillPath)); f.plan.changes[0].action = 'create'; f.plan.changes[0].before_sha256 = null;
  await f.writePlan(); await f.approve(); noErrors(f.check('upgrade', 'apply'));
  await f.execute(); noErrors(f.check('upgrade', 'verified'));
});

test('partial application resumes only with matching original execution evidence', async t => {
  const f = await fixture(t); await f.approve(); await f.execute('blocked');
  noErrors(f.check('upgrade', 'apply'));
  rejects(f.check('upgrade', 'verified'), /not verified/);
  await rm(join(f.planRoot, 'execution.json'));
  rejects(f.check('upgrade', 'apply'), /requires original execution evidence/);
});

test('deferred findings keep their report active while verified partial improvements can finish', async t => {
  const f = await fixture(t);
  f.report.findings.push({ ...f.report.findings[0], id: 'F-002' });
  await save(join(f.reportRoot, 'RETRO.md'), markdown(f.report, [...reportHeadings, 'F-002']));
  f.plan.inputs[0].sha256 = sha(await readFile(join(f.reportRoot, 'RETRO.md')));
  f.plan.decisions.push({ report: reportId, finding: 'F-002', disposition: 'defer', reason: 'The CI fix belongs to implementation.', targets: [] });
  await f.writePlan(); rejects(f.check(), /deferred findings cannot be archived/);
  f.plan.archive_reports = []; await f.writePlan(); await f.approve(); await f.execute(); noErrors(f.check('upgrade', 'verified'));
  rejects(f.check('report', 'archive-ready', { upgrade: upgradeId }), /not approved for archive/);
  assert.deepEqual(f.api.listRetroReports(f.options).reports, [reportId]);
});

test('target traversal, missing references, projection ownership and Builder ownership block unsafe upgrades', async t => {
  const f = await fixture(t);
  await save(join(f.repo, skillPath), originalSkill + 'writer drift'); rejects(f.check(), /target digest drift/);
  await save(join(f.repo, skillPath), originalSkill);
  const target = f.plan.changes[0].path;
  f.plan.changes[0].path = '.agents/skills/project-checks/../../../outside.md'; f.plan.decisions[0].targets = [f.plan.changes[0].path];
  await f.writePlan(); rejects(f.check(), /path-unsafe/);
  f.plan.changes[0].path = target; f.plan.decisions[0].targets = [target];
  const broken = candidateSkill + '\n[Missing](references/missing.md)\n';
  await save(join(f.planRoot, f.plan.changes[0].candidate), broken); f.plan.changes[0].after_sha256 = sha(broken); await f.writePlan(); rejects(f.check(), /broken local link/);
  await save(join(f.planRoot, f.plan.changes[0].candidate), candidateSkill); f.plan.changes[0].after_sha256 = sha(candidateSkill); await f.writePlan();
  await saveJSON(join(f.repo, 'data/projections.json'), { schema_version: 3, files: [] }); rejects(f.check(), /invalid Speculo projection manifest/);
  await saveJSON(join(f.repo, 'data/projections.json'), { schema_version: 3, package_version: '2.0.4', targets: ['agents'], asset_ids: ['specdev/retro'], files: [{ path: skillPath, asset_id: 'specdev/retro', sha256: sha(originalSkill) }] }); rejects(f.check(), /managed Speculo projection/);
  await rm(join(f.repo, 'data/projections.json'));
  await saveJSON(join(f.repo, '.agents/skills/engineering-standards/generated-skill-set.json'), { schema_version: 1, generator: 'engineering-standards-builder', skills: [{ name: 'engineering-standards', path: '.agents/skills/engineering-standards', role: 'router' }, { name: 'project-checks', path: '.agents/skills/project-checks', role: 'domain' }] });
  rejects(f.check(), /ownership mismatch/);
  f.plan.changes[0].owner = 'engineering-standards-builder'; await f.writePlan(); noErrors(f.check());
});

test('symlink targets are not silently replaced', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t); await rm(join(f.repo, skillPath)); await save(join(f.repo, 'user.md'), originalSkill);
  await symlink(join(f.repo, 'user.md'), join(f.repo, skillPath)); rejects(f.check(), /symbolic links/);
  assert.ok((await lstat(join(f.repo, skillPath))).isSymbolicLink());
});

async function move(f: Awaited<ReturnType<typeof fixture>>, id: string, owner: string) {
  const root = join(f.retroRoot, id), target = join(f.retroRoot, 'archive', id);
  const receipt = { schema_version: 1, id, owner, upgrade: upgradeId, source: `retro/${id}`, target: `retro/archive/${id}`, plan_sha256: sha(await readFile(join(f.planRoot, 'PLAN.md'))), approval_sha256: sha(await readFile(join(f.planRoot, 'approval.json'))), result: 'moved', time: date, entries: f.api.retroInventory(root) };
  await saveJSON(join(root, 'archive.json'), receipt); await mkdir(dirname(target), { recursive: true }); await rename(root, target);
  return { target, receipt };
}
test('archival requires completed upgrades, preserves bytes, survives source moves and seals the plan last', async t => {
  const f = await fixture(t); await f.approve(); await f.execute();
  noErrors(f.check('report', 'archive-ready', { upgrade: upgradeId }));
  rejects(f.check('upgrade', 'archive-ready'), /report must be sealed/);
  const archived = await move(f, reportId, f.report.owner);
  noErrors(f.check('report', 'archived', { upgrade: upgradeId }));
  rejects(f.check('report', 'archived', { upgrade: upgradeId, sealed: true }), /not been sealed/);
  archived.receipt.result = 'verified'; await saveJSON(join(archived.target, 'archive.json'), archived.receipt);
  noErrors(f.check('report', 'archived', { upgrade: upgradeId, sealed: true }));
  await mkdir(join(f.repo, 'data/specdev/changes/archive'), { recursive: true });
  await rename(f.sourceRoot, join(f.repo, 'data/specdev/changes/archive', sourceId));
  noErrors(f.check('report', 'archived', { upgrade: upgradeId, sealed: true }));
  noErrors(f.check('upgrade', 'archive-ready'));
  const planArchive = await move(f, upgradeId, f.plan.owner);
  planArchive.receipt.result = 'verified'; await saveJSON(join(planArchive.target, 'archive.json'), planArchive.receipt);
  noErrors(f.check('upgrade', 'archived', { sealed: true }));
  await save(join(f.repo, skillPath), 'Later legitimate Skill revision');
  noErrors(f.check('upgrade', 'archived', { sealed: true }));
  noErrors(f.check('report', 'archived', { upgrade: upgradeId, sealed: true }));
  await save(join(archived.target, 'extra.md'), 'unrecorded mutation');
  rejects(f.check('report', 'archived', { upgrade: upgradeId, sealed: true }), /inventory coverage/);
});

test('invalid CLI flags and missing roots fail without creating data', async t => {
  const f = await fixture(t), before = JSON.stringify(f.api.retroInventory(f.repo));
  for (const args of [['--report', reportId], ['--list', '--stage', 'apply'], ['--upgrade', upgradeId, '--apply'], ['--report', reportId, '--stage', 'record', '--sealed']]) {
    const run = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' }); assert.notEqual(run.status, 0);
  }
  assert.equal(JSON.stringify(f.api.retroInventory(f.repo)), before);
});
