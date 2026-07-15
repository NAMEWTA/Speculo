#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, posix, relative, resolve, sep } from "node:path";

const schemaVersion = 1;

function usageError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  throw error;
}

function parseArgs(argv) {
  const options = {
    repo: undefined,
    from: "HEAD",
    to: "worktree",
    workflow: undefined,
    format: "markdown",
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    if (!["--repo", "--from", "--to", "--workflow", "--format"].includes(argument)) {
      usageError(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usageError(`${argument} requires a value`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  if (!new Set(["markdown", "json"]).has(options.format)) {
    usageError("--format must be markdown or json");
  }
  return options;
}

function git(repo, args, encoding = "utf8") {
  try {
    return execFileSync("git", ["-C", repo, ...args], {
      encoding: encoding === "buffer" ? undefined : encoding,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    usageError(`git ${args.join(" ")}: ${detail}`);
  }
}

function splitNull(buffer) {
  return buffer
    .toString("utf8")
    .split("\0")
    .filter((value) => value.length > 0);
}

function parseNameStatus(buffer) {
  const fields = splitNull(buffer);
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (/^[RC]/.test(status)) {
      changes.push({ status: status[0], score: status.slice(1), oldPath: fields[index++], path: fields[index++] });
    } else {
      changes.push({ status: status[0], path: fields[index++] });
    }
  }
  return changes;
}

function mergeChanges(changes) {
  const seen = new Set();
  return changes.filter((change) => {
    const key = [change.status, change.oldPath ?? "", change.path].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function gitChanges(repo, from, to, path) {
  const args = ["diff", "--name-status", "-z", "-M", from];
  if (to !== "worktree") args.push(to);
  args.push("--", path);
  const tracked = parseNameStatus(git(repo, args, "buffer"));
  if (to !== "worktree") return tracked;
  const untracked = splitNull(
    git(repo, ["ls-files", "--others", "--exclude-standard", "-z", "--", path], "buffer")
  ).map((entry) => ({ status: "A", path: entry, untracked: true }));
  return mergeChanges([...tracked, ...untracked]);
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-zA-Z0-9-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return fields;
}

function parseAttributes(text) {
  return Object.fromEntries(
    [...text.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
  );
}

function projectPathToSource(repo, projectPath) {
  if (projectPath === "speculo") return join(repo, "template");
  if (!projectPath.startsWith("speculo/")) return undefined;
  return join(repo, "template", ...projectPath.slice("speculo/".length).split("/"));
}

function resolveAliases(workspace, persistenceContent) {
  const aliases = { ...(workspace.roots ?? {}) };
  const roots = [...persistenceContent.matchAll(/<root\b([^>]*)\/?\s*>/g)].map((match) => parseAttributes(match[1]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const root of roots) {
      if (!root.id || !root.base || !root.path || aliases[root.id] || !aliases[root.base]) continue;
      aliases[root.id] = posix.join(aliases[root.base], root.path);
      changed = true;
    }
  }
  return aliases;
}

function parseCatalog(content) {
  const catalogMatch = content.match(/<atomic-skills\b([^>]*)>/);
  if (!catalogMatch) return undefined;
  const attributes = parseAttributes(catalogMatch[1]);
  const entries = [...content.matchAll(/<atomic-skill\b([^>]*)>/g)].map((match) => parseAttributes(match[1]));
  return { attributes, entries };
}

function parseWrapper(path) {
  const content = readFileSync(path, "utf8");
  const target = content.match(/<skill\b([^>]*)\/?\s*>/);
  return {
    file: path,
    frontmatter: parseFrontmatter(content),
    target: target ? parseAttributes(target[1]) : {},
  };
}

function discoverWorkflows(repo, filter) {
  const workspacePath = join(repo, "template", ".speculo", "workspace.json");
  if (!existsSync(workspacePath)) usageError("template/.speculo/workspace.json is missing");
  const workspace = JSON.parse(readFileSync(workspacePath, "utf8"));
  const workflowsRoot = join(repo, "template", "workflows");
  const workflows = [];
  for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || (filter && filter !== entry.name)) continue;
    const workflowDir = join(workflowsRoot, entry.name);
    const workflowPath = join(workflowDir, "WORKFLOW.md");
    const persistencePath = join(workflowDir, "PERSISTENCE.md");
    if (!existsSync(workflowPath) || !existsSync(persistencePath)) continue;
    const workflowContent = readFileSync(workflowPath, "utf8");
    const catalog = parseCatalog(workflowContent);
    const sourceRoot = catalog?.attributes["source-root"];
    if (!catalog || !sourceRoot) continue;
    const aliases = resolveAliases(workspace, readFileSync(persistencePath, "utf8"));
    const sourceDir = aliases[sourceRoot] ? projectPathToSource(repo, aliases[sourceRoot]) : undefined;
    if (!sourceDir) usageError(`${entry.name}: cannot resolve source-root ${sourceRoot}`);
    const vendorRoot = join(repo, "template", "vendor");
    if (sourceDir !== vendorRoot && !sourceDir.startsWith(`${vendorRoot}${sep}`)) continue;
    const atomicDir = join(workflowDir, "atomic-skills");
    const wrappers = new Map();
    if (existsSync(atomicDir)) {
      for (const name of readdirSync(atomicDir).filter((name) => name.endsWith(".md"))) {
        wrappers.set(name.slice(0, -3), parseWrapper(join(atomicDir, name)));
      }
    }
    workflows.push({
      id: entry.name,
      dir: workflowDir,
      content: workflowContent,
      sourceRoot,
      sourceDir,
      sourceRepoPath: relative(repo, sourceDir).split(sep).join("/"),
      complete: catalog.attributes.coverage === "complete",
      catalog,
      wrappers,
    });
  }
  if (filter && workflows.length === 0) usageError(`vendor-backed workflow not found: ${filter}`);
  return workflows;
}

function treeFiles(repo, revision, path) {
  return splitNull(git(repo, ["ls-tree", "-r", "--name-only", "-z", revision, "--", path], "buffer"));
}

function treeContent(repo, revision, path) {
  return git(repo, ["show", `${revision}:${path}`]);
}

function inventoryFromEntries(entries, readContent, sourceRepoPath) {
  const skills = [];
  const allFiles = new Set(entries);
  for (const path of entries.filter((entry) => entry.endsWith("/SKILL.md"))) {
    const content = readContent(path);
    const frontmatter = parseFrontmatter(content);
    skills.push({
      id: frontmatter.name,
      path: path.slice(sourceRepoPath.length + 1),
      repoPath: path,
      directory: posix.dirname(path),
      content,
      frontmatter,
    });
  }
  return { skills, allFiles };
}

function currentInventory(repo, workflow) {
  const entries = walkFiles(workflow.sourceDir).map((path) => relative(repo, path).split(sep).join("/"));
  return inventoryFromEntries(entries, (path) => readFileSync(join(repo, ...path.split("/")), "utf8"), workflow.sourceRepoPath);
}

function revisionInventory(repo, workflow, revision) {
  const entries = treeFiles(repo, revision, workflow.sourceRepoPath);
  return inventoryFromEntries(entries, (path) => treeContent(repo, revision, path), workflow.sourceRepoPath);
}

function duplicateIds(skills) {
  const counts = new Map();
  for (const skill of skills) counts.set(skill.id, (counts.get(skill.id) ?? 0) + 1);
  return [...counts.entries()].filter(([id, count]) => !id || count > 1).map(([id]) => id || "<missing>");
}

function uniqueMap(skills) {
  return new Map(skills.filter((skill) => skill.id).map((skill) => [skill.id, skill]));
}

function frontmatterDelta(before, after) {
  const delta = {};
  for (const key of ["name", "description", "disable-model-invocation"]) {
    if (before[key] !== after[key]) delta[key] = { before: before[key] ?? null, after: after[key] ?? null };
  }
  return delta;
}

function ownerForPath(path, inventories) {
  const candidates = inventories
    .flatMap((inventory) => inventory.skills)
    .filter((skill) => path === skill.repoPath || path.startsWith(`${skill.directory}/`))
    .sort((left, right) => right.directory.length - left.directory.length);
  return candidates[0]?.id;
}

function classifyChanges(workflow, before, after, changes) {
  const beforeMap = uniqueMap(before.skills);
  const afterMap = uniqueMap(after.skills);
  const removed = new Set([...beforeMap.keys()].filter((id) => !afterMap.has(id)));
  const added = new Set([...afterMap.keys()].filter((id) => !beforeMap.has(id)));
  const output = [];

  for (const oldId of [...removed]) {
    const oldSkill = beforeMap.get(oldId);
    const renamed = [...added].map((id) => afterMap.get(id)).find((skill) => {
      if (skill.repoPath === oldSkill.repoPath) return true;
      return changes.some((change) => change.status === "R" && change.oldPath === oldSkill.repoPath && change.path === skill.repoPath);
    });
    if (!renamed) continue;
    output.push({
      type: "renamed",
      beforeId: oldId,
      id: renamed.id,
      beforePath: oldSkill.path,
      path: renamed.path,
      frontmatterDelta: frontmatterDelta(oldSkill.frontmatter, renamed.frontmatter),
      files: changes.filter((change) => change.oldPath === oldSkill.repoPath || change.path === renamed.repoPath),
    });
    removed.delete(oldId);
    added.delete(renamed.id);
  }

  for (const id of [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort()) {
    const oldSkill = beforeMap.get(id);
    const newSkill = afterMap.get(id);
    if (!oldSkill || !newSkill) continue;
    const files = changes.filter((change) => ownerForPath(change.path, [before, after]) === id || (change.oldPath && ownerForPath(change.oldPath, [before, after]) === id));
    if (oldSkill.path !== newSkill.path) {
      output.push({
        type: "moved",
        id,
        beforePath: oldSkill.path,
        path: newSkill.path,
        frontmatterDelta: frontmatterDelta(oldSkill.frontmatter, newSkill.frontmatter),
        files,
      });
    } else if (files.length > 0) {
      output.push({
        type: files.some((change) => change.path === newSkill.repoPath || change.oldPath === oldSkill.repoPath) ? "modified" : "supporting",
        id,
        path: newSkill.path,
        frontmatterDelta: frontmatterDelta(oldSkill.frontmatter, newSkill.frontmatter),
        files,
      });
    }
  }

  for (const id of [...added].sort()) {
    const skill = afterMap.get(id);
    output.push({ type: "added", id, path: skill.path, files: changes.filter((change) => ownerForPath(change.path, [after]) === id) });
  }
  for (const id of [...removed].sort()) {
    const skill = beforeMap.get(id);
    output.push({ type: "deleted", id, beforePath: skill.path, files: changes.filter((change) => ownerForPath(change.oldPath ?? change.path, [before]) === id) });
  }
  for (const change of changes) {
    const path = change.path;
    if (!ownerForPath(path, [before, after]) && !(change.oldPath && ownerForPath(change.oldPath, [before, after]))) {
      output.push({ type: "collection", path: path.slice(workflow.sourceRepoPath.length + 1), files: [change] });
    }
  }
  return output;
}

function extractSlashCalls(content, candidates) {
  const output = new Set();
  const pattern = /(?:^|[\s`("'“‘（])\/([a-z0-9][a-z0-9-]*)(?![a-z0-9\/-])/gm;
  for (const match of content.matchAll(pattern)) {
    if (candidates.has(match[1])) output.add(match[1]);
  }
  return [...output];
}

function dependencyIndex(workflow, before, after) {
  const ids = new Set([...before.skills, ...after.skills].map((skill) => skill.id).filter(Boolean));
  const routes = new Map();
  const rawCalls = new Map();
  for (const path of walkFiles(workflow.dir).filter((path) => path.endsWith(".md") && !path.includes(`${sep}atomic-skills${sep}`))) {
    if (path.endsWith(`${sep}WORKFLOW.md`)) continue;
    const content = readFileSync(path, "utf8");
    for (const match of content.matchAll(/atomic-skills\/([a-z0-9][a-z0-9-]*)\.md/g)) {
      const refs = routes.get(match[1]) ?? [];
      refs.push(relative(workflow.dir, path).split(sep).join("/"));
      routes.set(match[1], refs);
    }
  }
  for (const skill of after.skills) {
    for (const target of extractSlashCalls(skill.content, ids)) {
      const refs = rawCalls.get(target) ?? [];
      refs.push(skill.id);
      rawCalls.set(target, refs);
    }
  }
  return { routes, rawCalls };
}

function scanExternalReferences(repo, ids, paths) {
  const roots = ["AGENTS.md", "README.md", "README-ZH.md", "CHANGELOG.md", "docs", "test", "scripts", ".agents", "template/commands", "template/skills"];
  const files = roots.flatMap((root) => {
    const path = join(repo, root);
    if (!existsSync(path)) return [];
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  }).filter((path) => /\.(md|ts|mjs|json)$/i.test(path));
  const references = new Map(ids.map((id) => [id, []]));
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const id of ids) {
      const skillPaths = paths.get(id) ?? [];
      if (content.includes(`atomic-skills/${id}.md`) || skillPaths.some((path) => content.includes(path))) {
        references.get(id).push(relative(repo, file).split(sep).join("/"));
      }
    }
  }
  return references;
}

function expectedPolicy(skill) {
  const experimental = skill.path.startsWith("in-progress/");
  return {
    stability: experimental ? "experimental" : "stable",
    invocation: experimental || skill.frontmatter["disable-model-invocation"] === "true" ? "user-only" : "model-allowed",
  };
}

function structuralDrift(workflow, after) {
  const drift = [];
  const rawMap = uniqueMap(after.skills);
  const catalogIds = workflow.catalog.entries.map((entry) => entry.id).filter(Boolean);
  const expectedIds = workflow.complete ? [...rawMap.keys()].sort() : [...new Set(catalogIds)].sort();
  for (const id of expectedIds) {
    const raw = rawMap.get(id);
    const wrapper = workflow.wrappers.get(id);
    const catalog = workflow.catalog.entries.find((entry) => entry.id === id);
    if (!raw) {
      drift.push({ code: "STALE_CATALOG", id });
      continue;
    }
    if (!wrapper) {
      drift.push({ code: "MISSING_WRAPPER", id, target: raw.path });
      continue;
    }
    if (wrapper.target.root !== workflow.sourceRoot || wrapper.target.path !== raw.path) {
      drift.push({ code: "TARGET_MISMATCH", id, expected: `${workflow.sourceRoot}:${raw.path}`, actual: `${wrapper.target.root ?? "?"}:${wrapper.target.path ?? "?"}` });
    }
    if (wrapper.frontmatter.id !== raw.id) {
      drift.push({ code: "RAW_ID_MISMATCH", id, wrapperId: wrapper.frontmatter.id ?? null });
    }
    const policy = expectedPolicy(raw);
    for (const field of ["stability", "invocation"]) {
      if (wrapper.frontmatter[field] !== policy[field]) {
        drift.push({ code: "POLICY_MISMATCH", id, field, expected: policy[field], actual: wrapper.frontmatter[field] ?? null });
      }
    }
    if (!catalog || catalog.path !== `atomic-skills/${id}.md`) {
      drift.push({ code: "CATALOG_MISMATCH", id });
    }
  }
  if (workflow.complete) {
    for (const id of workflow.wrappers.keys()) {
      if (!rawMap.has(id)) drift.push({ code: "STALE_WRAPPER", id });
    }
  }
  if (catalogIds.join("\n") !== [...catalogIds].sort().join("\n")) {
    drift.push({ code: "CATALOG_ORDER" });
  }
  for (const [index, entry] of workflow.catalog.entries.entries()) {
    if (entry.order !== String(index + 1)) drift.push({ code: "CATALOG_SEQUENCE", id: entry.id, expected: index + 1, actual: entry.order ?? null });
  }
  return drift;
}

function buildWorkflowReport(repo, workflow, from, to) {
  const before = revisionInventory(repo, workflow, from);
  const after = to === "worktree" ? currentInventory(repo, workflow) : revisionInventory(repo, workflow, to);
  const changes = gitChanges(repo, from, to, workflow.sourceRepoPath);
  const classified = classifyChanges(workflow, before, after, changes);
  const dependencies = dependencyIndex(workflow, before, after);
  const changedIds = new Set(classified.flatMap((change) => [change.id, change.beforeId]).filter(Boolean));
  const pathIndex = new Map();
  for (const skill of [...before.skills, ...after.skills]) {
    const paths = pathIndex.get(skill.id) ?? [];
    paths.push(`${workflow.sourceRepoPath}/${skill.path}`);
    pathIndex.set(skill.id, [...new Set(paths)]);
  }
  const external = scanExternalReferences(repo, [...changedIds], pathIndex);
  const blockers = [];
  for (const id of duplicateIds(after.skills)) blockers.push({ code: "INVALID_RAW_ID", id });
  for (const change of classified.filter((change) => change.type === "deleted" || change.type === "renamed")) {
    const oldId = change.beforeId ?? change.id;
    const reverse = {
      routes: dependencies.routes.get(oldId) ?? [],
      rawCalls: dependencies.rawCalls.get(oldId) ?? [],
      external: external.get(oldId) ?? [],
    };
    if (Object.values(reverse).some((items) => items.length > 0)) {
      blockers.push({ code: change.type === "renamed" ? "REFERENCED_RENAME" : "REFERENCED_DELETE", id: oldId, reverse });
    }
  }
  const drift = structuralDrift(workflow, after);
  const actions = [];
  for (const change of classified) {
    const id = change.id;
    if (change.type === "added" && drift.some((item) => item.code === "MISSING_WRAPPER" && item.id === id)) {
      actions.push({ code: "ADD_WRAPPER_AND_CATALOG", id });
    } else if (change.type === "deleted" && !blockers.some((item) => item.id === id) && drift.some((item) => item.id === id)) {
      actions.push({ code: "REMOVE_WRAPPER_AND_CATALOG", id });
    } else if (change.type === "moved" && drift.some((item) => item.id === id)) {
      actions.push({ code: "UPDATE_TARGET_AND_POLICY", id });
    } else if (change.type === "renamed" && !blockers.some((item) => item.id === change.beforeId)) {
      actions.push({ code: "RENAME_WRAPPER_AND_CATALOG", from: change.beforeId, to: id });
    } else if (["modified", "supporting", "collection"].includes(change.type)) {
      actions.push({ code: "REVIEW_SEMANTICS", id: id ?? null, path: change.path ?? null });
    }
  }
  return {
    id: workflow.id,
    sourceRoot: workflow.sourceRoot,
    sourcePath: workflow.sourceRepoPath,
    coverage: workflow.complete ? "complete" : "partial",
    inventory: { before: before.skills.length, after: after.skills.length },
    changes: classified,
    impacts: {
      routes: Object.fromEntries([...dependencies.routes].filter(([id]) => changedIds.has(id))),
      rawCalls: Object.fromEntries([...dependencies.rawCalls].filter(([id]) => changedIds.has(id))),
      external: Object.fromEntries([...external].filter(([, refs]) => refs.length > 0)),
    },
    safeActions: actions,
    drift,
    blockers,
  };
}

function markdown(report) {
  const lines = [
    "# Vendor Workflow Impact",
    "",
    `- Range: \`${report.range.from} -> ${report.range.to}\``,
    `- Workflows: ${report.workflows.length}`,
    `- Unmapped vendor changes: ${report.unmappedVendorChanges.length}`,
  ];
  for (const workflow of report.workflows) {
    lines.push("", `## ${workflow.id}`, "", `- Source root: \`${workflow.sourceRoot}\``, `- Source path: \`${workflow.sourcePath}\` (${workflow.coverage})`, `- Inventory: ${workflow.inventory.before} -> ${workflow.inventory.after}`);
    if (workflow.changes.length === 0) lines.push("- Changes: none");
    else for (const change of workflow.changes) lines.push(`- ${change.type}: \`${change.beforeId ? `${change.beforeId} -> ` : ""}${change.id ?? change.path}\``);
    if (workflow.safeActions.length > 0) lines.push(`- Safe actions: ${workflow.safeActions.map((action) => action.code).join(", ")}`);
    if (workflow.drift.length > 0) lines.push(`- Drift: ${workflow.drift.map((item) => `${item.code}${item.id ? `(${item.id})` : ""}`).join(", ")}`);
    if (workflow.blockers.length > 0) lines.push(`- Blockers: ${workflow.blockers.map((item) => `${item.code}(${item.id})`).join(", ")}`);
  }
  if (report.unmappedVendorChanges.length > 0) {
    lines.push("", "## Unmapped vendor changes", "", ...report.unmappedVendorChanges.map((change) => `- ${change.status}: \`${change.path}\``));
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repo = resolve(options.repo ?? git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim());
  git(repo, ["rev-parse", "--verify", options.from]);
  if (options.to !== "worktree") git(repo, ["rev-parse", "--verify", options.to]);
  const workflows = discoverWorkflows(repo, options.workflow);
  const workflowReports = workflows.map((workflow) => buildWorkflowReport(repo, workflow, options.from, options.to));
  const mappedPaths = [...new Set(workflows.map((workflow) => workflow.sourceRepoPath))];
  const allVendorChanges = gitChanges(repo, options.from, options.to, "template/vendor");
  const unmappedVendorChanges = allVendorChanges.filter((change) => !mappedPaths.some((path) => change.path === path || change.path.startsWith(`${path}/`) || (change.oldPath && (change.oldPath === path || change.oldPath.startsWith(`${path}/`)))));
  const report = {
    schema_version: schemaVersion,
    range: { from: options.from, to: options.to, mode: options.to === "worktree" ? "working-tree" : "revision-range" },
    workflows: workflowReports,
    unmappedVendorChanges,
    summary: {
      changes: workflowReports.reduce((total, workflow) => total + workflow.changes.length, 0),
      drift: workflowReports.reduce((total, workflow) => total + workflow.drift.length, 0),
      blockers: workflowReports.reduce((total, workflow) => total + workflow.blockers.length, 0),
    },
  };
  process.stdout.write(options.format === "json" ? `${JSON.stringify(report, null, 2)}\n` : markdown(report));
  if (options.check && (report.summary.drift > 0 || report.summary.blockers > 0)) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error.exitCode ?? 2;
}
