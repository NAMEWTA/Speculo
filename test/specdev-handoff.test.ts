import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, writeFile, rm, rename, readdir, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, type TestContext } from 'node:test';

const methodRoot=join(process.cwd(),'template');
const script=join(methodRoot,'workflows/specdev/common/tools/validate-handoff.mjs');
const handoff=await import(pathToFileURL(script).href);
const session='20261016T021000Z', task='001-implement-a1', change='2026-10-16-handoff';
const taskText=(id=task)=>`---\nschema_version: 1\nsession: "${session}"\ntask: "${id}"\nkind: implementation\nchange: ${change}\n---\n\n# Task\n\n## Goal\nLead fixture-lead assigns a fixed response to fixture-worker.\n\n## Inputs\nRead the selected Work and README acceptance.\n\n## Workspace and Scope\nUse this fixture; only response.txt is writable. Lead owns shared build output.\n\n## Acceptance\nCheck the response equals the fixture input. Lead owns integration verification.\n\n## Return\nWrite this task's REPORT.md and notify the original tool channel.\n`;
const reportText=(status='completed',id=task)=>`# Report\n\nSession: ${session}\nTask: ${id}\nStatus: ${status}\n\n## 聚焦交接\nThe assigned candidate is ready for Lead acceptance.\n\n## 产物与验证\nFixture response matches; no external command ran.\n\n## 问题与下一步\nLead verifies the actual candidate.\n`;
const locator=(path='/external/session-42.jsonl')=>({path});
const rejected=(result:{errors:string[]},pattern:RegExp)=>assert.match(result.errors.join('\n'),pattern);

async function fixture(t:TestContext) {
  const repo=await realpath(await mkdtemp(join(tmpdir(),'speculo-handoff-')));
  t.after(()=>rm(repo,{recursive:true,force:true}));
  const root=join(repo,'data/specdev/changes',change), round=join(root,'sessions',session), dir=join(round,task);
  await mkdir(dir,{recursive:true});
  await writeFile(join(root,'README.md'),'# Fixture\n\nOutcome: active\n');
  await writeFile(join(dir,'TASK.md'),taskText());
  const input={projectRoot:repo,methodRoot,stateRoot:'data',change,session,task,stage:'dispatch'};
  const check=(overrides:Record<string,unknown>={})=>handoff.validateHandoff({...input,...overrides});
  const save=(value:unknown)=>writeFile(join(dir,'session-locator.json'),JSON.stringify(value));
  return {repo,root,round,dir,input,check,save};
}

test('handoff supports an optional log path and delivery without modifying input or Outcome',async t=>{
  const f=await fixture(t), original=await readFile(join(f.dir,'TASK.md'));
  assert.deepEqual(f.check().errors,[]);
  assert.deepEqual(await readdir(f.dir),['TASK.md']);
  await f.save(locator()); assert.deepEqual(f.check().errors,[]);
  await writeFile(join(f.dir,'REPORT.md'),reportText());
  rejected(f.check(),/already delivered/);
  assert.deepEqual(f.check({stage:'return'}).errors,[]);
  assert.deepEqual(await readFile(join(f.dir,'TASK.md')),original);
  assert.equal(await readFile(join(f.root,'README.md'),'utf8'),'# Fixture\n\nOutcome: active\n');
  assert.deepEqual((await readdir(f.dir)).sort(),['REPORT.md','TASK.md','session-locator.json']);
});

test('all terminal reports work without a locator; missing reports and invalid statuses fail',async t=>{
  const f=await fixture(t);rejected(f.check({stage:'return'}),/required path/);
  for (const status of ['completed','blocked','failed','cancelled']) {
    await writeFile(join(f.dir,'REPORT.md'),reportText(status));
    assert.deepEqual(f.check({stage:'return'}).errors,[]);
  }
  for (const status of ['idle','DONE','working','completed / failed','']) {
    await writeFile(join(f.dir,'REPORT.md'),reportText(status));
    rejected(f.check({stage:'return'}),/terminal status/);
  }
  assert.deepEqual((await readdir(f.dir)).sort(),['REPORT.md','TASK.md']);
});

