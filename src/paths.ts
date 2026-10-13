import { lstat, readFile, readdir } from "node:fs/promises";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const INSTALL_ROOT = ".agents/speculo";
export const WORKSPACE_PATH = `${INSTALL_ROOT}/.speculo/workspace.json`;
export const ROOT_NAMES = ["config", "speculo", "state", "commands", "skills", "workflows", "references"] as const;
export type RootName = typeof ROOT_NAMES[number];
export const DEFAULT_ROOTS: Record<RootName, string> = {
  config: `${INSTALL_ROOT}/config.json`, speculo: INSTALL_ROOT, state: `${INSTALL_ROOT}/.speculo`,
  commands: `${INSTALL_ROOT}/commands`, skills: ".agents/skills", workflows: `${INSTALL_ROOT}/workflows`, references: `${INSTALL_ROOT}/references`,
};
export type Workspace = { schema_version: 2; layout_version: "agents-v2"; installation_id: string; path_base: "project-root"; roots: Record<RootName, string> };
export function safeRelativePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/[\\:\x00-\x1f]/.test(value) &&
    !value.startsWith("/") && !value.split("/").some((part, index, all) => part === ".." || part === "." || (!part && index < all.length - 1));
}
export function validateWorkspace(value: unknown): asserts value is Workspace {
  const w = value as Partial<Workspace> | null;
  if (!w || w.schema_version !== 2 || w.layout_version !== "agents-v2" || w.path_base !== "project-root" ||
      typeof w.installation_id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(w.installation_id) || !w.roots || Array.isArray(w.roots) ||
      Object.keys(w.roots).length !== ROOT_NAMES.length || !ROOT_NAMES.every(key => w.roots?.[key] === DEFAULT_ROOTS[key])) {
    throw new Error("invalid-workspace-roots: expected the agents-v2 layout and installation identity");
  }
}
export async function containedPath(projectRoot: string, portable: string): Promise<string> {
  if (!safeRelativePath(portable)) throw new Error(`unsafe-project-path: ${portable}`);
  const root = resolve(projectRoot), target = resolve(root, portable), rel = relative(root, target);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) throw new Error("path-outside-project");
  let cursor = root;
  for (const part of rel.split(sep)) {
    cursor = join(cursor, part);
    try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`path-symlink: ${cursor}; preserve the existing node`); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return target;
}
async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; }
}
export async function assertSupportedProject(projectRoot: string): Promise<void> {
  const names = await readdir(projectRoot).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; });
  if (names.some(n => n.toLowerCase() === ".agents" && n !== ".agents")) throw new Error("ambiguous-workspace: noncanonical .agents casing; preserve existing files");
  if (await exists(join(projectRoot, "speculo", ".speculo")) || await exists(join(projectRoot, ".speculo-init.lock")) || await exists(join(projectRoot,INSTALL_ROOT,'.speculo/migration.json'))) {
    throw new Error("unsupported-installation-version: old Speculo installation or transaction detected; inspect it with its owning version and explicitly choose a clean project; no data was moved or deleted");
  }
  await containedPath(projectRoot, WORKSPACE_PATH);
  if (await exists(join(projectRoot, ".agents"))) {
    const children = await readdir(join(projectRoot, ".agents"));
    if (children.some(n => ["speculo", "skills"].includes(n.toLowerCase()) && n !== n.toLowerCase())) throw new Error("ambiguous-workspace: noncanonical managed directory casing");
  }
}
export async function locateProject(start: string): Promise<string> {
  let cursor = resolve(start);
  for (;;) {
    if (await exists(join(cursor, WORKSPACE_PATH)) || await exists(join(cursor, ".agents", ".speculo-install.lock")) || (basename(cursor) !== ".agents" && await exists(join(cursor, "speculo", ".speculo")))) {
      await assertSupportedProject(cursor); return cursor;
    }
    const parent = dirname(cursor); if (parent === cursor) return resolve(start); cursor = parent;
  }
}
export async function readWorkspace(projectRoot: string): Promise<Workspace> {
  await assertSupportedProject(projectRoot);
  const value: unknown = JSON.parse(await readFile(await containedPath(projectRoot, WORKSPACE_PATH), "utf8"));
  validateWorkspace(value); return value;
}
/** Synchronous entry for portable validators; the same schema and layout apply. */
export function workspaceForPathSync(start: string): { projectRoot: string; workspace: Workspace } {
  const exists = (p: string) => { try { lstatSync(p); return true; } catch(e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; } };
  let cursor = resolve(start);
  for (;;) {
    if (basename(cursor) !== ".agents" && exists(join(cursor,"speculo/.speculo"))) throw new Error("unsupported-installation-version");
    if (exists(join(cursor,WORKSPACE_PATH))) {
      const names = readdirSync(cursor);
      if (names.some(n => n.toLowerCase() === ".agents" && n !== ".agents")) throw new Error("ambiguous-workspace");
      let node = cursor;
      for (const part of WORKSPACE_PATH.split("/")) { node = join(node,part); if (lstatSync(node).isSymbolicLink()) throw new Error("path-symlink"); }
      if(readdirSync(join(cursor,'.agents')).some(n=>['speculo','skills'].includes(n.toLowerCase())&&n!==n.toLowerCase())) throw new Error('ambiguous-workspace');
      if(exists(join(cursor,'.speculo-init.lock'))||exists(join(cursor,INSTALL_ROOT,'.speculo/migration.json'))) throw new Error('unsupported-installation-version');
      const workspace: unknown = JSON.parse(readFileSync(node,"utf8")); validateWorkspace(workspace);
      return { projectRoot: cursor, workspace };
    }
    const parent=dirname(cursor); if(parent===cursor) throw new Error("missing-workspace: initialize an agents-v2 project first"); cursor=parent;
  }
}
/** Resolve one explicit reference without invoking a shell or granting authority. */
export async function resolvePathReference(start: string, reference: string): Promise<string> {
  const projectRoot = await locateProject(start), workspace = await readWorkspace(projectRoot);
  const tagged = /^<Path>([^<>]+)<\/Path>$/.exec(reference);
  if (reference.includes("<") && !tagged) throw new Error("invalid-path-tag");
  let portable = tagged?.[1] ?? reference;
  portable = portable.replace(/^\{roots\.([a-z]+)\}/, (_, key: RootName) => {
    if (!ROOT_NAMES.includes(key)) throw new Error(`unknown-root: ${key}`);
    return workspace.roots[key];
  });
  if (/[{}*?]/.test(portable)) throw new Error("unresolved-path-reference: substitute identifiers before execution; glob expansion is not supported");
  return containedPath(projectRoot, portable);
}
