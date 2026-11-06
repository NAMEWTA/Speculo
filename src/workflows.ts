import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readAssetCatalog } from "./assets.js";
import { RefreshBlockedError } from "./refresh.js";
export type WorkflowPackage = { id:string; name:string; displayName:string; description:string };
export type WorkflowCatalog = Map<string,WorkflowPackage>;
export type WorkflowSelection = {workflowIds:string[]};
async function discover(root: string): Promise<WorkflowCatalog> {
  const catalog: WorkflowCatalog = new Map();
  for (const asset of (await readAssetCatalog(root)).assets) {
    if (asset.kind !== "domain-skill") continue;
    const id = asset.domain!;
    catalog.set(id, { id, name: asset.name, displayName: asset.name, description: asset.description });
  }
  return catalog;
}
export async function discoverWorkflowCatalog(packageRoot:string):Promise<WorkflowCatalog>{return discover(join(packageRoot,'template'));}
export async function scanInstalledWorkflows(installRoot:string):Promise<string[]>{return [...(await discover(installRoot)).keys()].sort();}
/** Repair must not parse potentially edited or missing managed method files. */
export async function readInstalledWorkflowIds(installRoot: string): Promise<string[]> {
 let content: string;
 try { content = await readFile(join(installRoot, ".speculo/install.json"), "utf8"); }
 catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
 const manifest = JSON.parse(content);
 if (!manifest || manifest.schema_version !== 4) throw new RefreshBlockedError([{code:"unsupported-installation-version",path:".speculo/install.json",message:"Speculo requires a schema v4 install manifest; existing data is preserved"}]);
 if (!Array.isArray(manifest.workflows) ||
     manifest.workflows.some((id: unknown) => typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) ||
     new Set(manifest.workflows).size !== manifest.workflows.length) throw new RefreshBlockedError([{code:"invalid-install-manifest",path:".speculo/install.json",message:"cannot establish installed workflow identities"}]);
 return [...manifest.workflows].sort();
}
export function isInteractive():boolean{return process.stdin.isTTY===true && process.stdout.isTTY===true;}
export async function promptWorkflowSelection(catalog:WorkflowCatalog,options?:{preSelectedWorkflowIds?:Set<string>}):Promise<WorkflowSelection>{
 if(!isInteractive())return {workflowIds:[...(options?.preSelectedWorkflowIds??[])].filter(id=>catalog.has(id)).sort()};
 const {promptWorkflows}=await import('./install-ui.js');
 return promptWorkflows(catalog,options?.preSelectedWorkflowIds??new Set());
}
export function selectAllFromCatalog(catalog:WorkflowCatalog):WorkflowSelection{return {workflowIds:[...catalog.keys()].sort()};}
