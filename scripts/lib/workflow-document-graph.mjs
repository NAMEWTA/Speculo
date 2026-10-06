import { safeRelative } from "./evaluation-evidence.mjs";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const aliases = { workflows: "template/workflows", skills: "template/skills", commands: "template/commands", speculo: "template", config: "template/config.json", state: "template/.speculo" };
const posix = (value) => value.split(sep).join("/");
const inside = (root, path) => { const rel = relative(root, path); return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`)); };
const digest = (value) => createHash("sha256").update(value).digest("hex");
const isEntry = (path) => /^template\/workflows\/[^/]+\/([^/]+)\/\1\.md$/.test(path);
const isEvidence = (path) => /\/(books|research-snapshot)\//.test(path);

export function sourceRole(path) {
  if (path.startsWith("template/canonical/")) return "generated";
  if (path.includes("/_state/")) return "runtime-seed";
  if (isEvidence(path)) return "evidence";
  return "source";
}

/** Static potential references, not a prediction of what a model actually loads. */
export function extractDocumentReferences(content, source) {
  const refs = [];
  let heading = "", inFence = false;
  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^#{1,6}\s+/.test(line)) heading = line.replace(/^#+\s*/, "");
    const pointers = [...line.matchAll(/<Path>\{roots\.([\w-]+)\}([^<]*)<\/Path>/g)].map((m) => ({ raw: m[0], alias: m[1], path: m[2] }));
    if (!inFence) for (const m of line.replace(/`+[^`]*`+/g, "").matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(m[1]) || /[<>]/.test(m[1])) continue;
      pointers.push({ raw: m[0], alias: null, path: m[1] });
    }
    if (!inFence && /^template\/workflows\/[^/]+\/(INDEX|README)\.md$/.test(source)) {
      const work = line.match(/^- \*\*([A-Z]-[a-z0-9-]+)\*\*/)?.[1];
      if (work) refs.push({ source, line: index + 1, raw: line, kind: "discovery", condition: line.split("**").slice(2).join("**").trim(), target: `${dirname(source)}/${work}/${work}.md`, role: "source", error: null });
    }
    for (const pointer of pointers) {
      const rawPath = pointer.path.split("#")[0];
      const table = line.trim().startsWith("|");
      const firstCell = table ? line.split("|")[1].trim() : null;
      let condition = table ? firstCell : line.replace(/<Path>[\s\S]*?<\/Path>/g, "[reference]").trim();
      const branch = /分支|模式|按需|路由|按阶段/.test(heading) || /(?:when\b|仅|需要|时[，：,]|步骤\s*\d|模式|分支|恢复|生成|创建)/i.test(condition);
      let kind = branch ? "conditional" : "reference";
      if (/只作定位|只用于定位|下一|转交|返回.*Work|路由到/.test(condition)) kind = "navigation";
      if (isEntry(source) && /\/(?:README|INDEX)\.md$/.test(rawPath) && !rawPath.includes("/common/")) kind = "activation";
      if (isEntry(source) && rawPath.endsWith("/common/rules/activation-and-memory.md")) kind = "activation";
      const ref = { source, line: index + 1, raw: pointer.raw, kind, condition, target: null, role: "source", error: null };
      if (pointer.alias) {
        if (!(pointer.alias in aliases)) { if (!["xxx", "X"].includes(pointer.alias)) ref.error = "unknown root alias"; }
        else if (/[\\\x00-\x1f]/.test(rawPath) || rawPath.split("/").includes("..")) ref.error = "escaping Path reference";
        else if (pointer.alias === "state" || pointer.alias === "config") ref.role = "runtime";
        else if (/[{}<>*]|\.\.\./.test(rawPath)) ref.role = "dynamic";
        else ref.target = posix(join(aliases[pointer.alias], rawPath.replace(/^\//, "")));
      } else if (/[{}<>*]|\.\.\./.test(rawPath)) ref.role = "dynamic";
      else {
        try { ref.target = posix(join(dirname(source), decodeURIComponent(rawPath))); }
        catch { ref.error = "malformed encoded reference"; }
      }
      if (table && /分支|模式|按需/.test(heading) && !firstCell) ref.error = "conditional table pointer has no trigger";
      if (ref.target) ref.role = sourceRole(ref.target);
      refs.push(ref);
    }
  }
  return refs;
}

function stronglyConnected(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node, []]));
  for (const edge of edges) if (adjacency.has(edge.source) && adjacency.has(edge.target)) adjacency.get(edge.source).push(edge.target);
  let counter = 0;
  const stack = [], active = new Set(), index = new Map(), low = new Map(), cycles = [];
  function visit(node) {
    index.set(node, counter); low.set(node, counter++); stack.push(node); active.add(node);
    for (const next of adjacency.get(node)) {
      if (!index.has(next)) { visit(next); low.set(node, Math.min(low.get(node), low.get(next))); }
      else if (active.has(next)) low.set(node, Math.min(low.get(node), index.get(next)));
    }
    if (low.get(node) === index.get(node)) {
      const component = []; let last;
      do { last = stack.pop(); active.delete(last); component.push(last); } while (last !== node);
      if (component.length > 1 || adjacency.get(node).includes(node)) cycles.push(component.sort());
    }
  }
  for (const node of nodes) if (!index.has(node)) visit(node);
  return cycles.sort((a, b) => a[0].localeCompare(b[0]));
}

