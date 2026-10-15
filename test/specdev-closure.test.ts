import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {validateChangeClosure, readChangeOwner} = await import(pathToFileURL(resolve('template/workflows/specdev/common/tools/change-artifacts.mjs')).href);
const name = '2026-10-14-small';
function fixture(t: {after(fn:()=>void):void}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(),'specdev-closure-'))); t.after(()=>rmSync(base,{recursive:true,force:true}));
  const root = join(base,'changes',name); mkdirSync(root,{recursive:true});
  return {base,root,file:join(root,'README.md')};
}
const ownership = `## Ownership\nOwner: session-one\nEvidence: #handoff\n\n<a id="handoff"></a>\n## Original session\nSession: session-one\nSource: actual host request 2026-10-14\nObserved: same owner continues this change\n`;
const content = `# Small task\nOutcome: completed\n\n<a id="scope"></a>\n## Scope\nRepair the parser for a real date.\n<a id="acceptance"></a>\n## Acceptance\n- [x] AC-1 rejects a non-existent date.\n<a id="verification"></a>\n## Verification\n| AC | Result | Evidence |\n| --- | --- | --- |\n| AC-1 | passed | #observed-test |\n<a id="observed-test"></a>\n## Actual verification\nMethod: disposable parser fixture\nSource: test/date.test.ts at current source\nObserved: invalid date rejected, valid leap day accepted\nCommand: node --test test/date.test.js\nExit: 0\nResult: passed\n\n${ownership}`;
test('one-file lightweight completion reads AC and handoff then defers implementation review to the full gate', t=>{
  const f=fixture(t); writeFileSync(f.file,content); const before=readFileSync(f.file);
  const result=validateChangeClosure({context:f.base,change:name,forArchive:true});
  assert.deepEqual(result.errors,[]); assert.equal(result.complete,false); assert.equal(result.scope,'complex-preflight'); // Implementation also requires the full independent review gate.
  assert.deepEqual(readdirSync(f.root),['README.md']); assert.deepEqual(readFileSync(f.file),before);
});
test('Outcome and checked tasks alone cannot bypass real evidence, owner and failed verification',t=>{
  const f=fixture(t);
  for (const bad of [content.replace('| AC-1 | passed | #observed-test |',''),content.replace('Exit: 0','Exit: 1'),content.replace('Session: session-one','Session: someone-else'),content.replace('Result: passed','Result: failed'),content.replace('#observed-test |','#verification |'),content.replace('[x]','[ ]'),content.replace('Outcome: completed','Outcome: active')]) {
    writeFileSync(f.file,bad); assert.equal(validateChangeClosure({context:f.base,change:name}).valid,false,bad);
  }
});
test('complex plan preflight cannot certify completion and immutable owner comes from actual Lead',t=>{
  const f=fixture(t); writeFileSync(f.file,content);
  writeFileSync(join(f.root,'goal-plan.md'),`---\nchange: ${name}\nlead: plan-lead\n---\n# Goal\nActual gates remain unverified.\n`);
  const result=validateChangeClosure({context:f.base,change:name}); assert.equal(result.scope,'complex-preflight'); assert.equal(result.complete,false); assert.equal(readChangeOwner(f.base,name).owner,'plan-lead');
});
test('whole-change cancellation requires original owner, decision, ended writers and resolved dependencies',t=>{
  const f=fixture(t);
  const cancelled=`# Cancelled\nOutcome: cancelled\n\n${ownership}\n<a id="cancellation"></a>\n## Cancellation\nSource: #request\nScope: Entire original change\nTime: 2026-10-14T10:00:00Z\nConfirmed-By: session-one\nUndelivered: Feature remains unimplemented\nLanded: none: analysis only\nWriters: none: no implementation was dispatched\nDependencies: none: independent change\nCheckpoints: none: no commits made\nExternal: none: no remote action requested\nNext: retain investigation; no rollback or cleanup authorized\n<a id="request"></a>\n## Original request\nUser requested cancelling the entire change in host message 42.\n`;
  writeFileSync(f.file,cancelled); assert.equal(validateChangeClosure({context:f.base,change:name,forArchive:true}).complete,true);
  for (const bad of [cancelled.replace('Confirmed-By: session-one','Confirmed-By: other'),cancelled.replace('Writers: none: no implementation was dispatched','Writers: timeout'),cancelled.replace('External: none: no remote action requested','External: unknown'),cancelled.replace('Source: #request','Source: #cancellation')]) { writeFileSync(f.file,bad); assert.equal(validateChangeClosure({context:f.base,change:name,forArchive:true}).complete,false); }
});
test('unrequested external actions are absent; requested unresolved delivery blocks only archival',t=>{
  const f=fixture(t); writeFileSync(f.file,content); writeFileSync(join(f.root,'triage.md'),`---\nchange: ${name}\nexternal_action: pending-close\npublish_action: not-requested\n---\n# Ledger\n`);
  assert.equal(validateChangeClosure({context:f.base,change:name}).valid,true);
  assert.equal(validateChangeClosure({context:f.base,change:name,forArchive:true}).complete,false);
});
test('a cancelled Ticket cannot cancel its active change or replace the whole-change decision', t=>{
  const f=fixture(t);
  mkdirSync(join(f.root,'ticket'));
  writeFileSync(join(f.root,'ticket/T-01.md'),`---\nid: T-01\nstatus: cancelled\n---\n# Cancelled optional task\nOnly this task was cancelled.\n`);
  writeFileSync(f.file,content.replace('Outcome: completed','Outcome: active'));
  const active=validateChangeClosure({context:f.base,change:name,forArchive:true});
  assert.equal(active.complete,false);
  assert.ok(active.errors.some((value:string)=>value.includes('change is still active')));
  writeFileSync(f.file,content.replace('Outcome: completed','Outcome: cancelled'));
  const missingDecision=validateChangeClosure({context:f.base,change:name,forArchive:true});
  assert.equal(missingDecision.complete,false);
  assert.ok(missingDecision.errors.some((value:string)=>value.includes('cancellation')));
});
test('a legacy cancellation marker without a new cancellation contract cannot authorize archival', t=>{
  const f=fixture(t);
  writeFileSync(f.file,`# Legacy cancellation\n${ownership}`);
  const legacy=JSON.stringify({change:name,change_status:'cancelled'});
  writeFileSync(join(f.root,'.status.json'),legacy);
  const result=validateChangeClosure({context:f.base,change:name,forArchive:true});
  assert.equal(result.complete,false);
  assert.ok(result.errors.some((value:string)=>value.includes('mixed-protocol')));
  assert.equal(readFileSync(join(f.root,'.status.json'),'utf8'),legacy);
});
