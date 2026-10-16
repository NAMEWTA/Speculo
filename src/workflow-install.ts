import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AssetCatalog } from "./assets.js";
import { readProjectionManifest, sha256Buffer } from "./agent-skills.js";
import { snapshotSkillTree, type SkillRecord } from "./skill-trees.js";
import { containedPath } from "./paths.js";
import { validateRetainedWorkflows, type RetainedWorkflow } from "./retained-workflows.js";
export { validateRetainedWorkflows, retainedAssets } from "./retained-workflows.js";
import type { ManagedFileRecord } from "./manifest.js";

export type WorkflowRemoval = { removed: string[]; retained: string[]; warnings: string[]; registry: RetainedWorkflow[]; removedAssetIds: string[]; priorFiles: ManagedFileRecord[]; projectionRecords: SkillRecord[] };
export async function planWorkflowRemoval(target: string, root: string, installed: string[], selected: string[]): Promise<WorkflowRemoval> {
  const result: WorkflowRemoval = { removed: [], retained: [], warnings: [], registry: [], removedAssetIds: [], priorFiles: [], projectionRecords: [] };
  let metadata;
  try { metadata = JSON.parse(await readFile(join(root, ".speculo/install.json"), "utf8")); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return result; throw e; }
  result.registry = validateRetainedWorkflows(metadata.retained_workflows, installed).filter(w => !selected.includes(w.id));
  const managed = JSON.parse(await readFile(join(root, ".speculo/managed.json"), "utf8"));
  if (managed.schema_version !== 2 || !Array.isArray(managed.files)) throw new Error("invalid-managed-manifest");
  result.priorFiles = managed.files;
  if (installed.every(id => selected.includes(id))) return result;
  const source = await readFile(join(root, "catalog.json"));
  if (!result.priorFiles.some(f => f.path === "catalog.json" && f.sha256 === sha256Buffer(source))) throw new Error("workflow-removal-catalog-drift");
  const catalog = JSON.parse(source.toString("utf8")) as AssetCatalog;
  if (catalog.schema_version !== 2 || !Array.isArray(catalog.assets)) throw new Error("invalid-removal-catalog");
  const projections = await readProjectionManifest(target);
  for (const id of installed.filter(id => !selected.includes(id))) {
    try {
      const prefix = `workflows/${id}/`, owned = result.priorFiles.filter(f => f.path.startsWith(prefix));
      if (!owned.length) throw new Error("workflow has no ownership records");
      const tree = await snapshotSkillTree(join(root, "workflows", id));
      const expectedDirs = new Set([""]);
      for (const f of owned) {
        const name = f.path.slice(prefix.length), node = tree.get(name);
        if (node?.kind !== "file" || sha256Buffer(Buffer.from(node.content, "base64")) !== f.sha256 || f.mode !== undefined && f.mode !== node.mode) throw new Error("managed workflow file modified or missing: " + f.path);
        const parts = name.split("/"); parts.pop(); while (parts.length) { expectedDirs.add(parts.join("/")); parts.pop(); }
      }
      for (const [path, node] of tree) if (node.kind === "directory" ? !expectedDirs.has(path) : !owned.some(f => f.path === prefix + path)) throw new Error("unmanaged workflow resource: " + path);
      const assetIds = catalog.assets.filter(a => a.domain === id).map(a => a.id);
      const projectionRecords = new Map<string, SkillRecord>();
      for (const p of projections?.files.filter(f => assetIds.includes(f.asset_id)) ?? []) {
        const parent = p.path.split("/").slice(0, 3).join("/"), projected = await snapshotSkillTree(await containedPath(target, parent));
        const ownedProjection = projections!.files.filter(f => f.path.startsWith(parent + "/"));
        const directories = new Set([""]);
        for (const file of ownedProjection) { const parts = file.path.slice(parent.length + 1).split("/"); parts.pop(); while (parts.length) { directories.add(parts.join("/")); parts.pop(); } }
        for (const [path, node] of projected) {
          const record = ownedProjection.find(f => f.path === parent + "/" + path);
          if (node.kind === "directory" ? !directories.has(path) : node.kind !== "file" || !record || sha256Buffer(Buffer.from(node.content, "base64")) !== record.sha256 || record.mode !== undefined && node.mode !== record.mode || !(node.mode & 0o200)) throw new Error("workflow projection modified or contains unmanaged resources: " + parent);
        }
        if (!projected.has(p.path.slice(parent.length + 1))) throw new Error("workflow projection missing: " + p.path);
        for (const [path, before] of projected) {
          const name = parent + (path ? "/" + path : "");
          projectionRecords.set(name, { name, before, after: { kind: "absent" } });
        }
      }
      result.removed.push(id); result.removedAssetIds.push(...assetIds);
      result.projectionRecords.push(...projectionRecords.values());
      result.registry.push({ id, works: catalog.assets.filter(a => a.domain === id && a.kind === "work-skill").map(a => ({ id: a.id, stages: a.stages })) });
    } catch (e) {
      result.retained.push(id); result.warnings.push(`workflow-removal-conflict ${id}: ${String(e)}; whole workflow retained`);
    }
  }
  return result;
}
export async function writeRemovalMetadata(stagedRoot: string, removal: WorkflowRemoval): Promise<void> {
  const path = join(stagedRoot, ".speculo/install.json"), metadata = JSON.parse(await readFile(path, "utf8"));
  if (removal.registry.length) metadata.retained_workflows = removal.registry;
  await writeFile(path, JSON.stringify(metadata, null, 2) + "\n");
  if (removal.retained.length) {
    const path = join(stagedRoot, ".speculo/managed.json"), managed = JSON.parse(await readFile(path, "utf8"));
    const retained = (f: ManagedFileRecord) => removal.retained.some(id => f.path.startsWith(`workflows/${id}/`));
    managed.files = [...managed.files.filter((f: ManagedFileRecord) => !retained(f)), ...removal.priorFiles.filter(retained)].sort((a, b) => a.path.localeCompare(b.path));
    await writeFile(path, JSON.stringify(managed, null, 2) + "\n");
  }
}