test('strict TASK YAML, required sections and REPORT identity reject ambiguous handoffs',async t=>{
  const f=await fixture(t);
  for (const [text,pattern] of [
    [taskText().replace('schema_version: 1','schema_version: 2'),/schema_version 1/],
    [taskText().replace('kind: implementation','kind: implementation\nkind: review'),/unique|duplicate|Map keys/i],
    [taskText('002-other'),/TASK identity/],
    [taskText().replace(`change: ${change}`,'change: 2026-10-16-other'),/change mismatch/],
    [taskText().replace('kind: implementation','kind: arbitrary'),/invalid kind/],
    [taskText().replace('kind: implementation','kind: implementation\nprovider_session_id: invented'),/unknown metadata/],
    [taskText().replace('## Acceptance','## Missing'),/Acceptance section/],
    [taskText().replace('## Acceptance\nCheck the response equals the fixture input. Lead owns integration verification.','## Acceptance\n<!-- not actual visible input -->'),/empty Acceptance/],
    ['# Legacy input\nKeep the old dispatch untouched.\n',/frontmatter/],
  ] as const) {
    await writeFile(join(f.dir,'TASK.md'),text);rejected(f.check(),pattern);
    assert.equal(await readFile(join(f.dir,'TASK.md'),'utf8'),text);
  }
  await writeFile(join(f.dir,'TASK.md'),taskText());
  for (const text of [reportText('completed','002-other'),reportText().replace(`Session: ${session}`,'```\nSession: '+session+'\n```')]) {
    await writeFile(join(f.dir,'REPORT.md'),text);rejected(f.check({stage:'return'}),/REPORT identity/);
  }
  await writeFile(join(f.dir,'REPORT.md'),reportText().replace('Status: completed','Status: completed\nStatus: failed'));
  rejected(f.check({stage:'return'}),/duplicate Status/);
});

test('names, sequence collisions, traversal and cancelled changes cannot dispatch',async t=>{
  const f=await fixture(t);
  for (const name of ['20260230T021000Z','20261016T251000Z','20261016T021000Z-00','20261016T021000Z-001','../../escape']) rejected(f.check({session:name}),/orchestration session/);
  for (const id of ['000-empty','0001-extra','002-Upper','1-short','../escape']) rejected(f.check({task:id}),/task sequence/);
  await mkdir(join(f.round,'001-duplicate'));rejected(f.check(),/occupied/);
  await rm(join(f.round,'001-duplicate'),{recursive:true});
  rejected(f.check({change:'../escape'}),/identity-conflict/);
  await writeFile(join(f.root,'README.md'),'Outcome: cancelled\n');rejected(f.check(),/active change/);
});

test('locator contains only a path; invalid optional records are not silently ignored',async t=>{
  const f=await fixture(t);
  for (const value of [null,{},[],{path:null},{path:42},{path:''},{...locator(),tool:'fixture'},{...locator(),schema_version:1},{...locator(),session,task},{entry:'provider://session/42'}]) {
    await f.save(value);assert.ok(f.check().errors.length,JSON.stringify(value));
  }
  await writeFile(join(f.dir,'session-locator.json'),'{partial');rejected(f.check(),/JSON|property|position/i);
  await writeFile(join(f.dir,'session-locator.json'),JSON.stringify(locator()).replace(/}$/,',"__proto__":{}}'));
  rejected(f.check(),/unknown __proto__/);
});

test('locator accepts absolute log paths and rejects relative or placeholder addresses without opening logs',async t=>{
  const f=await fixture(t);
  for (const path of ['/external/nonexistent.jsonl','C:\\Users\\worker\\sessions\\rollout.jsonl','\\\\remote-host\\share\\session.jsonl','/external/native-history.txt']) {
    await f.save(locator(path));assert.deepEqual(f.check().errors,[],path);
  }
  for (const path of ['sessions/latest.jsonl','C:relative.jsonl','\\rooted-but-no-drive.jsonl','/logs/<session>.jsonl','/logs/{session}.jsonl','/unknown/session.jsonl','/logs/.../session.jsonl',' /external/session.jsonl','/external/session.jsonl\n','provider://session/42']) {
    await f.save(locator(path));assert.ok(f.check().errors.length,path);
  }
});

