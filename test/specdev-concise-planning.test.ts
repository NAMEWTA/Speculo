import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const tools=resolve('template/workflows/specdev/common/tools');
const {validateChange,validateTicket}=await import(pathToFileURL(join(tools,'validate-specdev.mjs')).href);
const {validateTicketPlan}=await import(pathToFileURL(join(tools,'plan-contract.mjs')).href);
const name='2026-10-15-vertical-slice';
test('concise Spec and vertical Ticket preserve readiness without mandatory implementation recipes',t=>{
 const repo=mkdtempSync(join(tmpdir(),'concise-planning-')),root=join(repo,'data/specdev/changes',name);
 t.after(()=>rmSync(repo,{recursive:true,force:true}));mkdirSync(root,{recursive:true});
 writeFileSync(join(root,'README.md'),'# Request\nOutcome: active\n');
 const spec=`---\nschema_version: 3\nartifact: spec\nchange: ${name}\nstatus: ready\nready_for_tickets: true\nsources: [USER-DECISION:export]\n---\n# Export\n## 问题与目标\nLet a caller export selected records.\n## 解决方案与外部行为\nReturn only authorized records; reject unauthorized requests.\n## 验收合同\nAC-001: an authorized caller receives selected records.\n## 范围\nIN export; REUSE authorization; OUT import.\n## 验证策略\nExisting public API integration seam covers AC-001 and denied access.\n### 未决问题\n无。\n`;
 writeFileSync(join(root,'spec.md'),spec);
 const validate=()=>validateChange(root,'spec',repo,null,null,{methodRoot:resolve('template'),stateRoot:'data'}).errors;
 assert.deepEqual(validate(),[]);
 writeFileSync(join(root,'spec.md'),spec.replace('无。','Unresolved authorization policy.'));
 assert.match(validate().join('\n'),/unresolved/);writeFileSync(join(root,'spec.md'),spec);
 const template=readFileSync(resolve('template/workflows/specdev/specdev-t-tickets/assets/ticket-template.md'),'utf8');
 const header=template.slice(0,template.indexOf('\n---',4)+4).replaceAll('<YYYY-MM-DD-topic>',name).replace('<标题>','Export selected records').replace('status: draft','status: ready').replace('ready: false','ready: true').replace('skill_scan: unreviewed','skill_scan: Inspected project Skill roots; none applicable').replace('<触发该深度的事实>','Public API slice with existing authorization').replace('kind: bug','kind: feature');
 const body=`\n# Export selected records\n## 目标与来源\nAC-001 of the accepted Spec; make authorized records exportable.\n## 行为与范围\nAPI request through authorization and serialization to the download response; reuse storage and exclude import.\n## 验收标准\n- [ ] AC-001 returns exactly the selected authorized records.\n## 验证方法\n| Behavior | Seam | Expected |\n|---|---|---|\n| Export and denied access | existing API test | exact rows or forbidden |\nE2E disposition: not-required: public API integration covers the boundary.\nEnvironment: change-workspace\n## 执行约束\nUse frontmatter ownership and invoke I-implement; no extra implementation order.\n### 未决问题\n无。\n`;
 const ticket=join(root,'01-export.md');writeFileSync(ticket,header+body);
 let errors:string[]=[];let artifact=validateTicket(ticket,errors);assert.deepEqual(errors,[]);assert.deepEqual(validateTicketPlan(artifact,{repoRoot:repo}),[]);
 for(const [bad,pattern] of [[body.replace('- [ ] AC-001 returns exactly the selected authorized records.','No acceptance yet.'),/acceptance checklist/],[body.replace('无。','Decide who may export.'),/unresolved/]] as const) {
  writeFileSync(ticket,header+bad);errors=[];validateTicket(ticket,errors);assert.match(errors.join('\n'),pattern);
 }
 writeFileSync(ticket,header.replace('writable_paths: ["<Path>src/example/**</Path>"]','writable_paths: []')+body);errors=[];validateTicket(ticket,errors);assert.match(errors.join('\n'),/writable_paths/);
});
