import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFrontmatter, validateSkill } from "./assets.js";
import { pathExists } from "./utils.js";
import { validateWorkflowManifest } from "./contracts.js";
export type WorkflowPackage = { id:string; name:string; displayName:string; description:string };
export type WorkflowCatalog = Map<string,WorkflowPackage>;
export type WorkflowSelection = {workflowIds:string[]};
async function discover(root:string):Promise<WorkflowCatalog>{
 const catalog:WorkflowCatalog=new Map();
 const entries=await readdir(join(root,'workflows'),{withFileTypes:true}).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return [];throw e;});
 for(const entry of entries){
  if(!entry.isDirectory()||entry.name.startsWith('_'))continue;
  const folder=join(root,'workflows',entry.name);
  if(!await pathExists(join(folder,'SKILL.md'))&&!await pathExists(join(folder,'manifest.json')))continue;
  const content=await readFile(join(folder,'SKILL.md'));
  const errors=validateSkill(content,entry.name);if(errors.length)throw new Error(`${folder}: ${errors.join('; ')}`);
  const {fields}=parseFrontmatter(content), metadata=fields.metadata as Record<string,string>;
  const manifest=JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'));
  validateWorkflowManifest(manifest, entry.name);
  if(metadata?.['speculo-id']!==`domain/${entry.name}`)throw new Error(`invalid-domain-manifest: ${entry.name}`);
  catalog.set(entry.name,{id:entry.name,name:entry.name,displayName:entry.name,description:fields.description as string});
 }
 return catalog;
}
export async function discoverWorkflowCatalog(packageRoot:string):Promise<WorkflowCatalog>{return discover(join(packageRoot,'template'));}
export async function scanInstalledWorkflows(installRoot:string):Promise<string[]>{return [...(await discover(installRoot)).keys()].sort();}
export function isInteractive():boolean{return process.stdin.isTTY===true && process.stdout.isTTY===true;}
export async function promptWorkflowSelection(catalog:WorkflowCatalog,options?:{preSelectedWorkflowIds?:Set<string>}):Promise<WorkflowSelection>{
 if(!isInteractive())return {workflowIds:[...(options?.preSelectedWorkflowIds??[])].filter(id=>catalog.has(id)).sort()};
 const {promptWorkflows}=await import('./install-ui.js');
 return promptWorkflows(catalog,options?.preSelectedWorkflowIds??new Set());
}
export function selectAllFromCatalog(catalog:WorkflowCatalog):WorkflowSelection{return {workflowIds:[...catalog.keys()].sort()};}
