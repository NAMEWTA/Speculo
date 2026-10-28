import assert from 'node:assert/strict';
import {test, type TestContext} from 'node:test';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {appendReviewFixture} from './helpers/review-fixture.js';

const methodRoot = resolve('template');
const toolRoot = join(methodRoot,'workflows/specdev/common/tools');
const {validateChange} = await import(pathToFileURL(join(toolRoot,'validate-specdev.mjs')).href);
const {analyzeMap} = await import(pathToFileURL(join(toolRoot,'ticket-control.mjs')).href);
const {partitionDiagnostics} = await import(pathToFileURL(join(toolRoot,'validation-diagnostics.mjs')).href);
const {readExecutionContext,resolveExecutionWorkspace,ticketPolicy} = await import(pathToFileURL(join(toolRoot,'execution-context.mjs')).href);
const fence=(heading:string,value:unknown)=>`## ${heading}\n\n\x60\x60\x60json\n${JSON.stringify(value,null,2)}\n\x60\x60\x60\n`;
const template=(path:string)=>readFileSync(join(methodRoot,'workflows/specdev',path),'utf8');

function fixture(t:TestContext,worktree=false,shared?:{repo:string,base:string}) {
  const repo=shared?.repo??realpathSync(mkdtempSync(join(tmpdir(),'speculo-change-workspace-')));
  if(!shared)t.after(()=>rmSync(repo,{recursive:true,force:true}));
  const change=shared?'2026-10-15-second':'2026-10-15-workspace',root=join(repo,'data/specdev/changes',change);
  mkdirSync(join(root,'ticket'),{recursive:true});mkdirSync(join(root,'evidence'));
  const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  if(!shared){
    git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
    writeFileSync(join(repo,'.gitignore'),'data/\nspecdev-worktree/\n');
    writeFileSync(join(repo,'one.txt'),'before one\n');writeFileSync(join(repo,'two.txt'),'before two\n');
    git('add','.');git('-c','commit.gpgsign=false','commit','-m','fixture baseline');
  }
  const base=git('rev-parse','HEAD');
  const workspace=worktree?join(repo,'specdev-worktree',change):repo;
  if(worktree)git('worktree','add','-b',`speculo/${change}`,workspace,base);
  const context:Record<string,any>={schema_version:1,change,workspace_policy:worktree?'worktree':'current',workspace_ref:worktree?`specdev-worktree/${change}`:'current',branch:worktree?`speculo/${change}`:'main',base_sha:base,owner:'native:lead',ticket_execution:'auto'};
  const saveContext=(outcome='active')=>writeFileSync(join(root,'README.md'),`# Change\nOutcome: ${outcome}\n\n## Ownership\nOwner: native:lead\nEvidence: owner.md\n\n<a id="execution-context"></a>\n${fence('Execution Context',context)}`);
  writeFileSync(join(root,'owner.md'),'Owner: native:lead\nObserved: synthetic fixture lead owns this change.\n');saveContext();
  const fill=(s:string)=>s.replaceAll('<YYYY-MM-DD-topic>',change).replace('skill_scan: unreviewed','skill_scan: fixture inspected project skills and found none').replace('deliverable_policy: unreviewed','deliverable_policy: fixture requires no quantified deliverables');
  writeFileSync(join(root,'spec.md'),fill(template('specdev-s-spec/assets/spec-template.md')).replace('status: draft','status: ready').replace('ready_for_tickets: false','ready_for_tickets: true').replace('\n存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。',''));
  writeFileSync(join(root,'tickets-map.md'),fill(template('specdev-t-tickets/assets/tickets-map-template.md')).replace('status: draft','status: ready')+'\nT-02 is independent.\n');
  const ticket=(id:string,path:string,status='ready')=>{
    const content=fill(template('specdev-t-tickets/assets/ticket-template.md')).replaceAll('T-01',id).replace('status: draft',`status: ${status}`).replace('ready: false','ready: true').replace('owner: unassigned','owner: native:lead').replaceAll('src/example/**',path).replaceAll('src/example.ts',path).replace('\n存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。','');
    const file=join(root,'ticket',`${id.slice(2)}-implementation.md`);writeFileSync(file,content);return file;
  };
  const files=[ticket('T-01','one.txt'),ticket('T-02','two.txt')];
  const setStatus=(index:number,status:string)=>writeFileSync(files[index],readFileSync(files[index],'utf8').replace(/^status: \S+/m,`status: ${status}`));
  const record=(id:string,owners=['native:implementer']):Record<string,any>=>({schema_version:1,ticket_id:id,workspace_context:'README.md#execution-context',implementation_owners:owners,status:'active',checkpoint:null,verification:{status:'pending',evidence:null,e2e:{required:false,status:'not-required',reason:'fixture has no cross-boundary behavior',evidence:null}},attempts:0});
  const save=(r:Record<string,any>,verified=false)=>{
    const id=r.ticket_id??'direct-spec',artifact=`evidence/${id}.md`;
    let content=template('specdev-i-implement/assets/evidence-template.md');
    content=content.slice(0,content.indexOf('## Workspace Execution Record'));
    if(verified){r.status='verified';r.checkpoint=`${artifact}#review-input`;r.verification.status='passed';r.verification.evidence=`${artifact}#verification`;r.attempts=1;}
    content+=fence('Workspace Execution Record',r);
    content+='\n<a id="verification"></a>\n## Actual verification\nResult: passed\nCommand: read fixture value\nExit: 0\nObserved: synthetic fixture observed the changed value.\n';
    const ids=[...new Set(readFileSync(join(root,'spec.md'),'utf8').match(/\bAC-\d+\b/g)??[])];
    content+=fence('Acceptance Verification',ids.map(id=>({id,result:'passed',method:'disposable fixture',source:'one.txt / two.txt',observed:'fixture values inspected'})));
    writeFileSync(join(root,artifact),content);
    if(verified)appendReviewFixture({repo:workspace,sourceRoot:repo,root,artifact,base,files:[id==='T-02'?'two.txt':'one.txt'],implementers:r.implementation_owners,spec:join(root,'spec.md')});
  };
  const validate=(stage='implement')=>validateChange(root,stage,repo,null,null,{methodRoot,stateRoot:'data'}).errors as string[];
  const analyze=()=>analyzeMap({mapPath:join(root,'tickets-map.md'),repoRoot:repo,methodRoot,stateRoot:'data'});
  const plan=(mode='auto',cap?:number)=>{
    let content=fill(template('specdev-p-goal-plan/assets/goal-plan-template.md')).replace('status: draft','status: ready').replace('ready_for_execution: false','ready_for_execution: true').replaceAll('<owner-or-session-locator>','native:lead').replace('ticket_execution: auto',`ticket_execution: ${mode}${cap?`\nmax_parallel_tickets: ${cap}`:''}`);
    writeFileSync(join(root,'goal-plan.md'),content);
  };
  return {repo,root,workspace,change,base,git,context,saveContext,files,setStatus,record,save,validate,analyze,plan};
}

