import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { readAssetCatalog, parseFrontmatter, type Asset, type AssetCatalog } from "./assets.js";
import { containedPath, INSTALL_ROOT, safeRelativePath } from "./paths.js";
import { RefreshBlockedError, type RefreshBlocker } from "./refresh.js";
import type { SkillNode, SkillRecord } from "./transaction.js";
import { readImage } from "./external-files.js";

export const MANAGED_MANIFEST = "projections.json";
export type ProjectionHost = "agents" | "claude";
export type SkillRequest = {mode:"none"|"keep"|"all"} | {mode:"set";assetIds:string[]};
export type ExposureSelection = { targets: ProjectionHost[]; assetIds: string[] };
export type ExposureSummary = ExposureSelection & { added: string[]; retained: string[]; removed: string[] };
export type ProjectionSummary = {
 enabled: boolean;
 affected: boolean;
 selected: string[];
 added: string[];
 retained: string[];
 removed: string[];
 ready: number;
 conflicts: string[];
 created: number;
 updated: number;
 deleted: number;
};
export type ProjectionSummaries = Record<ProjectionHost, ProjectionSummary>;

/** Every UI mode and command-line request resolves against the staged catalog. */
export function resolveProjectionIds(request: SkillRequest, catalog: AssetCatalog, existing: string[]): string[] {
 let ids: string[];
 switch (request.mode) {
  case "none": ids = []; break;
  case "keep": ids = existing; break;
  case "all": ids = catalog.assets.map(a => a.id); break;
  case "set": ids = request.assetIds; break;
  default: throw new Error("invalid-projection-selection");
 }
 for (const id of ids) if (!catalog.assets.some(a => a.id === id))
  throw new RefreshBlockedError([{code:"unknown-projection-asset",path:id,message:"select an installed public asset business id"}]);
 return [...new Set(ids)].sort();
}
type ManagedProjectionFile = {path:string;asset_id:string;sha256:string};
export type ManagedManifest = {schema_version:3;package_version:string;targets:ProjectionHost[];asset_ids:string[];files:ManagedProjectionFile[]};
export function sha256Buffer(value:Buffer|string):string{return createHash('sha256').update(value).digest('hex');}
const BUSINESS_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function parseSkillSpec(spec:string):SkillRequest{
 if(['none','keep','all'].includes(spec))return {mode:spec as 'none'|'keep'|'all'};
 const ids=spec.split(',');
 if(!ids.length||ids.some(id=>!BUSINESS_ID.test(id)))throw new Error('--skills must be none|keep|all or comma-separated business ids');
 return {mode:'set',assetIds:[...new Set(ids)].sort()};
}
export function normalizeSkillTargets(targets: readonly ProjectionHost[]): ProjectionHost[] {
 if(!Array.isArray(targets)||targets.some(host=>host!=='agents'&&host!=='claude'))throw new Error('--skill-targets must be agents|claude|agents,claude|none');
 return (['agents','claude'] as const).filter(host=>targets.includes(host));
}
export function parseSkillTargets(spec:string):ProjectionHost[]{
 return spec==='none'?[]:normalizeSkillTargets(spec.split(',') as ProjectionHost[]);
}
export function validateExposureRequest(targets: ProjectionHost[] | undefined, request: SkillRequest | undefined):void {
 if(targets!==undefined)normalizeSkillTargets(targets);
 if(targets?.length===0&&request&&request.mode!=='none')throw new Error('--skill-targets none conflicts with --skills other than none');
}
export async function readProjectionManifest(target:string):Promise<ManagedManifest|null>{
 let content:string;try{content=await readFile(await containedPath(target,`${INSTALL_ROOT}/.speculo/${MANAGED_MANIFEST}`),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
 const m=JSON.parse(content) as ManagedManifest;
 if(!m||m.schema_version!==3)throw new Error('invalid-projection-manifest: expected schema_version 3; older formats are not migrated');
 if(typeof m.package_version!=='string'||!Array.isArray(m.targets)||m.targets.some(h=>h!=='agents'&&h!=='claude')||new Set(m.targets).size!==m.targets.length||!Array.isArray(m.asset_ids)||m.asset_ids.some(id=>typeof id!=='string'||!BUSINESS_ID.test(id))||new Set(m.asset_ids).size!==m.asset_ids.length||(!m.targets.length&&m.asset_ids.length)||!Array.isArray(m.files))throw new Error('invalid-projection-manifest');
 for(const file of m.files)if(!file||typeof file.path!=='string'||!safeRelativePath(file.path)||!/^\.(agents|claude)\/skills\/[a-z0-9-]+\/(SKILL\.md|agents\/openai\.yaml)$/.test(file.path)||typeof file.asset_id!=='string'||!BUSINESS_ID.test(file.asset_id)||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))throw new Error('invalid-projection-record');
 if(new Set(m.files.map(f=>f.path)).size!==m.files.length)throw new Error('invalid-projection-manifest');
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
export async function resolveExposure(options: {
 target: string; catalog: AssetCatalog; targets?: ProjectionHost[]; request?: SkillRequest; prompt: boolean;
}): Promise<ExposureSelection> {
 validateExposureRequest(options.targets, options.request);
 const manifest = await readProjectionManifest(options.target);
 const existing: ExposureSelection = { targets: manifest?.targets ?? ['agents'], assetIds: manifest?.asset_ids ?? [] };
 if (options.prompt) {
  const { promptExposureConfiguration } = await import('./install-ui.js');
  return promptExposureConfiguration({ catalog: options.catalog, existing, hasHistory: manifest !== null, targets: options.targets, request: options.request });
 }
 const targets = normalizeSkillTargets(options.targets ?? existing.targets);
 if (!targets.length) {
  validateExposureRequest(targets, options.request);
  return { targets, assetIds: [] };
 }
 return { targets, assetIds: resolveProjectionIds(options.request ?? { mode: manifest ? 'keep' : 'none' }, options.catalog, existing.assetIds) };
}
export async function planSkillProjection(options: {
 target: string; stagedRoot: string; packageVersion: string; exposure: ExposureSelection;
}): Promise<{records:SkillRecord[]|null;blockers:RefreshBlocker[];warnings:RefreshBlocker[];count:number;summaries:ProjectionSummaries;exposure:ExposureSummary}> {
 const old=await readProjectionManifest(options.target),catalog=await readAssetCatalog(options.stagedRoot);
 const targets=normalizeSkillTargets(options.exposure.targets);
 if(!targets.length&&options.exposure.assetIds.length)throw new Error('cannot expose skills without a target');
 const assetIds=resolveProjectionIds({mode:'set',assetIds:options.exposure.assetIds},catalog,[]);
 const priorSelection=old?.asset_ids??[];
 const exposure:ExposureSummary={targets,assetIds,added:assetIds.filter(id=>!priorSelection.includes(id)),retained:assetIds.filter(id=>priorSelection.includes(id)),removed:priorSelection.filter(id=>!assetIds.includes(id))};
 const next:ManagedManifest={schema_version:3,package_version:options.packageVersion,targets,asset_ids:assetIds,files:[]};
 const records:SkillRecord[]=[],warnings:RefreshBlocker[]=[];
 const summaries={} as ProjectionSummaries;
 for(const host of ['agents','claude'] as const){
  const enabled=targets.includes(host);
  const priorIds=old?.targets.includes(host)?old.asset_ids:[];
  const ids=enabled?assetIds:[];
  const previous=(old?.files??[]).filter(f=>f.path.startsWith(`.${host}/skills/`));
  const summary=summaries[host]={enabled,affected:enabled||!!old?.targets.includes(host)||previous.length>0,selected:ids,added:ids.filter(id=>!priorIds.includes(id)),retained:ids.filter(id=>priorIds.includes(id)),removed:priorIds.filter(id=>!ids.includes(id)).sort(),ready:0,conflicts:[] as string[],created:0,updated:0,deleted:0};
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
    if(ids.includes(id)) {
     summary.ready++;
     if(pending.length) { if(owned.length)summary.updated++; else summary.created++; }
    } else if(pending.length)summary.deleted++;
   }catch(e){warnings.push({code:'managed-asset-conflict',path:`${host}:${id}`,message:String(e)});summary.conflicts.push(id);next.files.push(...owned);}
  }
 }
 next.files.sort((a,b)=>a.path.localeCompare(b.path));
 await writeFile(join(options.stagedRoot,'.speculo',MANAGED_MANIFEST),JSON.stringify(next,null,2)+'\n');
 return {records:records.length?records:null,blockers:[],warnings,count:next.files.filter(f=>f.path.endsWith('/SKILL.md')).length,summaries,exposure};
}
export async function inspectProjectedSkills(target:string,_installed:string[]):Promise<Array<{id:string;ok:boolean;message:string}>>{
 try{
  const manifest=await readProjectionManifest(target);if(!manifest)return [];
  const catalog=await readAssetCatalog(join(target,INSTALL_ROOT)),checks=[];
  for(const record of manifest.files){const node=await snapshot(target,record.path);if(node.kind!=='file'||sha256Buffer(Buffer.from(node.content,'base64'))!==record.sha256)checks.push({id:`projection-file:${record.path}`,ok:false,message:'owned projection drifted; preserve and reconcile explicitly'});}
  for(const record of manifest.files)if(!manifest.targets.some(host=>record.path.startsWith(`.${host}/skills/`))||!manifest.asset_ids.includes(record.asset_id))checks.push({id:`projection-retained:${record.path}`,ok:false,message:'disabled projection retained due to conflict; preserve and reconcile explicitly'});
  for(const host of manifest.targets)for(const id of manifest.asset_ids){
   const asset=catalog.assets.find(a=>a.id===id);let ok=!!asset;
   if(asset){const expected=renderSkillPointer(asset,await readFile(join(target,INSTALL_ROOT,asset.entry)),host);
    for(const [p,text] of Object.entries(expected)){const record=manifest.files.find(f=>f.path===p);const node=await snapshot(target,p);ok=ok&&!!record&&record.sha256===sha256Buffer(text)&&node.kind==='file'&&node.content===Buffer.from(text).toString('base64');}}
   checks.push({id:`projection:${host}:${id}`,ok,message:ok?'source and owned projection match; host invocation not probed':'projection missing, conflicted or drifted'});
  }
  return checks;
 }catch(e){return [{id:'projections',ok:false,message:String(e)}];}
}
