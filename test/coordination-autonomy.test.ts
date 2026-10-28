import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateProjectCoordination } from '../src/coordination.js';
import type { AssetCatalog } from '../src/assets.js';
const dispatch = await import(pathToFileURL(join(process.cwd(),'template/references/coordination/scripts/validate-dispatch.mjs')).href);

test('project limit schema rejects empty, duplicate or unknown channels', () => {
  const catalog={assets:[]} as unknown as AssetCatalog;
  for (const allowed_modes of [[],['host','host'],['invented'],'host']) assert.throws(()=>validateProjectCoordination({schema_version:2,defaults:{mode:'host'},rules:[],allowed_modes},catalog));
  validateProjectCoordination({schema_version:2,defaults:{mode:'host'},rules:[],allowed_modes:['host','cli']},catalog);
  assert.throws(()=>validateProjectCoordination({schema_version:2,defaults:{mode:'orca',selection:'required'},rules:[],allowed_modes:['host']},catalog),/required choice outside/);
});

const inline=()=>({handoff:'inline',stage:'dispatch',task:'read-api-contract',scope:{synchronous:true,readOnly:true,externalEffects:false,parallelWrites:false,recoveryRequired:false,formalDelivery:false}});
test('bounded read-only inline dispatch/return works without any directory or session', () => {
  assert.deepEqual(dispatch.validateDispatch(inline()).errors,[]);
  const result={task:'read-api-contract',callId:'tool-call-17',status:'completed',summary:'Inspected public API contract',findings:['No changed API'],checks:['Read source declarations'],unverified:['No live service request']};
  assert.deepEqual(dispatch.validateDispatch({...inline(),stage:'return',callId:'tool-call-17',result}).errors,[]);
});

test('async, effects, parallel writing, recovery and formal delivery cannot use inline handoff', () => {
  for (const key of ['synchronous','readOnly','externalEffects','parallelWrites','recoveryRequired','formalDelivery'] as const) {
    const input=inline(); input.scope[key]=!input.scope[key]; assert.ok(dispatch.validateDispatch(input).errors.length,key);
  }
  assert.ok(dispatch.validateDispatch({...inline(),scope:{readOnly:true}}).errors.length);
  assert.ok(dispatch.validateDispatch({...inline(),session:'20261028T060000Z'}).errors.length);
});

test('inline return must match the real call/task and cannot turn idle or unknown into completion', () => {
  const result={task:'read-api-contract',callId:'tool-call-17',status:'completed',summary:'Inspected source',findings:[],checks:[],unverified:[]};
  for (const changed of [{task:'other-task'},{callId:'different-call'},{status:'idle'},{status:'unknown'},{summary:''},{checks:'passed'}]) assert.ok(dispatch.validateDispatch({...inline(),stage:'return',callId:'tool-call-17',result:{...result,...changed}}).errors.length);
  assert.ok(dispatch.validateDispatch({...inline(),result}).errors.length);
  assert.ok(dispatch.validateDispatch({...inline(),stage:'return',result}).errors.length);
});


test('inline CLI consumes a correlated return on stdin without creating handoff files', () => {
  const script=join(process.cwd(),'template/references/coordination/scripts/validate-dispatch.mjs');
  const input={...inline(),stage:'return',callId:'call-3',result:{task:'read-api-contract',callId:'call-3',status:'completed',summary:'Reviewed source',findings:[],checks:[],unverified:[]}};
  const run=(value:unknown,args=['--inline'])=>spawnSync(process.execPath,[script,...args],{input:JSON.stringify(value),encoding:'utf8'});
  assert.equal(run(input).status,0);
  assert.equal(run({...input,result:{...input.result,callId:'wrong'}}).status,1);
  assert.equal(run(input,['--inline','--stage','return']).status,2);
  assert.equal(spawnSync(process.execPath,[script,'--inline'],{input:'invalid-json',encoding:'utf8'}).status,2);
});
