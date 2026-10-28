import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {validateCompletionReview,validateIndependentReview} from '../review-evidence.mjs';
import {validateExecutionRecord} from '../execution-context.mjs';
import {validateChange} from '../validate-specdev.mjs';
import {appendReviewFixture,appendSelfReviewFixture} from './review-fixture.mjs';
function fixture(t,changePath='data/change') {
 const repo=mkdtempSync(join(tmpdir(),'review-policy-')),root=join(repo,changePath);
 t.after(()=>rmSync(repo,{recursive:true,force:true}));mkdirSync(root,{recursive:true});
 const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','test@example.invalid');
 writeFileSync(join(repo,'.gitignore'),'data/\n');writeFileSync(join(repo,'value.txt'),'before');git('add','.');git('-c','commit.gpgsign=false','commit','-m','base');
 const base=git('rev-parse','HEAD');writeFileSync(join(repo,'value.txt'),'after');
 const save=(options={})=>appendSelfReviewFixture({repo,root,base,...options});
 const validate=(options={})=>validateCompletionReview(root,'evidence/direct-spec.md',{repoRoot:repo,checkCurrent:true,expectedHead:base,...options});
 return {repo,root,base,git,save,validate};
}

function reviewStageFixture(t) {
 const name='2026-10-28-review-history',f=fixture(t,`data/specdev/changes/${name}`);
 const readme='# Review scope\nOutcome: active\n\n## Ownership\nOwner: native:implementer\nWork: specdev/code-review\nEvidence: owner.md\n\n## Next Steps\nReturn the actual findings.\n';
 writeFileSync(join(f.root,'README.md'),readme);
 writeFileSync(join(f.root,'owner.md'),'Owner: native:implementer\nWork: specdev/code-review\nSource: fixture review request\n');
 const commit=value=>{
  writeFileSync(join(f.repo,'value.txt'),value);f.git('add','value.txt');
  f.git('-c','commit.gpgsign=false','commit','-m','review fixture implementation');
 };
 commit('first reviewed change');
 const review=(id,independent=false)=>{
  const artifact=`reviews/${id}.md`,path=join(f.root,artifact),head=f.git('rev-parse','HEAD');
  mkdirSync(join(f.root,'reviews'),{recursive:true});
  writeFileSync(path,`---\nschema_version: 1\nartifact: code-review\nchange: ${name}\nreview_id: ${id}\nfixed_point: ${f.base}\nhead: ${head}\nstatus: approved\nstandards_result: pass\nspecification_result: pass\n---\n## Fixed Input\nFrozen implementation.\n## 标准\nOriginal checks.\n## 规范\nOriginal checks.\n## Summary\nApproved.\n`);
  return (independent?appendReviewFixture:appendSelfReviewFixture)({repo:f.repo,root:f.root,artifact,base:f.base,head});
 };
 const validate=(stage='review')=>validateChange(f.root,stage,f.repo,null,null,{methodRoot:resolve(import.meta.dirname,'../../../../..'),stateRoot:'data'}).errors;
 const policy=value=>writeFileSync(join(f.root,'README.md'),`${readme}\n${value}\n`);
 return {...f,commit,review,policy,validate};
}
test('low-risk primary-agent checks finish with both axes and no separate agent receipt or session',t=>{
 const f=fixture(t),r=f.save(),before=readFileSync(r.path);
 assert.deepEqual(f.validate(),[]);assert.deepEqual(readFileSync(r.path),before);
 assert.doesNotMatch(r.text,/Verification:|Original dispatch|review-receipt/);
 assert.deepEqual(readdirSync(f.root),['evidence']);
 assert.match(validateIndependentReview(f.root,'evidence/direct-spec.md').join('\n'),/requires independent/);
});
test('risk and explicit independence are read from the original scope, not a low-risk self claim',t=>{
 const f=fixture(t);f.save();
 writeFileSync(join(f.root,'README.md'),'Review-Independence: required\n');
 assert.match(f.validate().join('\n'),/requires independent/);
 writeFileSync(join(f.root,'README.md'),'Review-Risk: high\n');
 assert.match(f.validate().join('\n'),/understates|requires independent/);
 writeFileSync(join(f.root,'README.md'),'Review-Risk: medium\n');
 assert.match(f.validate().join('\n'),/understates/);
 f.save({risk:'medium'});assert.deepEqual(f.validate(),[]);
 writeFileSync(join(f.root,'README.md'),'Review-Risk: low\n');
 writeFileSync(join(f.repo,'AGENTS.md'),'Review-Independence: required\n');
 assert.match(f.validate().join('\n'),/requires independent/);
 rmSync(join(f.repo,'AGENTS.md'));
 assert.match(f.validate({requiredRisk:'high'}).join('\n'),/understates|requires independent/);
 assert.match(f.validate({requireIndependent:true}).join('\n'),/requires independent/);
});
test('high-risk Ticket blocks self completion; genuine independent evidence passes and renamed implementer fails',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'ticket'));
 writeFileSync(join(f.root,'ticket/T-01.md'),'---\nid: T-01\nstatus: ready\nrisk: high\n---\n');
 f.save();assert.match(f.validate({ticketId:'T-01'}).join('\n'),/understates|requires independent/);
 const r=appendReviewFixture({repo:f.repo,root:f.root,base:f.base});
 assert.deepEqual(f.validate({ticketId:'T-01'}),[]);
 writeFileSync(r.path,r.text.replace('Implementers: native:implementer','Implementers: native:reviewer'));
 assert.match(f.validate({ticketId:'T-01'}).join('\n'),/participated/);
 writeFileSync(r.path,r.text.replaceAll('native:reviewer','unknown'));
 assert.match(f.validate({ticketId:'T-01'}).join('\n'),/invalid reviewer/);
});
test('final review includes other active Ticket requirements, cancelled scope does not impose a new gate',t=>{
 const f=fixture(t);f.save();mkdirSync(join(f.root,'ticket'));
 writeFileSync(join(f.root,'ticket/T-02.md'),'---\nid: T-02\nstatus: done\nrisk: critical\n---\n');
 assert.deepEqual(f.validate({ticketId:'T-01'}),[]);
 assert.match(f.validate({final:true}).join('\n'),/understates|requires independent/);
 writeFileSync(join(f.root,'ticket/T-02.md'),'---\nid: T-02\nstatus: cancelled\nrisk: critical\n---\n');
 assert.deepEqual(f.validate({final:true}),[]);
});
test('self review keeps source, final code and required implementer integrity',t=>{
 const f=fixture(t),r=f.save();
 assert.match(f.validate({requiredImplementers:['native:other-fixer']}).join('\n'),/implementation owner missing/);
 writeFileSync(r.path,r.text.replace('Verified-By: native:implementer','Verified-By: native:other'));
 assert.match(f.validate().join('\n'),/actual reviewing owner/);
 writeFileSync(r.path,r.text);writeFileSync(join(f.repo,'value.txt'),'later fix');
 assert.match(f.validate().join('\n'),/drift/);
 f.save();assert.deepEqual(f.validate(),[]);
 writeFileSync(join(f.root,'evidence/fixture-spec.md'),'Changed acceptance');
 assert.match(f.validate().join('\n'),/source drift/);
});
test('an inapplicable axis needs a specific original reason; unknown/failure is not an exemption',t=>{
 const f=fixture(t),r=f.save();
 const na=r.text.replace('Axis: standards\nResult: pass','Axis: standards\nResult: not-applicable').replace('| standards | native:implementer | pass |','| standards | native:implementer | not-applicable |');
 writeFileSync(r.path,na);assert.match(f.validate().join('\n'),/applicability reason/);
 writeFileSync(r.path,na.replace('Axis: standards\n','Reason: No executable code changed; the documentation facts are checked under specification.\nAxis: standards\n'));
 assert.deepEqual(f.validate(),[]);
 writeFileSync(r.path,r.text.replace('| standards | native:implementer | pass |','| standards | native:implementer | skipped |'));
 assert.match(f.validate().join('\n'),/has not passed/);
});
test('verified execution accepts primary-agent review but still enforces observed checks and required E2E',t=>{
 const f=fixture(t);f.save();
 writeFileSync(join(f.root,'checks.md'),'<a id="verified"></a>\n## Actual checks\nResult: passed\nObserved: fixture command exercised the acceptance behavior.\nCommand: fixture-check\nExit: 0\n');
 const record={schema_version:1,ticket_id:'T-01',workspace_context:'README.md#execution-context',implementation_owners:['native:implementer'],status:'verified',checkpoint:'evidence/T-01.md#review-input',verification:{status:'passed',evidence:'checks.md#verified',e2e:{required:false,status:'not-required',reason:'No runtime interaction in this fixture',evidence:null}},attempts:0};
 f.save({artifact:'evidence/T-01.md'});
 const validate=()=>validateExecutionRecord(f.root,record,{owner:'native:implementer'},{repoRoot:f.repo,checkCurrent:true});
 assert.deepEqual(validate(),[]);
 record.verification.e2e={required:true,status:'pending',reason:null,evidence:null};
 assert.match(validate().join('\n'),/requires passed checks/);
 record.verification.e2e={required:false,status:'not-required',reason:'No runtime interaction',evidence:null};
 writeFileSync(join(f.root,'checks.md'),'<a id="verified"></a>\n## Actual checks\nResult: passed\n');
 assert.match(validate().join('\n'),/actual observations/);
});
test('one primary owner can complete consecutive scopes without mandatory reviewer handoff',t=>{
 const f=fixture(t);
 for(const id of ['T-01','T-02']) {
  const artifact=`evidence/${id}.md`;f.save({artifact});
  assert.deepEqual(validateCompletionReview(f.root,artifact,{repoRoot:f.repo,ticketId:id,checkCurrent:true}),[]);
 }
 assert.ok(!readdirSync(f.root).includes('sessions'));
});