for(const worktree of [false,true]) test(`${worktree?'change worktree':'current main'} supports independent concurrent Tickets without extra checkouts or commits`,t=>{
  const f=fixture(t,worktree),before=f.git('worktree','list','--porcelain');
  assert.deepEqual(f.analyze().errors,[]);assert.deepEqual(f.analyze().suggested_batch,['T-01','T-02']);
  for(const [i,id] of ['T-01','T-02'].entries()){f.setStatus(i,'in_progress');f.save(f.record(id));}
  writeFileSync(join(f.workspace,'one.txt'),'after one\n');writeFileSync(join(f.workspace,'two.txt'),'after two\n');
  assert.deepEqual(f.validate(),[]);assert.deepEqual(f.validate(),[]);
  assert.equal(f.git('worktree','list','--porcelain'),before);assert.equal(f.git('rev-parse','main'),f.base);
});

test('serial Ticket scheduling permits several implementers on the current Ticket',t=>{
  const f=fixture(t);f.plan('serial');f.setStatus(0,'in_progress');f.save(f.record('T-01',['native:first','native:second']));
  assert.deepEqual(f.validate(),[]);assert.deepEqual(f.analyze().suggested_batch,[]);
  assert.equal(f.analyze().max_parallel_tickets,1);
  f.setStatus(1,'in_progress');f.save(f.record('T-02'));assert.match(f.validate().join('\n'),/Ticket limit/);
});

