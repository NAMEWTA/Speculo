import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('template/workflows/specdev/specdev-t-triage/scripts/publish-status.mjs');
function root(t:{after(fn:()=>void):void}) {const dir=mkdtempSync(join(tmpdir(),'specdev-status-md-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
function add(base:string,name:string,kind:'active'|'archive'|'legacy',origin='local') {
  const dir=join(base,kind==='active'?'changes':kind==='archive'?'changes/archive':`archive/${name.slice(0,7)}`,name);mkdirSync(dir,{recursive:true});
  if(kind==='legacy')writeFileSync(join(dir,'.status.json'),JSON.stringify({...JSON.parse(readFileSync('test/fixtures/specdev-legacy-change-v6.json','utf8')),change:name,change_status:'archived',archived:true,current_work:null,archive_path:`<Path>{roots.state}/specdev/archive/${name.slice(0,7)}/${name}</Path>`}));
  else writeFileSync(join(dir,'README.md'),`# Work\nOutcome: ${kind==='active'?'active':'completed'}\n`);
  writeFileSync(join(dir,'publish.md'),`---\nchange: ${name}\norigin: ${origin}\npublish_action: published\n---\n| ticket | kind | title | labels | number | url | marker | state |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| T-01 | bug | local fact | bug | 1 | fixture | record | created |\n`);return dir;
}
function run(root:string) {return spawnSync(process.execPath,[script,'--state-root',root,'--json'],{encoding:'utf8'});}
test('statistics count new active/new archives/legacy history once, preserve old bytes and ignore unrelated folders',t=>{
  const base=root(t);add(base,'2026-10-14-current','active');add(base,'2026-10-13-sealed','archive');const old=add(base,'2025-01-03-history','legacy','intake');const before=readFileSync(join(old,'.status.json'));
  mkdirSync(join(base,'changes/notes'));writeFileSync(join(base,'changes/notes/publish.md'),'not an object');
  const result=run(base);assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout);assert.equal(data.ledgers,3);assert.equal(data.published_issues,3);assert.deepEqual(data.origin,{local:2,intake:1});assert.deepEqual(readFileSync(join(old,'.status.json')),before);
});
test('statistics reject duplicate stable identity, malformed Outcome and linked ledger without guessing',t=>{
  const base=root(t),name='2026-10-14-same',active=add(base,name,'active');add(base,name,'archive');assert.match(run(base).stderr,/identity-conflict/);rmSync(join(base,'changes/archive'),{recursive:true});
  writeFileSync(join(active,'README.md'),'Outcome: active\nOutcome: completed\n');assert.match(run(base).stderr,/outcome-invalid/);
  writeFileSync(join(active,'README.md'),'Outcome: active\n');rmSync(join(active,'publish.md'));writeFileSync(join(base,'outside.md'),'secret');symlinkSync('../../outside.md',join(active,'publish.md'));assert.match(run(base).stderr,/path-unsafe/);
});
