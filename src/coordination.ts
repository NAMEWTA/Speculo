import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { retainedAssets, validateRetainedWorkflows } from "./retained-workflows.js";
import type { Asset, AssetCatalog } from './assets.js';
export const ORCHESTRATION_MODES=['host','orca','herdr','cli'] as const;
export type OrchestrationMode=typeof ORCHESTRATION_MODES[number];
type CoordinationChoiceFields={selection?:'required'|'preferred';tool?:string;model?:string;guide?:string;fallback?:OrchestrationMode[]};
export type CoordinationChoice=CoordinationChoiceFields&({mode:'cli';interaction?:'headless'|'interactive'}|{mode:Exclude<OrchestrationMode,'cli'>;interaction?:never});
export type ProjectCoordination={schema_version:2;defaults:CoordinationChoice;allowed_modes?:OrchestrationMode[];rules:Array<{work_id:string;stage?:string;choice:CoordinationChoice}>};
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function exact(value:Record<string,unknown>,keys:string[]){if(Object.keys(value).some(k=>!keys.includes(k)))throw new Error('coordination-policy-conflict: unknown field');}
function choice(value:unknown):asserts value is CoordinationChoice{
 if(!object(value))throw new Error('coordination-policy-conflict: choice must be an object');
 exact(value,['mode','selection','tool','model','guide','interaction','fallback']);
 if(!ORCHESTRATION_MODES.includes(value.mode as OrchestrationMode))throw new Error('coordination-policy-conflict: unknown orchestration mode');
 if(value.selection!==undefined&&(typeof value.selection!=='string'||!['required','preferred'].includes(value.selection)))throw new Error('coordination-policy-conflict: invalid selection');
 for(const key of ['tool','model','guide'])if(value[key]!==undefined&&(typeof value[key]!=='string'||!(value[key] as string).trim()))throw new Error(`coordination-policy-conflict: invalid ${key}`);
 if(value.interaction!==undefined&&(value.mode!=='cli'||typeof value.interaction!=='string'||!['headless','interactive'].includes(value.interaction)))throw new Error('coordination-policy-conflict: invalid CLI interaction');
 if(value.fallback!==undefined&&(!Array.isArray(value.fallback)||new Set(value.fallback).size!==value.fallback.length||value.fallback.some(m=>!ORCHESTRATION_MODES.includes(m))))throw new Error('coordination-policy-conflict: invalid fallback');
 if(value.selection==='required'&&Array.isArray(value.fallback)&&value.fallback.length)throw new Error('coordination-policy-conflict: required choice cannot allow fallback');
}
/** Structural validation only. This does not probe tools, choose an executor or grant permission. */
export function validateProjectCoordination(value:unknown,catalog:AssetCatalog,inactive: Asset[] = []):asserts value is ProjectCoordination{
 if(!object(value))throw new Error('coordination-policy-conflict: project facts must be an object');
 exact(value,['schema_version','defaults','rules','allowed_modes']);
 if(value.allowed_modes!==undefined&&(!Array.isArray(value.allowed_modes)||!value.allowed_modes.length||new Set(value.allowed_modes).size!==value.allowed_modes.length||value.allowed_modes.some(mode=>!ORCHESTRATION_MODES.includes(mode))))throw new Error('coordination-policy-conflict: invalid allowed_modes');
 if(value.schema_version!==2||!Array.isArray(value.rules))throw new Error('coordination-policy-conflict: expected schema 2 and rules; preserve older configuration and establish a new v2 configuration explicitly');
 choice(value.defaults);
 const withinLimits=(selected:CoordinationChoice)=>{if(selected.selection==='required'&&Array.isArray(value.allowed_modes)&&!value.allowed_modes.includes(selected.mode))throw new Error('coordination-policy-conflict: required choice outside allowed_modes');};
 withinLimits(value.defaults);const seen=new Set<string>();
 for(const rule of value.rules){
  if(!object(rule))throw new Error('coordination-policy-conflict: invalid rule');exact(rule,['work_id','stage','choice']);choice(rule.choice);withinLimits(rule.choice);
  const asset=[...catalog.assets,...inactive].find(a=>a.kind==='work-skill'&&a.id===rule.work_id);
  if(!asset||rule.stage!==undefined&&(typeof rule.stage!=='string'||!asset.stages.includes(rule.stage)))throw new Error('coordination-policy-conflict: unknown Work or stage');
  const key=`${rule.work_id}:${rule.stage??'*'}`;if(seen.has(key))throw new Error('coordination-policy-conflict: duplicate rule '+key);seen.add(key);
 }
}
export async function readProjectCoordination(stateRoot:string,catalog:AssetCatalog,inactive?: Asset[]):Promise<ProjectCoordination|null>{
 let source:string;try{source=await readFile(join(stateRoot,'coordination','project.json'),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
 if (inactive === undefined) {
  inactive = [];
  let metadata;
  try { metadata = JSON.parse(await readFile(join(stateRoot,'install.json'),'utf8')); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  if (metadata) {
   if (metadata.schema_version !== 4) throw new Error('invalid-retained-installation-schema');
   inactive = retainedAssets(validateRetainedWorkflows(metadata.retained_workflows,catalog.assets.filter(a=>a.kind==='domain-skill').map(a=>a.domain!)));
  }
 }
 const value:unknown=JSON.parse(source);validateProjectCoordination(value,catalog,inactive);return value;
}
