#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser, XMLValidator } from "fast-xml-parser";

const packageRoot = resolve(
  process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), "..")
);
const templateRoot = join(packageRoot, "template");
const workflowsRoot = join(templateRoot, "workflows");
const workspacePath = join(templateRoot, ".speculo", "workspace.json");
const docsSyncAssets = join(templateRoot, "skills", "docs-sync", "assets");
const allowedXmlRoots = new Set([
  "routes",
  "sequence",
  "dependencies",
  "state-schema",
  "transitions",
  "runtime-context",
  "persistence",
]);
const staticReferenceTags = new Set([
  "route",
  "skill",
  "instructions",
  "template",
  "agent",
  "command",
  "dependency",
]);
const expectedAgentSkills = [
  "speculo-write-skill",
  "speculo-write-workflows",
  "speculo-write-command",
];
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});
const errors = [];

function fail(message) {
  errors.push(message);
}

function asArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label}: ${error.message}`);
    return undefined;
  }
}

function parseFrontmatter(content, file) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    fail(`${file}: missing frontmatter`);
    return {};
  }

  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-zA-Z0-9-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label}: path must be a non-empty string`);
    return false;
  }
  if (value.includes("\\") || posix.isAbsolute(value)) {
    fail(`${label}: path must be POSIX project-relative: ${value}`);
    return false;
  }
  if (value.split("/").filter(Boolean).includes("..")) {
    fail(`${label}: path escapes its declared root: ${value}`);
    return false;
  }
  return true;
}

function projectPathToTemplate(projectPath) {
  if (projectPath === "speculo") return templateRoot;
  if (!projectPath.startsWith("speculo/")) return undefined;
  return join(templateRoot, ...projectPath.slice("speculo/".length).split("/"));
}

function xmlBlocks(content) {
  return [...content.matchAll(/```xml\s*\n([\s\S]*?)```/g)].map(
    (match) => match[1].trim()
  );
}