test('Agent counts, Ticket counts and workspaces are independent constraints',t=>{
  const f=fixture(t);f.plan('parallel',2);
  assert.deepEqual(f.analyze().suggested_batch,['T-01','T-02']);
  const before=f.git('worktree','list','--porcelain');
  f.context.concurrent_implementation_limit=1;f.saveContext();
  assert.deepEqual(f.analyze().suggested_batch,['T-01','T-02']); // The read-only analyzer never invents an Agent topology.
  assert.equal(f.git('worktree','list','--porcelain'),before);
  assert.deepEqual(ticketPolicy({ticket_execution:'parallel',max_parallel_tickets:3},{ticket_execution:'serial'}),{ticket_execution:'serial',max_parallel_tickets:1});
});

test('eligible exposes alternative legal batches instead of authorizing only the greedy suggestion',t=>{
  const f=fixture(t);f.plan('parallel');
  for(let i=0;i<2;i++)writeFileSync(f.files[i],readFileSync(f.files[i],'utf8').replace('resource_claims: []','resource_claims: ["db:shared"]'));
  const before=f.files.map(file=>readFileSync(file,'utf8'));
  const result=f.analyze();
  assert.equal(result.schema_version,3);assert.equal(result.batch_is_authoritative,false);
  assert.equal(result.authorization_checked,false);assert.equal(result.transaction_gateway_checked,false);
  assert.equal('frontier' in result,false);
  assert.deepEqual(result.eligible,['T-01','T-02']);
  assert.deepEqual(result.suggested_batch,['T-01']);
  assert.deepEqual(result.conflicts,[{left:'T-01',right:'T-02',reason:'semantic resource: db:shared / db:shared'}]);
  assert.deepEqual(result.deferred,[{id:'T-02',reason:'semantic resource: db:shared / db:shared',scope:'suggestion-only'}]);
  assert.deepEqual(result.blocked,[]);
  // The owner may actually start T-02 rather than the suggested T-01.
  f.setStatus(1,'in_progress');f.save(f.record('T-02'));
  assert.deepEqual(f.validate(),[]);
  const running=f.analyze();assert.deepEqual(running.eligible,[]);
  assert.match(JSON.stringify(running.blocked),/in-flight owner/);
  assert.equal(readFileSync(f.files[0],'utf8'),before[0]);
});

test('eligible contains all choices under a batch cap without mistaking them for concurrent permission',t=>{
  const f=fixture(t);f.plan('serial');
  const result=f.analyze();
  assert.deepEqual(result.eligible,['T-01','T-02']);assert.deepEqual(result.suggested_batch,['T-01']);
  assert.equal(result.capacity.global,1);assert.deepEqual(result.conflicts,[]);
  f.setStatus(1,'in_progress');f.save(f.record('T-02'));
  assert.deepEqual(f.validate(),[]);assert.deepEqual(f.analyze().eligible,[]);
  assert.match(JSON.stringify(f.analyze().blocked),/concurrency limit occupied/);
});

test('checkpoints ignore optional Skill discovery and drift but invalidate required methods',t=>{
  const f=fixture(t),path='.agents/skills/helper/SKILL.md',source='---\nname: helper\ndescription: fixture knowledge\n---\nOriginal advice.\n';
  mkdirSync(join(f.repo,'.agents/skills/helper'),{recursive:true});writeFileSync(join(f.repo,path),source);
  const original=readFileSync(f.files[0],'utf8');
  const optional={id:'helper',path:`<Path>${path}</Path>`,required:false,sha256:createHash('sha256').update(source).digest('hex')};
  const analyze=(previous?:any)=>analyzeMap({mapPath:join(f.root,'tickets-map.md'),repoRoot:f.repo,methodRoot,stateRoot:'data',previous});
  const before=analyze();assert.deepEqual(before.errors,[]);
  writeFileSync(f.files[0],original.replace(/^---\n/,'---\nskill_bindings: '+JSON.stringify([optional])+'\nskill_scan: discovered only relevant helper knowledge\n'));
  let result=analyze(before);assert.deepEqual(result.errors,[]);assert.deepEqual(result.invalidated,[]);
  writeFileSync(join(f.repo,path),source+'New ordinary advice.\n');
  result=analyze(before);assert.deepEqual(result.invalidated,[]);assert.deepEqual(result.eligible,['T-01','T-02']);
  writeFileSync(join(f.repo,path),source);
  const required={...optional,required:true,phase:'verify',operation:'check security boundary',inputs:['actual diff'],outputs:['check result'],on_failure:'block-ticket'};
  writeFileSync(f.files[0],original.replace(/^---\n/,'---\nskill_bindings: '+JSON.stringify([required])+'\n'));
  const pinned=analyze();assert.deepEqual(pinned.errors,[]);assert.deepEqual(pinned.validation_errors,[]);
  writeFileSync(join(f.repo,path),source+'Changed required boundary.\n');
  result=analyze(pinned);assert.deepEqual(result.invalidated,['T-01']);assert.deepEqual(result.eligible,['T-02']);
  assert.match(JSON.stringify(result.blocked),/digest drift|contract drift/);
});

