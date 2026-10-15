import {appendReviewFixture} from './helpers/review-fixture.js';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

test('Direct Spec current execution is independent of native or Herdr selection and reads without mutation', t => {
  const f = fixture(t); const r = f.record(true);
  for (const mode of ['lead', 'herdr']) {
    mkdirSync(join(f.repo,'data/coordination'), {recursive:true});
    writeFileSync(join(f.repo,'data/coordination/project.json'), JSON.stringify({schema_version:1,defaults:{mode},rules:[]}));
    f.save(r); const before = readFileSync(f.file);
    assert.deepEqual(f.validate(), []); assert.deepEqual(readChangeExecution(f.root), [r]);
    assert.deepEqual(readFileSync(f.file), before);
  }
});

test('Direct Spec worktree creates, restores, validates candidate and integrates without fabricated Tickets', t => {
  const f = fixture(t), r = f.record(); const source = f.source(r); f.save(r);
  assert.deepEqual(f.validate(), []); assert.deepEqual(f.validate(), []);
  const candidate = f.candidate(r); assert.deepEqual(f.validate(), []);
  assert.equal(readFileSync(join(candidate,'value.txt'),'utf8'), 'after\n');
  Object.assign(r.integration,{verification:'passed',full_suite:{required:true,status:'passed',reason:null,evidence:'actual fixture read'}});
  f.git('merge','--ff-only',r.integration.candidate_sha);
  r.integration.result_sha = f.git('rev-parse','HEAD'); r.integration.status='passed';r.integration.promotion_status='applied';r.status='integrated';
  f.save(r);f.complete();assert.deepEqual(f.validate('complete'), []);
  assert.match(f.git('worktree','list','--porcelain'),new RegExp(source)); // Validation never cleans up.
  f.git('worktree','remove',source); f.git('branch','-d',r.branch); r.status='removed';f.save(r);
  assert.deepEqual(f.validate('complete'), []);assert.equal(r.integration.result_sha,r.source_checkpoint);
});

test('failed E2E, stale parent and forged completion cannot pass or move the parent', t => {
  const f=fixture(t),r=f.record();f.source(r);f.candidate(r);
  Object.assign(r.integration,{status:'failed',verification:'failed',e2e:{required:true,status:'failed',reason:null,evidence:'fixture failing check'}});
  r.status='blocked';f.save(r);assert.deepEqual(f.validate(),[]);
  f.complete();assert.match(f.validate('complete').join('\n'),/requires integrated or removed/);assert.equal(f.git('rev-parse','main'),f.base);
  r.status='integrated';f.save(r);assert.match(f.validate('complete').join('\n'),/passed candidate\/result\/E2E/);assert.equal(f.git('rev-parse','main'),f.base);
  writeFileSync(join(f.root,'README.md'),f.readme);
  r.status='integrating';r.integration.status='candidate';r.integration.verification='pending';
  writeFileSync(join(f.repo,'unrelated.txt'),'parent update\n');f.git('add','unrelated.txt');f.git('commit','-m','external parent change');
  const changed=f.git('rev-parse','main');f.save(r);assert.match(f.validate().join('\n'),/parent HEAD drifted/);assert.equal(f.git('rev-parse','main'),changed);
});

