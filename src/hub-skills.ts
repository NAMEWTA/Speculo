import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import type { HubCatalog } from "./hub-catalog.js";
export { discoverHubCatalog, type HubCatalog } from "./hub-catalog.js";
import { assertProjectionCasing, normalizeSkillTargets, parseSkillSpec, sha256Buffer, type ProjectionHost, type SkillRequest } from "./agent-skills.js";
import { containedPath, INSTALL_ROOT } from "./paths.js";
import { absent, sameNode, snapshotSkillTree, reconcileOwnedTree, validSkillPath, type SkillNode, type SkillRecord } from "./skill-trees.js";

type OwnedNode = { path: string; kind: "file" | "directory"; mode: number; sha256?: string };
type OwnedPackage = { id: string; host: ProjectionHost; name: string; nodes: OwnedNode[] };
export type HubManifest = { schema_version: 1; package_version: string; targets: ProjectionHost[]; skill_ids: string[]; packages: OwnedPackage[] };
export type HubSummary = { selected: string[]; targets: ProjectionHost[]; installed: string[]; created: string[]; updated: string[]; removed: string[]; conflicts: string[] };
export const HUB_MANIFEST = "hub-skills.json";
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseHubSkillSpec(spec: string): SkillRequest {
  try { return parseSkillSpec(spec); } catch { throw new Error("--hub-skills must be none|keep|all or comma-separated category/name ids"); }
}
export function resolveHubIds(request: SkillRequest | undefined, catalog: HubCatalog, existing: string[]): string[] {
  const ids = !request || request.mode === "keep" ? existing : request.mode === "none" ? [] : request.mode === "all" ? [...catalog.keys()] : request.mode === "set" ? request.assetIds : [];
  for (const id of ids) if (!catalog.has(id)) throw new Error("unavailable-hub-skill: " + id + "; explicitly select a new list or none");
  return [...new Set(ids)].sort();
}
function ownedNodes(tree: Map<string, SkillNode>): OwnedNode[] {
  return [...tree].map(([path, node]) => {
    if (node.kind === "absent") throw new Error("absent-owned-node");
    return { path, kind: node.kind, mode: node.mode, ...(node.kind === "file" ? { sha256: sha256Buffer(Buffer.from(node.content, "base64")) } : {}) };
  });
}
function matches(tree: Map<string, SkillNode>, nodes: OwnedNode[]): boolean {
  const actual = new Map(ownedNodes(tree).map(n => [n.path, n]));
  return nodes.every(n => {
    const a = actual.get(n.path); return a?.kind === n.kind && a.mode === n.mode && a.sha256 === n.sha256;
  });
}
export async function readHubManifest(target: string): Promise<HubManifest | null> {
  let text: string;
  try { text = await readFile(await containedPath(target, `${INSTALL_ROOT}/.speculo/${HUB_MANIFEST}`), "utf8"); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
  const m = JSON.parse(text) as HubManifest;
  if (!m || m.schema_version !== 1 || typeof m.package_version !== "string" || !Array.isArray(m.targets) ||
      normalizeSkillTargets(m.targets).length !== m.targets.length || !Array.isArray(m.skill_ids) || m.skill_ids.some(id => !ID.test(id)) ||
      new Set(m.skill_ids).size !== m.skill_ids.length || !Array.isArray(m.packages) || (!m.targets.length && m.skill_ids.length)) throw new Error("invalid-hub-manifest");
  const destinations = new Set<string>();
  for (const p of m.packages) {
    if (!p || !ID.test(p.id) || p.name !== p.id.split("/")[1] || !["agents", "claude"].includes(p.host) || !Array.isArray(p.nodes)) throw new Error("invalid-hub-package");
    const root = `.${p.host}/skills/${p.name}`;
    if (destinations.has(root)) throw new Error("duplicate-hub-destination"); destinations.add(root);
    const paths = new Set<string>();
    for (const n of p.nodes) {
      if (!n || typeof n.path !== "string" || !validSkillPath(root + (n.path ? "/" + n.path : "")) || paths.has(n.path) ||
          !Number.isInteger(n.mode) || n.mode < 0 || n.mode > 0o777 || !["file", "directory"].includes(n.kind) ||
          (n.kind === "file" ? !/^[a-f0-9]{64}$/.test(n.sha256 ?? "") : n.sha256 !== undefined)) throw new Error("invalid-hub-node");
      if (process.platform === "win32") n.mode = n.kind === "directory" ? 0o755 : n.mode & 0o200 ? 0o666 : 0o444;
      paths.add(n.path);
    }
    if (!p.nodes.some(n => n.path === "" && n.kind === "directory") || !p.nodes.some(n => n.path === "SKILL.md" && n.kind === "file")) throw new Error("invalid-hub-package-root");
    for (const n of p.nodes) if (n.path && !p.nodes.some(d => d.kind === "directory" && d.path === (posix.dirname(n.path) === "." ? "" : posix.dirname(n.path)))) throw new Error("invalid-hub-node-parent");
  }
  return m;
}
export async function planHubSkills(options: { target: string; stagedRoot: string; packageVersion: string; catalog: HubCatalog; ids: string[]; targets: ProjectionHost[] }): Promise<{ records: SkillRecord[]; summary: HubSummary; warnings: string[] }> {
  const old = await readHubManifest(options.target), targets = normalizeSkillTargets(options.targets);
  if (options.ids.length && !targets.length) throw new Error("--hub-skills requires at least one --skill-targets destination");
  const next: HubManifest = { schema_version: 1, package_version: options.packageVersion, targets, skill_ids: options.ids, packages: [] };
  const summary: HubSummary = { selected: options.ids, targets, installed: [], created: [], updated: [], removed: [], conflicts: [] };
  const records: SkillRecord[] = [], warnings: string[] = [];
  for (const host of ["agents", "claude"] as const) {
    const previous = old?.packages.filter(p => p.host === host) ?? [];
    const desired = targets.includes(host) ? options.ids : [];
    for (const id of new Set([...desired, ...previous.map(p => p.id)])) {
      const prior = previous.find(p => p.id === id), skill = options.catalog.get(id), name = skill?.name ?? prior!.name;
      const root = `.${host}/skills/${name}`, label = `${host}:${id}`;
      try {
        await assertProjectionCasing(options.target, root);
        const names = await readdir(await containedPath(options.target, `.${host}/skills`)).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; });
        if (names.some(n => n.toLowerCase() === name.toLowerCase() && n !== name)) throw new Error("ambiguous Skill directory casing");
        const before = await snapshotSkillTree(await containedPath(options.target, root));
        if (!prior && before.size > 0) throw new Error("unmanaged same-name directory exists");
        const packaged = desired.includes(id) ? skill!.tree : new Map<string, SkillNode>();
        const after = reconcileOwnedTree(before, prior?.nodes ?? [], packaged);
        const pending: SkillRecord[] = [];
        for (const path of new Set([...before.keys(), ...after.keys()])) {
          const a = before.get(path) ?? absent, b = after.get(path) ?? absent;
          if (a.kind !== "absent" && b.kind !== "absent" && a.kind !== b.kind) throw new Error("resource node type changed: " + path);
          pending.push({ name: root + (path ? "/" + path : ""), before: a, after: b });
        }
        if (packaged.size) {
          next.packages.push({ id, name, host, nodes: ownedNodes(packaged) }); summary.installed.push(label);
          if (!prior) summary.created.push(label);
          else if (pending.some(r => !sameNode(r.before, r.after))) summary.updated.push(label);
        } else if (prior) summary.removed.push(label);
        // Include unchanged nodes to detect extra files and recover partial package changes.
        if (pending.some(r => !sameNode(r.before, r.after))) records.push(...pending);
      } catch (e) {
        summary.conflicts.push(label); warnings.push(`hub-package-conflict ${root}: ${String(e)}; whole package retained`);
        if (prior) { next.packages.push(prior); summary.installed.push(label); }
      }
    }
  }
  await writeFile(join(options.stagedRoot, ".speculo", HUB_MANIFEST), JSON.stringify(next, null, 2) + "\n");
  return { records, summary, warnings };
}
export async function inspectHubSkills(target: string): Promise<Array<{ id: string; ok: boolean; message: string }>> {
  try {
    const m = await readHubManifest(target); if (!m) return [];
    const checks = [];
    for (const p of m.packages) {
      const tree = await snapshotSkillTree(await containedPath(target, `.${p.host}/skills/${p.name}`));
      const ok = m.targets.includes(p.host) && m.skill_ids.includes(p.id) && matches(tree, p.nodes);
      checks.push({ id: `hub:${p.host}:${p.id}`, ok, message: ok ? "complete owned package matches; host invocation not probed" : "package drifted or retained after conflict" });
    }
    for (const host of m.targets) for (const id of m.skill_ids) if (!m.packages.some(p => p.host === host && p.id === id)) checks.push({ id: `hub:${host}:${id}`, ok: false, message: "selected package not installed due to conflict" });
    return checks;
  } catch (e) { return [{ id: "hub-skills", ok: false, message: String(e) }]; }
}
