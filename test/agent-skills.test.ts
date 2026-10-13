import assert from 'node:assert/strict';
import { chmod,link,mkdir,mkdtemp,readFile,readdir,rm,symlink,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { test } from 'node:test';
import { readAssetCatalog,parseFrontmatter,validateSkill } from '../src/assets.js';
import { parseAgentSkillSpec,renderSkillPointer,readProjectionManifest,planSkillProjection,sha256Buffer } from '../src/agent-skills.js';
import { initSpeculo } from '../src/index.js';
import { doctorSpeculo } from '../src/doctor.js';
import { fingerprintTree } from '../src/manifest.js';
const packageRoot=process.cwd();
async function fixture(fn:(target:string)=>Promise<void>){const target=await mkdtemp(join(tmpdir(),'speculo-projections-'));try{await fn(target);}finally{await rm(target,{recursive:true,force:true});}}
test('catalog: exactly five domains, 38 works and ten commands with unique identities',async()=>{
 const {assets}=await readAssetCatalog(join(packageRoot,'template'));
 assert.equal(assets.filter(a=>a.kind==='domain-skill').length,5);
 assert.equal(assets.filter(a=>a.kind==='work-skill').length,38);
 assert.equal(assets.filter(a=>a.kind==='command').length,10);
 for(const asset of assets.filter(a=>a.kind!=='command')){
  const source=await readFile(join(packageRoot,'template',asset.entry));
  for(const host of ['agents','claude'] as const){
   const files=renderSkillPointer(asset,source,host),p=`.${host}/skills/${asset.name}/SKILL.md`,body=files[p];
   assert.equal(parseFrontmatter(body).raw,parseFrontmatter(source).raw);
   assert.deepEqual(validateSkill(body,asset.name),[]);
   const link=/\]\(([^)]+)\)/.exec(body)![1];
   assert.equal(resolve(dirname(join(packageRoot,p)),link),join(packageRoot,'.agents','speculo',asset.entry));
   assert.match(body,/必须先读取/);
  }
 }
});
test('YAML: multiline, Unicode, quotes and CRLF are preserved verbatim',()=>{
 const source='---\r\nname: sample\r\ndescription: >-\r\n  多行 "引用"\r\n  下一行\r\nmetadata:\r\n  key: "值"\r\n---\r\n\r\n# Source\r\n';
 assert.deepEqual(validateSkill(source,'sample'),[]);
 const asset={id:'domain/sample',kind:'domain-skill' as const,name:'sample',entry:'workflows/sample/SKILL.md',description:'unused',stages:[]};
 const output=renderSkillPointer(asset,Buffer.from(source),'agents')['.agents/skills/sample/SKILL.md'];
 assert.equal(parseFrontmatter(output).raw,parseFrontmatter(source).raw);
 for(const invalid of [source.replace('name: sample','name: Sample'),source.replace('metadata:','workflow: private\r\nmetadata:'),source.replace('key: "值"','key: 5'),source.replace('metadata:','name: sample\r\nmetadata:')])assert.ok(validateSkill(invalid,'sample').length);
 assert.throws(()=>parseFrontmatter('---\nname: &a [*a]\n---'),/alias|Alias/);
});
test('projection selection accepts business ids and rejects retired syntax',()=>{
 assert.deepEqual(parseAgentSkillSpec('all'),{mode:'all'});
 assert.deepEqual(parseAgentSkillSpec('domain/specdev,specdev/implement,command/docs-sync'),{mode:'set',assetIds:['command/docs-sync','domain/specdev','specdev/implement']});
 for(const value of ['template','template:docs-sync','specdev','none,all','../x'])assert.throws(()=>parseAgentSkillSpec(value));
});
test('default installation does not create a Skill discovery directory',()=>fixture(async target=>{
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});
 assert.ok(!(await readdir(join(target,'.agents'))).includes('skills'));
 const doctor=await doctorSpeculo(target);assert.equal(doctor.healthy,true,JSON.stringify(doctor.checks.filter(c=>!c.ok)));
 assert.ok(doctor.notChecked.includes('host-skill-invocation'));
}));
test('all projections cover both hosts and exceed the old 64-record limit',()=>fixture(async target=>{
 const result=await initSpeculo(target,{packageRoot,selection:{workflowIds:['learning','media','ops','person','specdev']},agentSkills:{mode:'all'},claudeSkills:{mode:'all'}});
 assert.equal(result.agentSkills.projected,106);assert.deepEqual(result.warnings,[]);
 const manifest=await readProjectionManifest(target);assert.equal(manifest?.files.length,116);
 const standard=await readFile(join(target,'.agents/skills/speculo-docs-sync/SKILL.md'),'utf8');assert.doesNotMatch(standard,/disable-model-invocation/);
 assert.match(await readFile(join(target,'.agents/skills/speculo-docs-sync/agents/openai.yaml'),'utf8'),/allow_implicit_invocation: false/);
 assert.match(await readFile(join(target,'.claude/skills/speculo-docs-sync/SKILL.md'),'utf8'),/disable-model-invocation: true/);
 const doctor=await doctorSpeculo(target);assert.equal(doctor.healthy,true,JSON.stringify(doctor.checks.filter(c=>!c.ok)));
 const before=await fingerprintTree(join(target,'.agents/skills'));
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});
 assert.equal(await fingerprintTree(join(target,'.agents/skills')),before);
}));
test('unmanaged collision only blocks that projection, preserving source installation and siblings',()=>fixture(async target=>{
 const file=join(target,'.agents/skills/specdev-i-implement/SKILL.md');await mkdir(dirname(file),{recursive:true});await writeFile(file,'user owned');
 const result=await initSpeculo(target,{packageRoot,selection:{workflowIds:['specdev']},agentSkills:{mode:'set',assetIds:['specdev/implement','specdev/code-review']}});
 assert.equal(result.warnings.length,1);assert.equal(result.agentSkills.projected,1);
 assert.equal(await readFile(file,'utf8'),'user owned');await readFile(join(target,'.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md'));
 assert.equal((await doctorSpeculo(target)).healthy,false);
}));
test('edited projection is preserved, unaffected projections refresh, explicit disable removes only owned files',()=>fixture(async target=>{
 await initSpeculo(target,{packageRoot,selection:{workflowIds:['learning']},agentSkills:{mode:'set',assetIds:['learning/lesson','learning/goal']}});
 const edited=join(target,'.agents/skills/learning-l-lesson/SKILL.md');await writeFile(edited,'edited');
 const kept=await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});assert.equal(kept.warnings.length,1);assert.equal(await readFile(edited,'utf8'),'edited');
 const sibling=join(target,'.agents/skills/learning-g-goal/user.txt');await writeFile(sibling,'keep');
 const removed=await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:{mode:'none'}});assert.equal(removed.warnings.length,1);
 assert.equal(await readFile(sibling,'utf8'),'keep');assert.equal(await readFile(edited,'utf8'),'edited');
 await assert.rejects(readFile(join(target,'.agents/skills/learning-g-goal/SKILL.md')),/ENOENT/);
}));
for(const phase of ['skills-applying','skills-projected','external-finalized'] as const)test(`projection rollback at ${phase}`,()=>fixture(async target=>{
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});
 const before=await fingerprintTree(join(target,'.agents/speculo'));
 await assert.rejects(initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:{mode:'all'},claudeSkills:{mode:'all'},transactionHook:async p=>{if(p===phase)throw new Error('fault');}}),/fault/);
 assert.equal(await fingerprintTree(join(target,'.agents/speculo')),before);
 const doctor=await doctorSpeculo(target);assert.equal(doctor.healthy,true,JSON.stringify(doctor.checks.filter(c=>!c.ok)));
}));