function walkMarkdown(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

function parseXmlBlock(block, file, index) {
  const valid = XMLValidator.validate(block);
  if (valid !== true) {
    fail(`${file}: XML block ${index + 1}: ${valid.err.msg}`);
    return undefined;
  }

  const parsed = parser.parse(block);
  const roots = Object.keys(parsed);
  if (roots.length !== 1 || !allowedXmlRoots.has(roots[0])) {
    fail(`${file}: XML block ${index + 1} has unsupported root ${roots.join(",")}`);
    return undefined;
  }
  return parsed;
}

function walkXmlNode(tag, value, context) {
  for (const node of asArray(value)) {
    if (!node || typeof node !== "object") continue;

    if (Object.hasOwn(node, "@_src") || Object.hasOwn(node, "@_command")) {
      fail(`${context.file}: <${tag}> must use root+path instead of src/command`);
    }

    const isDeclaration = tag === "root" || tag === "store" || tag === "persistence";
    if (
      !isDeclaration &&
      (Object.hasOwn(node, "@_root") || Object.hasOwn(node, "@_path"))
    ) {
      const rootId = node["@_root"];
      const nodePath = node["@_path"];
      if (!rootId || !nodePath) {
        fail(`${context.file}: <${tag}> must provide root and path together`);
      } else if (safeRelativePath(nodePath, `${context.file}: <${tag}>`)) {
        if (rootId === "change") {
          if (tag !== "artifact") {
            fail(`${context.file}: only artifacts may use the dynamic change root`);
          }
        } else if (!context.aliases[rootId]) {
          fail(`${context.file}: unknown root alias ${rootId}`);
        } else if (tag === "artifact" && rootId === "state") {
          const allowed = context.stateNamespaces.some(
            (namespace) =>
              nodePath === namespace || nodePath.startsWith(`${namespace}/`)
          );
          if (!allowed) {
            fail(`${context.file}: state artifact is outside declared namespaces: ${nodePath}`);
          }
        } else if (staticReferenceTags.has(tag)) {
          const projectPath = posix.join(context.aliases[rootId], nodePath);
          const sourcePath = projectPathToTemplate(projectPath);
          if (!sourcePath || !existsSync(sourcePath)) {
            fail(`${context.file}: missing ${tag} reference ${rootId}:${nodePath}`);
          }
        }
      }
    }

    for (const [childTag, child] of Object.entries(node)) {
      if (childTag === "#text" || childTag.startsWith("@_")) {
        continue;
      }
      walkXmlNode(childTag, child, context);
    }
  }
}

function validateWorkflow(workflowId, workspace) {
  const workflowDir = join(workflowsRoot, workflowId);
  const entryPath = join(workflowDir, "WORKFLOW.md");
  const relativeEntry = entryPath.slice(packageRoot.length + 1);
  if (!existsSync(entryPath)) {
    fail(`${relativeEntry}: missing workflow entry`);
    return;
  }

  const entryContent = readFileSync(entryPath, "utf8");
  const frontmatter = parseFrontmatter(entryContent, relativeEntry);
  if (frontmatter.id !== workflowId || frontmatter.workflow !== workflowId) {
    fail(`${relativeEntry}: id/workflow must match directory ${workflowId}`);
  }

  const parsedEntryBlocks = xmlBlocks(entryContent)
    .map((block, index) => parseXmlBlock(block, relativeEntry, index))
    .filter(Boolean);
  const runtimeBlock = parsedEntryBlocks.find(
    (block) => block["runtime-context"] !== undefined
  );
  const persistenceBlock = parsedEntryBlocks.find(
    (block) => block.persistence !== undefined
  );
  const runtime = runtimeBlock?.["runtime-context"];
  const persistence = persistenceBlock?.persistence;
  if (!runtime) fail(`${relativeEntry}: missing <runtime-context>`);
  if (!persistence) fail(`${relativeEntry}: missing <persistence>`);
  if (!runtime || !persistence) return;

  const aliases = { ...workspace.roots };
  for (const root of asArray(runtime.root)) {
    const id = root["@_id"];
    const base = root["@_base"];
    const rootPath = root["@_path"];
    if (!id || !base || !rootPath) {
      fail(`${relativeEntry}: runtime root requires id/base/path`);
      continue;
    }
    if (!aliases[base]) {
      fail(`${relativeEntry}: runtime root ${id} uses unknown base ${base}`);
      continue;
    }
    if (!safeRelativePath(rootPath, `${relativeEntry}: runtime root ${id}`)) {
      continue;
    }
    aliases[id] = posix.join(aliases[base], rootPath);
  }

  if (aliases.workflow !== `speculo/workflows/${workflowId}`) {
    fail(`${relativeEntry}: workflow root must resolve to speculo/workflows/${workflowId}`);
  }
  if (aliases.state !== `speculo/.speculo/${workflowId}`) {
    fail(`${relativeEntry}: state root must resolve to speculo/.speculo/${workflowId}`);
  }
  if (persistence["@_root"] !== "state") {
    fail(`${relativeEntry}: persistence root must be state`);
  }

  const stores = asArray(persistence.store);
  const storeById = Object.fromEntries(
    stores.map((store) => [store["@_id"], store])
  );
  const requiredStores = {
    index: ["status.json", "file"],
    changes: ["changes", "directory"],
    archive: ["archive", "directory"],
  };
  for (const [id, [path, kind]] of Object.entries(requiredStores)) {
    const store = storeById[id];
    if (
      !store ||
      store["@_path"] !== path ||
      store["@_kind"] !== kind
    ) {
      fail(`${relativeEntry}: persistence store ${id} must be ${kind} ${path}`);
    }
  }
  const stateNamespaces = stores
    .map((store) => store["@_path"])
    .filter((path) => safeRelativePath(path, `${relativeEntry}: persistence namespace`));

  const stateTemplate = join(workflowDir, "_state");
  for (const required of ["status.json", "changes", "archive"]) {
    if (!existsSync(join(stateTemplate, required))) {
      fail(`${relativeEntry}: _state is missing ${required}`);
    }
  }

  const baseContext = { aliases, file: relativeEntry, stateNamespaces };
  for (const filePath of walkMarkdown(workflowDir)) {
    const file = filePath.slice(packageRoot.length + 1);
    const content = readFileSync(filePath, "utf8");
    for (const [index, block] of xmlBlocks(content).entries()) {
      const parsed = parseXmlBlock(block, file, index);
      if (!parsed) continue;
      const rootTag = Object.keys(parsed)[0];
      walkXmlNode(rootTag, parsed[rootTag], { ...baseContext, file });
    }
  }
}

function validateAgentSkills() {
  for (const skillName of expectedAgentSkills) {
    const skillPath = join(packageRoot, ".agents", "skills", skillName, "SKILL.md");
    const relative = skillPath.slice(packageRoot.length + 1);
    if (!existsSync(skillPath)) {
      fail(`${relative}: missing project authoring skill`);
      continue;
    }
    const content = readFileSync(skillPath, "utf8");
    const frontmatter = parseFrontmatter(content, relative);
    const keys = Object.keys(frontmatter).sort();
    if (keys.join(",") !== "description,name") {
      fail(`${relative}: frontmatter must contain only name and description`);
    }
    if (frontmatter.name !== skillName) {
      fail(`${relative}: name must match directory ${skillName}`);
    }
    if (content.includes("TODO")) fail(`${relative}: unresolved TODO`);
  }
}

function validateDocsSyncTemplates() {
  if (!existsSync(join(templateRoot, "skills", "docs-sync", "SKILL.md"))) {
    return;
  }

  const state = readJson(
    join(docsSyncAssets, "state-template.json"),
    "template/skills/docs-sync/assets/state-template.json"
  );
  if (state) {
    if (
      state.schema_version !== 4 ||
      state.command !== "docs-sync" ||
      state.state_path !== "speculo/.speculo/commands/docs-sync/state.json"
    ) {
      fail("docs-sync state template must use schema v4 and the command state path");
    }
    if (
      state.baseline?.mode !== "explicit" ||
      state.baseline?.sha !== null ||
      !Array.isArray(state.project_targets) ||
      !Array.isArray(state.pending_legacy_targets)
    ) {
      fail("docs-sync state template has an invalid baseline or target scope");
    }
  }

  const scope = readJson(
    join(docsSyncAssets, "workflow-scope-template.json"),
    "template/skills/docs-sync/assets/workflow-scope-template.json"
  );
  if (scope) {
    if (
      scope.schema_version !== 1 ||
      scope.workflow !== "{workflow}" ||
      scope.manifest_path !== "speculo/.speculo/{workflow}/docs-sync.json" ||
      !Array.isArray(scope.project_targets) ||
      !Array.isArray(scope.state_targets)
    ) {
      fail("docs-sync workflow scope template has an invalid v1 shape");
    }
  }

  for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      existsSync(join(workflowsRoot, entry.name, "_state", "docs-sync.json"))
    ) {
      fail(`template/workflows/${entry.name}/_state/docs-sync.json: command sidecar must be lazy`);
    }
  }
}

const workspace = readJson(workspacePath, "template/.speculo/workspace.json");
if (workspace) {
  if (workspace.schema_version !== 1 || workspace.path_base !== "project-root") {
    fail("template/.speculo/workspace.json: unsupported schema or path_base");
  }
  for (const [id, root] of Object.entries(workspace.roots ?? {})) {
    safeRelativePath(root, `workspace root ${id}`);
  }
  for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith("_")) {
      validateWorkflow(entry.name, workspace);
    }
  }
}
validateAgentSkills();
validateDocsSyncTemplates();

if (errors.length > 0) {
  console.error(`Framework asset validation failed: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("framework asset validation: ok");