test('stale Direct Spec candidate can be rebuilt and verified against a newer parent', t => {
  const f=fixture(t),r=f.record();f.source(r);const candidate=f.candidate(r);
  writeFileSync(join(f.repo,'parent.txt'),'independent parent behavior\n');f.git('add','parent.txt');f.git('commit','-m','parent advanced');
  const parent=f.git('rev-parse','main');assert.notEqual(parent,f.base);
  f.git('worktree','remove',candidate);f.git('branch','-f',r.integration.candidate_branch,parent);
  f.git('worktree','add',candidate,r.integration.candidate_branch);
  f.at(candidate,'merge','--no-ff',r.source_checkpoint,'-m','rebuilt candidate');
  Object.assign(r.integration,{parent_before_sha:parent,candidate_sha:f.at(candidate,'rev-parse','HEAD'),candidate_tree_sha:f.at(candidate,'rev-parse','HEAD^{tree}'),method:'merge-commit',attempts:2});
  f.save(r);assert.deepEqual(f.validate(),[]);
  assert.equal(readFileSync(join(candidate,'value.txt'),'utf8'),'after\n');assert.equal(readFileSync(join(candidate,'parent.txt'),'utf8'),'independent parent behavior\n');
  f.git('merge','--ff-only',r.integration.candidate_sha);
  Object.assign(r.integration,{status:'passed',verification:'passed',result_sha:f.git('rev-parse','main'),promotion_status:'applied',full_suite:{required:true,status:'passed',reason:null,evidence:'both actual candidate files read'}});
  r.status='integrated';f.save(r);f.complete();assert.deepEqual(f.validate('complete'),[]);
  r.integration.candidate_tree_sha='0'.repeat(40);f.save(r);assert.match(f.validate('complete').join('\n'),/candidate tree/);
});

test('recovery rejects wrong repository, source drift, unsafe paths, excess attempts and identity conflicts', t => {
  const f=fixture(t),r=f.record();const source=f.source(r);f.save(r);
  const invalids=[{...r,change:'2026-10-14-foreign'},{...r,ticket_id:'T-01'}, {...r,workspace_ref:'../outside'},
    {...r,integration_owner:'foreign-lead'}, {...r,owner:'foreign-lead',integration_owner:'foreign-lead'}, {...r,integration_attempt_limit:0},
    {...r,integration:{...r.integration,attempts:4}}, {...r,branch:'other-branch'},
    {...r,integration:{...r.integration,evidence:`<Path>{roots.state}/specdev/changes/2026-10-14-foreign/evidence/direct-spec.md</Path>`}}];
  for(const bad of invalids){f.save(bad);assert.notDeepEqual(f.validate(),[],JSON.stringify(bad));}
  writeFileSync(join(f.repo,'data/specdev/config.json'),JSON.stringify({schema_version:7,execution:{max_concurrent_implementations:1,max_integration_attempts:2}}));
  f.save(r);assert.match(f.validate().join('\n'),/exceeds config max_integration_attempts/);
  rmSync(join(f.repo,'data/specdev/config.json'));
  f.save(r);f.git('worktree','remove',source);mkdirSync(source,{recursive:true});
  f.at(source,'init','-b',r.branch);assert.match(f.validate().join('\n'),/real isolated worktree/);
  rmSync(source,{recursive:true,force:true});
  symlinkSync(f.repo,source,'dir');assert.notDeepEqual(f.validate(),[]);
  rmSync(source);f.git('worktree','add',source,r.branch);f.candidate(r);
  writeFileSync(join(source,'value.txt'),'uncommitted drift\n');assert.match(f.validate().join('\n'),/source worktree is dirty/);
});

test('Ticket records retain their format, cannot mix with Direct Spec, and enforce one current writer without Goal', t => {
  const f=fixture(t),r=f.record(true);
  const ticket: Record<string, any>={...r,ticket_id:'T-01'};delete ticket.purpose;delete ticket.change;delete ticket.integration_attempt_limit;
  ticket.integration={...r.integration,evidence:`<Path>{roots.state}/specdev/changes/${change}/evidence/T-01.md</Path>`};
  f.save();writeFileSync(join(f.root,'evidence/T-01.md'),fence('Workspace Execution Record',ticket));
  assert.deepEqual(readChangeExecution(f.root),[ticket]);
  const second={...ticket,ticket_id:'T-02',integration:{...ticket.integration,evidence:`<Path>{roots.state}/specdev/changes/${change}/evidence/T-02.md</Path>`}};
  writeFileSync(join(f.root,'evidence/T-02.md'),fence('Workspace Execution Record',second));
  assert.match(f.validate('grill').join('\n'),/strictly serial/);
  f.save(r);assert.throws(()=>readChangeExecution(f.root),/cannot coexist/);
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
