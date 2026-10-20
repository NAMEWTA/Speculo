import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('template/workflows/specdev/specdev-t-triage/scripts/publish-status.mjs');
function root(t:{after(fn:()=>void):void}) {const dir=mkdtempSync(join(tmpdir(),'specdev-status-md-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
function add(base:string,name:string,kind:'active'|'archive',origin='local') {
  const dir=join(base,kind==='active'?'changes':'changes/archive',name);mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'README.md'),`# Work\nOutcome: ${kind==='active'?'active':'completed'}\n`);
  writeFileSync(join(dir,'publish.md'),`---\nchange: ${name}\norigin: ${origin}\npublish_action: published\n---\n| ticket | kind | title | labels | number | url | marker | state |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| T-01 | bug | local fact | bug | 1 | fixture | record | created |\n`);return dir;
}
function run(root:string) {return spawnSync(process.execPath,[script,'--state-root',root,'--json'],{encoding:'utf8'});}
test('statistics count current changes and archives once and leave unrelated history untouched',t=>{
  const base=root(t);add(base,'2026-10-14-current','active');add(base,'2026-10-13-sealed','archive');add(base,'2026-10-12-intake','active','intake');
  const old=join(base,'archive/2025-01/2025-01-03-history');mkdirSync(old,{recursive:true});
  const bytes='{"historical":"opaque source bytes"}\r\n';writeFileSync(join(old,'.status.json'),bytes);
  writeFileSync(join(old,'publish.md'),'Unowned historical ledger: not current publishing authority.\n');
  mkdirSync(join(base,'changes/notes'));writeFileSync(join(base,'changes/notes/publish.md'),'not an object');
  const result=run(base);assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout);assert.equal(data.ledgers,3);assert.equal(data.published_issues,3);assert.deepEqual(data.origin,{local:2,intake:1});assert.equal(readFileSync(join(old,'.status.json'),'utf8'),bytes);
});
test('statistics reject duplicate stable identity, malformed Outcome and linked ledger without guessing',t=>{
  const base=root(t),name='2026-10-14-same',active=add(base,name,'active');add(base,name,'archive');assert.match(run(base).stderr,/identity-conflict/);rmSync(join(base,'changes/archive'),{recursive:true});
  writeFileSync(join(active,'README.md'),'Outcome: active\nOutcome: completed\n');assert.match(run(base).stderr,/outcome-invalid/);
  writeFileSync(join(active,'README.md'),'Outcome: active\n');rmSync(join(active,'publish.md'));writeFileSync(join(base,'outside.md'),'secret');symlinkSync('../../outside.md',join(active,'publish.md'));assert.match(run(base).stderr,/path-unsafe/);
});
