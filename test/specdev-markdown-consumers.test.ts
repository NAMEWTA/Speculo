import {attachReviewFixture} from './helpers/review-fixture.js';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, rename, readdir, lstat, symlink, readlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
const tools=join(process.cwd(),'template/workflows/specdev/common/tools');
const plan=await import(pathToFileURL(join(tools,'plan-contract.mjs')).href);
const validator=await import(pathToFileURL(join(tools,'validate-specdev.mjs')).href);
const name='2026-10-14-direct-work';
test('grill resumes without empty knowledge files but requires evidence for answered nodes',async()=>{
  const repo=await realpath(await mkdtemp(join(tmpdir(),'speculo-grill-resume-')));
  const root=join(repo,'data/specdev/changes',name);
  try{
    await mkdir(root,{recursive:true});
    const readme='# Design interview\n\nOutcome: active\n\n## Next Steps\nResolve D-001 with the user.\n';
    await writeFile(join(root,'README.md'),readme);
    const node={id:'D-001',title:'Delivery choice',question:'Which delivery channel is required?',depends_on:[],recommendation:'Use the existing local channel.',status:'open',round:null as number|null,answer:null as string|null,log_ref:null as string|null};
    const tree={schema_version:1,artifact:'design-tree',change:name,status:'active',round:0,nodes:[node]};
    const save=()=>writeFile(join(root,'design-tree.json'),JSON.stringify(tree));
    const validate=()=>validator.validateChange(root,'grill',repo,null,null,{methodRoot:join(process.cwd(),'template'),stateRoot:'data'});
    await save();
    const initial=await readFile(join(root,'design-tree.json'));
    for(let attempt=0;attempt<2;attempt++){
      assert.deepEqual(validate().errors,[]);
      assert.deepEqual((await readdir(root)).sort(),['README.md','design-tree.json']);
      assert.deepEqual(await readFile(join(root,'design-tree.json')),initial);
    }
    Object.assign(node,{status:'answered',round:1,answer:'The user selected the local channel.',log_ref:'LOG-001'});
    tree.round=1;tree.status='consensus';await save();
    assert.match(validate().errors.join('\n'),/D-001 points to missing LOG-001/);
    await writeFile(join(root,'LOG.md'),'# Interview log\n\n## LOG-001\nUser decision: use the existing local channel.\n');
    assert.deepEqual(validate().errors,[]);
    assert.deepEqual((await readdir(root)).sort(),['LOG.md','README.md','design-tree.json']);
    assert.equal(await readFile(join(root,'README.md'),'utf8'),readme);
  }finally{await rm(repo,{recursive:true,force:true});}
});
async function fixture(){
  const repo=await mkdtemp(join(tmpdir(),'speculo-md-consumers-')),root=join(repo,'data/specdev/changes',name);
  await mkdir(root,{recursive:true});
  const verified='Method: isolated fixture test\nSource: fixture input\nObserved: exact output matches\nResult: passed\n';
  await writeFile(join(root,'verified.md'),verified);
  await writeFile(join(root,'owner.md'),'Owner: test-lead\nWork: specdev/implement\nSource: fixture session assignment\n');
  const readme=`# Direct request\n\nOutcome: active\n\n## Ownership\nOwner: test-lead\nWork: specdev/implement\nEvidence: owner.md\n\n<a id="scope"></a>\n## Scope\nExpose exact current value in one response.\n\n<a id="acceptance"></a>\n## Acceptance\n- AC-1: response equals current value.\n\n## Current Work\n- [x] Implement the accepted response.\n\n<a id="verification"></a>\n## Verification\n| AC | Result | Evidence | SHA256 |\n|---|---|---|---|\n| AC-1 | passed | verified.md | ${plan.digest(verified)} |\n\n## Next Steps\nReview delivery before archive.\n`;
  await writeFile(join(root,'README.md'),readme);
  const options={methodRoot:join(process.cwd(),'template'),stateRoot:'data'};
  return {repo,root,readme,options};
}
test('direct lightweight Spec validates without installed workspace or duplicate artifacts',async()=>{
  const f=await fixture();try{
    assert.deepEqual(validator.validateChange(f.root,'spec',f.repo,null,null,f.options).errors,[]);
    await writeFile(join(f.root,'README.md'),f.readme.replace('Outcome: active','Outcome: completed'));
    attachReviewFixture(f.repo,f.root);
    assert.deepEqual(validator.validateChange(f.root,'complete',f.repo,null,null,f.options).errors,[]);
    await assert.rejects(readFile(join(f.root,'.status.json')),/ENOENT/);
    await assert.rejects(readFile(join(f.root,'spec.md')),/ENOENT/);
    await writeFile(join(f.root,'verified.md'),'Method: changed\nResult: passed\n');
    assert.match(validator.validateChange(f.root,'complete',f.repo,null,null,f.options).errors.join('\n'),/source-drift|digest/);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('lightweight input rejects incomplete AC, competing Spec, explicit artifacts and Deep requests',async()=>{
  const f=await fixture();try{
    assert.throws(()=>plan.readSpecification(f.root,{allowLightweight:true,requiredArtifact:'spec'}),/independent Spec/);
    assert.throws(()=>plan.readSpecification(f.root,{allowLightweight:true,depth:'deep'}),/independent Spec/);
    await writeFile(join(f.root,'README.md'),f.readme.replace('- AC-1: response equals current value.','Unknown'));
    assert.throws(()=>plan.readSpecification(f.root,{allowLightweight:true}),/AC identifiers/);
    await writeFile(join(f.root,'README.md'),f.readme);await writeFile(join(f.root,'spec.md'),'# Another specification\n');
    assert.throws(()=>plan.readSpecification(f.root,{allowLightweight:true}),/two specification authorities/);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('adding learning materials never bypasses an implementation completion review',async()=>{
  const f=await fixture();try{
    await writeFile(join(f.root,'README.md'),f.readme.replace('Outcome: active','Outcome: completed'));
    attachReviewFixture(f.repo,f.root);
    const withReview=await readFile(join(f.root,'README.md'),'utf8');
    await writeFile(join(f.root,'README.md'),withReview.split('\n<!-- synthetic-independent-review -->')[0]);
    await mkdir(join(f.root,'learning'));await writeFile(join(f.root,'learning/index.md'),'# 学习图解索引\n');
    assert.match(validator.validateChange(f.root,'archive-ready',f.repo,null,null,f.options).errors.join('\n'),/Independent Review/);
    const {validateChangeClosure}=await import(pathToFileURL(join(tools,'change-artifacts.mjs')).href);
    const {resolveWorkContextSync}=await import(pathToFileURL(join(process.cwd(),'template/lib/speculo-runtime.mjs')).href);
    const context=resolveWorkContextSync({projectRoot:f.repo,methodRoot:f.options.methodRoot,stateRoot:'data'});
    assert.equal(validateChangeClosure({context,change:name,forArchive:true}).complete,false);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('explicit lightweight Goal owns its task progress without manufacturing Map or Ticket',async()=>{
  const f=await fixture();try{
    await writeFile(join(f.root,'README.md'),f.readme.replace('- [x] Implement the accepted response.','See [Goal](goal-plan.md).'));
    const goal=`---\nartifact: lightweight-goal-plan\nchange: ${name}\nlead: test-lead\n---\n\n## Tasks\n- [x] Implement accepted response.\n\n## Integration and Verification\nVerified against README AC-1 and verified.md.\n\n## Next Steps\nReview delivery and preserve the final evidence.\n`;
    await writeFile(join(f.root,'goal-plan.md'),goal);
    assert.deepEqual(validator.validateChange(f.root,'goal-plan',f.repo,null,null,f.options).errors,[]);
    await writeFile(join(f.root,'README.md'),(await readFile(join(f.root,'README.md'),'utf8')).replace('Outcome: active','Outcome: completed'));
    attachReviewFixture(f.repo,f.root);
    assert.deepEqual(validator.validateChange(f.root,'complete',f.repo,null,null,f.options).errors,[]);
    await writeFile(join(f.root,'goal-plan.md'),goal.replace('- [x]','- [ ]'));
    assert.match(validator.validateChange(f.root,'complete',f.repo,null,null,f.options).errors.join('\n'),/unfinished|unchecked/);
    await mkdir(join(f.root,'ticket'));
    assert.throws(()=>plan.readLightweightGoal(f.root),/cannot own Tickets/);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('direct Spec completion rejects empty, duplicate and failed acceptance evidence',async()=>{
  const f=await fixture();try{
    await mkdir(join(f.root,'evidence'));
    const path=join(f.root,'evidence/direct-spec.md');await writeFile(path,'# Evidence\n');
    assert.match(plan.validateAcceptanceEvidence(f.root,'evidence/direct-spec.md',['AC-1']).join('\n'),/Acceptance Verification/);
    const record={id:'AC-1',result:'passed',method:'fixture execution',source:'current code',observed:'assertion matched',command:'fixture-check',exit:0};
    const save=async(records:unknown[])=>writeFile(path,`## Acceptance Verification\n\n\x60\x60\x60json\n${JSON.stringify(records)}\n\x60\x60\x60\n`);
    await save([record]);assert.deepEqual(plan.validateAcceptanceEvidence(f.root,'evidence/direct-spec.md',['AC-1']),[]);
    await save([record,record]);assert.match(plan.validateAcceptanceEvidence(f.root,'evidence/direct-spec.md',['AC-1']).join('\n'),/exactly one/);
    await save([{...record,exit:1}]);assert.match(plan.validateAcceptanceEvidence(f.root,'evidence/direct-spec.md',['AC-1']).join('\n'),/Exit 0/);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});

test('worker reports cannot replace the owning change Outcome or acceptance evidence',async()=>{
  const f=await fixture();try{
    const task=join(f.root,'sessions/20261015T083000Z/001-code-review');
    await mkdir(task,{recursive:true});
    const input='# Task\nReview the fixed candidate read-only; return findings for Lead acceptance.\n';
    await writeFile(join(task,'TASK.md'),input);
    for(const status of ['completed','blocked','failed','cancelled']){
      const report=`# Task report\nSession: 20261015T083000Z\nTask: 001-code-review\nStatus: ${status}\n`;
      await writeFile(join(task,'REPORT.md'),report);
      assert.deepEqual(validator.validateChange(f.root,'spec',f.repo,null,null,f.options).errors,[]);
      assert.match(validator.validateChange(f.root,'archive-ready',f.repo,null,null,f.options).errors.join('\n'),/change is still active/);
      assert.equal(await readFile(join(f.root,'README.md'),'utf8'),f.readme);
      assert.equal(await readFile(join(task,'TASK.md'),'utf8'),input);
      assert.equal(await readFile(join(task,'REPORT.md'),'utf8'),report);
    }
    await rm(join(task,'REPORT.md'));
    assert.match(validator.validateChange(f.root,'archive-ready',f.repo,null,null,f.options).errors.join('\n'),/change is still active/);
    await writeFile(join(task,'REPORT.md'),'Status: completed\n');
    await writeFile(join(f.root,'README.md'),f.readme.replace('Outcome: active','Outcome: completed'));
    await writeFile(join(f.root,'verified.md'),'Method: not executed\nResult: failed\n');
    assert.notDeepEqual(validator.validateChange(f.root,'complete',f.repo,null,null,f.options).errors,[]);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});

test('new archives require the original receipt and moved bytes before sealed completion',async()=>{
  const f=await fixture();try{
    const session='sessions/20261015T083000Z';
    const dispatchFiles=new Map([
      [`${session}/001-implement-T01/TASK.md`,Buffer.from('# Input\nImplement the assigned change.\r\n')],
      [`${session}/001-implement-T01/REPORT.md`,Buffer.from('# Report\nStatus: completed\nCandidate awaits Lead acceptance.\n')],
      [`${session}/001-implement-T01/history-01.jsonl`,Buffer.from('{"id":"message-1","role":"assistant","text":"候选已交付"}\n')],
      [`${session}/002-review-T01/session-locator.json`,Buffer.from(JSON.stringify({path:'/external/provider-review.jsonl'})+'\n')],
      [`${session}/002-review-T01/TASK.md`,Buffer.from(`# Review\nChange: ${name}\nInput: change:${session}/001-implement-T01/REPORT.md\n`)],
      [`${session}/002-review-T01/REPORT.md`,Buffer.from('# Review report\nStatus: completed\nNo findings; observed checks are in the owning Evidence.\n')],
    ]);
    for(const [file,bytes] of dispatchFiles){await mkdir(dirname(join(f.root,file)),{recursive:true});await writeFile(join(f.root,file),bytes);}
    await writeFile(join(f.root,'README.md'),f.readme.replace('Outcome: active','Outcome: completed'));
    const archived=join(dirname(f.root),'archive',name);await mkdir(dirname(archived));await rename(f.root,archived);
    for(const [file,bytes] of dispatchFiles)assert.deepEqual(await readFile(join(archived,file)),bytes);
    const validate=()=>validator.validateChange(archived,'archived',f.repo,null,null,f.options);
    assert.match(validate().errors.join('\n'),/archive-receipt|required path/);
    const approval=`# Specific archive approval\n\nArchive ${name} in operation ARCHIVE-001 by test-lead.\n`;
    await writeFile(join(archived,'archive-approval.md'),approval);
    await symlink('verified.md',join(archived,'verification-link'));
    const entries:any[]=[];
    async function scan(root:string){for(const filename of await readdir(root)){
      const path=join(root,filename),stat=await lstat(path),base={path:relative(archived,path).split('\\').join('/'),mode:stat.mode & 0o7777};
      if(stat.isDirectory()){entries.push({...base,type:'directory'});await scan(path);}
      else if(stat.isSymbolicLink())entries.push({...base,type:'symlink',target:await readlink(path)});
      else entries.push({...base,type:'file',sha256:plan.digest(await readFile(path))});
    }}
    await scan(archived);
    let manifest=JSON.stringify({entries});await writeFile(join(archived,'archive-manifest.json'),manifest);
    const receipt=`<a id="archive-${name}"></a>\n## Original archive operation\nChange: ${name}\nOwner: test-lead\nOperation: ARCHIVE-001\nApproval: change:archive-approval.md\nApproval-SHA256: ${plan.digest(approval)}\nSource: changes/${name}\nTarget: changes/archive/${name}\nResult: moved\nIntegrity: change:archive-manifest.json\nIntegrity-SHA256: ${plan.digest(manifest)}\nTime: 2026-10-14T10:00:00Z\n`;
    await writeFile(join(archived,'archive-receipt.md'),receipt);
    const moved=validate();assert.deepEqual(moved.errors,[]);assert.equal(moved.archive.sealed,false);assert.match(moved.warnings.join('\n'),/not sealed/);
    assert.match(validator.validateChange(archived,'archived',f.repo,null,null,{...f.options,sealed:true}).errors.join('\n'),/not sealed/);
    for(const invalid of [receipt.replace(`Change: ${name}`,'Change: 2026-10-14-foreign'),receipt.replace(`Target: changes/archive/${name}`,`Target: changes/${name}`)]){
      await writeFile(join(archived,'archive-receipt.md'),invalid);assert.match(validate().errors.join('\n'),/foreign change\/source\/target/);
    }
    await writeFile(join(archived,'archive-receipt.md'),receipt.replace('Result: moved','Result: verified'));
    const sealed=validator.validateChange(archived,'archived',f.repo,null,null,{...f.options,sealed:true});assert.deepEqual(sealed.errors,[]);assert.equal(sealed.archive.sealed,true);
    const workerReport=`${session}/001-implement-T01/REPORT.md`,history=`${session}/001-implement-T01/history-01.jsonl`;
    await writeFile(join(archived,workerReport),'Status: failed\n');
    assert.match(validate().errors.join('\n'),/integrity byte drift/);
    await writeFile(join(archived,workerReport),dispatchFiles.get(workerReport)!);
    await rm(join(archived,history));
    assert.notDeepEqual(validate().errors,[]);
    await writeFile(join(archived,history),dispatchFiles.get(history)!);
    assert.deepEqual(validate().errors,[]);
    const locator=`${session}/002-review-T01/session-locator.json`;
    await writeFile(join(archived,locator),'{}\n');
    assert.match(validate().errors.join('\n'),/integrity byte drift/);
    await writeFile(join(archived,locator),dispatchFiles.get(locator)!);
    assert.deepEqual(validate().errors,[]);
    const report=join(f.repo,'data/commands/project-maintenance/2026-10-14-single-fixture.md');await mkdir(dirname(report),{recursive:true});
    const navigated=(await readFile(join(archived,'README.md'),'utf8'))+`\n## Archive Receipt\nReceipt: project:${relative(f.repo,report).split('\\').join('/')}#archive-${name}\n`;
    await writeFile(join(archived,'README.md'),navigated);
    entries.find(entry=>entry.path === 'README.md').sha256=plan.digest(navigated);
    const oldManifest=manifest;manifest=JSON.stringify({entries});await writeFile(join(archived,'archive-manifest.json'),manifest);
    await writeFile(report,receipt.replace('Result: moved','Result: verified').replace(plan.digest(oldManifest),plan.digest(manifest)));
    assert.match(validate().errors.join('\n'),/two receipt authorities/);
    await rm(join(archived,'archive-receipt.md'));assert.deepEqual(validate().errors,[]);
    await writeFile(join(archived,'archive-manifest.json'),manifest+'\n');assert.match(validate().errors.join('\n'),/manifest.*digest drift/);
    await writeFile(join(archived,'archive-manifest.json'),manifest);await writeFile(join(archived,'verified.md'),'Changed evidence');assert.match(validate().errors.join('\n'),/integrity byte drift/);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});
