import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { readAssetCatalog, parseFrontmatter, type Asset } from "./assets.js";
import { containedPath, INSTALL_ROOT, safeRelativePath } from "./paths.js";
import { RefreshBlockedError, type RefreshBlocker } from "./refresh.js";
import type { SkillNode, SkillRecord } from "./transaction.js";
import type { WorkflowCatalog } from "./workflows.js";
import { readImage } from "./external-files.js";

export const MANAGED_MANIFEST = "projections.json";
export type ProjectionHost = "agents" | "claude";
export type AgentSkillRequest = {mode:"none"|"keep"|"domains"|"all"} | {mode:"set";assetIds:string[]};
type ManagedProjectionFile = {path:string;asset_id:string;sha256:string};
export type ManagedManifest = {schema_version:2;package_version:string;selections:Record<ProjectionHost,string[]>;files:ManagedProjectionFile[]};
export function sha256Buffer(value:Buffer|string):string{return createHash('sha256').update(value).digest('hex');}
export function parseAgentSkillSpec(spec:string):AgentSkillRequest{
 if(['none','keep','domains','all'].includes(spec))return {mode:spec as 'none'|'keep'|'domains'|'all'};
 const ids=spec.split(',');
 if(!ids.length||ids.some(id=>!/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))throw new Error('projection selection must be none|keep|domains|all or comma-separated business ids');
 return {mode:'set',assetIds:[...new Set(ids)].sort()};
}
export async function readProjectionManifest(target:string):Promise<ManagedManifest|null>{
 let content:string;try{content=await readFile(await containedPath(target,`${INSTALL_ROOT}/.speculo/${MANAGED_MANIFEST}`),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
 const m=JSON.parse(content) as ManagedManifest;
 if(m.schema_version!==2||typeof m.package_version!=='string'||!m.selections||!['agents','claude'].every(h=>Array.isArray(m.selections[h as ProjectionHost])&&m.selections[h as ProjectionHost].every(id=>typeof id==='string'))||!Array.isArray(m.files)||new Set(m.files.map(f=>f.path)).size!==m.files.length)throw new Error('invalid-projection-manifest');
 for(const file of m.files)if(!safeRelativePath(file.path)||!/^\.(agents|claude)\/skills\/[a-z0-9-]+\/(SKILL\.md|agents\/openai\.yaml)$/.test(file.path)||typeof file.asset_id!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))throw new Error('invalid-projection-record');
 return m;
}
function fileNode(content:Buffer|string):SkillNode{return {kind:'file',content:Buffer.from(content).toString('base64'),mode:0o644};}
async function assertProjectionCasing(target: string, path: string): Promise<void> {
 let parent = target;
 for (const part of path.split('/')) {
  const names = await readdir(parent).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error; });
  if (names.some(name => name.toLowerCase() === part.toLowerCase() && name !== part)) throw new Error(`ambiguous-projection-casing: ${path}`);
  parent = join(parent, part);
 }
}
async function snapshot(target:string,p:string):Promise<SkillNode>{
 const full=await containedPath(target,p);
 try{const value=await readImage(full);if(!value)return {kind:'absent'};if(!(value.mode&0o200))throw new Error(`managed-asset-conflict: readonly ${p}`);return {kind:'file',...value};}
 catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {kind:'absent'};throw e;}
}
export function renderSkillPointer(asset:Asset,source:Buffer,host:ProjectionHost):Record<string,string>{
 const destination=`.${host}/skills/${asset.name}`, sourcePath=`${INSTALL_ROOT}/${asset.entry}`;
 const link=posix.relative(destination,sourcePath), {raw}=parseFrontmatter(source);
 const eol=raw.includes('\r\n')?'\r\n':'\n';
 const header=asset.kind==='command'?`---\nname: ${asset.name}\ndescription: ${JSON.stringify(asset.description)}${host==='claude'?'\ndisable-model-invocation: true':''}\n---`:raw;
 const body=[header,'',`# ${asset.name}`,'',`执行任何步骤或扩读之前，必须先读取[权威入口](${link})。该入口是本能力的唯一事实源。`,'','随后仅按入口读取当前分支所需的参考。相对链接以权威入口所在目录为基准。读取或选择本投影不构成执行、提交、发布或其他副作用授权。入口不可读时停止，不根据描述猜测流程。',''].join(eol);
 const files:Record<string,string>={[`${destination}/SKILL.md`]:body};
 if(asset.kind==='command'&&host==='agents')files[`${destination}/agents/openai.yaml`]='policy:\n  allow_implicit_invocation: false\n';
 return files;
}
export async function resolveAgentSkillRequest(options:{target:string;packageRoot:string;catalog:WorkflowCatalog;installedWorkflowIds:string[];request?:AgentSkillRequest;prompt:boolean}):Promise<AgentSkillRequest>{
 if(options.request)return options.request;
 const existing=await readProjectionManifest(options.target);
 if(!options.prompt)return {mode:existing?'keep':'none'};
 const {select}=await import('@inquirer/prompts');
 return {mode:await select({message:'选择 .agents/skills 能力曝光范围：',choices:[{name:'保留现有选择',value:'keep' as const},{name:'不曝光',value:'none' as const},{name:'已安装领域入口',value:'domains' as const},{name:'全部已安装公开入口',value:'all' as const}],default:existing?'keep':'none'})};
}
export async function planSkillProjection(options:{target:string;stagedRoot:string;packageRoot:string;packageVersion:string;installedWorkflowIds:string[];request:AgentSkillRequest;claudeRequest?:AgentSkillRequest}):Promise<{records:SkillRecord[]|null;blockers:RefreshBlocker[];warnings:RefreshBlocker[];count:number}>{
 const old=await readProjectionManifest(options.target),catalog=await readAssetCatalog(options.stagedRoot);
 const next:ManagedManifest={schema_version:2,package_version:options.packageVersion,selections:{agents:[],claude:[]},files:[]};
 const records:SkillRecord[]=[],warnings:RefreshBlocker[]=[];
 for(const host of ['agents','claude'] as const){
  const request=host==='agents'?options.request:options.claudeRequest??{mode:'keep'};
  const ids=request.mode==='none'?[]:request.mode==='keep'?old?.selections[host]??[]:request.mode==='all'?catalog.assets.map(a=>a.id):request.mode==='domains'?catalog.assets.filter(a=>a.kind==='domain-skill').map(a=>a.id):(request as {assetIds:string[]}).assetIds;
  for(const id of ids)if(!catalog.assets.some(a=>a.id===id))throw new RefreshBlockedError([{code:'unknown-projection-asset',path:id,message:'select an installed public asset business id'}]);
  next.selections[host]=[...ids].sort();
  const previous=(old?.files??[]).filter(f=>f.path.startsWith(`.${host}/skills/`));
  const allIds=[...new Set([...ids,...previous.map(f=>f.asset_id)])];
  for(const id of allIds){
   const owned=previous.filter(f=>f.asset_id===id),asset=catalog.assets.find(a=>a.id===id),desired:Record<string,string>=ids.includes(id)&&asset?renderSkillPointer(asset,await readFile(join(options.stagedRoot,asset.entry)),host):{};
   const pending:SkillRecord[]=[],registered:ManagedProjectionFile[]=[];
   try{
    if(asset)await assertProjectionCasing(options.target,`.${host}/skills/${asset.name}`);
    if(asset&&ids.includes(id)&&!owned.some(file=>file.path.startsWith(`.${host}/skills/${asset.name}/`))){
     const folder=await containedPath(options.target,`.${host}/skills/${asset.name}`);
     try{await lstat(folder);throw new Error('unmanaged Skill directory already exists');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    }
    for(const p of new Set([...owned.map(f=>f.path),...Object.keys(desired)])){
     const before=await snapshot(options.target,p),prior=owned.find(f=>f.path===p);
     if(prior ? before.kind!=='file'||sha256Buffer(Buffer.from(before.content,'base64'))!==prior.sha256 : before.kind!=='absent')throw new Error(`file differs from ownership record: ${p}`);
     const after=desired[p]===undefined?{kind:'absent' as const}:fileNode(desired[p]);
     if(JSON.stringify(before)!==JSON.stringify(after))pending.push({name:p,before,after});
     if(desired[p]!==undefined)registered.push({path:p,asset_id:id,sha256:sha256Buffer(desired[p])});
    }
    records.push(...pending);next.files.push(...registered);
   }catch(e){warnings.push({code:'managed-asset-conflict',path:`${host}:${id}`,message:String(e)});next.files.push(...owned);}
  }
 }
 next.files.sort((a,b)=>a.path.localeCompare(b.path));
 if(old||next.files.length||next.selections.agents.length||next.selections.claude.length)await writeFile(join(options.stagedRoot,'.speculo',MANAGED_MANIFEST),JSON.stringify(next,null,2)+'\n');
 return {records:records.length?records:null,blockers:[],warnings,count:next.files.filter(f=>f.path.endsWith('/SKILL.md')).length};
}
export async function inspectProjectedSkills(target:string,_installed:string[]):Promise<Array<{id:string;ok:boolean;message:string}>>{
 try{
  const manifest=await readProjectionManifest(target);if(!manifest)return [];
  const catalog=await readAssetCatalog(join(target,INSTALL_ROOT)),checks=[];
  for(const record of manifest.files){const node=await snapshot(target,record.path);if(node.kind!=='file'||sha256Buffer(Buffer.from(node.content,'base64'))!==record.sha256)checks.push({id:`projection-file:${record.path}`,ok:false,message:'owned projection drifted; preserve and reconcile explicitly'});}
  for(const host of ['agents','claude'] as const)for(const id of manifest.selections[host]){
   const asset=catalog.assets.find(a=>a.id===id);let ok=!!asset;
   if(asset){const expected=renderSkillPointer(asset,await readFile(join(target,INSTALL_ROOT,asset.entry)),host);
    for(const [p,text] of Object.entries(expected)){const record=manifest.files.find(f=>f.path===p);const node=await snapshot(target,p);ok=ok&&!!record&&record.sha256===sha256Buffer(text)&&node.kind==='file'&&node.content===Buffer.from(text).toString('base64');}}
   checks.push({id:`projection:${host}:${id}`,ok,message:ok?'source and owned projection match; host invocation not probed':'projection missing, conflicted or drifted'});
  }
  return checks;
 }catch(e){return [{id:'projections',ok:false,message:String(e)}];}
}