test('review entry keeps earlier self checks when the latest numeric CR satisfies a new independent requirement',t=>{
 const f=reviewStageFixture(t),old=f.review('CR-999');
 assert.deepEqual(f.validate(),[]);
 f.commit('later high-risk implementation');f.policy('Review-Risk: high');
 f.review('CR-1000',true);
 assert.deepEqual(f.validate(),[]);
 assert.equal(readFileSync(old.path,'utf8'),old.text,'historical review bytes stay unchanged');
 f.review('CR-1000');
 const errors=f.validate();
 assert.ok(errors.some(error=>error.includes('reviews/CR-1000.md') && /understates|requires independent/.test(error)));
 assert.ok(!errors.some(error=>error.includes('reviews/CR-999.md')),'current policy belongs to the adopted review');
});

test('historical CRs keep their original result integrity while only the latest input is checked for current drift',t=>{
 const f=reviewStageFixture(t),old=f.review('CR-999');
 f.commit('later reviewed change');f.review('CR-1000');
 assert.deepEqual(f.validate(),[]);
 writeFileSync(join(f.root,'evidence/fixture-standards.md'),'Changed standards for the current review.\n');
 const drift=f.validate();
 assert.ok(drift.some(error=>error.includes('reviews/CR-1000.md') && /source drift/.test(error)));
 assert.ok(!drift.some(error=>error.includes('reviews/CR-999.md')));
 f.review('CR-1000');
 writeFileSync(old.path,old.text.replace('Axis: standards\nResult: pass','Axis: standards\nResult: request-changes'));
 assert.ok(f.validate().some(error=>error.includes('reviews/CR-999.md') && /original report does not match/.test(error)));
});

test('a changed policy affects an adopted review without retroactively blocking artifact inspection',t=>{
 const f=reviewStageFixture(t);f.review('CR-001');
 f.policy('Review-Independence: required');
 assert.deepEqual(f.validate(null),[]);
 assert.ok(f.validate().some(error=>error.includes('reviews/CR-001.md') && /requires independent/.test(error)));
});