test('path and semantic resource conflicts block overlapping writers in either scheduling mode',t=>{
  const f=fixture(t);f.plan('parallel');
  for(let i=0;i<2;i++)writeFileSync(f.files[i],readFileSync(f.files[i],'utf8').replace('resource_claims: []','resource_claims: ["db:shared"]'));
  assert.deepEqual(f.analyze().suggested_batch,['T-01']);assert.match(JSON.stringify(f.analyze().deferred),/semantic resource/);
  for(let i=0;i<2;i++){f.setStatus(i,'in_progress');f.save(f.record(`T-0${i+1}`));}
  assert.match(f.validate().join('\n'),/semantic resources/);
  writeFileSync(f.files[1],readFileSync(f.files[1],'utf8').replaceAll('two.txt','one.txt'));
  assert.match(f.validate().join('\n'),/conflicting writable paths/);
});

for(const worktree of [false,true]) test(`uncommitted ${worktree?'worktree':'current'} delivery completes after real snapshot checks and rejects drift`,t=>{
  const f=fixture(t,worktree);rmSync(f.files[1]);
  writeFileSync(join(f.workspace,'one.txt'),'after one\n');f.setStatus(0,'done');const r=f.record('T-01');f.save(r,true);f.saveContext('completed');
  const count=f.git('worktree','list','--porcelain');
  assert.deepEqual(f.validate('complete'),[]);assert.equal(f.git('rev-parse','main'),f.base);
  writeFileSync(join(f.workspace,'one.txt'),'unreviewed change\n');
  assert.match(f.validate('complete').join('\n'),/drifted/);assert.equal(f.git('worktree','list','--porcelain'),count);
});

test('verified status cannot replace independent review, checks, or required Lead E2E',t=>{
  const f=fixture(t);rmSync(f.files[1]);writeFileSync(join(f.workspace,'one.txt'),'after\n');f.setStatus(0,'done');
  const r=f.record('T-01');f.save(r,true);assert.deepEqual(f.validate(),[]);
  r.verification.e2e={required:true,status:'failed',reason:null,evidence:null};f.save(r,true);
  assert.match(f.validate().join('\n'),/E2E/);
  r.verification.e2e={required:false,status:'not-required',reason:'no boundary',evidence:null};f.save(r,true);
  const file=join(f.root,'evidence/T-01.md');writeFileSync(file,readFileSync(file,'utf8').replace('Exit: 0','Exit: 1'));
  assert.match(f.validate().join('\n'),/successful command exits/);
  f.save(r,true);writeFileSync(file,readFileSync(file,'utf8').replaceAll('native:reviewer','native:implementer'));
  assert.match(f.validate().join('\n'),/participated in implementation/);
});

test('recovery rejects invalid locators, branch drift and a foreign repository without mutation',t=>{
  const f=fixture(t,true),original=readFileSync(join(f.root,'README.md'),'utf8'),worktrees=f.git('worktree','list','--porcelain');
  assert.equal(resolveExecutionWorkspace(f.repo,readExecutionContext(f.root)),realpathSync.native(f.workspace));
  for(const value of ['../outside','/absolute','specdev-worktree/../outside']){f.context.workspace_ref=value;f.saveContext();assert.notDeepEqual(f.validate(),[]);}
  f.context.workspace_ref=`specdev-worktree/${f.change}`;f.context.branch='wrong';f.saveContext();assert.match(f.validate().join('\n'),/branch drifted/);
  writeFileSync(join(f.root,'README.md'),original);assert.deepEqual(f.validate(),[]);
  assert.equal(f.git('worktree','list','--porcelain'),worktrees);
  const foreign=join(f.repo,'foreign');mkdirSync(foreign);execFileSync('git',['-C',foreign,'init','-b','main'],{stdio:'ignore'});
  f.context.workspace_ref='foreign';f.context.branch='main';f.saveContext();assert.match(f.validate().join('\n'),/another repository/);
});