export async function buildDocumentGraph(root, options = {}) {
  root = await realpath(resolve(root));
  const files = new Map(), errors = [], edges = [], symlinks = [];
  async function walk(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(directory, entry.name), path = posix(relative(root, file));
      if (entry.isSymbolicLink()) {
        const target = await realpath(file).catch(() => null);
        symlinks.push({ path, target: target && inside(root, target) ? posix(relative(root, target)) : null });
        if (!target || !inside(root, target)) errors.push(`${path}: broken or out-of-repository source symlink`);
        continue;
      }
      if (entry.isDirectory()) { if (!["node_modules", ".git", "dist", "_state"].includes(entry.name)) await walk(file); }
      else if (entry.isFile() && path.endsWith(".md")) {
        const role = sourceRole(path);
        // Corpora are evidence. Inventory them without recursively loading their prose.
        if (role === "evidence") { files.set(path, { path, role, bytes: (await stat(file)).size, characters: null, entry: false }); continue; }
        const data = await readFile(file), content = data.toString("utf8");
        const metadata = content.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "";
        const id = metadata.match(/^id:\s*(.+)$/m)?.[1] ?? null;
        files.set(path, { path, role, bytes: data.length, characters: [...content].length, sha256: digest(data), entry: isEntry(path), id, content });
        edges.push(...extractDocumentReferences(content, path));
      }
    }
  }
  for (const dir of options.roots ?? ["template/workflows", "template/skills", "template/commands", "skills"]) await walk(join(root, dir));
  for (const edge of edges) {
    if (edge.error) errors.push(`${edge.source}:${edge.line}: ${edge.error}`);
    if (!edge.target) continue;
    const full = resolve(root, edge.target);
    if (!inside(root, full)) { errors.push(`${edge.source}:${edge.line}: escaping reference ${edge.target}`); continue; }
    const target = await realpath(full).catch(() => null);
    if (!target) errors.push(`${edge.source}:${edge.line}: missing reference ${edge.target}`);
    else if (!inside(root, target)) errors.push(`${edge.source}:${edge.line}: reference follows an out-of-repository link`);
  }
  const incoming = new Set(edges.map((edge) => edge.target).filter(Boolean));
  const entries = [...files.values()].filter((node) => node.entry);
  const ids = new Set();
  for (const entry of entries) {
    if (!entry.id || ids.has(entry.id)) errors.push(`${entry.path}: missing or duplicate Work ID`);
    ids.add(entry.id);
    if (!edges.some((edge) => edge.target === entry.path && edge.kind === "discovery")) errors.push(`${entry.path}: not reachable from its workflow discovery list`);
  }
  return { root, files, edges, entries: entries.map(({ content, ...entry }) => entry), errors: [...new Set(errors)], symlinks,
    cycles: stronglyConnected([...files.keys()], edges),
    unlinked_candidates: [...files.values()].filter((file) => file.role === "source" && !file.entry && !incoming.has(file.path) && !/\/(INDEX|README)\.md$/.test(file.path)).map((file) => file.path).sort(),
  };
}

