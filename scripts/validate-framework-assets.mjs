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
const workflowEntryName = "WORKFLOW.md";
const persistenceEntryName = "PERSISTENCE.md";
const atomicSkillsDirName = "atomic-skills";
const allowedXmlRoots = new Set([
  "atomic-skills",
  "routes",
  "sequence",
  "dependencies",
  "state-schema",
  "transitions",
  "runtime-context",
  "persistence",
  "vendor-path-mapping",
]);
const staticReferenceTags = new Set([
  "atomic-skill",
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
  "speculo-write-canonical",
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

function parsedXmlBlocks(content, file) {
  return xmlBlocks(content)
    .map((block, index) => parseXmlBlock(block, file, index))
    .filter(Boolean);
}

function collectXmlNodes(tag, value, target, output) {
  for (const node of asArray(value)) {
    if (tag === target) output.push(node);
    if (!node || typeof node !== "object") continue;
    for (const [childTag, child] of Object.entries(node)) {
      if (childTag === "#text" || childTag.startsWith("@_")) continue;
      collectXmlNodes(childTag, child, target, output);
    }
  }
}

function xmlNodes(blocks, target) {
  const output = [];
  for (const block of blocks) {
    const rootTag = Object.keys(block)[0];
    collectXmlNodes(rootTag, block[rootTag], target, output);
  }
  return output;
}

function validatePersistenceLoad(blocks, file) {
  const sequences = blocks.filter((block) => block.sequence !== undefined);
  if (sequences.length !== 1) {
    fail(`${file}: must contain exactly one top-level <sequence>`);
    return;
  }
  const phases = asArray(sequences[0].sequence.phase);
  const first = phases.filter((phase) => phase?.["@_order"] === "1");
  if (first.length !== 1 || first[0]["@_id"] !== "load-persistence") {
    fail(`${file}: first phase must be load-persistence with order 1`);
    return;
  }
  const instructions = asArray(first[0].instructions).filter(
    (node) =>
      node?.["@_root"] === "workflow" &&
      node?.["@_path"] === persistenceEntryName &&
      node?.["@_activation"] === "required"
  );
  if (instructions.length !== 1) {
    fail(`${file}: load-persistence must require workflow:${persistenceEntryName}`);
  }
}

function validateAtomicSkills(workflowId, workflowDir, entryBlocks, context) {
  const atomicBlocks = entryBlocks.filter(
    (block) => block["atomic-skills"] !== undefined
  );
  const atomicDir = join(workflowDir, atomicSkillsDirName);
  const hasAtomicDir = existsSync(atomicDir);

  if (!hasAtomicDir && atomicBlocks.length === 0) return;
  if (!hasAtomicDir) {
    fail(`template/workflows/${workflowId}/${atomicSkillsDirName}: missing directory`);
    return;
  }
  if (atomicBlocks.length !== 1) {
    fail(`template/workflows/${workflowId}/${workflowEntryName}: must declare exactly one <atomic-skills> catalog`);
    return;
  }

  const catalog = atomicBlocks[0]["atomic-skills"];
  const entries = asArray(catalog["atomic-skill"]);
  const ids = [];
  const catalogPaths = new Set();
  for (const [index, entry] of entries.entries()) {
    const id = entry?.["@_id"];
    const order = entry?.["@_order"];
    const root = entry?.["@_root"];
    const path = entry?.["@_path"];
    if (!id || order !== String(index + 1) || root !== "workflow") {
      fail(`template/workflows/${workflowId}/${workflowEntryName}: atomic skill ${index + 1} requires id, continuous order and workflow root`);
      continue;
    }
    if (path !== `${atomicSkillsDirName}/${id}.md`) {
      fail(`template/workflows/${workflowId}/${workflowEntryName}: atomic skill ${id} path must be ${atomicSkillsDirName}/${id}.md`);
    }
    if (typeof entry.when !== "string" || entry.when.trim().length === 0) {
      fail(`template/workflows/${workflowId}/${workflowEntryName}: atomic skill ${id} requires <when>`);
    }
    ids.push(id);
    catalogPaths.add(path);
  }
  if (new Set(ids).size !== ids.length) {
    fail(`template/workflows/${workflowId}/${workflowEntryName}: atomic skill ids must be unique`);
  }
  if (ids.join("\n") !== [...ids].sort().join("\n")) {
    fail(`template/workflows/${workflowId}/${workflowEntryName}: atomic skill ids must be ordered lexically`);
  }

  const wrapperFiles = readdirSync(atomicDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  const wrapperPaths = new Set(
    wrapperFiles.map((name) => `${atomicSkillsDirName}/${name}`)
  );
  for (const path of catalogPaths) {
    if (!wrapperPaths.has(path)) {
      fail(`template/workflows/${workflowId}/${workflowEntryName}: catalog references missing atomic wrapper ${path}`);
    }
  }
  for (const path of wrapperPaths) {
    if (!catalogPaths.has(path)) {
      fail(`template/workflows/${workflowId}/${workflowEntryName}: unlisted atomic wrapper ${path}`);
    }
  }

  const sourceRoot = catalog["@_source-root"];
  const completeCoverage = catalog["@_coverage"] === "complete";
  if (completeCoverage && !sourceRoot) {
    fail(`template/workflows/${workflowId}/${workflowEntryName}: complete atomic coverage requires source-root`);
  }

  const targetRefs = new Set();
  for (const wrapperName of wrapperFiles) {
    const wrapperPath = join(atomicDir, wrapperName);
    const relativeWrapper = wrapperPath.slice(packageRoot.length + 1);
    const content = readFileSync(wrapperPath, "utf8");
    const frontmatter = parseFrontmatter(content, relativeWrapper);
    const expectedKeys = [
      "description",
      "id",
      "invocation",
      "name",
      "stability",
      "type",
      "workflow",
    ];
    if (Object.keys(frontmatter).sort().join(",") !== expectedKeys.join(",")) {
      fail(`${relativeWrapper}: atomic frontmatter must contain ${expectedKeys.join(", ")}`);
    }
    const id = wrapperName.slice(0, -3);
    if (
      frontmatter.id !== id ||
      frontmatter.type !== "atomic-skill" ||
      frontmatter.workflow !== workflowId
    ) {
      fail(`${relativeWrapper}: id/type/workflow must match its package and filename`);
    }
    if (!new Set(["stable", "experimental"]).has(frontmatter.stability)) {
      fail(`${relativeWrapper}: stability must be stable or experimental`);
    }
    if (!new Set(["user-only", "model-allowed"]).has(frontmatter.invocation)) {
      fail(`${relativeWrapper}: invocation must be user-only or model-allowed`);
    }

    const blocks = parsedXmlBlocks(content, relativeWrapper);
    validatePersistenceLoad(blocks, relativeWrapper);
    const sequences = blocks.filter((block) => block.sequence !== undefined);
    const phases = sequences.length === 1
      ? asArray(sequences[0].sequence.phase)
      : [];
    const invokePhase = phases.find(p => p["@_id"] === "invoke");
    if (
      phases.length < 2 ||
      phases.length > 3 ||
      phases[0]?.["@_id"] !== "load-persistence" ||
      phases[0]?.["@_order"] !== "1" ||
      !invokePhase ||
      invokePhase["@_order"] !== String(phases.length)
    ) {
      fail(`${relativeWrapper}: atomic wrapper must contain load-persistence (order=1), optional adapt-paths, and invoke phases`);
    }

    const skillNodes = xmlNodes(blocks, "skill");
    if (skillNodes.length !== 1) {
      fail(`${relativeWrapper}: atomic wrapper must reference exactly one raw SKILL`);
      continue;
    }
    const target = skillNodes[0];
    const targetRoot = target?.["@_root"];
    const targetPath = target?.["@_path"];
    if (
      !targetRoot ||
      typeof targetPath !== "string" ||
      !targetPath.endsWith("/SKILL.md") ||
      target?.["@_activation"] !== "adapted"
    ) {
      fail(`${relativeWrapper}: invoke phase must adapt one root+path SKILL.md target`);
      continue;
    }
    if (sourceRoot && targetRoot !== sourceRoot) {
      fail(`${relativeWrapper}: target root must match catalog source-root ${sourceRoot}`);
    }
    const targetRef = `${targetRoot}:${targetPath}`;
    if (targetRefs.has(targetRef)) {
      fail(`${relativeWrapper}: duplicate atomic target ${targetRef}`);
    }
    targetRefs.add(targetRef);

    const projectPath = context.aliases[targetRoot]
      ? posix.join(context.aliases[targetRoot], targetPath)
      : undefined;
    const sourcePath = projectPath ? projectPathToTemplate(projectPath) : undefined;
    if (sourcePath && existsSync(sourcePath)) {
      const rawFrontmatter = parseFrontmatter(
        readFileSync(sourcePath, "utf8"),
        sourcePath.slice(packageRoot.length + 1)
      );
      if (sourceRoot && !rawFrontmatter.name) {
        fail(`${relativeWrapper}: raw target must declare frontmatter name`);
      } else if (sourceRoot && rawFrontmatter.name !== id) {
        fail(`${relativeWrapper}: id must match raw target name ${rawFrontmatter.name}`);
      }
      const expectedStability = targetPath.startsWith("in-progress/")
        ? "experimental"
        : "stable";
      const expectedInvocation =
        expectedStability === "experimental" ||
          rawFrontmatter["disable-model-invocation"] === "true"
          ? "user-only"
          : "model-allowed";
      if (frontmatter.stability !== expectedStability) {
        fail(`${relativeWrapper}: stability must match raw target ${expectedStability}`);
      }
      if (frontmatter.invocation !== expectedInvocation) {
        fail(`${relativeWrapper}: invocation must preserve raw target policy ${expectedInvocation}`);
      }
    }
  }

  if (sourceRoot && context.aliases[sourceRoot]) {
    const sourceDir = projectPathToTemplate(context.aliases[sourceRoot]);
    if (!sourceDir || !existsSync(sourceDir)) {
      fail(`template/workflows/${workflowId}/${workflowEntryName}: missing atomic source root ${sourceRoot}`);
    } else {
      const expectedTargets = new Set(
        walkMarkdown(sourceDir)
          .filter((path) => path.endsWith(`${posix.sep}SKILL.md`) || path.endsWith("/SKILL.md"))
          .map((path) =>
            `${sourceRoot}:${path.slice(sourceDir.length + 1).replaceAll("\\", "/")}`
          )
      );
      const rawNames = new Map();
      for (const target of expectedTargets) {
        const targetPath = target.slice(`${sourceRoot}:`.length);
        const sourcePath = join(sourceDir, ...targetPath.split("/"));
        const rawFrontmatter = parseFrontmatter(
          readFileSync(sourcePath, "utf8"),
          sourcePath.slice(packageRoot.length + 1)
        );
        const rawName = rawFrontmatter.name;
        if (!rawName) {
          fail(`${sourcePath.slice(packageRoot.length + 1)}: raw target must declare frontmatter name`);
          continue;
        }
        if (rawNames.has(rawName)) {
          fail(`${sourcePath.slice(packageRoot.length + 1)}: duplicate raw target name ${rawName}`);
        } else {
          rawNames.set(rawName, targetPath);
        }
      }
      if (completeCoverage) {
        for (const target of expectedTargets) {
          if (!targetRefs.has(target)) {
            fail(`template/workflows/${workflowId}/${workflowEntryName}: complete atomic catalog is missing ${target}`);
          }
        }
        for (const target of targetRefs) {
          if (!expectedTargets.has(target)) {
            fail(`template/workflows/${workflowId}/${workflowEntryName}: atomic target is outside complete source set ${target}`);
          }
        }
      }
    }
  }
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
  const entryPath = join(workflowDir, workflowEntryName);
  const persistencePath = join(workflowDir, persistenceEntryName);
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

  if (!existsSync(persistencePath)) {
    fail(`${relativeEntry}: missing ${persistenceEntryName}`);
    return;
  }
  const relativePersistence = persistencePath.slice(packageRoot.length + 1);
  const persistenceContent = readFileSync(persistencePath, "utf8");
  const parsedEntryBlocks = parsedXmlBlocks(entryContent, relativeEntry);
  const parsedPersistenceBlocks = parsedXmlBlocks(
    persistenceContent,
    relativePersistence
  );
  validatePersistenceLoad(parsedEntryBlocks, relativeEntry);

  if (
    parsedEntryBlocks.some(
      (block) =>
        block["runtime-context"] !== undefined ||
        block.persistence !== undefined
    )
  ) {
    fail(`${relativeEntry}: runtime-context and persistence belong only in ${persistenceEntryName}`);
  }

  const runtimeBlocks = parsedPersistenceBlocks.filter(
    (block) => block["runtime-context"] !== undefined
  );
  const persistenceBlocks = parsedPersistenceBlocks.filter(
    (block) => block.persistence !== undefined
  );
  if (runtimeBlocks.length !== 1) {
    fail(`${relativePersistence}: must contain exactly one <runtime-context>`);
  }
  if (persistenceBlocks.length !== 1) {
    fail(`${relativePersistence}: must contain exactly one <persistence>`);
  }
  const runtime = runtimeBlocks[0]?.["runtime-context"];
  const persistence = persistenceBlocks[0]?.persistence;
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
  validateAtomicSkills(workflowId, workflowDir, parsedEntryBlocks, baseContext);
  for (const filePath of walkMarkdown(workflowDir)) {
    const file = filePath.slice(packageRoot.length + 1);
    const content = readFileSync(filePath, "utf8");
    const blocks = parsedXmlBlocks(content, file);
    for (const parsed of blocks) {
      const rootTag = Object.keys(parsed)[0];
      if (
        filePath !== persistencePath &&
        (rootTag === "runtime-context" || rootTag === "persistence")
      ) {
        fail(`${file}: ${rootTag} belongs only in ${persistenceEntryName}`);
      }
      walkXmlNode(rootTag, parsed[rootTag], { ...baseContext, file });
    }
    const isAtomicWrapper = filePath.startsWith(`${join(workflowDir, atomicSkillsDirName)}/`);
    if (filePath !== persistencePath && !isAtomicWrapper) {
      const skillNodes = xmlNodes(blocks, "skill");
      if (skillNodes.length > 0) {
        fail(`${file}: raw <skill> references must be isolated in atomic wrappers`);
      }
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
