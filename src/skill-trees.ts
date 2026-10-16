import { chmod, lstat, mkdir, readdir, rmdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { containedPath, safeRelativePath } from "./paths.js";
import { readImage, replaceImage, syncDirectory } from "./external-files.js";

export type SkillNode = { kind: "absent" } | { kind: "directory"; mode: number } | { kind: "file"; content: string; mode: number };
export type SkillRecord = { name: string; before: SkillNode; after: SkillNode };
export const absent: SkillNode = { kind: "absent" };
export const sameNode = (a: SkillNode, b: SkillNode): boolean => a.kind === b.kind &&
  (a.kind === "absent" || b.kind !== "absent" && a.mode === b.mode &&
    (a.kind !== "file" || b.kind === "file" && a.content === b.content));

export function validSkillPath(path: string): boolean {
  return safeRelativePath(path) && !path.endsWith("/") && /^\.(agents|claude)\/skills\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[^/]+)*$/.test(path);
}
export function validSkillNode(node: SkillNode, directories = true): boolean {
  if (!node || typeof node !== "object") return false;
  if (node.kind === "absent") return Object.keys(node).length === 1;
  if (!Number.isInteger(node.mode) || node.mode < 0 || node.mode > 0o777) return false;
  if (node.kind === "directory") return directories && Object.keys(node).length === 2;
  return node.kind === "file" && Object.keys(node).length === 3 && typeof node.content === "string" &&
    Buffer.from(node.content, "base64").toString("base64") === node.content;
}
export async function readSkillNode(path: string, source = false): Promise<SkillNode> {
  let stat;
  try { stat = await lstat(path); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return absent; throw e; }
  if (stat.isSymbolicLink()) throw new Error("skill-symlink: " + path);
  if (stat.mode & 0o7000) throw new Error("unsafe-skill-mode: " + path);
  if (stat.isDirectory()) return { kind: "directory", mode: process.platform === "win32" ? 0o755 : stat.mode & 0o777 };
  const value = await readImage(path, { allowSourceHardlinks: source });
  if (!value) return absent;
  return { kind: "file", ...value };
}
/** Includes empty directories and modes. Never follows symlinks; only read-only package sources may contain pnpm hardlinks. */
export async function snapshotSkillTree(root: string, options: { source?: boolean } = {}): Promise<Map<string, SkillNode>> {
  const nodes = new Map<string, SkillNode>();
  async function visit(name: string) {
    if (name && (!safeRelativePath(name) || name.endsWith("/"))) throw new Error("unsafe-skill-resource: " + name);
    const node = await readSkillNode(join(root, name), options.source);
    if (node.kind === "absent") return;
    nodes.set(name, node);
    if (node.kind === "directory") {
      const names = (await readdir(join(root, name))).sort();
      if (new Set(names.map(n => n.toLowerCase())).size !== names.length) throw new Error("ambiguous-skill-casing: " + root);
      for (const child of names) await visit(name ? `${name}/${child}` : child);
    }
  }
  await visit("");
  return nodes;
}
export async function assertSkillRecords(target: string, records: SkillRecord[], side: "before" | "after" | "either"): Promise<void> {
  for (const record of records) {
    const current = await readSkillNode(await containedPath(target, record.name));
    if (!(side !== "after" && sameNode(current, record.before)) && !(side !== "before" && sameNode(current, record.after)))
      throw new Error("recovery-drift: " + record.name);
  }
  // A root directory record means this is a complete owned package, not a pointer.
  for (const record of records.filter(r => r.name.split("/").length === 3 && (r.before.kind === "directory" || r.after.kind === "directory"))) {
    const allowed = new Set(records.map(r => r.name));
    const tree = await snapshotSkillTree(await containedPath(target, record.name));
    for (const name of tree.keys()) if (!allowed.has(record.name + (name ? "/" + name : ""))) throw new Error("recovery-drift: unrecorded Skill resource " + name);
  }
}
/** Every node has before/after evidence, so recovery also handles an interrupted package copy. */
export async function applySkillRecords(target: string, records: SkillRecord[], side: "before" | "after"): Promise<void> {
  await assertSkillRecords(target, records, side === "before" ? "either" : "before");
  const deepest = [...records].sort((a, b) => b.name.split("/").length - a.name.split("/").length);
  for (const r of deepest) {
    const path = await containedPath(target, r.name), current = await readSkillNode(path);
    if (current.kind === "absent" || r[side].kind !== "absent") continue;
    if (current.kind === "directory") { await rmdir(path); await syncDirectory(dirname(path)); }
    else await replaceImage(path, current, null);
  }
  for (const r of deepest.reverse()) {
    const desired = r[side];
    if (desired.kind === "absent") continue;
    const path = await containedPath(target, r.name), current = await readSkillNode(path);
    if (sameNode(current, desired)) continue;
    if (desired.kind === "directory") {
      if (current.kind !== "absent" && current.kind !== "directory") throw new Error("skill-node-type-conflict: " + r.name);
      await mkdir(path, { recursive: true, mode: desired.mode });
      await chmod(path, desired.mode); await syncDirectory(dirname(path));
    } else {
      if (current.kind === "directory") throw new Error("skill-node-type-conflict: " + r.name);
      await mkdir(dirname(path), { recursive: true });
      await replaceImage(path, current.kind === "absent" ? null : current, desired);
    }
  }
}
