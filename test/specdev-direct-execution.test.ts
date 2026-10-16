import {appendReviewFixture} from './helpers/review-fixture.js';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const methodRoot = resolve('template');
const toolRoot = join(methodRoot, 'workflows/specdev/common/tools');
const { validateChange } = await import(pathToFileURL(join(toolRoot, 'validate-specdev.mjs')).href);
const { readChangeExecution } = await import(pathToFileURL(join(toolRoot, 'plan-contract.mjs')).href);
const change = '2026-10-14-direct-execution';
const fence = (heading: string, value: unknown) => `## ${heading}\n\n\x60\x60\x60json\n${JSON.stringify(value, null, 2)}\n\x60\x60\x60\n`;

function fixture(t: TestContext) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'speculo-direct-execution-')));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const root = join(repo, 'data/specdev/changes', change);
  mkdirSync(join(root, 'evidence'), { recursive: true });
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const at = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  git('config','core.autocrlf','false');
  writeFileSync(join(repo, '.gitignore'), 'data/\nspecdev-worktree/\n');
  writeFileSync(join(repo, 'value.txt'), 'before\n');
  git('add', '.'); git('commit', '-m', 'fixture baseline');
  const base = git('rev-parse', 'HEAD');
  const readme = `# Direct execution\nOutcome: active\n\n## Ownership\nOwner: fixture-lead\nEvidence: owner.md\n`;
  writeFileSync(join(root, 'README.md'), readme);
  writeFileSync(join(root, 'owner.md'), 'Owner: fixture-lead\nSource: fixture host instruction\n');
  const spec = `---\nschema_version: 3\nartifact: spec\nchange: ${change}\nstatus: ready\nready_for_tickets: true\nsources: [USER-DECISION:fixture]\n---\n# Complete Spec\n## 1. 问题与目标\nUpdate a stored value and preserve compatibility.\n## 2. 解决方案与外部行为\nTwo observable behaviors, including a public interface.\n## 4. 验收合同\nAC-001: reads return the updated value.\nAC-002: old callers remain supported.\n## 5. 范围\nOnly value.txt in this fixture.\n## 9. 验证策略\nRead the actual value and exercise old calls.\n### 未决问题\n无。\n`;
  writeFileSync(join(root, 'spec.md'), spec);
  const file = join(root, 'evidence/direct-spec.md');
  const acceptance = ['AC-001', 'AC-002'].map(id => ({id, result:'passed', method:'disposable fixture', source:'value.txt', observed:'fixture value and compatibility checked'}));
  let review = '';
  const save = (record?: Record<string, any>) => writeFileSync(file, '# Direct Spec Evidence\n' + (record ? fence('Workspace Execution Record', record) : 'Current workspace checkpoint; no integration claimed.\n') + fence('Acceptance Verification', acceptance) + review);
  save();
  const validate = (stage = 'implement') => validateChange(root, stage, repo, null, null, {methodRoot, stateRoot:'data'}).errors as string[];
  const complete = () => {
    writeFileSync(join(root, 'README.md'), readme.replace('Outcome: active', 'Outcome: completed'));
    if (readFileSync(join(repo,'value.txt'),'utf8') === 'before\n') writeFileSync(join(repo,'value.txt'),'after\n');
    const result = appendReviewFixture({repo,root,base,spec:join(root,'spec.md')});
    review = '\n<!-- synthetic-independent-review -->' + result.text.split('\n<!-- synthetic-independent-review -->')[1];
  };
  const record = (current = false): Record<string, any> => ({
    purpose:'direct-spec', change, integration_attempt_limit:3,
    owner:'fixture-lead', implementation_owner:'fixture-worker', integration_owner:'fixture-lead', provider:'git',
    base_sha:base, parent_branch:'main', branch: current ? 'main' : `speculo/${change}/direct-spec`,
    workspace_ref: current ? 'current' : `specdev-worktree/${change}/direct-spec`, source_checkpoint:null,
    status:'active', updated_at:'2026-10-14T10:00:00Z',
    integration:{status:'pending', parent_ref:'main', parent_before_sha:null, source_sha:null, candidate_sha:null,
      candidate_tree_sha:null, candidate_branch:null, candidate_workspace_ref:null, result_sha:null, method:null,
      conflict_paths:[], verification:'pending', full_suite:{required:true,status:'pending',reason:null,evidence:null},
      e2e:{required:false,status:'not-required',reason:'fixture has no cross-boundary behavior',evidence:null},
      evidence:`<Path>{roots.state}/specdev/changes/${change}/evidence/direct-spec.md</Path>`, attempts:0,promotion_status:'pending'}
  });
  const source = (r: Record<string, any>) => {
    const path = join(repo, r.workspace_ref);
    git('worktree', 'add', '-b', r.branch, path, base);
    return path;
  };
  const candidate = (r: Record<string, any>) => {
    const sourcePath = join(repo, r.workspace_ref);
    writeFileSync(join(sourcePath, 'value.txt'), 'after\n');
    at(sourcePath, 'add', 'value.txt'); at(sourcePath, 'commit', '-m', 'fixture implementation');
    r.source_checkpoint = at(sourcePath, 'rev-parse', 'HEAD');
    r.status = 'review'; save(r); assert.deepEqual(validate(), []);
    const branch = `speculo/integration/${change}/direct-spec`, locator = `specdev-worktree/.integration/${change}/direct-spec`;
    const path = join(repo, locator);
    git('worktree', 'add', '-b', branch, path, 'main');
    at(path, 'merge', '--ff-only', r.source_checkpoint);
    Object.assign(r.integration, {status:'candidate', parent_before_sha:git('rev-parse','main'), source_sha:r.source_checkpoint,
      candidate_sha:at(path,'rev-parse','HEAD'), candidate_tree_sha:at(path,'rev-parse','HEAD^{tree}'), candidate_branch:branch,
      candidate_workspace_ref:locator, method:'fast-forward', attempts:1});
    r.status = 'integrating'; save(r);
    return path;
  };
  return {repo, root, file, git, at, base, spec, readme, record, save, validate, complete, source, candidate};
}

