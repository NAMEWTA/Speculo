#!/usr/bin/env node
/** Validate the refactor audit without using historical mappings at runtime. */
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path='scripts/data/asset-disposition.json',ledger=JSON.parse(await readFile(resolve(root,path),'utf8'));
const errors=[],sources=new Set(),targets=new Set([path]);
const safe=p=>typeof p==='string'&&p.length>0&&!p.startsWith('/')&&!/[\\:]/.test(p)&&!p.split('/').some(s=>s==='..'||s==='.'||!s);
if(ledger.schema_version!==2||!/^[a-f0-9]{40}$/.test(ledger.baseline))errors.push('invalid audit schema/baseline');
for(const r of ledger.files??[]){
 if(!safe(r.source)||sources.has(r.source)||!/^[a-f0-9]{64}$/.test(r.sha256)||!r.reason)errors.push('invalid source disposition '+r.source);
 sources.add(r.source);
 if(!['preserved','rewritten','moved','moved-and-rewritten','merged','retired'].includes(r.action))errors.push('invalid action '+r.source);
 if(r.action==='retired'&&r.target!==null)errors.push('retired asset has live target '+r.source);
 if(r.target!==null){if(!safe(r.target))errors.push('unsafe target '+r.target);else targets.add(r.target);}
}
for(const p of ledger.added??[])if(!safe(p)||targets.has(p))errors.push('invalid added path '+p);else targets.add(p);
const actions={};for(const r of ledger.files??[])actions[r.action]=(actions[r.action]??0)+1;
if(ledger.summary?.baseline_files!==sources.size||ledger.summary?.added!==(ledger.added??[]).length)errors.push('audit summary file counts differ from recorded entries');
for(const action of new Set([...Object.keys(actions),...Object.keys(ledger.summary?.actions??{})]))if(actions[action]!==ledger.summary?.actions?.[action])errors.push('audit summary action count differs: '+action);
for(const p of targets)try{if(!(await stat(resolve(root,p))).isFile())errors.push('target is not a file '+p);}catch{errors.push('missing target '+p);}
const current=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))];
for(const p of current)try{await stat(resolve(root,p));if(!targets.has(p))errors.push('current source has no disposition '+p);}catch(e){if(e.code!=='ENOENT')throw e;}
// A shallow CI checkout may not contain the historical commit. Its absence never becomes a false hash claim.
try{const baseline=execFileSync('git',['ls-tree','-r','--name-only','-z',ledger.baseline],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).split('\0').filter(Boolean);for(const p of baseline)if(!sources.has(p))errors.push('baseline file omitted '+p);if(baseline.length!==sources.size)errors.push('baseline file count mismatch');}catch{console.log('disposition: historical commit not present; checking recorded coverage and current targets');}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`disposition: ${sources.size} original files and ${targets.size} current files accounted for`);
