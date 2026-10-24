#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter as parseYaml, readAssetCatalog, validateWorkspace, validateWorkflowManifest as assertWorkflowManifest } from "../template/lib/speculo-runtime.mjs";

const packageRoot = resolve(
  process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), "..")
);
const templateRoot = join(packageRoot, "template");
const workflowsRoot = join(templateRoot, "workflows");
const workspacePath = join(templateRoot, ".speculo", "workspace.json");
const maintenanceAssets = join(templateRoot, "commands", "project-maintenance", "assets");
const workflowEntryName = "SKILL.md";
const allowedRootAliases = new Set([
  "config",
  "speculo",
  "state",
  "commands",
  "skills",
  "workflows",
  "references",
]);
const requiredPassiveIndexSections = [
  "永久知识",
  "Work 激活",
];
const requiredActivationSections = [
  "Work 条目",
  "运行时根",
  "持久化约定",
  "启动协议",
  "状态字段",
  "路径分配",
  "副作用边界",
];
const expectedAgentSkills = [
  "speculo-write-skill",
  "speculo-write-workflows",
  "speculo-write-command",
  "speculo-write-canonical",
  "speculo-write-work",
];
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

const workflowPersistentKnowledge = {
  specdev: new Set([
    "<Path>{roots.state}/specdev/adr/</Path>",
    "<Path>{roots.state}/specdev/context/</Path>",
    "<Path>{roots.state}/specdev/design/</Path>",
  ]),
  learning: new Set([
    "<Path>{roots.state}/learning/context/INDEX.md</Path>",
    "<Path>{roots.state}/learning/context/REVIEW.md</Path>",
  ]),
  ops: new Set(["<Path>{roots.state}/ops/knowledge/</Path>", "<Path>{roots.state}/ops/hosts/{host_id}/knowledge/</Path>", "<Path>{roots.state}/ops/projects/{project_id}/knowledge/</Path>"]),
  person: new Set(),
  media: new Set(["<Path>{roots.state}/media/context/INDEX.md</Path>"]),
};

function validateWorkflowManifest(workflowId, workflowDir) {
  const manifestPath = join(workflowDir, "manifest.json");
  const relative = manifestPath.slice(packageRoot.length + 1);
  const manifest = readJson(manifestPath, relative);
  if (!manifest) return;
  try { assertWorkflowManifest(manifest, workflowId); }
  catch (error) { fail(`${relative}: ${error.message}`); return; }
  const declaredKnowledge = new Set();
  for (const path of manifest.persistent_knowledge) {
    if (typeof path !== "string" || !/^<Path>\{roots\.state\}\/[^<]+<\/Path>$/.test(path)) {
      fail(`${relative}: persistent_knowledge entries must use safe <Path>{roots.state}/... </Path> references`);
      continue;
    }
    if (path.includes("workflows/") || path.includes("_state/") || path.includes("/changes/") || path.includes("/archive/")) {
      fail(`${relative}: persistent_knowledge cannot reference workflow or active state paths: ${path}`);
    }
    if (declaredKnowledge.has(path)) fail(`${relative}: duplicate persistent_knowledge path ${path}`);
    declaredKnowledge.add(path);
  }
  const expectedKnowledge = workflowPersistentKnowledge[workflowId] || new Set();
  if (declaredKnowledge.size !== expectedKnowledge.size || [...expectedKnowledge].some((path) => !declaredKnowledge.has(path))) {
    fail(`${relative}: persistent_knowledge does not match the registered ${workflowId} knowledge roots`);
  }
}

function parseFrontmatter(content,file) { try { return parseYaml(content).fields; }catch(error){fail(file+": "+error);return {}; } }

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

function walkMarkdown(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

function walkInstructionFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkInstructionFiles(path));
    else if (entry.name.endsWith(".md") || entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

function validatePathTags(file, content) {
  const open = (content.match(/<Path>/g) ?? []).length;
  const close = (content.match(/<\/Path>/g) ?? []).length;
  if (open !== close) fail(`${file}: unbalanced Path tags: ${open} open, ${close} close`);
  const re = /<Path>\{roots\.([a-zA-Z0-9_-]+)\}([^<]*)<\/Path>/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const alias = match[1];
    const rest = match[2] ?? "";
    if (alias === "X" || alias === "xxx") continue;
    if (!allowedRootAliases.has(alias)) {
      fail(`${file}: unknown Path root alias {roots.${alias}}`);
    }
    if (rest.includes("\\")) {
      fail(`${file}: Path must use forward slashes: ${match[0]}`);
      continue;
    }
    // Reject path-segment ".." only (not prose ellipsis "...")
    if (rest.split("/").includes("..")) {
      fail(`${file}: Path must not escape with ..: ${match[0]}`);
    }
  }
}

function validateCommandReportRoots() {
  const commandsDir = join(templateRoot, "commands");
  for (const entry of readdirSync(commandsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "references") continue;
    const filePath = join(commandsDir, entry.name, "COMMAND.md");
    const file = filePath.slice(packageRoot.length + 1);
    const content = readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(content, file);
    if (!frontmatter.id) {
      fail(`${file}: command frontmatter must declare id`);
      continue;
    }
    const expected = `{roots.state}/commands/${frontmatter.id}/`;
    if (!content.includes(expected)) {
      fail(`${file}: command must declare report root ${expected}`);
    }
  }
}