test('full multi-behavior Direct Spec runs without Ticket, Map, Goal or installed workspace', t => {
  const f = fixture(t); const before = readdirSync(f.root);
  assert.deepEqual(f.validate(), []);
  f.complete(); assert.deepEqual(f.validate('complete'), []);
  assert.deepEqual(readdirSync(f.root), before);
  assert.deepEqual(readChangeExecution(f.root), []); // Historical current Evidence remains readable.
  writeFileSync(join(f.root, 'spec.md'), f.spec.replace('ready_for_tickets: true', 'ready_for_tickets: false'));
  assert.match(f.validate().join('\n'), /Direct Spec.*ready/);
});
test('final Direct Spec gate rejects dirty code behind a previously approved commit',t=>{
  const f=fixture(t);f.complete();f.git('add','value.txt');f.git('commit','-m','reviewed implementation');
  appendReviewFixture({repo:f.repo,root:f.root,base:f.base,head:f.git('rev-parse','HEAD'),spec:join(f.root,'spec.md')});
  assert.deepEqual(f.validate('complete'),[]);
  writeFileSync(join(f.repo,'value.txt'),'unreviewed repair\n');
  assert.match(f.validate('complete').join('\n'),/unreviewed working-tree delivery/);
});
test('formal C report cannot approve findings that its original reviewer rejected',t=>{
  const f=fixture(t);writeFileSync(join(f.repo,'value.txt'),'after\n');f.git('add','value.txt');f.git('commit','-m','review input');
  const head=f.git('rev-parse','HEAD'),artifact='reviews/CR-001.md';mkdirSync(join(f.root,'reviews'));
  writeFileSync(join(f.root,artifact),`---\nschema_version: 1\nartifact: code-review\nchange: ${change}\nreview_id: CR-001\nfixed_point: ${f.base}\nhead: ${head}\nstatus: approved\nstandards_result: pass\nspecification_result: pass\n---\n## Fixed Input\nActual commits.\n## 标准\nSee original output.\n## 规范\nSee original output.\n## Summary\nApproved.\n`);
  const r=appendReviewFixture({repo:f.repo,root:f.root,artifact,base:f.base,head,spec:join(f.root,'spec.md')});
  assert.deepEqual(f.validate('review'),[]);
  const rejected=r.text.replace('Axis: standards\nResult: pass','Axis: standards\nResult: request-changes').replace('| standards | native:reviewer | pass |','| standards | native:reviewer | request-changes |');
  writeFileSync(r.path,rejected);assert.match(f.validate('review').join('\n'),/standards has not passed/);
  writeFileSync(r.path,rejected.replace('status: approved','status: request-changes'));
  assert.match(f.validate('review').join('\n'),/differs from the owning report/);
  writeFileSync(r.path,rejected.replace('status: approved','status: request-changes').replace('standards_result: pass','standards_result: request-changes'));
  assert.deepEqual(f.validate('review'),[]);
});