export function affectedCallers(graph, changed) {
  const seen = new Set(changed), queue = [...changed];
  while (queue.length) {
    const target = queue.shift();
    for (const edge of graph.edges) if (edge.target === target && !seen.has(edge.source)) { seen.add(edge.source); queue.push(edge.source); }
  }
  return { callers: [...seen].filter((path) => !changed.includes(path)).sort(),
    generators: [
      ...(changed.some((path) => path.startsWith("template/workflows/specdev/")) ? ["scripts/generate-specdev-canonical.mjs"] : []),
      ...(changed.some(isEntry) ? ["skills/speculo-write-workflows/scripts/generate-index.mjs"] : []),
    ],
  };
}

/** De-duplicate actual supplied read ranges. This does not authenticate a trace. */
export function measureReadTrace(graph, trace, profile = {}) {
  if (!Array.isArray(trace)) throw new Error("read trace must be an event array");
  const loaded = new Map(), phases = {}, errors = [], unclassified = [];
  const required = profile.required ?? [], forbidden = profile.forbidden ?? [];
  if (![required, forbidden].every((items) => Array.isArray(items) && items.every((item) => safeRelative(typeof item === "string" && item.endsWith("/") ? item.slice(0, -1) : item)))) throw new Error("invalid read profile");
  let bytes = 0, characters = 0, read_events = 0, first_action = null;
  for (const event of trace) {
    if (event.kind === "tool" && event.payload?.action === "effective" && first_action === null) first_action = { bytes, characters };
    if (event.kind !== "context") continue;
    const p = event.payload;
    if (!p || !safeRelative(p.path)) { errors.push("context path must be canonical repository-relative"); continue; }
    read_events++;
    if (forbidden.some((path) => p.path === path || p.path.startsWith(path.endsWith("/") ? path : `${path}/`))) errors.push(`forbidden read: ${p.path}`);
    const file = graph.files.get(p.path);
    if (!file || file.content === undefined) { unclassified.push(p.path); continue; }
    if (p.sha256 && p.sha256 !== file.sha256) { errors.push(`read source drift: ${p.path}`); continue; }
    const lines = file.content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const start = p.start_line ?? 1, end = p.end_line ?? lines.length;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lines.length) { errors.push(`invalid read range: ${p.path}`); continue; }
    const phase = p.phase ?? "unclassified";
    if (!["discovery", "activation", "branch", "unclassified"].includes(phase)) { errors.push(`invalid read phase: ${p.path}`); continue; }
    const seen = loaded.get(p.path) ?? new Set(); loaded.set(p.path, seen);
    phases[phase] ??= { bytes: 0, characters: 0 };
    for (let i = start - 1; i < end; i++) if (!seen.has(i)) {
      seen.add(i); const b = Buffer.byteLength(lines[i]), c = [...lines[i]].length;
      bytes += b; characters += c; phases[phase].bytes += b; phases[phase].characters += c;
    }
  }
  for (const path of required) if (!loaded.has(path)) errors.push(`required read missing: ${path}`);
  return { source: "supplied trace; not host-authenticated", read_events, unique_files: loaded.size, bytes, characters, phases, before_first_effective_action: first_action,
    unclassified_reads: [...new Set(unclassified)].sort(), errors: [...new Set(errors)] };
}

export function graphReport(graph, changed = []) {
  return { schema_version: 1, work_count: graph.entries.length, entries: graph.entries,
    documents: [...graph.files.values()].map(({ content, ...file }) => file), edges: graph.edges,
    errors: graph.errors, symlinks: graph.symlinks, cycles: graph.cycles, unlinked_candidates: graph.unlinked_candidates,
    caveat: "potential references; cycles may be intentional navigation; unlinked candidates may have code/dynamic consumers and are not deletion authorization",
    impact: affectedCallers(graph, changed) };
}
