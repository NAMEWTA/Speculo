import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { attachReviewFixture } from './helpers/review-fixture.js';
const methodRoot=resolve('template');
const {validateChange}=await import(pathToFileURL(join(methodRoot,'workflows/specdev/common/tools/validate-specdev.mjs')).href);
const name='2026-10-28-low-risk-review';
function fixture(t:{after(fn:()=>void):void},independent=false) {
 const repo=mkdtempSync(join(tmpdir(),'specdev-risk-entry-')),root=join(repo,'data/specdev/changes',name);
 t.after(()=>rmSync(repo,{recursive:true,force:true}));mkdirSync(root,{recursive:true});
 writeFileSync(join(root,'owner.md'),'Owner: native:implementer\nWork: specdev/implement\nSource: fixture host request\n');
 writeFileSync(join(root,'checked.md'),'Method: executable fixture\nSource: value fixture\nObserved: accepted output and unchanged input checked\nResult: passed\nCommand: fixture-check\nExit: 0\n');
 writeFileSync(join(root,'README.md'),`# Small documentation correction\nOutcome: completed\n${independent?'Review-Independence: required\n':''}\n## Ownership\nOwner: native:implementer\nWork: specdev/implement\nEvidence: owner.md\n\n<a id="scope"></a>\n## Scope\nCorrect one documented value without changing external behavior.\n\n<a id="acceptance"></a>\n## Acceptance\n- AC-1: documented value equals the verified current value.\n\n## Current Work\n- [x] Correct the value.\n\n<a id="verification"></a>\n## Verification\n| AC | Result | Evidence |\n|---|---|---|\n| AC-1 | passed | checked.md |\n\n## Next Steps\nReport verified delivery.\n`);
 const validate=()=>validateChange(root,'complete',repo,null,null,{methodRoot,stateRoot:'data'}).errors as string[];
 return {repo,root,validate};
}
test('complete entry accepts observed low-risk self review without Ticket Goal session or independent reviewer',t=>{
 const f=fixture(t);attachReviewFixture(f.repo,f.root,'README.md','self');
 assert.deepEqual(f.validate(),[]);
 for(const path of ['ticket','goal-plan.md','sessions','spec.md','.status.json'])assert.equal(existsSync(join(f.root,path)),false,path);
 const readme=readFileSync(join(f.root,'README.md'),'utf8');
 assert.doesNotMatch(readme,/Original dispatch|Verification: .*review-receipt/);
 writeFileSync(join(f.repo,'reviewed-value.txt'),'unreviewed later change\n');
 assert.match(f.validate().join('\n'),/drift/);
});
test('complete entry does not let self-review override an original required-independent decision',t=>{
 const f=fixture(t,true);attachReviewFixture(f.repo,f.root,'README.md','self');
 assert.match(f.validate().join('\n'),/requires independent/);
});
test('complete entry accepts actual independent fixture when original scope requires it',t=>{
 const f=fixture(t,true);attachReviewFixture(f.repo,f.root);
 assert.deepEqual(f.validate(),[]);
});

test('review-stage change-wide CR enforces every non-cancelled Ticket risk and independence requirement', async t=>{
 const {execFileSync}=await import('node:child_process');
 const {appendReviewFixture,appendSelfReviewFixture}=await import('./helpers/review-fixture.js');
 const f=fixture(t);
 writeFileSync(join(f.root,'README.md'),readFileSync(join(f.root,'README.md'),'utf8').replace('Outcome: completed','Outcome: active'));
 const git=(...args:string[])=>execFileSync('git',['-C',f.repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 attachReviewFixture(f.repo,f.root,'README.md','self');
 const base=git('rev-parse','HEAD');git('add','reviewed-value.txt');git('-c','commit.gpgsign=false','commit','-m','review fixture implementation');
 const head=git('rev-parse','HEAD'),artifact='reviews/CR-001.md';
 mkdirSync(join(f.root,'reviews'));mkdirSync(join(f.root,'ticket'));
 const report=`---\nschema_version: 1\nartifact: code-review\nchange: ${name}\nreview_id: CR-001\nfixed_point: ${base}\nhead: ${head}\nstatus: approved\nstandards_result: pass\nspecification_result: pass\n---\n## Fixed Input\nFrozen implementation.\n## 标准\nOriginal checks.\n## 规范\nOriginal checks.\n## Summary\nApproved.\n`;
 const review=(independent=false)=>{
  writeFileSync(join(f.root,artifact),report);
  (independent?appendReviewFixture:appendSelfReviewFixture)({repo:f.repo,root:f.root,artifact,base,head,files:['reviewed-value.txt']});
 };
 // Minimal original Ticket policy records isolate the CR gate; ordinary Ticket
 // schema diagnostics are intentionally not interpreted as review approval.
 const ticket=(id:string,status:string,policy:string)=>writeFileSync(join(f.root,'ticket',`${id}.md`),`---\nid: ${id}\nstatus: ${status}\n${policy}\n---\n# Original owned scope\n`);
 const reviewErrors=()=> (validateChange(f.root,'review',f.repo,null,null,{methodRoot,stateRoot:'data'}).errors as string[]).filter(error=>error.includes('independent-review: reviews/CR-001.md'));
 ticket('T-01','done','risk: low');ticket('T-02','cancelled','risk: critical');review();
 assert.deepEqual(reviewErrors(),[]);
 for(const policy of ['risk: high','risk: critical','risk: low\nreview_independence: required']) {
  ticket('T-02','done',policy);
  assert.match(reviewErrors().join('\n'),/requires independent|understates/);
  review(true);assert.deepEqual(reviewErrors(),[]);review();
 }
 ticket('T-02','cancelled','risk: critical');assert.deepEqual(reviewErrors(),[]);
});