test('unsupported execution records fail without changing Evidence or real worktrees',t=>{
  const f=fixture(t),file=join(f.root,'evidence/T-01.md');
  const legacy={ticket_id:'T-01',workspace_ref:`specdev-worktree/${f.change}/T-01`,status:'active'};
  writeFileSync(file,fence('Workspace Execution Record',legacy));const before=readFileSync(file),worktrees=f.git('worktree','list','--porcelain');
  assert.match(f.validate().join('\n'),/unsupported execution record/);
  assert.deepEqual(readFileSync(file),before);assert.equal(f.git('worktree','list','--porcelain'),worktrees);
});

for(const worktree of [false,true]) test(`Direct Spec verifies in its selected ${worktree?'worktree':'current workspace'} without planning artifacts`,t=>{
  const f=fixture(t,worktree);rmSync(join(f.root,'ticket'),{recursive:true});rmSync(join(f.root,'tickets-map.md'));
  const r=f.record('T-01');delete r.ticket_id;Object.assign(r,{purpose:'direct-spec',change:f.change});
  writeFileSync(join(f.workspace,'one.txt'),'direct spec implementation\n');f.save(r,true);f.saveContext('completed');
  assert.deepEqual(f.validate('complete'),[]);assert.equal(f.git('rev-parse','main'),f.base);
  writeFileSync(join(f.workspace,'one.txt'),'drift after review\n');assert.match(f.validate('complete').join('\n'),/drifted/);
  f.saveContext();r.status='cancelled';f.save(r);assert.match(f.validate().join('\n'),/whole-change cancellation/);
});

