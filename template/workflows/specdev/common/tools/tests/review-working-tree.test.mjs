import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,renameSync,chmodSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveReviewScope} from '../review-scope.mjs';

function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'review-working-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','test@example.invalid');
  git('config','core.autocrlf','false');
  for(const path of ['one.txt','removed.txt','renamed.txt']) writeFileSync(join(root,path),'original\n');
  writeFileSync(join(root,'.gitignore'),'ignored/\n');git('add','.');git('-c','commit.gpgsign=false','commit','-m','base');
  const base=git('rev-parse','HEAD');
  return {root,git,base,scope:(extra={})=>resolveReviewScope({repo:root,mode:'working-tree',base,...extra})};
}
test('working-tree freezes staged, unstaged, added, deleted, renamed and mode changes without writes',t=>{
  const f=fixture(t);
  writeFileSync(join(f.root,'one.txt'),'staged\n');f.git('add','one.txt');writeFileSync(join(f.root,'one.txt'),'final\n');
  rmSync(join(f.root,'removed.txt'));renameSync(join(f.root,'renamed.txt'),join(f.root,'new-name.txt'));
  writeFileSync(join(f.root,'new.bin'),Buffer.from([0,255,7]));chmodSync(join(f.root,'one.txt'),0o755);
  mkdirSync(join(f.root,'ignored'));writeFileSync(join(f.root,'ignored/not-selected'),'ignored');
  const before=readFileSync(join(f.root,'.git/index')), status=f.git('status','--porcelain');
  const scope=f.scope();
  assert.equal(scope.outcome,'changes');assert.equal(scope.observed_head,f.base);assert.equal(scope.head_sha,undefined);
  assert.deepEqual(scope.changed_paths,['new-name.txt','new.bin','one.txt','removed.txt','renamed.txt']);
  assert.equal(scope.working_snapshot.find(x=>x.path==='one.txt').after.mode,process.platform === 'win32' ? '100644' : '100755');
  assert.equal(scope.working_snapshot.find(x=>x.path==='removed.txt').after,null);
  assert.equal(scope.working_snapshot.find(x=>x.path==='new.bin').after.bytes,3);
  assert.deepEqual(f.scope(),scope);assert.equal(f.git('status','--porcelain'),status);assert.deepEqual(readFileSync(join(f.root,'.git/index')),before);
  writeFileSync(join(f.root,'new.bin'),Buffer.from([0,255,8]));assert.notEqual(f.scope().input_sha256,scope.input_sha256);
});
test('explicit scopes are literal, expose exclusions and retain deleted files',t=>{
  const f=fixture(t), path='literal [abc] $(touch unsafe).txt';
  writeFileSync(join(f.root,path),'literal');rmSync(join(f.root,'removed.txt'));writeFileSync(join(f.root,'one.txt'),'changed');
  const scope=f.scope({files:[path,'removed.txt']});
  assert.deepEqual(scope.changed_paths,[path,'removed.txt']);assert.deepEqual(scope.excluded_paths,['one.txt']);
  assert.equal(scope.selection,'explicit-files');
  for(const files of [[],['../outside'],['.git/config'],['one.txt','one.txt'],['missing']]) assert.throws(()=>f.scope({files}));
  for(const extra of [{head:'HEAD'},{commit:'HEAD'},{parent:1}]) assert.throws(()=>f.scope(extra));
  assert.throws(()=>f.scope({base:'missing'}));
});
test('links are read as links and directory links never disclose outside bytes',t=>{
  const f=fixture(t), outside=mkdtempSync(join(tmpdir(),'review-outside-'));
  t.after(()=>rmSync(outside,{recursive:true,force:true}));writeFileSync(join(outside,'secret'),'sensitive');
  symlinkSync(join(outside,'secret'),join(f.root,'link'));
  const scope=f.scope({files:['link']});assert.equal(scope.working_snapshot[0].after.kind,'symlink');
  symlinkSync(outside,join(f.root,'directory'),process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(()=>f.scope({files:['directory/secret']}),/symlink directory/);
});
test('unmerged index and borrowed parent repository are rejected',t=>{
  const f=fixture(t);f.git('checkout','-b','other');writeFileSync(join(f.root,'one.txt'),'other\n');f.git('commit','-am','other');
  f.git('checkout','main');writeFileSync(join(f.root,'one.txt'),'main\n');f.git('commit','-am','main');
  assert.throws(()=>f.git('merge','other'));assert.throws(()=>f.scope(),/unresolved index/);
  f.git('merge','--abort');mkdirSync(join(f.root,'nested'));
  assert.throws(()=>resolveReviewScope({repo:join(f.root,'nested'),mode:'working-tree',base:f.base}),/actual project Git root/);
});