test('rollback restores both hosts after all 116 projection files were applied',()=>fixture(async target=>{
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});
 const before=await fingerprintTree(join(target,'.agents/speculo'));
 await assert.rejects(initSpeculo(target,{packageRoot,selection:{workflowIds:['learning','media','ops','person','specdev']},agentSkills:{mode:'all'},claudeSkills:{mode:'all'},transactionHook:async phase=>{if(phase==='skills-projected'){assert.equal((await readProjectionManifest(target))?.files.length,116);throw Error('full-projection-fault');}}}),/full-projection-fault/);
 assert.equal(await fingerprintTree(join(target,'.agents/speculo')),before);
 for(const host of ['agents','claude'])assert.deepEqual(await readdir(join(target,`.${host}/skills`)),[]);
 assert.equal((await doctorSpeculo(target)).healthy,true);
}));

test('disable then re-enable projections does not leave an unmanaged empty directory conflict',()=>fixture(async target=>{
 const choice={mode:'set' as const,assetIds:['command/handoff']};
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:choice});
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:{mode:'none'}});
 const result=await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:choice});
 assert.deepEqual(result.warnings,[]);assert.equal(result.agentSkills.projected,1);
}));

test('doctor reports external atomic-write residue without deleting it',()=>fixture(async target=>{
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});
 const file=join(target,'.speculo-file-interrupted.tmp');await writeFile(file,'preserve evidence');
 const result=await doctorSpeculo(target);
 assert.equal(result.healthy,false);assert.ok(result.checks.some(c=>!c.ok&&c.id.includes('refresh-residue:')));
 assert.equal(await readFile(file,'utf8'),'preserve evidence');
}));

