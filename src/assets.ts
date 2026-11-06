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
export type Asset = { id: string; kind: "domain-skill" | "command"; name: string; domain?: string; entry: string; description: string };
export type AssetCatalog = { schema_version: 2; assets: Asset[] };

/** A workflow is one standard Skill. Its directory is the only registration. */
export async function readAssetCatalog(root: string): Promise<AssetCatalog> {
  const assets: Asset[] = [];
  async function directories(path: string) {
    return (await readdir(path, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })).filter(entry => entry.isDirectory() && !entry.name.startsWith("_")).sort((a, b) => a.name.localeCompare(b.name));
  }
  for (const folder of await directories(join(root, "workflows"))) {
    const entry = `workflows/${folder.name}/SKILL.md`;
    if (!await pathExists(join(root, entry))) continue;
    const content = await readFile(await containedPath(root, entry));
    const errors = validateSkill(content, dirname(entry));
    if (errors.length) throw new Error(`${entry}: ${errors.join("; ")}`);
    const { fields } = parseFrontmatter(content);
    assets.push({ id: `domain/${folder.name}`, kind: "domain-skill", name: fields.name as string,
      domain: folder.name, entry, description: fields.description as string });
  }
  for (const folder of await directories(join(root, "commands"))) {
    const entry = `commands/${folder.name}/COMMAND.md`;
    if (!await pathExists(join(root, entry))) continue;
    if (!safeRelativePath(folder.name) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folder.name)) throw new Error(`invalid-command-entry: ${entry}`);
    const { fields } = parseFrontmatter(await readFile(await containedPath(root, entry)));
    if (fields.id !== folder.name || typeof fields.description !== "string" || !fields.description.trim()) throw new Error(`invalid-command-header: ${entry}`);
    assets.push({ id: `command/${folder.name}`, kind: "command", name: `speculo-${folder.name}`,
      entry, description: fields.description });
  }
  for (const key of ["id", "name"] as const) if (new Set(assets.map(asset => asset[key])).size !== assets.length) throw new Error(`duplicate-asset-${key}`);
  return { schema_version: 2, assets: assets.sort((a, b) => a.id.localeCompare(b.id)) };
}
