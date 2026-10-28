import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveCoordination, validateProjectCoordination, type CoordinationChoice, type OrchestrationMode } from '../src/coordination.js';
import type { AssetCatalog } from '../src/assets.js';
const dispatch = await import(pathToFileURL(join(process.cwd(),'template/references/coordination/scripts/validate-dispatch.mjs')).href);
const modes: OrchestrationMode[] = ['host','cli','orca','herdr'];
const noProbe = () => { throw new Error('unexpected tool discovery'); };

test('direct and ordinary parallel tools need no delegate, configuration or tool probing', () => {
  for (const intent of ['direct','parallel-tools'] as const) {
    const result = resolveCoordination({intent,authorizedModes:[],check:noProbe});
    assert.equal(result.execution,intent); assert.deepEqual(result.checked,[]);
    assert.deepEqual(Object.keys(result).sort(),['checked','choice','execution','reason','source']);
  }
  assert.deepEqual(resolveCoordination({intent:'direct',request:{mode:'host',model:'required-current-model',selection:'required'},authorizedModes:[],check:c=>{assert.equal(c.mode,'host');return {available:true};}}).choice,{mode:'host',model:'required-current-model',selection:'required'});
  assert.equal(resolveCoordination({intent:'direct',request:{mode:'host',model:'unavailable',selection:'required'},authorizedModes:[],check:()=>({available:false})}).execution,'blocked');
  // Successive work units do not introduce a handoff or a worker lifecycle.
  for (let i=0;i<3;i++) assert.equal(resolveCoordination({intent:'direct',authorizedModes:[],check:noProbe}).execution,'direct');
});

test('main Agent proposes an authorized native or external channel without saved configuration', () => {
  for (const mode of modes) {
    const checked: OrchestrationMode[]=[];
    const result=resolveCoordination({intent:'delegate',rationale:'Independent bounded context needed',proposal:{mode} as CoordinationChoice,authorizedModes:[mode],check:c=>{checked.push(c.mode);return {available:true};}});
    assert.equal(result.execution,'delegate'); assert.equal(result.choice.mode,mode); assert.deepEqual(checked,[mode]);
  }
});

test('saved preferences and project allowed_modes do not grant current authorization', () => {
  const project={schema_version:2 as const,defaults:{mode:'herdr' as const},rules:[],allowed_modes:['herdr' as const]};
  assert.equal(resolveCoordination({intent:'delegate',rationale:'terminal supervision',project,authorizedModes:[],check:noProbe}).execution,'blocked');
  assert.equal(resolveCoordination({intent:'delegate',rationale:'alternate context',project,proposal:{mode:'cli'},authorizedModes:['cli'],check:noProbe}).execution,'blocked');
  assert.equal(resolveCoordination({intent:'direct',project,authorizedModes:[],check:noProbe}).execution,'direct');
});

test('required request and approved stage cannot be skipped or silently replaced', () => {
  for (const field of ['request','approved'] as const) {
    const chosen={mode:'orca' as const,selection:'required' as const};
    const common={intent:'delegate' as const,rationale:'user requires Orca',authorizedModes:modes,proposal:{mode:'cli' as const},[field]:chosen};
    const result=resolveCoordination({...common,check:c=>{assert.equal(c.mode,'orca');return {available:false};}});
    assert.equal(result.execution,'blocked'); assert.deepEqual(result.checked,['orca']);
    assert.equal(resolveCoordination({...common,intent:'direct',check:noProbe}).execution,'blocked');
    assert.equal(resolveCoordination({...common,[field]:{mode:'orca'},intent:'parallel-tools',check:noProbe}).execution,'blocked');
    assert.equal(resolveCoordination({...common,[field]:{mode:'orca',fallback:['host']},check:noProbe}).execution,'blocked');
  }
});

test('preferred unavailable choice falls back only as allowed and leaves preferences unchanged', () => {
  const request={mode:'herdr' as const,selection:'preferred' as const,fallback:['host' as const]};
  const before=JSON.stringify(request);
  const result=resolveCoordination({intent:'delegate',rationale:'supervised terminal',request,authorizedModes:['herdr','host'],check:c=>{assert.equal(c.mode,'herdr');return {available:false,reason:'not managed'};}});
  assert.equal(result.execution,'direct'); assert.equal(result.choice.mode,'host'); assert.deepEqual(result.checked,['herdr']); assert.equal(JSON.stringify(request),before);
  assert.equal(resolveCoordination({intent:'delegate',rationale:'supervised terminal',request,authorizedModes:['herdr'],check:()=>({available:false})}).execution,'blocked');
  assert.equal(resolveCoordination({intent:'delegate',rationale:'supervised terminal',request:{mode:'herdr',selection:'preferred'},authorizedModes:modes,check:()=>({available:false})}).execution,'blocked');
});

test('project stage/work precedence protects required choices; soft defaults permit reasoned proposals', () => {
  const project={schema_version:2 as const,defaults:{mode:'host' as const},rules:[
    {work_id:'specdev/implement',choice:{mode:'cli' as const,selection:'required' as const}},
    {work_id:'specdev/implement',stage:'review',choice:{mode:'orca' as const,selection:'required' as const}},
  ]};
  for (const [stage,mode] of [['review','orca'],['implement','cli']]) {
    const result=resolveCoordination({intent:'delegate',rationale:'approved independent execution',project,workId:'specdev/implement',stage,proposal:{mode:'herdr'},authorizedModes:modes,check:()=>({available:true})});
    assert.equal(result.choice.mode,mode);
  }
  const result=resolveCoordination({intent:'delegate',rationale:'separate terminal capability',project,workId:'other/work',proposal:{mode:'herdr'},authorizedModes:['herdr'],check:()=>({available:true})});
  assert.equal(result.choice.mode,'herdr');
  assert.equal(resolveCoordination({intent:'delegate',proposal:{mode:'herdr'},authorizedModes:modes,check:noProbe}).execution,'blocked');
});

test('fallback does not transfer CLI-specific model, guide or interaction to another channel', () => {
  const seen: CoordinationChoice[]=[];
  const result=resolveCoordination({intent:'delegate',rationale:'bounded alternate capability',request:{mode:'cli',tool:'selected-cli',model:'selected-model',guide:'selected-guide',interaction:'headless',selection:'preferred',fallback:['orca']},authorizedModes:modes,check:c=>{seen.push(c);return {available:c.mode==='orca'};}});
  assert.equal(result.execution,'delegate'); assert.deepEqual(seen[1],{mode:'orca'});
});

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
