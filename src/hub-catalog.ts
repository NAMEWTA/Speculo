import { readFile, readdir } from "node:fs/promises";
import { join, posix } from "node:path";
import { parseFrontmatter, readAssetCatalog, validateSkill } from "./assets.js";
import { safeRelativePath } from "./paths.js";
import { snapshotSkillTree, validSkillNode, type SkillNode } from "./skill-trees.js";
export type HubSkill = { id: string; name: string; description: string; root: string; tree: Map<string, SkillNode> };
export type HubCatalog = Map<string, HubSkill>;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Only category/name is a public entry. Nested SKILL.md files are package resources. */
export async function discoverHubCatalog(packageRoot: string): Promise<HubCatalog> {
  const root = join(packageRoot, "skills-hub"), catalog: HubCatalog = new Map();
  // npm omits .gitignore and normalizes modes. The build snapshot preserves the
  // complete source package; any shipped source bytes that differ are rejected.
  let bundle: { schema_version: number; packages: Array<{ id: string; nodes: Array<{ path: string; node: SkillNode }> }> } | undefined;
  try { bundle = JSON.parse(await readFile(join(packageRoot, "dist/src/hub-resources.json"), "utf8")); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  if (bundle && (bundle.schema_version !== 1 || !Array.isArray(bundle.packages) || new Set(bundle.packages.map(p => p.id)).size !== bundle.packages.length)) throw new Error("invalid-hub-bundle");
  const names = new Set((await readAssetCatalog(join(packageRoot, "template"))).assets.map(a => a.name));
  const categories = await readdir(root, { withFileTypes: true }).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; });
  for (const category of categories.sort((a, b) => a.name.localeCompare(b.name))) {
    if (category.isSymbolicLink()) throw new Error("hub-source-symlink: " + category.name);
    if (!category.isDirectory()) continue;
    if (!SLUG.test(category.name)) throw new Error("invalid-hub-category: " + category.name);
    for (const entry of (await readdir(join(root, category.name), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error("hub-source-symlink: " + entry.name);
      if (!entry.isDirectory()) continue;
      const source = join(root, category.name, entry.name), content = await readFile(join(source, "SKILL.md"));
      const errors = validateSkill(content, entry.name);
      if (errors.length) throw new Error(`invalid-hub-skill: ${category.name}/${entry.name}: ${errors.join("; ")}`);
      if (names.has(entry.name)) throw new Error("duplicate-skill-name: " + entry.name);
      names.add(entry.name);
      const id = `${category.name}/${entry.name}`;
      let tree = await snapshotSkillTree(source, { source: true });
      if (bundle) {
        const packaged = bundle.packages.find(p => p.id === id);
        if (!packaged || !Array.isArray(packaged.nodes)) throw new Error("missing-hub-bundle-package: " + id);
        const original = new Map<string, SkillNode>();
        for (const { path, node } of packaged.nodes) {
          if (typeof path !== "string" || path && (!safeRelativePath(path) || path.endsWith("/")) || original.has(path) || !validSkillNode(node) || node.kind === "absent") throw new Error("invalid-hub-bundle-node");
          original.set(path, process.platform === "win32" ? { ...node, mode: node.kind === "directory" ? 0o755 : node.mode & 0o200 ? 0o666 : 0o444 } : node);
        }
        if (original.get("")?.kind !== "directory" || original.get("SKILL.md")?.kind !== "file") throw new Error("invalid-hub-bundle-root");
        for (const [path, node] of original) if (path && original.get(posix.dirname(path) === "." ? "" : posix.dirname(path))?.kind !== "directory") throw new Error("invalid-hub-bundle-parent");
        for (const [path, node] of tree) {
          const expected = original.get(path);
          if (!expected || expected.kind !== node.kind || node.kind === "file" && (expected.kind !== "file" || expected.content !== node.content)) throw new Error(`stale-hub-bundle: ${id}/${path}; rebuild from skills-hub`);
        }
        tree = original;
      }
      // Markdown links to package resources must stay in this complete package.
      for (const [path, node] of tree) if (node.kind === "file" && path.endsWith(".md")) {
        const text = Buffer.from(node.content, "base64").toString("utf8").replace(/```[^]*?```/g, "");
        for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
          const link = match[1];
          if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(link) || /[<>${}]/.test(link)) continue;
          const resource = decodeURIComponent(link.split("#")[0]);
          if (!resource) continue;
          const resolved = posix.normalize(posix.join(posix.dirname(path), resource)).replace(/\/$/, "");
          if (!safeRelativePath(resolved) || !tree.has(resolved)) throw new Error(`hub-resource-link: ${category.name}/${entry.name}/${path}: ${link}`);
        }
      }
      catalog.set(id, { id, name: entry.name, description: String(parseFrontmatter(content).fields.description), root: source, tree });
    }
  }
  if (bundle && bundle.packages.some(p => !catalog.has(p.id))) throw new Error("hub-bundle-catalog-mismatch");
  return catalog;
}
