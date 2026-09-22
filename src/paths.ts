import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const ROOT_NAMES = ["config", "speculo", "state", "commands", "skills", "workflows"] as const;
export type RootName = typeof ROOT_NAMES[number];
export type Workspace = { schema_version: 1; path_base: "project-root"; roots: Record<RootName, string> };

export function safeRelativePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/[\\:\x00-\x1f]/.test(value) &&
    !value.startsWith("/") && !value.split("/").some((part, index, all) => part === ".." || part === "." || (!part && index < all.length - 1));
}
export function validateWorkspace(value: unknown): asserts value is Workspace {
  const w = value as Partial<Workspace> | null;
  if (!w || w.schema_version !== 1 || w.path_base !== "project-root" || !w.roots || Array.isArray(w.roots) ||
      !ROOT_NAMES.every((key) => safeRelativePath(w.roots?.[key]))) throw new Error("invalid-workspace-roots");
  const root = w.roots.speculo.replace(/\/$/, "");
  for (const key of ROOT_NAMES.filter((name) => name !== "speculo")) {
    if (!w.roots[key].startsWith(root + "/")) throw new Error(`workspace-root-outside-installation: ${key}`);
  }
}

export async function containedPath(projectRoot: string, portable: string): Promise<string> {
  if (!safeRelativePath(portable)) throw new Error(`unsafe-project-path: ${portable}`);
  const root = resolve(projectRoot), target = resolve(root, portable), rel = relative(root, target);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) throw new Error("path-outside-project");
  let cursor = root;
  for (const part of rel.split(sep)) {
    cursor = join(cursor, part);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`path-symlink: ${cursor}; explicit source ownership is required`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return target;
}

/** Resolve one explicit reference, not shell text. No shell is invoked or authorized. */
export async function resolvePathReference(projectRoot: string, reference: string): Promise<string> {
  const workspacePath = await containedPath(projectRoot, "speculo/.speculo/workspace.json");
  const workspace: unknown = JSON.parse(await readFile(workspacePath, "utf8"));
  validateWorkspace(workspace);
  const tagged = /^<Path>([^<>]+)<\/Path>$/.exec(reference);
  if (reference.includes("<") && !tagged) throw new Error("invalid-path-tag");
  let portable = tagged?.[1] ?? reference;
  portable = portable.replace(/^\{roots\.([a-z]+)\}/, (_, key: RootName) => {
    if (!ROOT_NAMES.includes(key)) throw new Error(`unknown-root: ${key}`);
    return workspace.roots[key].replace(/\/$/, "");
  });
  if (/[{}*?]/.test(portable)) throw new Error("unresolved-path-reference: substitute identifiers before execution; glob expansion is not supported");
  return containedPath(projectRoot, portable);
}
