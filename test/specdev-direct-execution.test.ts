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
  const record = (): Record<string, any> => {
    const context={schema_version:1,change,workspace_policy:'worktree',workspace_ref:`specdev-worktree/${change}`,branch:`speculo/${change}`,base_sha:base,owner:'fixture-lead',ticket_execution:'auto'};
    git('worktree','add','-b',context.branch,join(repo,context.workspace_ref),base);
    writeFileSync(join(root,'README.md'),readme+'\n<a id="execution-context"></a>\n'+fence('Execution Context',context));
    return {schema_version:1,purpose:'direct-spec',change,workspace_context:'README.md#execution-context',implementation_owners:['native:worker'],status:'active',checkpoint:null,verification:{status:'pending',evidence:null,e2e:{required:false,status:'not-required',reason:'fixture has no cross-boundary behavior',evidence:null}},attempts:0};
  };
  return {repo, root, file, git, at, base, spec, readme, record, save, validate, complete};
}

test('full multi-behavior Direct Spec runs without Ticket, Map, Goal or installed workspace', t => {
  const f = fixture(t); const before = readdirSync(f.root);
  assert.deepEqual(f.validate(), []);
  f.complete(); assert.deepEqual(f.validate('complete'), []);
  assert.deepEqual(readdirSync(f.root), before);
  assert.deepEqual(readChangeExecution(f.root), []); // A no-Ticket current snapshot can carry equivalent acceptance and review evidence.
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

for(const status of ['active','integrated']) test(`unsupported ${status} Direct Spec records cannot enter current gates and remain unchanged`,t=>{
  const f=fixture(t),r={purpose:'direct-spec',change,status,workspace_ref:`specdev-worktree/${change}/direct-spec`};
  f.git('worktree','add','-b','retained-old',join(f.repo,r.workspace_ref),f.base);f.save(r);
  if(status==='integrated')f.complete();
  const before=readFileSync(f.file),worktrees=f.git('worktree','list','--porcelain');
  assert.deepEqual(readChangeExecution(f.root),[r]); // Reading bytes does not validate the unsupported protocol.
  assert.match(f.validate(status==='integrated'?'complete':'implement').join('\n'),/unsupported execution record/);
  assert.deepEqual(readFileSync(f.file),before);assert.equal(f.git('worktree','list','--porcelain'),worktrees);
});

test('cancellation and archive preflight include Direct Spec writers, even without Ticket files', t => {
  const f=fixture(t),r=f.record();f.save(r);
  const cancelled=readFileSync(join(f.root,'README.md'),'utf8').replace('Outcome: active','Outcome: cancelled')+`\n<a id="cancellation"></a>\n## Cancellation\nSource: #request\nScope: whole change\nTime: 2026-10-14T10:00:00Z\nConfirmed-By: fixture-lead\nUndelivered: implementation cancelled\nLanded: none: source retained\nWriters: stopped: #stopped\nDependencies: none: independent\nCheckpoints: resolved: retain source, no integration\nExternal: none: no remote actions\nNext: retain source; cleanup not authorized\n<a id="request"></a>\n## Actual request\nUser cancelled this fixture task.\n<a id="stopped"></a>\n## Observed stop\nWriters: stopped\nObserved: fixture worker exited, source retained\n`;
  writeFileSync(join(f.root,'README.md'),cancelled);
  assert.match(f.validate('archive-ready').join('\n'),/writer-active/);
  r.status='cancelled';f.save(r);assert.deepEqual(f.validate('archive-ready'),[]);
  assert.match(f.git('worktree','list','--porcelain'),/direct-execution/);
  writeFileSync(join(f.root,'README.md'),cancelled.replace('Writers: stopped: #stopped','Writers: none: no writer'));
  assert.match(f.validate('archive-ready').join('\n'),/stopped/);
});