test('separate tasks can reference the same tool log without duplicating task identity in the locator',async t=>{
  const f=await fixture(t);await f.save(locator());assert.deepEqual(f.check().errors,[]);
  const second='002-review-a1', secondDir=join(f.round,second);
  await mkdir(secondDir);await writeFile(join(secondDir,'TASK.md'),taskText(second).replace('kind: implementation','kind: review'));
  await writeFile(join(secondDir,'session-locator.json'),JSON.stringify(locator()));
  assert.deepEqual(f.check({task:second}).errors,[]);
  assert.deepEqual(await readFile(join(f.dir,'session-locator.json')),await readFile(join(secondDir,'session-locator.json')));
});

test('a log path can be added after delivery without changing frozen input or report',async t=>{
  const f=await fixture(t);await writeFile(join(f.dir,'REPORT.md'),reportText());
  const files=['TASK.md','REPORT.md'], before=await Promise.all(files.map(file=>readFile(join(f.dir,file))));
  assert.deepEqual(f.check({stage:'return'}).errors,[]);
  await f.save(locator());assert.deepEqual(f.check({stage:'return'}).errors,[]);
  for(const [i,file] of files.entries()) assert.deepEqual(await readFile(join(f.dir,file)),before[i]);
});

test('symlinked task, locator and report paths are rejected, including dangling optional files',{skip:process.platform==='win32'},async t=>{
  const f=await fixture(t), outside=join(f.repo,'outside');await mkdir(outside);
  await rename(f.dir,join(outside,'task'));await symlink(join(outside,'task'),f.dir);
  rejected(f.check(),/symbolic links/);await rm(f.dir);await rename(join(outside,'task'),f.dir);
  await symlink(join(outside,'missing.json'),join(f.dir,'session-locator.json'));rejected(f.check(),/symbolic links/);
  await rm(join(f.dir,'session-locator.json'));await writeFile(join(outside,'REPORT.md'),reportText());
  await symlink(join(outside,'REPORT.md'),join(f.dir,'REPORT.md'));rejected(f.check({stage:'return'}),/symbolic links/);
});

test('archived handoffs remain unchanged and new retries retain prior reports',async t=>{
  const f=await fixture(t);await writeFile(join(f.dir,'REPORT.md'),reportText('failed'));await f.save(locator());
  const files=['TASK.md','REPORT.md','session-locator.json'], before=await Promise.all(files.map(file=>readFile(join(f.dir,file))));
  const retry='002-fix-a1';await mkdir(join(f.round,retry));await writeFile(join(f.round,retry,'TASK.md'),taskText(retry));
  assert.deepEqual(f.check({task:retry}).errors,[]);
  await writeFile(join(f.root,'README.md'),'Outcome: completed\n');
  const target=join(f.repo,'data/specdev/changes/archive',change);await mkdir(join(f.repo,'data/specdev/changes/archive'));await rename(f.root,target);
  rejected(f.check({stage:'return'}),/archived handoffs/);
  for(const [i,file] of files.entries()) assert.deepEqual(await readFile(join(target,'sessions',session,task,file)),before[i]);
});

test('published locator schema validates with a complete JSON Schema engine',async()=>{
  const require=createRequire(import.meta.url), Ajv=require('ajv/dist/2020.js').default;
  const schema=JSON.parse(await readFile(join(methodRoot,'workflows/specdev/common/schemas/session-locator.schema.json'),'utf8'));
  const validate=new Ajv({strict:true}).compile(schema);
  assert.equal(validate(locator()),true,JSON.stringify(validate.errors));
  for(const value of [null,{}, {path:42},{path:''},{...locator(),tool:'fixture'},{...locator(),provider:{session_id:'42'}}]) {
    assert.equal(validate(value),false);assert.ok(handoff.validateSessionLocator(value).length);
  }
});

test('CLI has stable exit codes and does not mutate runtime files',async t=>{
  const f=await fixture(t), args=[script,'--repo',f.repo,'--method-root',methodRoot,'--state-root','data','--change',change,'--session',session,'--task',task,'--stage','dispatch'];
  const result=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'}));assert.deepEqual(result.errors,[]);
  assert.equal(spawnSync(process.execPath,[...args,'--stage','return']).status,2);
  assert.equal(spawnSync(process.execPath,[...args,'--unsupported','value']).status,2);
  assert.equal(spawnSync(process.execPath,[...args.slice(0,-1),'return']).status,1);
  assert.deepEqual(await readdir(f.dir),['TASK.md']);
});