test('noncanonical Claude directory casing blocks only its projections',()=>fixture(async target=>{
 await mkdir(join(target,'.Claude'));
 const result=await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:{mode:'set',assetIds:['command/handoff']},claudeSkills:{mode:'set',assetIds:['command/handoff']}});
 assert.equal(result.agentSkills.projected,1);assert.equal(result.warnings.length,1);
 assert.match(result.warnings[0],/ambiguous-projection-casing/);
 assert.deepEqual(await readdir(join(target,'.Claude')),[]);
}));

test('refresh rejects string schemas and malformed version suffixes without replacing the installation',()=>fixture(async target=>{
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]}});
 const root=join(target,'.agents/speculo'),path=join(root,'.speculo/install.json'),manifest=JSON.parse(await readFile(path,'utf8'));
 for(const next of [{...manifest,schema_version:'4'},{...manifest,package_version:'2.0.0garbage'}]){
  await writeFile(path,JSON.stringify(next));const before=await fingerprintTree(root);
  await assert.rejects(initSpeculo(target,{packageRoot,selection:{workflowIds:[]}}),/blocked/);
  assert.equal(await fingerprintTree(root),before);
 }
}));

test('renaming an owned Work never adopts an existing unowned destination directory',()=>fixture(async target=>{
 const staged=join(target,'stage'),entry='sample-a-next/SKILL.md',oldPath='.agents/skills/sample-a-first/SKILL.md';
 for(const p of ['stage/workflows/sample/sample-a-next','stage/commands','stage/.speculo','.agents/speculo/.speculo','.agents/skills/sample-a-first','.agents/skills/sample-a-next'])await mkdir(join(target,p),{recursive:true});
 const header=(name:string,kind:string,id:string)=>`---\nname: ${name}\ndescription: Sample\nmetadata:\n  speculo-kind: ${kind}\n  speculo-id: ${id}\n  speculo-domain: sample\n  speculo-contract-version: "2"\n---\n`;
 await writeFile(join(staged,'commands/manifest.json'),JSON.stringify({schema_version:1,commands:[]}));
 await writeFile(join(staged,'workflows/sample/manifest.json'),JSON.stringify({schema_version:2,id:'sample',entry:'SKILL.md',works:[entry],work_stages:{[entry]:[]}}));
 await writeFile(join(staged,'workflows/sample/SKILL.md'),header('sample','domain-skill','domain/sample'));
 await writeFile(join(staged,'workflows/sample',entry),header('sample-a-next','work-skill','sample/run'));
 await writeFile(join(target,oldPath),'owned');await writeFile(join(target,'.agents/skills/sample-a-next/user.txt'),'preserve');
 await writeFile(join(target,'.agents/speculo/.speculo/projections.json'),JSON.stringify({schema_version:2,package_version:'2.0.0',selections:{agents:['sample/run'],claude:[]},files:[{path:oldPath,asset_id:'sample/run',sha256:sha256Buffer('owned')}]}));
 const plan=await planSkillProjection({target,stagedRoot:staged,packageRoot,packageVersion:'2.0.0',installedWorkflowIds:['sample'],request:{mode:'keep'}});
 assert.equal(plan.warnings.length,1);assert.equal(plan.records,null);
 assert.equal(await readFile(join(target,oldPath),'utf8'),'owned');assert.equal(await readFile(join(target,'.agents/skills/sample-a-next/user.txt'),'utf8'),'preserve');
}));

for(const conflict of ['hardlink','readonly','junction'] as const)test(`owned projection ${conflict} conflict preserves unrelated files`,()=>fixture(async target=>{
 const request={mode:'set' as const,assetIds:['command/handoff','command/status']};
 await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:request});
 const folder=join(target,'.agents/skills/speculo-handoff'),file=join(folder,'SKILL.md'),original=await readFile(file),external=join(target,'user-owned.md');
 if(conflict==='hardlink'){await writeFile(external,original);await rm(file);await link(external,file);}
 if(conflict==='readonly')await chmod(file,0o444);
 if(conflict==='junction'){await rm(file);await rm(join(folder,'agents/openai.yaml'));await rm(join(folder,'agents'),{recursive:true});await rm(folder,{recursive:true});await mkdir(join(target,'user-dir'));await writeFile(join(target,'user-dir/SKILL.md'),original);await symlink(join(target,'user-dir'),folder,process.platform==='win32'?'junction':'dir');}
 try{
  const result=await initSpeculo(target,{packageRoot,selection:{workflowIds:[]},agentSkills:request});
  assert.equal(result.warnings.length,1);assert.deepEqual(await readFile(file),original);
  if(conflict==='hardlink')assert.deepEqual(await readFile(external),original);
  assert.ok((await readFile(join(target,'.agents/skills/speculo-status/SKILL.md'),'utf8')).includes('权威入口'));
 }finally{if(conflict==='readonly')await chmod(file,0o644);}
}));
