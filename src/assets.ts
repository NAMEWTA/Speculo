import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parseDocument } from "yaml";
import { safeRelativePath, containedPath } from "./paths.js";
import { pathExists } from "./utils.js";

export type Frontmatter = { raw: string; fields: Record<string, unknown>; body: string };
export function parseFrontmatter(content: string | Buffer): Frontmatter {
  const source = Buffer.isBuffer(content) ? content.toString("utf8") : content;
  if (Buffer.isBuffer(content) && !content.equals(Buffer.from(source))) throw new Error("invalid-frontmatter: source must be UTF-8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(source);
  if (!match) throw new Error("invalid-frontmatter: missing YAML delimiters");
  const document = parseDocument(match[1], { version: "1.2", uniqueKeys: true, strict: true });
  if (document.errors.length || document.warnings.length) throw new Error("invalid-frontmatter: " + [...document.errors, ...document.warnings].map(e=>e.message).join("; "));
  const fields: unknown = document.toJS({ maxAliasCount: 0 });
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("invalid-frontmatter: expected a mapping");
  function checkKeys(value:unknown):void {if(value&&typeof value==='object'){for(const key of Object.keys(value)){if(['__proto__','prototype','constructor'].includes(key))throw new Error('invalid-frontmatter: unsafe mapping key '+key);checkKeys((value as Record<string,unknown>)[key]);}}}
  checkKeys(fields);
  return { raw: match[0], fields: fields as Record<string, unknown>, body: source.slice(match[0].length) };
}
const STANDARD_FIELDS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
export function validateSkill(content: string | Buffer, directory: string): string[] {
  try {
    const {fields} = parseFrontmatter(content), errors: string[] = [];
    if (typeof fields.name !== "string" || fields.name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name) || fields.name !== basename(directory)) errors.push("name must match its lowercase parent directory (1–64 characters)");
    if (typeof fields.description !== "string" || !fields.description.trim() || fields.description.length > 1024) errors.push("description must be a nonempty string of at most 1024 characters");
    for (const key of Object.keys(fields)) if (!STANDARD_FIELDS.has(key)) errors.push("unsupported top-level field: " + key);
    for (const key of ["license", "compatibility", "allowed-tools"]) if (fields[key] !== undefined && typeof fields[key] !== "string") errors.push(key + " must be a string");
    if (typeof fields.compatibility === "string" && fields.compatibility.length > 500) errors.push("compatibility exceeds 500 characters");
    if (fields.metadata !== undefined && (!fields.metadata || typeof fields.metadata !== "object" || Array.isArray(fields.metadata) || !Object.values(fields.metadata).every(v=>typeof v === "string"))) errors.push("metadata must contain string values");
    return errors;
  } catch (e) { return [String(e)]; }
}
export type Asset = { id: string; kind: "domain-skill" | "work-skill" | "command"; name: string; domain?: string; entry: string; description: string; stages: string[] };
export type AssetCatalog = { schema_version: 2; assets: Asset[] };
export async function readAssetCatalog(root: string): Promise<AssetCatalog> {
  const assets: Asset[] = [];
  async function addSkill(entry: string, kind: Asset["kind"], domain: string, stages: string[] = []) {
    const content = await readFile(await containedPath(root, entry));
    const errors = validateSkill(content, dirname(entry)); if (errors.length) throw new Error(`${entry}: ${errors.join("; ")}`);
    const {fields} = parseFrontmatter(content), meta = fields.metadata as Record<string,string>;
    if (!meta || meta["speculo-kind"] !== kind || meta["speculo-domain"] !== domain || !meta["speculo-id"] || meta["speculo-contract-version"] !== "2") throw new Error(`invalid-asset-metadata: ${entry}`);
    if (kind === "domain-skill" ? meta["speculo-id"] !== `domain/${domain}` : !meta["speculo-id"].startsWith(domain + "/")) throw new Error(`invalid-business-id: ${entry}`);
    assets.push({id:meta["speculo-id"],kind,name:fields.name as string,domain,entry,description:fields.description as string,stages});
  }
  const folders = await readdir(join(root,"workflows"),{withFileTypes:true}).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return [];throw e;});
  for(const folder of folders.sort((a,b)=>a.name.localeCompare(b.name))) {
    if(!folder.isDirectory()||folder.name.startsWith('_'))continue;
    const domain=folder.name, prefix=`workflows/${domain}`;
    if(!await pathExists(join(root,prefix,'SKILL.md'))&&!await pathExists(join(root,prefix,'manifest.json')))continue;
    const manifest=JSON.parse(await readFile(await containedPath(root,`${prefix}/manifest.json`),'utf8'));
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(domain)||!manifest||manifest.schema_version!==2||manifest.id!==domain||manifest.entry!=="SKILL.md"||!Array.isArray(manifest.works)||new Set(manifest.works).size!==manifest.works.length||!manifest.work_stages||typeof manifest.work_stages!=='object'||Array.isArray(manifest.work_stages)||Object.keys(manifest.work_stages).some(k=>!manifest.works.includes(k)))throw new Error(`invalid-domain-manifest: ${domain}`);
    await addSkill(`${prefix}/SKILL.md`,"domain-skill",domain);
    for(const entry of manifest.works) {
      if(!safeRelativePath(entry)||!new RegExp(`^${domain}-[a-z]-[a-z0-9-]+/SKILL\\.md$`).test(entry))throw new Error(`invalid-work-entry: ${entry}`);
      const phases=manifest.work_stages[entry];
      if(!Array.isArray(phases)||new Set(phases).size!==phases.length||phases.some((p:unknown)=>typeof p!=='string'||!/^[a-z][a-z0-9-]*$/.test(p)))throw new Error(`invalid-work-stages: ${entry}`);
      await addSkill(`${prefix}/${entry}`,"work-skill",domain,phases);
    }
    for(const entry of await readdir(join(root,prefix),{withFileTypes:true}))if(entry.isDirectory()&&entry.name.startsWith(domain+'-')&&!manifest.works.includes(`${entry.name}/SKILL.md`))throw new Error(`unregistered-work: ${prefix}/${entry.name}`);
  }
  const manifest=JSON.parse(await readFile(await containedPath(root,'commands/manifest.json'),'utf8'));
  if(!manifest||manifest.schema_version!==1||!Array.isArray(manifest.commands)||new Set(manifest.commands).size!==manifest.commands.length)throw new Error('invalid-command-manifest');
  for(const entry of manifest.commands) {
    if(!safeRelativePath(entry)||!/^([a-z0-9]+(?:-[a-z0-9]+)*)\/COMMAND\.md$/.test(entry))throw new Error(`invalid-command-entry: ${entry}`);
    const {fields}=parseFrontmatter(await readFile(await containedPath(root,`commands/${entry}`)));
    const id=entry.split('/')[0];
    if(fields.id!==id||typeof fields.description!=='string'||!fields.description.trim())throw new Error(`invalid-command-header: ${entry}`);
    assets.push({id:`command/${id}`,kind:'command',name:`speculo-${id}`,entry:`commands/${entry}`,description:fields.description,stages:[]});
  }
  for(const entry of await readdir(join(root,'commands'),{withFileTypes:true}))if(entry.isDirectory()&&await pathExists(join(root,'commands',entry.name,'COMMAND.md'))&&!manifest.commands.includes(`${entry.name}/COMMAND.md`))throw new Error(`unregistered-command: ${entry.name}`);
  for(const key of ['id','name'] as const)if(new Set(assets.map(a=>a[key])).size!==assets.length)throw new Error(`duplicate-asset-${key}`);
  return {schema_version:2,assets:assets.sort((a,b)=>a.id.localeCompare(b.id))};
}