test('parent scheduling and final review preserve each member workspace without merging',t=>{
  const a=fixture(t,true),b=fixture(t,true,a),name='2026-10-15-parent',root=join(a.repo,'data/specdev/changes',name);
  rmSync(a.files[1]);rmSync(b.files[0]);mkdirSync(join(root,'evidence'),{recursive:true});
  const members=[a.change,b.change],tasks=[`${a.change}::T-01`,`${b.change}::T-02`];
  const map={schema_version:1,artifact:'implementation-map',change:name,status:'in_progress',revision:1,members,tasks,dependencies:[] as string[],serializations:[] as string[]};
  const plan={schema_version:3,artifact:'implementation-plan',change:name,status:'in_progress',source_map_revision:1,orchestration:'lead-directed',lead:'native:lead',integration_attempt_limit:3,ticket_execution:'auto',max_parallel_tickets:2,ready_for_execution:true};
  const parentTemplate=(meta:object,kind:'map'|'plan')=>template(`specdev-p-goal-plan/assets/implementation-${kind}-template.md`)
    .replace(/^---[\s\S]*?---/, '---\n'+Object.entries(meta).map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join('\n')+'\n---')
    .replaceAll('<YYYY-MM-DD-topic>',name).replaceAll('<owner-or-session-locator>','native:lead')
    .replace(/## Execution Policy Source[\s\S]*$/, '## Execution Policy Source\nFixture user authorizes dependency-based scheduling in each existing member workspace.\n');
  const saveParent=(outcome='active')=>{
    writeFileSync(join(root,'README.md'),`# Parent\nOutcome: ${outcome}\n## Ownership\nOwner: native:lead\nEvidence: owner.md\n`);
    writeFileSync(join(root,'owner.md'),'Owner: native:lead\nSource: fixture authorization\n');
    writeFileSync(join(root,'implementation-map.md'),parentTemplate(map,'map'));
    writeFileSync(join(root,'implementation-plan.md'),parentTemplate(plan,'plan'));
  };
  const validate=(stage='goal-plan')=>validateChange(root,stage,a.repo,null,null,{methodRoot,stateRoot:'data'}).errors as string[];
  saveParent();const worktrees=a.git('worktree','list','--porcelain');
  const analysis=analyzeMap({mapPath:join(root,'implementation-map.md'),repoRoot:a.repo,methodRoot,stateRoot:'data'});
  assert.deepEqual(analysis.suggested_batch.sort(),[...tasks].sort(),JSON.stringify(analysis));
  // Creating a Ready parent does not require a draft downstream consumer to be executable.
  const originalB=readFileSync(b.files[1],'utf8');
  map.status='ready';plan.status='ready';map.dependencies=[`${tasks[1]} <- ${tasks[0]}`];saveParent();
  writeFileSync(b.files[1],originalB.replace('status: ready','status: draft').replace('ready: true','ready: false')+'\nDeferred until the producer publishes its actual contract.\n');
  assert.deepEqual(validate(),[]);
  const progressive=analyzeMap({mapPath:join(root,'implementation-map.md'),repoRoot:a.repo,methodRoot,stateRoot:'data'});
  assert.deepEqual(progressive.errors,[]);assert.deepEqual(progressive.validation_errors,[]);
  assert.deepEqual(progressive.eligible,[tasks[0]]);assert.deepEqual(progressive.suggested_batch,[tasks[0]]);
  assert.match(JSON.stringify(progressive.blocked),/not Ready: draft/);
  assert.equal(progressive.eligible_for_final_verification,false);
  assert.deepEqual(progressive.dependencies[tasks[1]],[tasks[0]]);
  // Merely changing its status cannot bypass the unresolved producer dependency.
  writeFileSync(b.files[1],originalB.replace('status: ready','status: in_progress'));b.save(b.record('T-02'));
  assert.match(validate().join('\n'),/prerequisite is not done/);
  rmSync(join(b.root,'evidence/T-02.md'));writeFileSync(b.files[1],originalB);
  map.status='in_progress';plan.status='in_progress';map.dependencies=[];saveParent();
  // The published parent templates must not accidentally be ordinary Goal templates.
  writeFileSync(join(root,'implementation-plan.md'),template('specdev-p-goal-plan/assets/goal-plan-template.md'));
  assert.match(validate().join('\n'),/implementation-plan\/3/);saveParent();
  // A competing parent owns only its overlapping member. Independent members remain legal.
  const other=join(a.repo,'data/specdev/changes/2026-10-15-other-parent');mkdirSync(other);
  writeFileSync(join(other,'README.md'),'# Other parent\nOutcome: active\n');
  writeFileSync(join(other,'implementation-map.md'),'---\nmembers: '+JSON.stringify([a.change])+'\n---\n');
  const conflict=analyzeMap({mapPath:join(root,'implementation-map.md'),repoRoot:a.repo,methodRoot,stateRoot:'data'});
  assert.deepEqual(conflict.errors,[]);assert.deepEqual(conflict.suggested_batch,[tasks[1]]);
  assert.deepEqual(conflict.diagnostics.filter((item:any)=>item.code==='parent-ownership-conflict').map((item:any)=>[item.scope,item.change]),[['change',a.change]]);
  rmSync(other,{recursive:true});

  a.setStatus(0,'in_progress');a.save(a.record('T-01'));b.setStatus(1,'in_progress');b.save(b.record('T-02'));
  assert.deepEqual(validate(),[]);
  plan.ticket_execution='serial';saveParent();assert.match(validate().join('\n'),/parent concurrent Ticket limit/);
  plan.ticket_execution='auto';map.serializations=[`${tasks[0]} <> ${tasks[1]}`];saveParent();assert.match(validate().join('\n'),/serialized Tickets/);
  map.serializations=[];map.dependencies=[`${tasks[1]} <- ${tasks[0]}`];saveParent();assert.match(validate().join('\n'),/prerequisite is not done/);
  map.dependencies=[];map.status='completed';plan.status='completed';plan.ready_for_execution=false;
  for(const [f,index,id,file] of [[a,0,'T-01','one.txt'],[b,1,'T-02','two.txt']] as const){
    writeFileSync(join(f.workspace,file),'completed in member workspace\n');f.setStatus(index,'done');f.save(f.record(id),true);f.saveContext('completed');
  }
  saveParent('completed');
  const artifact='evidence/implementation-orchestration.md';
  writeFileSync(join(root,artifact),template('specdev-p-goal-plan/assets/implementation-evidence-template.md')+'\nObserved: fixture read actual member workspaces, immutable child review inputs, and both completed outcomes.\n');
  const locator=(file:string)=>relative(a.repo,file).split('\\').join('/');
  const sources=[join(root,'implementation-plan.md'),join(root,'implementation-map.md'),join(a.root,'spec.md'),join(b.root,'spec.md')].map(file=>({kind:'specification',locator:locator(file)}));
  sources.push(...[a,b].map((f,index)=>({kind:'specification',locator:locator(join(f.root,`evidence/T-0${index+1}.md`))+'#review-input'})));
  sources.push({kind:'standards',locator:locator(join(a.root,'evidence/fixture-standards.md'))});
  appendReviewFixture({repo:a.repo,root,artifact,base:a.base,sourceFiles:true,files:[locator(join(root,'implementation-map.md'))],sourceLocators:sources});
  assert.deepEqual(validate('complete'),[]);assert.equal(a.git('rev-parse','main'),a.base);assert.equal(a.git('worktree','list','--porcelain'),worktrees);
  writeFileSync(join(b.workspace,'two.txt'),'unreviewed member drift\n');assert.match(validate('complete').join('\n'),/drifted/);
});


test('structured Ticket diagnostics keep unrelated Ready work executable and do not depend on message wording',t=>{
  const f=fixture(t),original=readFileSync(f.files[0],'utf8');
  writeFileSync(f.files[0],original.replace(/^risk:.*$/m,'risk: unknown-risk'));
  const result=validateChange(f.root,'tickets',f.repo,null,null,{methodRoot,stateRoot:'data'});
  const issue=result.diagnostics.find((item:any)=>item.code==='ticket-contract-invalid'&&item.ticket==='T-01');
  assert.ok(issue,JSON.stringify(result));assert.equal(issue.scope,'ticket');assert.equal(issue.change,f.change);assert.equal(issue.artifact,'ticket/01-implementation.md');
  assert.deepEqual(result.errors,result.diagnostics.map((item:any)=>item.message));
  assert.deepEqual(f.analyze().suggested_batch,['T-02']);assert.deepEqual(f.analyze().errors,[]);
  const tasks=new Map([['T-01',{member:f.change,ticket:'T-01'}],['T-02',{member:f.change,ticket:'T-02'}]]);
  const owners=(records:any[])=>{
    const groups=partitionDiagnostics(records,tasks);
    return {global:groups.global.length,local:[...groups.byTask].map(([id,items]:[string,any[]])=>[id,items.length])};
  };
  assert.deepEqual(owners(result.diagnostics),owners(result.diagnostics.map((item:any)=>({...item,message:'任意译文，带换行\nT-02: misleading English prefix ["different-member"]'}))));
  writeFileSync(f.files[1],readFileSync(f.files[1],'utf8').replace('blocked_by: []','blocked_by: [T-01]'));
  assert.deepEqual(f.analyze().suggested_batch,[]);assert.match(JSON.stringify(f.analyze().blocked),/dependency/);
  writeFileSync(f.files[0],original);assert.deepEqual(f.analyze().suggested_batch,['T-01']);
  writeFileSync(f.files[1],readFileSync(f.files[1],'utf8').replace('blocked_by: [T-01]','blocked_by: []'));
  writeFileSync(f.files[0],original+'\nUnbalanced artifact link: <Path>src/incomplete\n');
  const malformed=f.analyze();assert.deepEqual(malformed.errors,[]);assert.deepEqual(malformed.suggested_batch,['T-02']);
  assert.ok(malformed.diagnostics.some((item:any)=>item.code==='artifact-path-invalid'&&item.scope==='ticket'&&item.ticket==='T-01'));
});

test('invalid diagnostic scope and unresolved owners fail closed while a real DAG cycle blocks the whole frontier',t=>{
  const tasks=new Map([['T-01',{member:'2026-10-15-workspace',ticket:'T-01'}]]);
  for(const diagnostic of [{code:'bad',scope:'unknown',message:'translated'},{code:'bad',scope:'ticket',change:'missing',ticket:'T-01',message:'T-01: apparent owner'}]){
    const classified=partitionDiagnostics([diagnostic],tasks);assert.equal(classified.global.length,1);assert.deepEqual(classified.byTask.get('T-01'),[]);
  }
  assert.equal(partitionDiagnostics(undefined,tasks).global.length,1);
  const f=fixture(t);
  for(const [index,dependency] of ['T-02','T-01'].entries())writeFileSync(f.files[index],readFileSync(f.files[index],'utf8').replace('blocked_by: []',`blocked_by: [${dependency}]`));
  const result=f.analyze();assert.deepEqual(result.suggested_batch,[]);assert.match(result.errors.join('\n'),/cycle/);
});

test('a completed Outcome cannot re-enable the retired Goal schema',t=>{
  const f=fixture(t);f.plan();f.saveContext('completed');
  const path=join(f.root,'goal-plan.md');
  const obsolete=readFileSync(path,'utf8').replace('schema_version: 8','schema_version: 7');writeFileSync(path,obsolete);
  assert.match(f.validate('goal-plan').join('\n'),/requires schema v8/);
  assert.equal(readFileSync(path,'utf8'),obsolete);
});