function validateCommandAndSkillPaths() {
  const roots = [join(templateRoot, "commands"), join(templateRoot, "references")];
  const legacyPatterns = [
    [/speculo\/\.speculo(?!\/workspace\.json)(?:\/|\b)/, "runtime state must use <Path>{roots.state}/...</Path>"],
    [/speculo\/config\.json\b/, "config must use <Path>{roots.config}</Path>"],
    [/speculo\/workflows(?:\/|\b)/, "workflow assets must use <Path>{roots.workflows}/...</Path>"],
    [/(?:^|[\s`(])(?:\.\.\/)+skills\//m, "cross-package skill references must use roots.skills"],
    [/(?:^|[\s`(])(?:\.\.\/)+commands\//m, "cross-package command references must use roots.commands"],
  ];
  for (const root of roots) {
    for (const filePath of walkInstructionFiles(root)) {
      const file = filePath.slice(packageRoot.length + 1);
      const content = readFileSync(filePath, "utf8");
      validatePathTags(file, content);
      for (const [pattern, message] of legacyPatterns) {
        if (pattern.test(content)) fail(`${file}: ${message}`);
      }
    }
  }
}

function validateWorkflow(workflowId, workspace) {
  const workflowDir = join(workflowsRoot, workflowId);
  validateWorkflowManifest(workflowId, workflowDir);
  const entryPath = join(workflowDir, workflowEntryName);
  const relativeEntry = entryPath.slice(packageRoot.length + 1);
  if (!existsSync(entryPath)) {
    fail(`${relativeEntry}: missing workflow entry`);
    return;
  }

  const entryContent = readFileSync(entryPath, "utf8");
  const frontmatter = parseFrontmatter(entryContent, relativeEntry);
  if(frontmatter.metadata?.["speculo-id"]!=="domain/"+workflowId)fail(relativeEntry+": invalid domain identity");
  for(const section of ["发现与激活","能力路由","永久知识"])if(!entryContent.includes("## "+section))fail(relativeEntry+": missing "+section);
  if(!entryContent.includes("common/rules/activation-and-memory.md"))fail(relativeEntry+": missing activation contract");
  const stateTemplate = join(workflowDir, "_state");
  const runtimeContract = readJson(join(workflowDir, "runtime-contract.json"), "workflow runtime contract");
  const requiredState = runtimeContract?.state_seed === "optional" ? [] : workflowId === "ops" ? ["status.json"] : ["status.json", "changes", "archive"];
  if (workflowId === "ops") {
    const seed = readJson(join(stateTemplate, "status.json"), "OPS resource seed");
    if (seed?.schema_version !== 3 || seed?.workflow !== "ops" || !seed?.hosts || !seed?.deployments) fail("OPS seed must be the v3 resource contract");
  }
  for (const required of requiredState) {
    if (!existsSync(join(stateTemplate, required))) {
      fail(`${relativeEntry}: _state is missing ${required}`);
    }
  }

  // Validate <Path>{roots.xxx}/...</Path> aliases across workflow markdown
  for (const filePath of walkMarkdown(workflowDir)) {
    // Skip large content corpora (books) — not instruction assets
    if (filePath.includes(`${workflowDir}/`) && filePath.includes("/books/")) continue;
    const file = filePath.slice(packageRoot.length + 1);
    const content = readFileSync(filePath, "utf8");
    validatePathTags(file, content);
  }

  // workspace roots used only to ensure path_base contract already validated above
  void workspace;
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

function validateProjectMaintenanceTemplates() {
  if (!existsSync(join(templateRoot, "commands", "project-maintenance", "COMMAND.md"))) {
    return;
  }

  const state = readJson(
    join(maintenanceAssets, "state-template.json"),
    "template/commands/project-maintenance/assets/state-template.json"
  );
  if (state) {
    if (
      state.schema_version !== 4 ||
      state.command !== "project-maintenance" ||
      state.state_path !== "<Path>{roots.state}/commands/project-maintenance/state.json</Path>"
    ) {
      fail("project-maintenance state template must use schema v4 and the command state path");
    }
    if (
      state.baseline?.mode !== "explicit" ||
      state.baseline?.sha !== null ||
      !Array.isArray(state.project_targets) ||
      Object.hasOwn(state, "pending_legacy_targets")
    ) {
      fail("project-maintenance state template has an invalid baseline or target scope");
    }
  }

  const scope = readJson(
    join(maintenanceAssets, "workflow-scope-template.json"),
    "template/commands/project-maintenance/assets/workflow-scope-template.json"
  );
  if (scope) {
    if (
      scope.schema_version !== 1 ||
      scope.workflow !== "{workflow}" ||
      scope.manifest_path !== "<Path>{roots.state}/{workflow}/project-maintenance-docs.json</Path>" ||
      !Array.isArray(scope.project_targets) ||
      !Array.isArray(scope.state_targets)
    ) {
      fail("project-maintenance workflow scope template has an invalid v1 shape");
    }
  }

  for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      existsSync(join(workflowsRoot, entry.name, "_state", "project-maintenance-docs.json"))
    ) {
      fail(`template/workflows/${entry.name}/_state/project-maintenance-docs.json: command sidecar must be lazy`);
    }
  }
}

const workspace = readJson(workspacePath, "template/.speculo/workspace.json");
if (workspace) {
  try {validateWorkspace(workspace);}catch(error){fail(String(error));}
  for (const [id, root] of Object.entries(workspace.roots ?? {})) {
    safeRelativePath(root, `workspace root ${id}`);
  }
  for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith("_")) {
      validateWorkflow(entry.name, workspace);
    }
  }
}
try { await readAssetCatalog(templateRoot); }catch(error){fail(String(error));}
validateAgentSkills();
validateProjectMaintenanceTemplates();
validateCommandAndSkillPaths();
validateCommandReportRoots();

if (errors.length > 0) {
  console.error(`Framework asset validation failed: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("framework asset validation: ok");