test('legacy active Direct Spec records are readable but cannot resume without explicit reconciliation', t => {
  const f=fixture(t),r=f.record();f.source(r);f.save(r);
  const before=readFileSync(f.file),worktrees=f.git('worktree','list','--porcelain');
  assert.deepEqual(readChangeExecution(f.root),[r]);
  assert.match(f.validate().join('\n'),/legacy-active-execution.*explicit reconciliation/);
  assert.deepEqual(readFileSync(f.file),before);assert.equal(f.git('worktree','list','--porcelain'),worktrees);
});

test('frozen legacy completed Direct Spec integration evidence stays readable without migration', t => {
  const f=fixture(t),r=f.record();f.source(r);const sourcePath=join(f.repo,r.workspace_ref);
  writeFileSync(join(sourcePath,'value.txt'),'after\n');f.at(sourcePath,'add','value.txt');f.at(sourcePath,'commit','-m','historical implementation');
  r.source_checkpoint=f.at(sourcePath,'rev-parse','HEAD');
  f.git('merge','--ff-only',r.source_checkpoint);
  Object.assign(r.integration,{status:'passed',verification:'passed',parent_before_sha:f.base,source_sha:r.source_checkpoint,candidate_sha:r.source_checkpoint,candidate_tree_sha:f.git('rev-parse','HEAD^{tree}'),candidate_branch:`speculo/integration/${change}/direct-spec`,candidate_workspace_ref:`specdev-worktree/.integration/${change}/direct-spec`,result_sha:r.source_checkpoint,method:'fast-forward',attempts:1,promotion_status:'applied',full_suite:{required:true,status:'passed',reason:null,evidence:'historical fixture observations'}});
  r.status='integrated';f.save(r);f.complete();
  const before=readFileSync(f.file);assert.deepEqual(f.validate('complete'),[]);assert.deepEqual(readFileSync(f.file),before);
});

test('cancellation and archive preflight include Direct Spec writers, even without Ticket files', t => {
  const f=fixture(t),r=f.record();f.source(r);f.save(r);
  const cancelled=f.readme.replace('Outcome: active','Outcome: cancelled')+`\n<a id="cancellation"></a>\n## Cancellation\nSource: #request\nScope: whole change\nTime: 2026-10-14T10:00:00Z\nConfirmed-By: fixture-lead\nUndelivered: implementation cancelled\nLanded: none: source retained\nWriters: stopped: #stopped\nDependencies: none: independent\nCheckpoints: resolved: retain source, no integration\nExternal: none: no remote actions\nNext: retain source; cleanup not authorized\n<a id="request"></a>\n## Actual request\nUser cancelled this fixture task.\n<a id="stopped"></a>\n## Observed stop\nWriters: stopped\nObserved: fixture worker exited, source retained\n`;
  writeFileSync(join(f.root,'README.md'),cancelled);
  assert.match(f.validate('archive-ready').join('\n'),/writer-active/);
  r.status='cancelled';f.save(r);assert.deepEqual(f.validate('archive-ready'),[]);
  assert.match(f.git('worktree','list','--porcelain'),/direct-spec/);
  writeFileSync(join(f.root,'README.md'),cancelled.replace('Writers: stopped: #stopped','Writers: none: no writer'));
  assert.match(f.validate('archive-ready').join('\n'),/stopped/);
});
