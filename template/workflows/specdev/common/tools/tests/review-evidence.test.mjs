import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateIndependentReview} from '../review-evidence.mjs';
import {appendReviewFixture} from './review-fixture.mjs';
function fixture(t) {
 const repo=mkdtempSync(join(tmpdir(),'review-evidence-')),root=join(repo,'data/change');
 t.after(()=>rmSync(repo,{recursive:true,force:true}));mkdirSync(root,{recursive:true});
 const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','test@example.invalid');
 writeFileSync(join(repo,'.gitignore'),'data/\n');writeFileSync(join(repo,'value.txt'),'before');git('add','.');git('-c','commit.gpgsign=false','commit','-m','base');
 const base=git('rev-parse','HEAD');writeFileSync(join(repo,'value.txt'),'after');
 const save=(options={})=>appendReviewFixture({repo,root,base,...options});
 const validate=(options={})=>validateIndependentReview(root,'evidence/direct-spec.md',{repoRoot:repo,checkCurrent:true,expectedHead:git('rev-parse','HEAD'),...options});
 return {repo,root,git,base,save,validate};
}
test('one actual independent reviewer may pass both axes in native or explicitly selected modes',t=>{
 const f=fixture(t);
 for(const mode of ['native','herdr','orca','cli']) {const r=f.save({mode});const before=readFileSync(r.path);assert.deepEqual(f.validate(),[]);assert.deepEqual(readFileSync(r.path),before);}
});
test('self review, unknown identity, mismatched original output and missing dispatch cannot certify completion',t=>{
 const f=fixture(t),r=f.save();
 for(const text of [
  r.text.replace('Implementers: native:implementer','Implementers: native:reviewer'),
  r.text.replaceAll('native:reviewer','unknown'),
  r.text.replace('Result: verified','Result: pending'),
  r.text.replace('Mode: native','Mode: herdr'),
  r.text.replace('Axis: standards','Axis: specification'),
  r.text.replace('| standards | native:reviewer | pass |','| standards | native:reviewer | skipped |'),
  r.text.replace('Verification: evidence/direct-spec.md#review-receipt','Verification: evidence/direct-spec.md#review-input'),
  r.text.replace('## Independent Review','## Self Review'),
 ]) {writeFileSync(r.path,text);assert.ok(f.validate().length,text);}
 writeFileSync(r.path,r.text);assert.ok(f.validate({requiredImplementers:['native:merge-fixer']}).length);
});
test('changed code, sources and final HEAD invalidate review, unrelated reports do not',t=>{
 const f=fixture(t),r=f.save();assert.deepEqual(f.validate(),[]);
 writeFileSync(join(f.root,'another-report.md'),'New report outside code scope');assert.deepEqual(f.validate(),[]);
 writeFileSync(join(f.repo,'value.txt'),'new fix');assert.match(f.validate().join('\n'),/drift/);
 f.save();assert.deepEqual(f.validate(),[]);
 writeFileSync(join(f.root,'evidence/fixture-standards.md'),'different standards');assert.match(f.validate().join('\n'),/source drift/);
 f.save();f.git('add','value.txt');f.git('-c','commit.gpgsign=false','commit','-m','new checkpoint');assert.match(f.validate().join('\n'),/checkpoint/);
 f.save();assert.deepEqual(f.validate(),[]);
});
test('valid old record is readable without reusing it for changed current inputs',t=>{
 const f=fixture(t);f.save();writeFileSync(join(f.repo,'value.txt'),'later work');
 assert.deepEqual(f.validate({checkCurrent:false}),[]);assert.ok(f.validate().length);
});
test('unsafe evidence paths, missing specification and empty change cannot fabricate approval',t=>{
 const f=fixture(t),r=f.save();
 writeFileSync(r.path,r.text.replace('Input: evidence/direct-spec.md#review-input','Input: ../outside'));
 assert.ok(f.validate().length);
 writeFileSync(r.path,r.text.replace('"kind": "specification"','"kind": "instructions"'));
 assert.match(f.validate().join('\n'),/required review sources/);
 writeFileSync(join(f.repo,'value.txt'),'before');f.save();assert.match(f.validate().join('\n'),/no-diff/);
});
test('owning results must match original axes and committed delivery rejects later dirty code',t=>{
 const f=fixture(t);f.git('add','value.txt');f.git('-c','commit.gpgsign=false','commit','-m','reviewed implementation');
 const head=f.git('rev-parse','HEAD'),r=f.save({head});
 assert.deepEqual(f.validate({requireDelivery:true}),[]);
 assert.match(f.validate({expectedResults:{standards:'request-changes',specification:'pass'}}).join('\n'),/differs from the owning report/);
 writeFileSync(join(f.repo,'value.txt'),'unreviewed repair');
 assert.deepEqual(f.validate(),[]); // C may inspect the immutable commit itself.
 assert.match(f.validate({requireDelivery:true}).join('\n'),/unreviewed working-tree delivery/);
 writeFileSync(join(f.repo,'value.txt'),'after');writeFileSync(join(f.repo,'new-feature.txt'),'unreviewed addition');
 assert.match(f.validate({requireDelivery:true}).join('\n'),/new-feature/);
 rmSync(join(f.repo,'new-feature.txt'));writeFileSync(join(f.root,'README.md'),'Outcome: completed\n');
 assert.deepEqual(f.validate({requireDelivery:true}),[]);
 const failed=r.text.replace('Axis: standards\nResult: pass','Axis: standards\nResult: request-changes').replace('| standards | native:reviewer | pass |','| standards | native:reviewer | request-changes |');
 writeFileSync(r.path,failed);
 assert.match(f.validate({requirePassed:false,expectedResults:{standards:'pass',specification:'pass'}}).join('\n'),/differs from the owning report/);
});
