#!/usr/bin/env node

/**
 * Validate the SpecDev workflow package and SpecDev change artifacts.
 *
 * The validator is dependency-free and runs on the Node.js runtime required by
 * Speculo. It checks canonical <Path> references, package layout, artifact
 * frontmatter, Ticket readiness, traceability, DAG validity, path ownership,
 * Goal Plan completeness, and Evidence presence.
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, basename, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DOMAIN_SCHEMA_VERSION = 3;
const CONFIG_SCHEMA_VERSION = 5;
const GOAL_PLAN_SCHEMA_VERSION = 6;
const IMPLEMENTATION_MAP_SCHEMA_VERSION = 1;
const IMPLEMENTATION_PLAN_SCHEMA_VERSION = 1;
const CHANGE_STATUS_SCHEMA_VERSION = 6;
const GLOBAL_STATUS_SCHEMA_VERSION = 5;
const WORKFLOW_PREFIX = "{roots.workflows}/specdev/";
const STATE_PREFIX = "{roots.state}/specdev/";
const STATE_ROOT_PREFIX = "{roots.state}/";
const SKILLS_PREFIX = "{roots.skills}/";
const COMMANDS_PREFIX = "{roots.commands}/";
const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EXPECTED_WORKS = new Set([
  "A-archive-and-consolidate",
  "C-code-review",
  "D-diagnose-bugs",
  "G-grill-with-docs",
  "I-implement",
  "I-init-setup",
  "O-orchestrate-implementation",
  "P-goal-plan",
  "P-prototype",
  "R-review-architecture",
  "S-spec",
  "T-tickets",
  "T-triage",
  "W-wayfinder",
]);
const EXPECTED_COMMON_DIRS = new Set(["rules", "schemas", "skills", "tools"]);
const VALID_TICKET_STATUS = new Set([
  "draft",
  "ready",
  "in_progress",
  "blocked",
  "review",
  "done",
  "deviated",
  "cancelled",
]);
const VALID_DEPTH = new Set(["lite", "standard", "deep"]);
const VALID_RISK = new Set(["low", "medium", "high", "critical"]);
const VALID_PLAN_MODES = new Set([
  "migration",
  "high-assurance",
  "reference-conformance",
  "release-coordination",
]);
const VALID_WORKTREE_STATUS = new Set([
  "planned",
  "active",
  "review",
  "integrating",
  "integrated",
  "removed",
  "blocked",
]);
const VALID_INTEGRATION_STATUS = new Set(["pending", "candidate", "passed", "failed", "stale"]);
const VALID_INTEGRATION_METHOD = new Set([null, "direct-parent", "fast-forward", "merge-commit"]);
const VALID_INTEGRATION_VERIFICATION = new Set(["pending", "passed", "failed"]);
const VALID_E2E_STATUS = new Set(["not-required", "pending", "passed", "failed"]);
const VALID_DESIGN_TREE_STATUS = new Set(["active", "consensus", "blocked"]);
const VALID_DESIGN_NODE_STATUS = new Set(["open", "answered", "deferred", "rejected"]);
const VALID_WAYFINDER_LABEL = new Set([
  "wayfinder:research",
  "wayfinder:prototype",
  "wayfinder:grilling",
  "wayfinder:task",
]);
const VALID_WAYFINDER_STATUS = new Set(["open", "closed"]);
const VALID_WAYFINDER_RESOLUTION = new Set([
  null,
  "answered",
  "out-of-scope",
  "superseded",
  "cancelled",
]);
const VALID_STAGES = new Set([
  "triage",
  "diagnosis",
  "grill",
  "spec",
  "tickets",
  "goal-plan",
  "implement",
  "review",
  "prototype",
  "wayfinder",
  "orchestrate-implementation",
  "complete",
]);
const REQUIRED_TICKET_KEYS = new Set([
  "schema_version",
  "artifact",
  "change",
  "id",
  "title",
  "status",
  "planning_depth",
  "planning_depth_reason",
  "ready",
  "risk",
  "blocked_by",
  "contract_ids",
  "owner",
  "expected_changes",
  "writable_paths",
  "read_only_paths",
  "shared_paths",
  "shared_path_owners",
]);
const REQUIRED_READY_TICKET_SECTIONS = new Set([
  "## 1. 战略与来源",
  "## 2. 决策状态",
  "## 3. 范围边界",
  "## 4. 要构建什么",
  "## 7. 路径访问契约",
  "## 8. 验证矩阵",
  "## 10. 验收标准",
]);
const REQUIRED_GOAL_PLAN_SECTIONS = new Set([
  "## 1. Outcome and Authority",
  "## 2. Execution Graph",
  "## 3. Gates and Completion Evidence",
  "## 4. Execution and Integration Protocol",
  "## 5. Constraints, Risk and Recovery",
  "## 6. Progress and Decisions",
]);
const REQUIRED_LEAD_GOAL_PLAN_MARKERS = [
  "### Lead Orchestration",
  "Implementation subagents",
  "Read-only agents",
  "execution-time dynamic",
  "### Ticket Workspace and Integration",
  "### Authorization Matrix",
  "Implementation commit",
];
const STATE_ARTIFACT_BASENAMES = new Set([
  "spec.md",
  "tickets-map.md",
  "goal-plan.md",
  "implementation-map.md",
  "implementation-plan.md",
  "ADR.md",
  "CONTEXT.md",
  "LOG.md",
  "status.json",
  ".status.json",
  "triage.md",
  "diagnosis.md",
  "source.md",
  "architecture-review.md",
  "architecture-review.html",
  "wayfinder-map.md",
  "design-tree.json",
  "implementation-orchestration.md",
]);
const FORBIDDEN_OBSOLETE_BASENAMES = new Set([
  "source-issue.md",
  "delegated-execution.md",
  "delegated-execution-template.md",
  "workspace-execution-template.md",
  "delegated-evidence-template.md",
  "input-validation.md",
  "vision-sections.md",
  "execution-sections.md",
  "governance-sections.md",
  "lead-orchestration-protocol.md",
  "quick-reference-table.md",
]);

const PATH_TAG_RE = /<Path>(.*?)<\/Path>/gs;
const URL_TAG_RE = /<Url>(.*?)<\/Url>/gs;
const RELATIVE_MD_LINK_RE = /\[[^\]]*\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;
const ABSOLUTE_MACHINE_PATH_RE = /^(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/|\/mnt\/|\/tmp\/)/;
const PLACEHOLDER_RE = /\{(?:change|ticket-file|investigation-id|[^}]+)\}|<[^>]+>|YYYY-MM|NN-|\.\.\.|\*|\?/;

function toPosix(value) {
  return value.split(sep).join("/");
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function walk(root) {
  if (!isDirectory(root)) return [];
  const paths = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    paths.push(path);
    if (entry.isDirectory()) paths.push(...walk(path));
  }
  return paths;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "true" || value === "True") return true;
  if (value === "false" || value === "False") return false;
  if (value === "null" || value === "Null" || value === "~") return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => parseScalar(item));
  }
  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function findSpecdevConfig(change) {
  let current = resolve(change);
  while (true) {
    const candidate = join(current, ".speculo", "specdev", "config.json");
    if (isFile(candidate)) {
      try {
        return JSON.parse(readText(candidate));
      } catch {
        return null;
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function positiveConfigLimit(config, key, fallback) {
  const value = config?.execution?.[key];
  return Number.isInteger(value) && value >= 1 ? value : fallback;
}

function parseFrontmatter(path) {
  const text = readText(path);
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { meta: {}, body: text };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return { meta: {}, body: text };

  const meta = {};
  let currentListKey = null;
  for (const line of lines.slice(1, end)) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#")) continue;
    if (currentListKey && /^\s+-\s+/.test(line)) {
      meta[currentListKey].push(parseScalar(line.replace(/^\s+-\s+/, "")));
      continue;
    }
    currentListKey = null;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const raw = line.slice(colon + 1).trim();
    if (!raw) {
      meta[key] = [];
      currentListKey = key;
    } else {
      meta[key] = parseScalar(raw);
    }
  }
  return { meta, body: lines.slice(end + 1).join("\n") };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionBody(body, heading) {
  const match = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m").exec(body);
  if (!match) return "";
  const tail = body.slice(match.index + match[0].length);
  const next = /^##\s+/m.exec(tail);
  return (next ? tail.slice(0, next.index) : tail).trim();
}

function stripPathTag(value) {
  const match = /^<Path>([^<]+)<\/Path>$/.exec(String(value).trim());
  return match ? match[1].trim() : null;
}

function normalizeProjectPath(value) {
  const inner = stripPathTag(value) ?? String(value);
  return inner
    .replaceAll("\\", "/")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/\/$/, "");
}

function pathRoot(value) {
  let normalized = normalizeProjectPath(value)
    .replace(/\/\*\*$/, "")
    .replace(/\/\*$/, "");
  const wildcard = normalized.search(/[*?[\\]/);
  if (wildcard >= 0) normalized = normalized.slice(0, wildcard).replace(/\/$/, "");
  return normalized.replace(/\/$/, "");
}

function pathsOverlap(left, right) {
  const a = pathRoot(left);
  const b = pathRoot(right);
  if (!a || !b) return true;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function findCycle(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(node) {
    if (visiting.has(node)) {
      const index = stack.indexOf(node);
      return [...stack.slice(index), node];
    }
    if (visited.has(node)) return null;
    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

function transitivelyDepends(graph, node, target, seen = new Set()) {
  if (seen.has(node)) return false;
  seen.add(node);
  for (const dependency of graph.get(node) ?? []) {
    if (dependency === target || transitivelyDepends(graph, dependency, target, seen)) {
      return true;
    }
  }
  return false;
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function validatePathValue(value, { allowProject = true } = {}) {
  if (!value || value !== value.trim()) {
    return "Path payload is empty or has surrounding whitespace";
  }
  if (value.includes("\\")) return "Path payload must use forward slashes";
  if (ABSOLUTE_MACHINE_PATH_RE.test(value)) {
    return "machine-specific absolute paths are forbidden";
  }
  if (value.startsWith(WORKFLOW_PREFIX)) {
    if (value === WORKFLOW_PREFIX) return null;
    const suffix = value.slice(WORKFLOW_PREFIX.length);
    if (
      suffix.startsWith("/") ||
      suffix.startsWith("./") ||
      suffix.startsWith("../") ||
      suffix.includes("/../")
    ) {
      return "workflow Path is not canonical";
    }
    return null;
  }
  if (value.startsWith(STATE_PREFIX)) {
    if (value === STATE_PREFIX) return null;
    const suffix = value.slice(STATE_PREFIX.length);
    if (
      suffix.startsWith("/") ||
      suffix.startsWith("./") ||
      suffix.startsWith("../") ||
      suffix.includes("/../")
    ) {
      return "state Path is not canonical";
    }
    return null;
  }
  if (value.startsWith(STATE_ROOT_PREFIX)) {
    const suffix = value.slice(STATE_ROOT_PREFIX.length);
    if (
      !suffix ||
      suffix.startsWith("/") ||
      suffix.startsWith("./") ||
      suffix.startsWith("../") ||
      suffix.includes("/../")
    ) {
      return "state-root Path is not canonical";
    }
    return null;
  }
  for (const [prefix, name] of [[SKILLS_PREFIX, "skills"], [COMMANDS_PREFIX, "commands"]]) {
    if (value.startsWith(prefix)) {
      const suffix = value.slice(prefix.length);
      if (
        !suffix ||
        suffix.startsWith("/") ||
        suffix.startsWith("./") ||
        suffix.startsWith("../") ||
        suffix.includes("/../")
      ) {
        return `${name} Path is not canonical`;
      }
      return null;
    }
  }
  if (value.includes("{roots.")) {
    return "unknown or incomplete root variable";
  }
  if (!allowProject) return "this field requires a rooted workflow or state Path";
  if (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("~") ||
    value.includes("/../")
  ) {
    return "project Path must be project-relative";
  }
  return null;
}

function validateDocumentReferences(root) {
  const errors = [];
  const warnings = [];
  const entries = walk(root);
  const frozenResearchRoot = join(
    root,
    "P-prototype",
    "design-library",
    "research-snapshot",
  );
  const governedEntries = entries.filter(
    (path) => path !== frozenResearchRoot && !path.startsWith(`${frozenResearchRoot}${sep}`),
  );
  const knownFiles = new Set(governedEntries.filter(isFile).map((path) => basename(path)));
  const knownDirectories = new Set(governedEntries.filter(isDirectory).map((path) => basename(path)));

  // The pinned research snapshot preserves its upstream relative links and HTML
  // asset paths byte-for-byte. Global template link checks still validate it.
  for (const path of governedEntries.filter(
    (item) => isFile(item) && [".md", ".html"].includes(extname(item).toLowerCase()),
  )) {
    const label = toPosix(relative(root, path));
    const text = readText(path);

    if ((text.match(/<Path>/g) ?? []).length !== (text.match(/<\/Path>/g) ?? []).length) {
      errors.push(`${label}: unbalanced <Path> tags`);
    }
    if ((text.match(/<Url>/g) ?? []).length !== (text.match(/<\/Url>/g) ?? []).length) {
      errors.push(`${label}: unbalanced <Url> tags`);
    }

    for (const match of text.matchAll(PATH_TAG_RE)) {
      const payload = match[1];
      const issue = validatePathValue(payload);
      if (issue) {
        errors.push(
          `${label}:${lineNumber(text, match.index)}: invalid <Path>${payload}</Path>: ${issue}`,
        );
        continue;
      }
      if (payload.startsWith(WORKFLOW_PREFIX)) {
        const referenced = payload.slice(WORKFLOW_PREFIX.length);
        if (!PLACEHOLDER_RE.test(referenced)) {
          const target = join(root, referenced);
          if (!existsSync(target)) {
            errors.push(
              `${label}:${lineNumber(text, match.index)}: broken workflow Path ${payload}`,
            );
          } else if (isDirectory(target) && !payload.endsWith("/")) {
            errors.push(
              `${label}:${lineNumber(text, match.index)}: directory workflow Path must end with /: ${payload}`,
            );
          } else if (isFile(target) && payload.endsWith("/")) {
            errors.push(
              `${label}:${lineNumber(text, match.index)}: file workflow Path must not end with /: ${payload}`,
            );
          }
        }
      } else if (payload.startsWith(SKILLS_PREFIX) || payload.startsWith(COMMANDS_PREFIX)) {
        const isSkill = payload.startsWith(SKILLS_PREFIX);
        const prefix = isSkill ? SKILLS_PREFIX : COMMANDS_PREFIX;
        const referenced = payload.slice(prefix.length);
        if (!PLACEHOLDER_RE.test(referenced)) {
          const templateRoot = resolve(root, "..", "..");
          const target = join(templateRoot, isSkill ? "skills" : "commands", referenced);
          if (!existsSync(target)) {
            errors.push(`${label}:${lineNumber(text, match.index)}: broken public Path ${payload}`);
          }
        }
      }
    }

    for (const match of text.matchAll(URL_TAG_RE)) {
      const payload = match[1].trim();
      if (!/^https?:\/\//.test(payload)) {
        errors.push(`${label}:${lineNumber(text, match.index)}: <Url> must contain http(s) URL`);
      }
    }

    for (const match of text.matchAll(RELATIVE_MD_LINK_RE)) {
      errors.push(
        `${label}:${lineNumber(text, match.index)}: relative Markdown link is forbidden: ${match[1]}`,
      );
    }

    let withoutTags = text
      .replace(/`?\s*<Path>.*?<\/Path>\s*`?/gs, "")
      .replace(/`?\s*<Url>.*?<\/Url>\s*`?/gs, "");

    for (const match of withoutTags.matchAll(/\{roots\.(?:workflows|state)\}/g)) {
      errors.push(
        `${label}:${lineNumber(withoutTags, match.index)}: root variable must be inside <Path>`,
      );
    }

    for (const name of [...knownFiles].sort((a, b) => b.length - a.length)) {
      if (name === basename(path) || name.length < 5) continue;
      const pattern = new RegExp(
        `(?<![\\w/.-])${escapeRegExp(name)}(?![\\w.-])`,
      );
      const match = pattern.exec(withoutTags);
      if (match) {
        errors.push(
          `${label}:${lineNumber(withoutTags, match.index)}: internal file reference '${name}' must use a full <Path>`,
        );
        break;
      }
    }

    const artifactNames = [
      ...STATE_ARTIFACT_BASENAMES,
      ...FORBIDDEN_OBSOLETE_BASENAMES,
    ].sort((a, b) => b.length - a.length);
    for (const name of artifactNames) {
      const pattern = new RegExp(
        `(?<![\\w/.-])${escapeRegExp(name)}(?![\\w.-])`,
      );
      const match = pattern.exec(withoutTags);
      if (match) {
        errors.push(
          `${label}:${lineNumber(withoutTags, match.index)}: concrete artifact reference '${name}' must use a full <Path>`,
        );
        break;
      }
    }

    const pathLikeCode = /`([^`\n]+\.(?:md|json|mjs|html|yaml|yml))`/g.exec(withoutTags);
    if (pathLikeCode) {
      errors.push(
        `${label}:${lineNumber(withoutTags, pathLikeCode.index)}: path-like code span '${pathLikeCode[1]}' must use a full <Path>`,
      );
    }

    for (const directoryName of [...knownDirectories].sort((a, b) => b.length - a.length)) {
      const match = new RegExp("`" + escapeRegExp(directoryName) + "/?`").exec(withoutTags);
      if (match) {
        errors.push(
          `${label}:${lineNumber(withoutTags, match.index)}: internal directory reference '${directoryName}' must use a full <Path>`,
        );
        break;
      }
    }
  }
  return { errors, warnings };
}

function validateJsonFiles(root) {
  const errors = [];
  for (const path of walk(root).filter((item) => isFile(item) && extname(item) === ".json")) {
    try {
      JSON.parse(readText(path));
    } catch (error) {
      errors.push(`${toPosix(relative(root, path))}: invalid JSON: ${error.message}`);
    }
  }
  return errors;
}

function validateGlobalStatusAssets(root) {
  const errors = [];
  const paths = [join(root, "I-init-setup", "status-template.json")];
  if (isDirectory(join(root, "_state"))) {
    paths.unshift(join(root, "_state", "status.json"));
  }
  for (const path of paths) {
    if (!isFile(path)) {
      errors.push(`missing global status seed ${toPosix(relative(root, path))}`);
      continue;
    }
    const data = JSON.parse(readText(path));
    const keys = Object.keys(data).sort();
    const expected = ["active", "archived", "schema_version", "workflow"];
    if (JSON.stringify(keys) !== JSON.stringify(expected)) {
      errors.push(`${toPosix(relative(root, path))}: global status must contain only ${expected.join(", ")}`);
    }
    if (
      data.schema_version !== GLOBAL_STATUS_SCHEMA_VERSION ||
      data.workflow !== "specdev" ||
      !Array.isArray(data.active) ||
      !Array.isArray(data.archived)
    ) {
      errors.push(`${toPosix(relative(root, path))}: invalid SpecDev global status v5 seed`);
    }
  }

  const schemaPath = join(root, "common", "schemas", "status.schema.json");
  if (!isFile(schemaPath)) {
    errors.push("missing common/schemas/status.schema.json");
    return errors;
  }
  const schema = JSON.parse(readText(schemaPath));
  if (
    schema.$id !== "urn:speculo:specdev:status:v5" ||
    schema.properties?.schema_version?.const !== GLOBAL_STATUS_SCHEMA_VERSION ||
    schema.additionalProperties !== false
  ) {
    errors.push("status.schema.json must define the strict SpecDev global status v5 index contract");
  }
  for (const removed of ["work_history", "completed", "result"]) {
    if (JSON.stringify(schema).includes(`\"${removed}\"`)) {
      errors.push(`status.schema.json still contains removed global field ${removed}`);
    }
  }
  return errors;
}

function validateExecutionContractAssets(root) {
  const errors = [];
  const configTemplatePath = join(root, "I-init-setup", "config-template.json");
  const changeTemplatePath = join(root, "I-init-setup", "change-status-template.json");
  const configSchemaPath = join(root, "common", "schemas", "config.schema.json");
  const goalPlanSchemaPath = join(root, "common", "schemas", "goal-plan.schema.json");
  const changeSchemaPath = join(root, "common", "schemas", "change-status.schema.json");
  const implementationMapSchemaPath = join(root, "common", "schemas", "implementation-map.schema.json");
  const implementationPlanSchemaPath = join(root, "common", "schemas", "implementation-plan.schema.json");

  for (const path of [
    configTemplatePath,
    changeTemplatePath,
    configSchemaPath,
    goalPlanSchemaPath,
    changeSchemaPath,
    implementationMapSchemaPath,
    implementationPlanSchemaPath,
  ]) {
    if (!isFile(path)) errors.push(`missing execution contract asset ${toPosix(relative(root, path))}`);
  }
  if (errors.length) return errors;

  const configTemplate = JSON.parse(readText(configTemplatePath));
  if (
    configTemplate.schema_version !== CONFIG_SCHEMA_VERSION ||
    !Number.isInteger(configTemplate.execution?.max_implementation_agents) ||
    configTemplate.execution.max_implementation_agents < 1 ||
    !Number.isInteger(configTemplate.execution?.max_integration_attempts) ||
    configTemplate.execution.max_integration_attempts < 1 ||
    !Number.isInteger(configTemplate.planning?.ui_design_default_candidates) ||
    !Number.isInteger(configTemplate.planning?.ui_design_max_candidates) ||
    configTemplate.planning.ui_design_default_candidates < 2 ||
    configTemplate.planning.ui_design_max_candidates > 4 ||
    configTemplate.planning.ui_design_max_candidates < configTemplate.planning.ui_design_default_candidates
  ) {
    errors.push("config-template.json must define SpecDev config v5 with positive execution limits and valid UI design candidate bounds");
  }
  for (const obsolete of ["auto_commit", "worktree_for_parallel", "max_parallel"]) {
    if (JSON.stringify(configTemplate).includes(`\"${obsolete}\"`)) {
      errors.push(`config-template.json still contains obsolete execution field ${obsolete}`);
    }
  }

  const configSchema = JSON.parse(readText(configSchemaPath));
  const limit = configSchema.properties?.execution?.properties?.max_implementation_agents;
  if (
    configSchema.$id !== "urn:speculo:specdev:config:v5" ||
    configSchema.properties?.schema_version?.const !== CONFIG_SCHEMA_VERSION ||
    limit?.minimum !== 1 ||
    configSchema.properties?.execution?.properties?.max_integration_attempts?.minimum !== 1 ||
    configSchema.additionalProperties !== false
  ) {
    errors.push("config.schema.json must define the strict SpecDev config v5 execution contract");
  }

  const goalPlanSchema = JSON.parse(readText(goalPlanSchemaPath));
  if (
    goalPlanSchema.$id !== "urn:speculo:specdev:goal-plan:v6" ||
    goalPlanSchema.properties?.schema_version?.const !== GOAL_PLAN_SCHEMA_VERSION ||
    goalPlanSchema.properties?.orchestration?.const !== "lead-directed" ||
    goalPlanSchema.properties?.implementation_agent_limit?.minimum !== 1 ||
    goalPlanSchema.properties?.integration_attempt_limit?.minimum !== 1 ||
    !["current", "required"].every((value) => goalPlanSchema.properties?.ticket_workspace_policy?.enum?.includes(value)) ||
    !["direct-parent", "candidate-merge"].every((value) => goalPlanSchema.properties?.integration_gate?.enum?.includes(value)) ||
    goalPlanSchema.additionalProperties !== false
  ) {
    errors.push("goal-plan.schema.json must define the strict Lead-directed Goal Plan v6 workspace strategy contract");
  }

  const changeTemplate = JSON.parse(readText(changeTemplatePath));
  if (
    changeTemplate.schema_version !== CHANGE_STATUS_SCHEMA_VERSION ||
    changeTemplate.artifact !== "change-status" ||
    !Array.isArray(changeTemplate.worktrees)
  ) {
    errors.push("change-status-template.json must define the SpecDev change-status v6 seed");
  }

  const changeSchema = JSON.parse(readText(changeSchemaPath));
  const worktreeRequired = new Set(changeSchema.$defs?.worktree?.required ?? []);
  const integrationRequired = new Set(changeSchema.$defs?.integration?.required ?? []);
  if (
    changeSchema.$id !== "urn:speculo:specdev:change-status:v6" ||
    !["implementation_owner", "integration_owner", "source_checkpoint", "integration"].every((key) => worktreeRequired.has(key)) ||
    !["parent_ref", "candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref", "full_suite", "e2e", "promotion_status"].every((key) => integrationRequired.has(key)) ||
    changeSchema.additionalProperties !== false
  ) {
    errors.push("change-status.schema.json must define the strict Ticket integration v6 contract");
  }

  const implementationMapSchema = JSON.parse(readText(implementationMapSchemaPath));
  if (
    implementationMapSchema.$id !== "urn:speculo:specdev:implementation-map:v1" ||
    implementationMapSchema.properties?.schema_version?.const !== IMPLEMENTATION_MAP_SCHEMA_VERSION ||
    implementationMapSchema.properties?.members?.minItems !== 2 ||
    implementationMapSchema.properties?.tasks?.minItems !== 1 ||
    implementationMapSchema.additionalProperties !== false
  ) {
    errors.push("implementation-map.schema.json must define the strict parent implementation graph contract v1");
  }
  const implementationPlanSchema = JSON.parse(readText(implementationPlanSchemaPath));
  if (
    implementationPlanSchema.$id !== "urn:speculo:specdev:implementation-plan:v1" ||
    implementationPlanSchema.properties?.schema_version?.const !== IMPLEMENTATION_PLAN_SCHEMA_VERSION ||
    implementationPlanSchema.properties?.orchestration?.const !== "lead-directed" ||
    implementationPlanSchema.properties?.implementation_agent_limit?.minimum !== 1 ||
    implementationPlanSchema.properties?.integration_attempt_limit?.minimum !== 1 ||
    !["current", "required"].every((value) => implementationPlanSchema.properties?.ticket_workspace_policy?.enum?.includes(value)) ||
    implementationPlanSchema.additionalProperties !== false
  ) {
    errors.push("implementation-plan.schema.json must define the strict parent implementation projection contract v1");
  }
  return errors;
}

function capabilityChecks(root) {
  const checks = new Map([
    [
      "init",
      [
        join(root, "I-init-setup", "I-init-setup.md"),
        [
          "tracking-template",
          "domain-layout-template",
          "config-template",
          "change-status-template",
          "specdev-worktree/",
        ],
      ],
    ],
    [
      "triage",
      [
        join(root, "T-triage", "T-triage.md"),
        ["source.md", "intake", "reconcile", "唯一权威", "远程写入为零"],
      ],
    ],
    [
      "spec",
      [
        join(root, "S-spec", "S-spec.md"),
        ["用户故事", "验收合同", "代码", "CONTEXT", "ADR", "验证接缝", "ready_for_tickets"],
      ],
    ],
    [
      "tickets",
      [
        join(root, "T-tickets", "T-tickets.md"),
        ["Prefactor", "垂直切片", "Expand", "与用户核对", "Definition of Ready"],
      ],
    ],
    [
      "goal-plan",
      [
        join(root, "P-goal-plan", "P-goal-plan.md"),
        [
          "Outcome",
          "权威来源",
          "DAG",
          "Gate",
          "Wave",
          "lead-directed",
          "implementation_agent_limit",
          "candidate-merge",
          "lead-orchestration.md",
          "Definition of Done",
        ],
      ],
    ],
    [
      "orchestrate-implementation",
      [
        join(root, "O-orchestrate-implementation", "O-orchestrate-implementation.md"),
        ["Ready Spec", "Ready Tickets", "Implementation Map", "Implementation Plan", "lead-directed", "implementation_agent_limit", "serialization", "I-implement"],
      ],
    ],
    [
      "implement",
      [
        join(root, "I-implement", "I-implement.md"),
        ["codebase-design", "design-it-twice", "TDD", "双轴审查", "Evidence", "parent-candidate", "subagent-delivery", "实现 commit"],
      ],
    ],
    [
      "code-review",
      [
        join(root, "C-code-review", "C-code-review.md"),
        ["git diff <fixed>...<head>", "固定点", "标准轴", "规范轴", "未合并排名", "reviews/CR-###.md"],
      ],
    ],
    [
      "prototype",
      [
        join(root, "P-prototype", "P-prototype.md"),
        ["设计定向", "风格", "design-system.md", "comparison", "HTML/CSS/JS", "design-library/INDEX.md"],
      ],
    ],
    [
      "wayfinder",
      [
        join(root, "W-wayfinder", "W-wayfinder.md"),
        ["共享地图", "claimed_investigations", "wayfinder:prototype", "wayfinder:grilling", "solution comment", "每个会话"],
      ],
    ],
    [
      "architecture-review",
      [
        join(root, "R-review-architecture", "R-review-architecture.md"),
        ["shallow", "interface", "locality", "Tailwind CDN", "Mermaid CDN", "最佳推荐"],
      ],
    ],
    [
      "archive",
      [
        join(root, "A-archive-and-consolidate", "A-archive-and-consolidate.md"),
        ["archive-single", "dry-run", "external_action", "consolidate-from-code", "archive-and-consolidate"],
      ],
    ],
    [
      "grill",
      [
        join(root, "G-grill-with-docs", "G-grill-with-docs.md"),
        ["完整 frontier", "design-tree.json", "LOG.md", "CONTEXT.md", "ADR.md", "推荐答案", "永久 namespace 对 G 只读"],
      ],
    ],
    [
      "diagnosis",
      [
        join(root, "D-diagnose-bugs", "D-diagnose-bugs.md"),
        ["红灯", "反馈回路", "最小化", "可证伪", "根因", "回归测试"],
      ],
    ],
  ]);

  const errors = [];
  for (const [ability, [path, markers]] of checks) {
    if (!isFile(path)) {
      errors.push(`capability '${ability}' has no entry file`);
      continue;
    }
    const text = readText(path);
    const missing = markers.filter((marker) => !text.includes(marker));
    if (missing.length) {
      errors.push(`capability '${ability}' lost markers: ${JSON.stringify(missing)}`);
    }
  }
  if (!isFile(join(root, "R-review-architecture", "architecture-review-report-template.html"))) {
    errors.push("architecture review lost its visual HTML report template");
  } else {
    const html = readText(join(root, "R-review-architecture", "architecture-review-report-template.html"));
    for (const marker of ["cdn.tailwindcss.com", "mermaid", "Before", "After", "top-recommendation"]) {
      if (!html.includes(marker)) errors.push(`architecture HTML template lost marker ${marker}`);
    }
  }

  for (const required of [
    "common/rules/codebase-design.md",
    "common/schemas/design-tree.schema.json",
    "common/schemas/wayfinder-ticket.schema.json",
    "G-grill-with-docs/design-tree-template.json",
    "W-wayfinder/local-tracker-contract.md",
    "W-wayfinder/solution-comment-template.md",
    "R-review-architecture/architecture-report-contract.md",
    "common/rules/parent-implementation-orchestration.md",
    "common/schemas/implementation-map.schema.json",
    "common/schemas/implementation-plan.schema.json",
    "O-orchestrate-implementation/input-readiness.md",
    "O-orchestrate-implementation/implementation-map-template.md",
    "O-orchestrate-implementation/implementation-plan-template.md",
    "O-orchestrate-implementation/implementation-evidence-template.md",
  ]) {
    if (!isFile(join(root, required))) errors.push(`missing architecture/wayfinding contract ${required}`);
  }

  const mapTemplate = join(root, "W-wayfinder", "wayfinder-map-template.md");
  if (isFile(mapTemplate) && /^## (?:开放 Tickets|调查清单)/m.test(readText(mapTemplate))) {
    errors.push("Wayfinder map template must query open Tickets instead of caching them");
  }

  const goalPlanTemplate = join(root, "P-goal-plan", "goal-plan-template.md");
  if (!isFile(goalPlanTemplate)) {
    errors.push("missing Goal Plan template");
  } else {
    const text = readText(goalPlanTemplate);
    for (const required of [
      "schema_version: 6",
      "orchestration: lead-directed",
      "implementation_agent_limit: 3",
      "integration_attempt_limit: 3",
      "ticket_workspace_policy: current",
      "integration_gate: direct-parent",
      ...REQUIRED_LEAD_GOAL_PLAN_MARKERS,
      "Local direct-parent verification and parent update",
    ]) {
      if (!text.includes(required)) errors.push(`Goal Plan template lost marker ${required}`);
    }
  }
  for (const obsolete of [
    "P-goal-plan/delegated-execution.md",
    "P-goal-plan/delegated-execution-template.md",
    "P-goal-plan/workspace-execution-template.md",
    "I-implement/delegated-evidence-template.md",
  ]) {
    if (isFile(join(root, obsolete))) errors.push(`obsolete topology asset must be removed: ${obsolete}`);
  }
  return errors;
}

function selfCheck(root) {
  const errors = [];
  const warnings = [];

  if (!isFile(join(root, "INDEX.md"))) errors.push("missing package INDEX");

  const actualWorks = new Set(
    readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[A-Z]-/.test(entry.name))
      .map((entry) => entry.name),
  );
  const missingWorks = [...EXPECTED_WORKS].filter((name) => !actualWorks.has(name));
  const extraWorks = [...actualWorks].filter((name) => !EXPECTED_WORKS.has(name));
  if (missingWorks.length) errors.push(`missing workflow directories: ${JSON.stringify(missingWorks.sort())}`);
  if (extraWorks.length) warnings.push(`unexpected workflow directories: ${JSON.stringify(extraWorks.sort())}`);

  const ids = [];
  for (const directoryName of [...actualWorks].sort()) {
    const entry = join(root, directoryName, `${directoryName}.md`);
    if (!isFile(entry)) {
      errors.push(`missing work entry ${toPosix(relative(root, entry))}`);
      continue;
    }
    const { meta } = parseFrontmatter(entry);
    if (meta.type !== "workflow-entry") {
      errors.push(`${toPosix(relative(root, entry))}: type must be workflow-entry`);
    }
    if (meta.workflow !== "specdev") {
      errors.push(`${toPosix(relative(root, entry))}: workflow must be specdev`);
    }
    if (typeof meta.id !== "string" || !meta.id.startsWith("specdev/")) {
      errors.push(`${toPosix(relative(root, entry))}: invalid work id`);
    } else {
      ids.push(meta.id);
    }
  }
  if (ids.length !== new Set(ids).size) errors.push("duplicate workflow entry id");

  const common = join(root, "common");
  if (!isDirectory(common)) {
    errors.push("missing common directory");
  } else {
    const actualCommon = new Set(
      readdirSync(common, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
    const missingCommon = [...EXPECTED_COMMON_DIRS].filter((name) => !actualCommon.has(name));
    if (missingCommon.length) {
      errors.push(`missing common subdirectories: ${JSON.stringify(missingCommon.sort())}`);
    }
    for (const forbidden of ["schemas", "tools", "skills"]) {
      if (existsSync(join(root, forbidden))) {
        errors.push(`${forbidden}/ must live under common/`);
      }
    }
    const flatRuleFiles = readdirSync(common, { withFileTypes: true })
      .filter((entry) => entry.isFile() && extname(entry.name) === ".md" && entry.name !== "README.md")
      .map((entry) => entry.name);
    if (flatRuleFiles.length) {
      errors.push(`common rule files must live under common/rules/: ${JSON.stringify(flatRuleFiles)}`);
    }
  }

  errors.push(...validateJsonFiles(root));
  errors.push(...validateGlobalStatusAssets(root));
  errors.push(...validateExecutionContractAssets(root));
  const references = validateDocumentReferences(root);
  errors.push(...references.errors);
  warnings.push(...references.warnings);
  errors.push(...capabilityChecks(root));

  const obsolete = [
    "P-goal-plan/input-validation.md",
    "P-goal-plan/vision-sections.md",
    "P-goal-plan/execution-sections.md",
    "P-goal-plan/governance-sections.md",
    "P-goal-plan/lead-orchestration-protocol.md",
    "P-goal-plan/quick-reference-table.md",
    "P-goal-plan/delegated-execution.md",
    "P-goal-plan/delegated-execution-template.md",
    "P-goal-plan/workspace-execution-template.md",
    "I-implement/delegated-evidence-template.md",
    "schemas",
    "tools",
    "skills",
  ];
  for (const item of obsolete.sort()) {
    if (existsSync(join(root, item))) errors.push(`obsolete package location still exists: ${item}`);
  }
  return { errors, warnings };
}

function requireList(meta, key, label, errors) {
  const value = meta[key];
  if (!Array.isArray(value)) {
    errors.push(`${label}: ${key} must be a list`);
    return [];
  }
  return value;
}

function validatePathList(values, label, key, errors) {
  for (const value of values) {
    if (typeof value !== "string") {
      errors.push(`${label}: ${key} entries must be strings`);
      continue;
    }
    const inner = stripPathTag(value);
    if (inner === null) {
      errors.push(`${label}: ${key} entry must use <Path>...</Path>: ${JSON.stringify(value)}`);
      continue;
    }
    const issue = validatePathValue(inner);
    if (issue) errors.push(`${label}: invalid ${key} Path ${JSON.stringify(value)}: ${issue}`);
  }
}

function validateSource(path, expectedChange, errors) {
  if (!isFile(path)) {
    errors.push("missing source artifact");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  const required = [
    "schema_version",
    "artifact",
    "change",
    "source_type",
    "canonical_locator",
    "captured_at",
    "content_sha256",
    "remote_state",
    "close_capability",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`source.md: missing keys ${JSON.stringify(missing)}`);
  if (meta.schema_version !== 1 || meta.artifact !== "source") {
    errors.push("source.md: artifact/schema_version must be source/1");
  }
  if (meta.change !== expectedChange) errors.push("source.md: change must equal directory name");
  if (!new Set(["conversation", "pasted", "local-file", "url", "github-issue", "github-pr"]).has(meta.source_type)) {
    errors.push(`source.md: invalid source_type ${meta.source_type}`);
  }
  if (!/^[a-f0-9]{64}$/.test(String(meta.content_sha256 ?? ""))) {
    errors.push("source.md: content_sha256 must be a SHA-256 digest");
  }
  if (!new Set(["open", "closed", "unknown", "not-applicable"]).has(meta.remote_state)) {
    errors.push(`source.md: invalid remote_state ${meta.remote_state}`);
  }
  if (!new Set(["supported", "unsupported", "not-applicable"]).has(meta.close_capability)) {
    errors.push(`source.md: invalid close_capability ${meta.close_capability}`);
  }
  if (typeof meta.canonical_locator === "string" && ABSOLUTE_MACHINE_PATH_RE.test(meta.canonical_locator)) {
    errors.push("source.md: canonical_locator must not be a machine absolute path");
  }
  for (const heading of ["## Capture Metadata", "## Original Content", "## Source Comments"]) {
    if (!body.includes(heading)) errors.push(`source.md: missing '${heading}'`);
  }
  return { path, meta, body };
}

function validateTriage(path, expectedChange, errors) {
  if (!isFile(path)) {
    errors.push("missing triage artifact");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  const required = [
    "schema_version",
    "artifact",
    "change",
    "mode",
    "source",
    "classification",
    "risk",
    "route",
    "ready_for_implementation",
    "external_action",
    "updated_at",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`triage.md: missing keys ${JSON.stringify(missing)}`);
  if (meta.schema_version !== 1 || meta.artifact !== "triage") {
    errors.push("triage.md: artifact/schema_version must be triage/1");
  }
  if (meta.change !== expectedChange) errors.push("triage.md: change must equal directory name");
  if (!new Set(["intake", "reconcile"]).has(meta.mode)) errors.push(`triage.md: invalid mode ${meta.mode}`);
  if (!VALID_RISK.has(meta.risk)) errors.push(`triage.md: invalid risk ${meta.risk}`);
  if (typeof meta.route !== "string" || !meta.route.startsWith("specdev/")) {
    errors.push("triage.md: route must be a specdev work id");
  }
  if (typeof meta.ready_for_implementation !== "boolean") {
    errors.push("triage.md: ready_for_implementation must be boolean");
  }
  if (!new Set(["not-applicable", "pending-close", "closed", "close-failed", "waived"]).has(meta.external_action)) {
    errors.push(`triage.md: invalid external_action ${meta.external_action}`);
  }
  if (!String(meta.source ?? "").includes("/source.md</Path>")) {
    errors.push("triage.md: source must reference the local source.md artifact");
  }
  for (const heading of ["## 当前判定", "## 未知项", "## 路由", "## 外部动作"]) {
    if (!body.includes(heading)) errors.push(`triage.md: missing '${heading}'`);
  }
  return { path, meta, body };
}

function validateDiagnosis(path, expectedChange, errors) {
  if (!isFile(path)) {
    errors.push("missing diagnosis artifact");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  if (meta.schema_version !== 1 || meta.artifact !== "diagnosis") {
    errors.push("diagnosis.md: artifact/schema_version must be diagnosis/1");
  }
  if (meta.change !== expectedChange) errors.push("diagnosis.md: change must equal directory name");
  if (!new Set(["reproducing", "minimizing", "testing-hypotheses", "root-cause-confirmed", "blocked"]).has(meta.status)) {
    errors.push(`diagnosis.md: invalid status ${meta.status}`);
  }
  if (typeof meta.feedback_loop_ready !== "boolean") {
    errors.push("diagnosis.md: feedback_loop_ready must be boolean");
  }
  if (meta.feedback_loop_ready) {
    if (!String(meta.red_command ?? "").trim() || !String(meta.red_evidence ?? "").trim()) {
      errors.push("diagnosis.md: ready feedback loop requires red_command and red_evidence");
    }
  } else {
    const hypotheses = sectionBody(body, "## 4. 假设与证伪");
    const dataRows = hypotheses
      .split(/\r?\n/)
      .filter((line) => /^\|/.test(line.trim()))
      .filter((line) => !/^\|\s*(?:排名|-)/.test(line.trim()));
    if (dataRows.length) errors.push("diagnosis.md: hypotheses must be empty before red evidence");
  }
  if (!new Set(["pending", "clean", "registered"]).has(meta.cleanup_status)) {
    errors.push(`diagnosis.md: invalid cleanup_status ${meta.cleanup_status}`);
  }
  for (const heading of ["## 2. 红灯反馈回路", "## 3. 最小复现", "## 4. 假设与证伪", "## 5. 已确认根因", "## 6. 修复契约", "## 7. 清理"]) {
    if (!body.includes(heading)) errors.push(`diagnosis.md: missing '${heading}'`);
  }
  return { path, meta, body };
}

function validateReviews(change, required, errors) {
  const root = join(change, "reviews");
  const paths = isDirectory(root)
    ? readdirSync(root).filter((name) => /^CR-\d{3,}\.md$/.test(name)).sort().map((name) => join(root, name))
    : [];
  if (required && !paths.length) errors.push("review stage requires a CR-###.md report");
  for (const path of paths) {
    const { meta, body } = parseFrontmatter(path);
    if (meta.schema_version !== 1 || meta.artifact !== "code-review") {
      errors.push(`${basename(path)}: artifact/schema_version must be code-review/1`);
    }
    if (meta.change !== basename(change)) errors.push(`${basename(path)}: change must equal directory name`);
    if (!/^CR-\d{3,}$/.test(String(meta.review_id ?? ""))) errors.push(`${basename(path)}: invalid review_id`);
    if (!/^[a-f0-9]{7,40}$/i.test(String(meta.fixed_point ?? "")) || !/^[a-f0-9]{7,40}$/i.test(String(meta.head ?? ""))) {
      errors.push(`${basename(path)}: fixed_point and head must be commit SHAs`);
    }
    if (meta.fixed_point === meta.head) errors.push(`${basename(path)}: fixed_point and head must differ`);
    if (!new Set(["approved", "request-changes", "blocked"]).has(meta.status)) errors.push(`${basename(path)}: invalid status`);
    if (!new Set(["pass", "request-changes", "skipped"]).has(meta.standards_result)) errors.push(`${basename(path)}: invalid standards_result`);
    if (!new Set(["pass", "request-changes", "skipped"]).has(meta.specification_result)) errors.push(`${basename(path)}: invalid specification_result`);
    for (const heading of ["## Fixed Input", "## 标准", "## 规范", "## Summary"]) {
      if (!body.includes(heading)) errors.push(`${basename(path)}: missing '${heading}'`);
    }
  }
  return paths;
}

function validatePrototypes(change, required, errors) {
  const root = join(change, "prototypes");
  if (!isDirectory(root)) {
    if (required) errors.push("prototype stage requires a prototypes/UI-NNN/design-system.md artifact");
    return [];
  }

  const validator = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "P-prototype",
    "tools",
    "validate-design-package.mjs",
  );
  const paths = [];
  let readyCount = 0;

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    const label = toPosix(relative(change, entryPath));
    if (entry.isSymbolicLink()) {
      errors.push(`${label}: prototype design directories and files must not be symlinks`);
      continue;
    }
    if (!entry.isDirectory()) {
      errors.push(`${label}: prototypes may only contain UI-NNN design directories`);
      continue;
    }
    if (!/^UI-\d{3,}$/.test(entry.name)) {
      errors.push(`${label}: prototype design directory must use UI-NNN`);
      continue;
    }

    const designPath = join(entryPath, "design-system.md");
    if (!isFile(designPath)) {
      errors.push(`${label}: missing design-system.md`);
      continue;
    }
    paths.push(designPath);
    const { meta } = parseFrontmatter(designPath);
    if (meta.status === "ready") readyCount += 1;
    try {
      execFileSync(process.execPath, [validator, designPath], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const details = String(error.stderr || error.stdout || error.message)
        .trim()
        .split(/\r?\n/)
        .filter(Boolean);
      if (!details.length) errors.push(`${label}: design package validation failed`);
      for (const detail of details) errors.push(`${label}: ${detail}`);
    }
  }

  const obsoleteRecords = walk(root).filter(
    (path) => isFile(path) && basename(path) === "record.md",
  );
  for (const path of obsoleteRecords) {
    errors.push(`${toPosix(relative(change, path))}: obsolete prototype record is forbidden; use UI-NNN/design-system.md`);
  }
  const discoveredDesigns = walk(root).filter(
    (path) => isFile(path) && basename(path) === "design-system.md",
  );
  for (const path of discoveredDesigns) {
    if (!paths.includes(path)) {
      errors.push(`${toPosix(relative(change, path))}: design-system.md must be directly under prototypes/UI-NNN`);
    }
  }
  if (required && readyCount === 0) {
    errors.push("prototype stage requires at least one ready UI design package");
  }
  return paths;
}

function validateSpec(path, errors, warnings) {
  if (!isFile(path)) {
    warnings.push("Spec is missing; contract traceability cannot be fully checked");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  const label = basename(path);
  if (meta.artifact !== "spec" || meta.schema_version !== DOMAIN_SCHEMA_VERSION) {
    errors.push(`${label}: artifact/schema_version must be spec/${DOMAIN_SCHEMA_VERSION}`);
  }
  const sources = requireList(meta, "sources", label, errors);
  if (!sources.length) errors.push(`${label}: sources must contain at least one source`);
  if (meta.ready_for_tickets === true) {
    const unresolved = sectionBody(body, "### 未决问题");
    if (unresolved && !/^无[。.]?$/.test(unresolved.trim())) {
      errors.push(`${label}: ready Spec has unresolved high-impact questions`);
    }
    for (const heading of [
      "## 1. 问题与目标",
      "## 2. 解决方案与外部行为",
      "## 4. 验收合同",
      "## 5. 范围",
      "## 9. 验证策略",
    ]) {
      if (!body.includes(heading)) errors.push(`${label}: ready Spec missing '${heading}'`);
    }
  }
  return { path, meta, body };
}

function validateMap(path, errors) {
  if (!isFile(path)) {
    errors.push("missing Tickets Map");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  if (meta.artifact !== "tickets-map" || meta.schema_version !== DOMAIN_SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be tickets-map/${DOMAIN_SCHEMA_VERSION}`);
  }
  for (const heading of [
    "## 2. 执行清单",
    "## 3. 依赖 DAG",
    "## 4. 合同覆盖矩阵",
    "## 5. 并行与路径所有权",
  ]) {
    if (!body.includes(heading)) errors.push(`${basename(path)}: missing '${heading}'`);
  }
  return { path, meta, body };
}

function validateGoalPlan(path, errors) {
  if (!isFile(path)) return null;
  const { meta, body } = parseFrontmatter(path);
  const required = [
    "schema_version",
    "artifact",
    "change",
    "status",
    "modes",
    "orchestration",
      "lead",
      "implementation_agent_limit",
      "integration_attempt_limit",
    "ticket_workspace_policy",
    "integration_gate",
    "ready_for_execution",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`${basename(path)}: missing keys ${JSON.stringify(missing.sort())}`);
  const unexpected = Object.keys(meta).filter((key) => !required.includes(key));
  if (unexpected.length) errors.push(`${basename(path)}: unexpected keys ${JSON.stringify(unexpected.sort())}`);
  if (meta.artifact !== "goal-plan" || meta.schema_version !== GOAL_PLAN_SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be goal-plan/${GOAL_PLAN_SCHEMA_VERSION}`);
  }
  const modes = requireList(meta, "modes", basename(path), errors);
  const invalidModes = modes.filter((mode) => !VALID_PLAN_MODES.has(mode));
  if (invalidModes.length) {
    errors.push(`${basename(path)}: invalid modes ${JSON.stringify(invalidModes)}`);
  }
  if (meta.orchestration !== "lead-directed") {
    errors.push(`${basename(path)}: orchestration must be lead-directed`);
  }
  if (typeof meta.lead !== "string" || !meta.lead.trim()) {
    errors.push(`${basename(path)}: lead must be a non-empty recoverable locator`);
  }
  if (!Number.isInteger(meta.implementation_agent_limit) || meta.implementation_agent_limit < 1) {
    errors.push(`${basename(path)}: implementation_agent_limit must be a positive integer`);
  }
  if (!Number.isInteger(meta.integration_attempt_limit) || meta.integration_attempt_limit < 1) {
    errors.push(`${basename(path)}: integration_attempt_limit must be a positive integer`);
  }
  if (!new Set(["current", "required"]).has(meta.ticket_workspace_policy)) {
    errors.push(`${basename(path)}: ticket_workspace_policy must be current or required`);
  }
  if (!new Set(["direct-parent", "candidate-merge"]).has(meta.integration_gate)) {
    errors.push(`${basename(path)}: integration_gate must be direct-parent or candidate-merge`);
  }
  if (
    (meta.ticket_workspace_policy === "current" && meta.integration_gate !== "direct-parent") ||
    (meta.ticket_workspace_policy === "required" && meta.integration_gate !== "candidate-merge")
  ) {
    errors.push(`${basename(path)}: ticket_workspace_policy and integration_gate must use current/direct-parent or required/candidate-merge`);
  }
  for (const obsolete of ["coordination_mode", "workspace_strategy", "terminal_action"]) {
    if (obsolete in meta) errors.push(`${basename(path)}: obsolete Goal Plan field ${obsolete} is not allowed`);
  }
  for (const obsolete of ["## Delegated Execution Addendum", "## Isolated Workspace Addendum"]) {
    if (body.includes(obsolete)) errors.push(`${basename(path)}: obsolete Goal Plan addendum '${obsolete}' is not allowed`);
  }
  const validReadyStates = new Set(["ready", "in_progress"]);
  const validNotReadyStates = new Set(["draft", "blocked", "completed"]);
  if (
    (meta.ready_for_execution === true && !validReadyStates.has(meta.status)) ||
    (meta.ready_for_execution === false && !validNotReadyStates.has(meta.status))
  ) {
    errors.push(`${basename(path)}: ready_for_execution must match status`);
  }
  if (meta.ready_for_execution === true) {
    for (const heading of REQUIRED_GOAL_PLAN_SECTIONS) {
      if (!body.includes(heading)) {
        errors.push(`${basename(path)}: ready Goal Plan missing '${heading}'`);
      }
    }
    const requiredMarkers = meta.ticket_workspace_policy === "current"
      ? [...REQUIRED_LEAD_GOAL_PLAN_MARKERS, "Local direct-parent verification and parent update"]
      : [...REQUIRED_LEAD_GOAL_PLAN_MARKERS, "source worktree 不运行 E2E", "Local candidate integration and parent update"];
    const missingLeadMarkers = requiredMarkers.filter((marker) => !body.includes(marker));
    if (missingLeadMarkers.length) {
      errors.push(`${basename(path)}: ready Goal Plan missing Lead/workspace markers ${JSON.stringify(missingLeadMarkers)}`);
    }
    const assumptions = sectionBody(body, "## Assumptions");
    if (assumptions && assumptions.includes("高影响") && !assumptions.includes("必须为 `false`")) {
      errors.push(`${basename(path)}: high-impact assumptions cannot remain in a ready Goal Plan`);
    }
  }
  return { path, meta, body };
}

function validateGoalPlanRuntimeLimits(path, change, goalPlan, errors) {
  if (!goalPlan) return;
  const config = findSpecdevConfig(change);
  if (!config) {
    errors.push(`${basename(path)}: SpecDev config.json is required to validate execution limits`);
    return;
  }
  const configuredAgents = positiveConfigLimit(config, "max_implementation_agents", 0);
  const configuredAttempts = positiveConfigLimit(config, "max_integration_attempts", 0);
  if (config.schema_version !== CONFIG_SCHEMA_VERSION || configuredAgents === 0 || configuredAttempts === 0) {
    errors.push(`${basename(path)}: SpecDev config.json must use schema v${CONFIG_SCHEMA_VERSION} with positive execution limits`);
    return;
  }
  if (goalPlan.meta.implementation_agent_limit > configuredAgents) {
    errors.push(`${basename(path)}: implementation_agent_limit ${goalPlan.meta.implementation_agent_limit} exceeds config max_implementation_agents ${configuredAgents}`);
  }
  if (goalPlan.meta.integration_attempt_limit > configuredAttempts) {
    errors.push(`${basename(path)}: integration_attempt_limit ${goalPlan.meta.integration_attempt_limit} exceeds config max_integration_attempts ${configuredAttempts}`);
  }
}

function validateDesignTree(path, change, errors) {
  if (!isFile(path)) return null;
  let data;
  try {
    data = JSON.parse(readText(path));
  } catch (error) {
    errors.push(`${basename(path)}: invalid JSON: ${error.message}`);
    return null;
  }

  if (data.schema_version !== 1 || data.artifact !== "design-tree") {
    errors.push(`${basename(path)}: artifact/schema_version must be design-tree/1`);
  }
  if (data.change !== basename(change)) {
    errors.push(`${basename(path)}: change must equal directory name ${basename(change)}`);
  }
  if (!VALID_DESIGN_TREE_STATUS.has(data.status)) {
    errors.push(`${basename(path)}: invalid status ${data.status}`);
  }
  if (!Number.isInteger(data.round) || data.round < 0) {
    errors.push(`${basename(path)}: round must be a non-negative integer`);
  }
  if (!Array.isArray(data.nodes)) {
    errors.push(`${basename(path)}: nodes must be a list`);
    return data;
  }

  const nodes = new Map();
  const graph = new Map();
  for (const node of data.nodes) {
    const id = String(node?.id ?? "");
    if (!/^D-\d{3,}$/.test(id)) errors.push(`${basename(path)}: invalid design node id ${id}`);
    if (nodes.has(id)) errors.push(`${basename(path)}: duplicate design node id ${id}`);
    nodes.set(id, node);
    const dependencies = Array.isArray(node?.depends_on) ? node.depends_on.map(String) : [];
    graph.set(id, dependencies);
    if (!Array.isArray(node?.depends_on)) {
      errors.push(`${basename(path)}: ${id} depends_on must be a list`);
    }
    for (const key of ["title", "question", "recommendation"]) {
      if (!String(node?.[key] ?? "").trim()) errors.push(`${basename(path)}: ${id} ${key} is required`);
    }
    if (!VALID_DESIGN_NODE_STATUS.has(node?.status)) {
      errors.push(`${basename(path)}: ${id} has invalid status ${node?.status}`);
    }
    if (node?.round !== null && (!Number.isInteger(node?.round) || node.round < 1)) {
      errors.push(`${basename(path)}: ${id} round must be null or a positive integer`);
    }
    if (node?.status !== "open") {
      if (!String(node?.answer ?? "").trim()) errors.push(`${basename(path)}: ${id} closed node needs an answer`);
      if (!/^LOG-\d{3,}$/.test(String(node?.log_ref ?? ""))) {
        errors.push(`${basename(path)}: ${id} closed node needs a LOG-### reference`);
      }
    }
  }

  for (const [id, dependencies] of graph) {
    for (const dependency of dependencies) {
      if (!nodes.has(dependency)) errors.push(`${basename(path)}: ${id} depends on missing ${dependency}`);
      if (dependency === id) errors.push(`${basename(path)}: ${id} cannot depend on itself`);
    }
  }
  const cycle = findCycle(graph);
  if (cycle) errors.push(`Design tree dependency cycle: ${cycle.join(" -> ")}`);
  if (
    data.status === "consensus" &&
    data.nodes.some((node) => new Set(["open", "deferred"]).has(node?.status))
  ) {
    errors.push(`${basename(path)}: consensus design tree cannot contain open or deferred nodes`);
  }

  const logPath = join(change, "LOG.md");
  const logText = isFile(logPath) ? readText(logPath) : "";
  for (const node of data.nodes) {
    if (node?.log_ref && !logText.includes(String(node.log_ref))) {
      errors.push(`${basename(path)}: ${node.id} points to missing ${node.log_ref} in LOG`);
    }
  }
  return data;
}

function validateWayfinder(change, errors) {
  const mapPath = join(change, "wayfinder-map.md");
  const investigationDir = join(change, "investigation");
  if (!isFile(mapPath) && !isDirectory(investigationDir)) return null;
  if (!isFile(mapPath)) errors.push("Wayfinder investigations exist but the map is missing");
  if (!isDirectory(investigationDir)) {
    errors.push("Wayfinder map exists but the investigation directory is missing");
    return null;
  }

  if (isFile(mapPath)) {
    const { meta } = parseFrontmatter(mapPath);
    if (meta.artifact !== "wayfinder-map") errors.push("wayfinder-map.md: artifact must be wayfinder-map");
    if (meta.change !== basename(change)) {
      errors.push(`wayfinder-map.md: change must equal directory name ${basename(change)}`);
    }
  }

  const ticketPaths = readdirSync(investigationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(investigationDir, entry.name))
    .sort();
  const tickets = new Map();
  const graph = new Map();
  for (const path of ticketPaths) {
    const { meta } = parseFrontmatter(path);
    const id = String(meta.id ?? "");
    if (meta.artifact !== "wayfinder-ticket") {
      errors.push(`${basename(path)}: artifact must be wayfinder-ticket`);
    }
    if (!/^INV-\d{2,}$/.test(id)) errors.push(`${basename(path)}: invalid Wayfinder Ticket id ${id}`);
    if (tickets.has(id)) errors.push(`duplicate Wayfinder Ticket id ${id}`);
    tickets.set(id, { path, meta });
    if (!basename(path).startsWith(id)) errors.push(`${basename(path)}: filename must start with ${id}`);
    if (!String(meta.name ?? "").trim()) errors.push(`${basename(path)}: name is required`);
    const parentMap = typeof meta.parent_map === "string" ? stripPathTag(meta.parent_map) : null;
    if (parentMap === null || !parentMap.endsWith("/wayfinder-map.md")) {
      errors.push(`${basename(path)}: parent_map must be a rooted Wayfinder map Path`);
    }
    if (!VALID_WAYFINDER_LABEL.has(meta.label)) {
      errors.push(`${basename(path)}: invalid Wayfinder label ${meta.label}`);
    }
    if (!VALID_WAYFINDER_STATUS.has(meta.status)) {
      errors.push(`${basename(path)}: invalid Wayfinder status ${meta.status}`);
    }
    const dependencies = Array.isArray(meta.blocked_by) ? meta.blocked_by.map(String) : [];
    if (!Array.isArray(meta.blocked_by)) errors.push(`${basename(path)}: blocked_by must be a list`);
    graph.set(id, dependencies);
    if (!VALID_WAYFINDER_RESOLUTION.has(meta.resolution)) {
      errors.push(`${basename(path)}: invalid Wayfinder resolution ${meta.resolution}`);
    }
    if (meta.status === "open" && meta.resolution !== null) {
      errors.push(`${basename(path)}: open Wayfinder Ticket must have resolution: null`);
    }
    if (meta.status === "closed" && meta.resolution === null) {
      errors.push(`${basename(path)}: closed Wayfinder Ticket needs a resolution`);
    }
  }

  for (const [id, dependencies] of graph) {
    for (const dependency of dependencies) {
      if (!tickets.has(dependency)) errors.push(`${id}: blocked_by references missing ${dependency}`);
      if (dependency === id) errors.push(`${id}: Wayfinder Ticket cannot block itself`);
    }
  }
  const cycle = findCycle(graph);
  if (cycle) errors.push(`Wayfinder dependency cycle: ${cycle.join(" -> ")}`);

  const commentsRoot = join(investigationDir, "comments");
  for (const [id, ticket] of tickets) {
    if (ticket.meta.status !== "closed") continue;
    const commentDir = join(commentsRoot, id);
    const comments = isDirectory(commentDir)
      ? readdirSync(commentDir).filter((name) => /^\d{2,}-solution\.md$/.test(name)).sort()
      : [];
    if (!comments.length) {
      errors.push(`${id}: closed Wayfinder Ticket has no solution comment`);
      continue;
    }
    for (const name of comments) {
      const { meta } = parseFrontmatter(join(commentDir, name));
      if (meta.artifact !== "wayfinder-solution-comment" || meta.ticket !== id) {
        errors.push(`${toPosix(relative(change, join(commentDir, name)))}: invalid solution comment identity`);
      }
    }
  }
  return tickets;
}

function validateTicket(path, errors) {
  const { meta, body } = parseFrontmatter(path);
  const missing = [...REQUIRED_TICKET_KEYS].filter((key) => !(key in meta));
  if (missing.length) {
    errors.push(`${basename(path)}: missing frontmatter keys ${JSON.stringify(missing.sort())}`);
    return null;
  }
  if (meta.artifact !== "ticket" || meta.schema_version !== DOMAIN_SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be ticket/${DOMAIN_SCHEMA_VERSION}`);
  }
  const ticketId = String(meta.id);
  if (!/^T-\d{2,}$/.test(ticketId)) errors.push(`${basename(path)}: invalid Ticket id ${ticketId}`);
  if (!VALID_TICKET_STATUS.has(meta.status)) errors.push(`${basename(path)}: invalid status ${meta.status}`);
  if (!VALID_DEPTH.has(meta.planning_depth)) {
    errors.push(`${basename(path)}: invalid planning_depth ${meta.planning_depth}`);
  }
  if (!VALID_RISK.has(meta.risk)) errors.push(`${basename(path)}: invalid risk ${meta.risk}`);
  if (!String(meta.planning_depth_reason ?? "").trim()) {
    errors.push(`${basename(path)}: planning_depth_reason is required`);
  }

  const listKeys = [
    "blocked_by",
    "contract_ids",
    "expected_changes",
    "writable_paths",
    "read_only_paths",
    "shared_paths",
    "shared_path_owners",
  ];
  const lists = Object.fromEntries(
    listKeys.map((key) => [key, requireList(meta, key, basename(path), errors)]),
  );
  for (const key of ["expected_changes", "writable_paths", "read_only_paths", "shared_paths"]) {
    validatePathList(lists[key], basename(path), key, errors);
  }

  const sharedPaths = lists.shared_paths.map(String);
  const ownerEntries = lists.shared_path_owners.map(String);
  for (const sharedPath of sharedPaths) {
    if (!ownerEntries.some((entry) => entry.includes(sharedPath) && entry.includes("=>"))) {
      errors.push(
        `${basename(path)}: shared Path ${sharedPath} needs an entry '<Path>...</Path> => owner' in shared_path_owners`,
      );
    }
  }
  if (ownerEntries.length && !sharedPaths.length) {
    errors.push(`${basename(path)}: shared_path_owners is non-empty while shared_paths is empty`);
  }

  if (meta.ready === true) {
    if (!new Set(["ready", "in_progress", "review", "done"]).has(meta.status)) {
      errors.push(`${basename(path)}: ready=true conflicts with status=${meta.status}`);
    }
    for (const heading of REQUIRED_READY_TICKET_SECTIONS) {
      if (!body.includes(heading)) errors.push(`${basename(path)}: Ready Ticket missing '${heading}'`);
    }
    const unresolved = sectionBody(body, "### 未决问题");
    if (unresolved && !/^无[。.]?$/.test(unresolved.trim())) {
      errors.push(`${basename(path)}: Ready Ticket has unresolved questions`);
    }
    if (!lists.writable_paths.length) errors.push(`${basename(path)}: Ready implementation Ticket requires writable_paths`);
    if (new Set(["standard", "deep"]).has(meta.planning_depth)) {
      for (const heading of ["## 5. 实现契约", "## 6. 执行路线"]) {
        if (!body.includes(heading)) {
          errors.push(`${basename(path)}: ${meta.planning_depth} Ticket missing '${heading}'`);
        }
      }
    }
    if (meta.planning_depth === "deep" && !body.includes("## 9. 发布、迁移与恢复")) {
      errors.push(`${basename(path)}: Deep Ticket missing release/migration/recovery`);
    }
    const verification = sectionBody(body, "## 8. 验证矩阵");
    if (!verification || !verification.includes("|")) {
      errors.push(`${basename(path)}: Ready Ticket has no usable verification matrix`);
    }
    if (!verification.includes("E2E disposition") || !/(current-workspace|source-worktree|parent-candidate|direct-parent)/.test(verification)) {
      errors.push(`${basename(path)}: Ready Ticket must define E2E disposition and an explicit execution environment`);
    }
    const acceptance = sectionBody(body, "## 10. 验收标准").toLowerCase();
    if (!acceptance.includes("- [ ]") && !acceptance.includes("- [x]")) {
      errors.push(`${basename(path)}: Ready Ticket has no acceptance checklist`);
    }
  }
  return { path, meta, body };
}

function validateChangeStatus(path, expectedChange, errors) {
  if (!isFile(path)) {
    errors.push("missing change status artifact");
    return null;
  }
  let data;
  try {
    data = JSON.parse(readText(path));
  } catch (error) {
    errors.push(`${basename(path)}: invalid JSON: ${error.message}`);
    return null;
  }
  const required = [
    "schema_version",
    "artifact",
    "change",
    "change_status",
    "current_work",
    "works_run",
    "claimed_investigations",
    "execution_authorization",
    "leadership",
    "created_at",
    "updated_at",
    "completed_at",
    "archived",
    "archive_path",
    "blockers",
    "deviations",
    "worktrees",
  ];
  const missing = required.filter((key) => !(key in data));
  if (missing.length) errors.push(`${basename(path)}: missing keys ${JSON.stringify(missing.sort())}`);
  const unexpected = Object.keys(data).filter((key) => !required.includes(key));
  if (unexpected.length) errors.push(`${basename(path)}: unexpected keys ${JSON.stringify(unexpected.sort())}`);
  if (data.schema_version !== CHANGE_STATUS_SCHEMA_VERSION || data.artifact !== "change-status") {
    errors.push(`${basename(path)}: artifact/schema_version must be change-status/${CHANGE_STATUS_SCHEMA_VERSION}`);
  }
  if (data.change !== expectedChange) {
    errors.push(`${basename(path)}: change must equal directory name ${expectedChange}`);
  }
  if (!new Set(["active", "blocked", "completed", "archived"]).has(data.change_status)) {
    errors.push(`${basename(path)}: invalid change_status ${data.change_status}`);
  }
  if (!Array.isArray(data.blockers) || !Array.isArray(data.deviations) || !Array.isArray(data.worktrees)) {
    errors.push(`${basename(path)}: blockers, deviations, and worktrees must be arrays`);
  }
  const seenWorktreeTickets = new Set();
  for (const worktree of Array.isArray(data.worktrees) ? data.worktrees : []) {
    if (!worktree || typeof worktree !== "object" || Array.isArray(worktree)) {
      errors.push(`${basename(path)}: invalid worktree entry`);
      continue;
    }
    const requiredWorktreeKeys = [
      "ticket_id",
      "owner",
      "implementation_owner",
      "integration_owner",
      "provider",
      "base_sha",
      "parent_branch",
      "branch",
      "workspace_ref",
      "source_checkpoint",
      "integration",
      "status",
      "updated_at",
    ];
    const missingWorktreeKeys = requiredWorktreeKeys.filter((key) => !(key in worktree));
    if (missingWorktreeKeys.length) {
      errors.push(`${basename(path)}: worktree integration contract missing ${JSON.stringify(missingWorktreeKeys)}`);
      continue;
    }
    const unexpectedWorktreeKeys = Object.keys(worktree).filter((key) => !requiredWorktreeKeys.includes(key));
    if (unexpectedWorktreeKeys.length) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} has unexpected keys ${JSON.stringify(unexpectedWorktreeKeys.sort())}`);
    }
    if (!/^T-[0-9]{2,}$/.test(String(worktree.ticket_id))) {
      errors.push(`${basename(path)}: invalid worktree ticket_id ${worktree.ticket_id}`);
    } else if (seenWorktreeTickets.has(worktree.ticket_id)) {
      errors.push(`${basename(path)}: duplicate worktree for ${worktree.ticket_id}`);
    }
    seenWorktreeTickets.add(worktree.ticket_id);
    const ref = worktree.workspace_ref;
    if (
      typeof ref !== "string" ||
      ref.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(ref)
    ) {
      errors.push(`${basename(path)}: workspace_ref must be a portable non-absolute locator`);
      continue;
    }
    if (!VALID_WORKTREE_STATUS.has(worktree.status)) {
      errors.push(`${basename(path)}: invalid worktree status ${worktree.status}`);
    }
    const currentWorkspace = ref === "current";
    if (worktree.provider !== "git") {
      errors.push(`${basename(path)}: Ticket worktree ${worktree.ticket_id} provider must be git`);
    }
    const expectedRef = `specdev-worktree/${expectedChange}/${worktree.ticket_id}`;
    if (!currentWorkspace && ref !== expectedRef) {
      errors.push(`${basename(path)}: git workspace_ref must equal ${expectedRef}`);
    }

    if ("terminal_action" in worktree) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} obsolete terminal_action is not allowed`);
    }
    const requiredIntegrationKeys = [
      "owner",
      "implementation_owner",
      "integration_owner",
      "parent_branch",
      "source_checkpoint",
      "integration",
    ];
    const missingIntegrationKeys = requiredIntegrationKeys.filter((key) => !(key in worktree));
    if (missingIntegrationKeys.length) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration contract missing ${JSON.stringify(missingIntegrationKeys)}`);
      continue;
    }
    for (const key of ["owner", "implementation_owner", "integration_owner", "base_sha", "parent_branch", "branch", "updated_at"]) {
      if (typeof worktree[key] !== "string" || !worktree[key].trim()) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${key} is required`);
      }
    }
    if (typeof worktree.parent_branch !== "string" || !worktree.parent_branch.trim()) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} parent_branch is required`);
    } else if (currentWorkspace && worktree.parent_branch !== worktree.branch) {
      errors.push(`${basename(path)}: current workspace ${worktree.ticket_id} branch must equal parent_branch`);
    } else if (!currentWorkspace && worktree.parent_branch === worktree.branch) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} parent_branch must differ from branch`);
    }

    const sourceRequired = new Set(["review", "integrating", "integrated", "removed"]).has(worktree.status);
    if (sourceRequired && (typeof worktree.source_checkpoint !== "string" || !worktree.source_checkpoint.trim())) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${worktree.status} requires source_checkpoint`);
    } else if (
      worktree.source_checkpoint !== null &&
      (typeof worktree.source_checkpoint !== "string" || !worktree.source_checkpoint.trim())
    ) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} source_checkpoint must be null or non-empty`);
    }

    const integration = worktree.integration;
    if (!integration || typeof integration !== "object" || Array.isArray(integration)) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration must be an object`);
      continue;
    }
    const requiredResultKeys = [
      "status",
      "parent_ref",
      "parent_before_sha",
      "source_sha",
      "candidate_sha",
      "candidate_tree_sha",
      "candidate_branch",
      "candidate_workspace_ref",
      "result_sha",
      "method",
      "conflict_paths",
      "verification",
      "full_suite",
      "e2e",
      "evidence",
      "attempts",
      "promotion_status",
    ];
    const missingResultKeys = requiredResultKeys.filter((key) => !(key in integration));
    if (missingResultKeys.length) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration missing ${JSON.stringify(missingResultKeys)}`);
    }
    const unexpectedResultKeys = Object.keys(integration).filter((key) => !requiredResultKeys.includes(key));
    if (unexpectedResultKeys.length) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration has unexpected keys ${JSON.stringify(unexpectedResultKeys.sort())}`);
    }
    if (!VALID_INTEGRATION_STATUS.has(integration.status)) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} has invalid integration status ${integration.status}`);
    }
    if (!VALID_INTEGRATION_METHOD.has(integration.method)) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} has invalid integration method ${integration.method}`);
    }
    if (!VALID_INTEGRATION_VERIFICATION.has(integration.verification)) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} has invalid integration verification ${integration.verification}`);
    }
    if (!Array.isArray(integration.conflict_paths)) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} conflict_paths must be an array`);
    }
    if (!Number.isInteger(integration.attempts) || integration.attempts < 0) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} attempts must be a non-negative integer`);
    }
    if (
      typeof integration.evidence !== "string" ||
      !/^<Path>\{roots\.state\}\/specdev\/changes\/[^<]+\/evidence\/T-[0-9]{2,}\.md<\/Path>$/.test(integration.evidence)
    ) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration evidence must be a rooted Ticket Evidence path`);
    }
    if (!new Set(["pending", "applying", "applied", "failed", "stale"]).has(integration.promotion_status)) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} has invalid promotion_status ${integration.promotion_status}`);
    }
    for (const [name, suite] of [["full_suite", integration.full_suite], ["e2e", integration.e2e]]) {
      if (!suite || typeof suite !== "object" || Array.isArray(suite) || typeof suite.required !== "boolean" || !VALID_E2E_STATUS.has(suite.status)) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${name} contract is invalid`);
        continue;
      }
      const unexpectedSuiteKeys = Object.keys(suite).filter((key) => !new Set(["required", "status", "reason", "evidence"]).has(key));
      if (unexpectedSuiteKeys.length) errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${name} has unexpected keys ${JSON.stringify(unexpectedSuiteKeys.sort())}`);
      if (suite.required === false && (suite.status !== "not-required" || typeof suite.reason !== "string" || !suite.reason.trim())) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} non-required ${name} needs not-required status and reason`);
      }
      if (suite.required === true && suite.status === "not-required") {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} required ${name} cannot be not-required`);
      }
    }
    const e2e = integration.e2e;
    if (
      !e2e ||
      typeof e2e !== "object" ||
      Array.isArray(e2e) ||
      typeof e2e.required !== "boolean" ||
      !VALID_E2E_STATUS.has(e2e.status)
    ) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration e2e contract is invalid`);
    } else {
      const unexpectedE2eKeys = Object.keys(e2e).filter((key) => !new Set(["required", "status", "reason", "evidence"]).has(key));
      if (unexpectedE2eKeys.length) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} integration e2e has unexpected keys ${JSON.stringify(unexpectedE2eKeys.sort())}`);
      }
      if (e2e.required === false && e2e.status !== "not-required") {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} non-required E2E must use status=not-required`);
      }
      if (e2e.required === true && e2e.status === "not-required") {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} required E2E cannot be not-required`);
      }
      if (
        e2e.required === true &&
        e2e.status === "passed" &&
        (typeof e2e.evidence !== "string" || !e2e.evidence.trim())
      ) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} passed required E2E needs evidence`);
      }
    }
    const integrationLifecycleActive = new Set(["integrating", "integrated", "removed"]).has(worktree.status);
    if (integrationLifecycleActive) {
      if (typeof integration.parent_before_sha !== "string" || !integration.parent_before_sha.trim()) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${worktree.status} requires parent_before_sha`);
      }
      if (typeof integration.source_sha !== "string" || !integration.source_sha.trim()) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${worktree.status} requires source_sha`);
      } else if (integration.source_sha !== worktree.source_checkpoint) {
        errors.push(`${basename(path)}: worktree ${worktree.ticket_id} source_sha must equal source_checkpoint`);
      }
      if (currentWorkspace) {
        if (integration.candidate_sha !== null || integration.candidate_tree_sha !== null || integration.candidate_branch !== null || integration.candidate_workspace_ref !== null) {
          errors.push(`${basename(path)}: current workspace ${worktree.ticket_id} cannot record candidate workspace fields`);
        }
        if (integration.method !== "direct-parent") {
          errors.push(`${basename(path)}: current workspace ${worktree.ticket_id} requires integration.method=direct-parent`);
        }
      } else {
        if (typeof integration.candidate_sha !== "string" || !integration.candidate_sha.trim()) {
          errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${worktree.status} requires candidate_sha`);
        }
        const expectedCandidateBranch = `speculo/integration/${expectedChange}/${worktree.ticket_id}`;
        if (integration.candidate_branch !== expectedCandidateBranch) {
          errors.push(`${basename(path)}: worktree ${worktree.ticket_id} candidate_branch must equal ${expectedCandidateBranch}`);
        }
        const expectedCandidateRef = `specdev-worktree/.integration/${expectedChange}/${worktree.ticket_id}`;
        if (integration.candidate_workspace_ref !== expectedCandidateRef) {
          errors.push(`${basename(path)}: worktree ${worktree.ticket_id} candidate_workspace_ref must equal ${expectedCandidateRef}`);
        }
        if (!new Set(["fast-forward", "merge-commit"]).has(integration.method)) {
          errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${worktree.status} requires an integration method`);
        }
      }
    if (!Number.isInteger(integration.attempts) || integration.attempts < 1) {
      errors.push(`${basename(path)}: worktree ${worktree.ticket_id} ${worktree.status} requires attempts >= 1`);
    }
    }
    if (worktree.status === "integrating" && integration.status !== "candidate") {
      errors.push(`${basename(path)}: integrating worktree ${worktree.ticket_id} requires integration.status=candidate`);
    }
    if (new Set(["integrated", "removed"]).has(worktree.status)) {
      if (
        integration.status !== "passed" ||
        integration.verification !== "passed" ||
        !(currentWorkspace ? integration.method === "direct-parent" : new Set(["fast-forward", "merge-commit"]).has(integration.method)) ||
        typeof integration.result_sha !== "string" ||
        !integration.result_sha.trim() ||
        (currentWorkspace ? integration.result_sha !== worktree.source_checkpoint : integration.result_sha !== integration.candidate_sha) ||
        !e2e ||
        !new Set(["not-required", "passed"]).has(e2e.status)
      ) {
        errors.push(`${basename(path)}: ${worktree.status} worktree ${worktree.ticket_id} requires passed candidate/result/E2E state`);
      }
      if (currentWorkspace && integration.method === "direct-parent") {
        if (integration.candidate_sha !== null || integration.candidate_tree_sha !== null || integration.candidate_branch !== null || integration.candidate_workspace_ref !== null) {
          errors.push(`${basename(path)}: current workspace ${worktree.ticket_id} direct-parent cannot record candidate fields`);
        }
        if (integration.result_sha !== worktree.source_checkpoint) {
          errors.push(`${basename(path)}: current workspace ${worktree.status} ${worktree.ticket_id} result_sha must equal source_checkpoint`);
        }
      } else if (integration.method === "fast-forward") {
        if (integration.candidate_sha !== worktree.source_checkpoint) {
          errors.push(`${basename(path)}: ${worktree.status} worktree ${worktree.ticket_id} fast-forward candidate/result must equal source_checkpoint`);
        }
        if (Array.isArray(integration.conflict_paths) && integration.conflict_paths.length > 0) {
          errors.push(`${basename(path)}: ${worktree.status} worktree ${worktree.ticket_id} fast-forward cannot record conflict_paths`);
        }
      } else if (
        integration.method === "merge-commit" &&
        typeof integration.candidate_sha === "string" &&
        (integration.candidate_sha === worktree.source_checkpoint || integration.candidate_sha === integration.parent_before_sha)
      ) {
        errors.push(`${basename(path)}: ${worktree.status} worktree ${worktree.ticket_id} merge-commit candidate must be a distinct checkpoint`);
      }
    }
  }
  if (data.change_status === "archived") {
    if (data.archived !== true) errors.push(`${basename(path)}: archived status requires archived=true`);
    const inner = typeof data.archive_path === "string" ? stripPathTag(data.archive_path) : null;
    if (inner === null || !inner.startsWith(`${STATE_PREFIX}archive/`)) {
      errors.push(`${basename(path)}: archived status requires a rooted archive_path`);
    }
  } else if (data.archived === true) {
    errors.push(`${basename(path)}: archived=true conflicts with change_status=${data.change_status}`);
  }
  return data;
}

function validateCurrentWorkspaceExecution(changeStatus, goalPlan, errors) {
  if (goalPlan?.meta.ticket_workspace_policy !== "current") return;
  const entries = Array.isArray(changeStatus?.worktrees) ? changeStatus.worktrees : [];
  const active = [];
  for (const worktree of entries) {
    if (worktree.workspace_ref !== "current") {
      errors.push(`${worktree.ticket_id}: current Goal Plan requires workspace_ref=current; source worktrees are not allowed`);
    }
    if (worktree.parent_branch !== worktree.branch) {
      errors.push(`${worktree.ticket_id}: current workspace execution must commit directly on parent_branch`);
    }
    if (new Set(["active", "review", "integrating", "blocked"]).has(worktree.status)) {
      active.push(worktree.ticket_id);
    }
    const integration = worktree.integration;
    if (integration && typeof integration === "object" && !Array.isArray(integration)) {
      if (["candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref"].some((key) => integration[key] !== null)) {
        errors.push(`${worktree.ticket_id}: current workspace execution cannot record candidate workspace fields`);
      }
      if (integration.method !== null && integration.method !== "direct-parent") {
        errors.push(`${worktree.ticket_id}: current workspace execution requires direct-parent integration`);
      }
    }
  }
  if (active.length > 1) {
    errors.push(`current Goal Plan requires strictly serial Ticket execution; active worktrees: ${active.join(", ")}`);
  }
}

function gitOutput(repoRoot, args) {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function gitCommitExists(repoRoot, sha) {
  return typeof sha === "string" && gitSucceeds(repoRoot, ["cat-file", "-e", `${sha}^{commit}`]);
}

function gitSucceeds(repoRoot, args) {
  try {
    execFileSync("git", ["-C", repoRoot, ...args], { stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function validateGitEvidence(repoRoot, changeStatus, errors) {
  if (!repoRoot) return;
  const resolvedRoot = resolve(repoRoot);
  if (gitOutput(resolvedRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    errors.push(`--repo is not a Git worktree: ${resolvedRoot}`);
    return;
  }
  const currentBranch = gitOutput(resolvedRoot, ["branch", "--show-current"]);
  for (const worktree of Array.isArray(changeStatus?.worktrees) ? changeStatus.worktrees : []) {
    const label = String(worktree.ticket_id ?? "worktree");
    for (const [name, sha] of [
      ["base_sha", worktree.base_sha],
      ["source_checkpoint", worktree.source_checkpoint],
      ["parent_before_sha", worktree.integration?.parent_before_sha],
      ["source_sha", worktree.integration?.source_sha],
      ["candidate_sha", worktree.integration?.candidate_sha],
      ["result_sha", worktree.integration?.result_sha],
    ]) {
      if (sha !== null && sha !== undefined && sha !== "" && !gitCommitExists(resolvedRoot, sha)) {
        errors.push(`${label}: ${name} is not a resolvable Git commit: ${sha}`);
      }
    }
    if (worktree.workspace_ref === "current") {
      if (currentBranch !== worktree.parent_branch) errors.push(`${label}: current branch ${currentBranch ?? "<detached>"} must equal ${worktree.parent_branch}`);
      if (new Set(["integrated", "removed"]).has(worktree.status) && worktree.integration?.result_sha && gitOutput(resolvedRoot, ["rev-parse", worktree.parent_branch]) !== worktree.integration.result_sha) {
        errors.push(`${label}: parent branch HEAD must equal recorded result_sha`);
      }
      if (worktree.integration?.source_sha && worktree.base_sha && !gitSucceeds(resolvedRoot, ["merge-base", "--is-ancestor", worktree.base_sha, worktree.integration.source_sha])) {
        errors.push(`${label}: source_sha must descend from base_sha`);
      }
    } else if (worktree.integration?.source_sha && worktree.base_sha && !gitSucceeds(resolvedRoot, ["merge-base", "--is-ancestor", worktree.base_sha, worktree.integration.source_sha])) {
      errors.push(`${label}: source_sha must descend from base_sha`);
    }
    if (new Set(["integrated", "removed"]).has(worktree.status) && gitOutput(resolvedRoot, ["status", "--porcelain"])) {
      errors.push(`${label}: repository is dirty while Ticket is recorded as ${worktree.status}`);
    }
  }
}

function validateParentImplementation(change, parentStatus, stage, errors, warnings) {
  const required = stage === "orchestrate-implementation";
  const mapPath = join(change, "implementation-map.md");
  const planPath = join(change, "implementation-plan.md");
  if (!required && !isFile(mapPath) && !isFile(planPath)) return null;
  if (!isFile(mapPath)) errors.push("orchestrate-implementation stage requires implementation-map.md");
  if (!isFile(planPath)) errors.push("orchestrate-implementation stage requires implementation-plan.md");
  if (!isFile(mapPath) || !isFile(planPath)) return null;

  const parentName = basename(change);
  const map = parseFrontmatter(mapPath);
  const plan = parseFrontmatter(planPath);
  const mapKeys = ["schema_version", "artifact", "change", "status", "revision", "members", "tasks", "dependencies", "serializations"];
  const planKeys = ["schema_version", "artifact", "change", "status", "source_map_revision", "orchestration", "lead", "implementation_agent_limit", "integration_attempt_limit", "ticket_workspace_policy", "integration_gate", "ready_for_execution"];
  for (const [label, meta, expected] of [
    ["implementation-map.md", map.meta, mapKeys],
    ["implementation-plan.md", plan.meta, planKeys],
  ]) {
    const missing = expected.filter((key) => !(key in meta));
    const unexpected = Object.keys(meta).filter((key) => !expected.includes(key));
    if (missing.length) errors.push(`${label}: missing keys ${JSON.stringify(missing)}`);
    if (unexpected.length) errors.push(`${label}: unexpected keys ${JSON.stringify(unexpected.sort())}`);
  }
  if (map.meta.schema_version !== IMPLEMENTATION_MAP_SCHEMA_VERSION || map.meta.artifact !== "implementation-map") {
    errors.push("implementation-map.md: artifact/schema_version must be implementation-map/1");
  }
  if (plan.meta.schema_version !== IMPLEMENTATION_PLAN_SCHEMA_VERSION || plan.meta.artifact !== "implementation-plan") {
    errors.push("implementation-plan.md: artifact/schema_version must be implementation-plan/1");
  }
  if (map.meta.change !== parentName || plan.meta.change !== parentName) {
    errors.push("parent implementation artifacts must name their containing change");
  }
  const artifactStatuses = new Set(["ready", "in_progress", "blocked", "completed"]);
  if (!artifactStatuses.has(map.meta.status)) errors.push(`implementation-map.md: invalid status ${map.meta.status}`);
  if (!artifactStatuses.has(plan.meta.status)) errors.push(`implementation-plan.md: invalid status ${plan.meta.status}`);
  if (!Number.isInteger(map.meta.revision) || map.meta.revision < 1) {
    errors.push("implementation-map.md: revision must be a positive integer");
  }
  if (plan.meta.source_map_revision !== map.meta.revision) {
    errors.push("implementation-plan.md: source_map_revision must equal Implementation Map revision");
  }
  if (plan.meta.orchestration !== "lead-directed" || typeof plan.meta.lead !== "string" || !plan.meta.lead.trim()) {
    errors.push("implementation-plan.md: lead-directed orchestration requires a recoverable Lead");
  }
  for (const key of ["implementation_agent_limit", "integration_attempt_limit"]) {
    if (!Number.isInteger(plan.meta[key]) || plan.meta[key] < 1) {
      errors.push(`implementation-plan.md: ${key} must be a positive integer`);
    }
  }
  const validStrategy =
    (plan.meta.ticket_workspace_policy === "current" && plan.meta.integration_gate === "direct-parent") ||
    (plan.meta.ticket_workspace_policy === "required" && plan.meta.integration_gate === "candidate-merge");
  if (!validStrategy) {
    errors.push("implementation-plan.md: workspace/integration strategy must be current/direct-parent or required/candidate-merge");
  }
  const readyStatuses = new Set(["ready", "in_progress"]);
  if (
    typeof plan.meta.ready_for_execution !== "boolean" ||
    (plan.meta.ready_for_execution === true) !== readyStatuses.has(plan.meta.status)
  ) {
    errors.push("implementation-plan.md: ready_for_execution must match status");
  }
  for (const heading of [
    "## 1. Members and Source Authority",
    "## 2. Composite Ticket Inventory",
    "## 3. Implementation Super-DAG",
    "## 4. Conflict and Serialization",
    "## 5. Contract and Path Coverage",
    "## 6. Revision Log",
  ]) {
    if (!map.body.includes(heading)) errors.push(`implementation-map.md: missing '${heading}'`);
  }
  for (const heading of [
    "## 1. Outcome and Authority",
    "## 2. Ready Frontier and Waves",
    "## 3. Workspace and Dispatch Contract",
    "## 4. Repository Integration Queue",
    "## 5. Gates and Aggregate Verification",
    "## 6. Conflict, Drift and Recovery",
    "## 7. Progress and Decisions",
  ]) {
    if (!plan.body.includes(heading)) errors.push(`implementation-plan.md: missing '${heading}'`);
  }

  const members = requireList(map.meta, "members", "implementation-map.md", errors).map(String);
  const tasks = requireList(map.meta, "tasks", "implementation-map.md", errors).map(String);
  const dependencies = requireList(map.meta, "dependencies", "implementation-map.md", errors).map(String);
  const serializations = requireList(map.meta, "serializations", "implementation-map.md", errors).map(String);
  if (members.length < 2) errors.push("implementation-map.md: parent implementation requires at least two members");
  if (!tasks.length) errors.push("implementation-map.md: tasks must contain the child Ticket inventory");
  for (const [key, values] of [["members", members], ["tasks", tasks], ["dependencies", dependencies], ["serializations", serializations]]) {
    if (new Set(values).size !== values.length) errors.push(`implementation-map.md: ${key} must be unique`);
  }
  if (members.includes(parentName)) errors.push("implementation-map.md: parent change cannot include itself");

  const changesRoot = dirname(change);
  const memberSet = new Set(members);
  const memberStatuses = new Map();
  const ticketByTask = new Map();
  const expectedTasks = new Set();
  const expectedInternalEdges = new Set();
  let activeImplementations = 0;
  let activeCurrentWriters = 0;
  const integratingByRef = new Map();

  for (const member of members) {
    if (!CHANGE_NAME.test(member)) {
      errors.push(`implementation-map.md: invalid member change name ${member}`);
      continue;
    }
    const memberRoot = join(changesRoot, member);
    if (!isDirectory(memberRoot)) {
      errors.push(`implementation-map.md: member change does not exist: ${member}`);
      continue;
    }
    if (isFile(join(memberRoot, "implementation-map.md"))) {
      errors.push(`implementation-map.md: nested parent implementation is not supported in v1: ${member}`);
    }

    const memberErrors = [];
    const memberWarnings = [];
    const status = validateChangeStatus(join(memberRoot, ".status.json"), member, memberErrors);
    if (status) {
      memberStatuses.set(member, status);
      if (status.change_status === "archived") memberErrors.push("archived change cannot be an implementation member");
      if (status.current_work !== null && status.current_work !== "specdev/implement") {
        memberErrors.push(`current_work=${status.current_work} conflicts with parent implementation ownership`);
      }
      for (const worktree of Array.isArray(status.worktrees) ? status.worktrees : []) {
        if (worktree?.status === "active") {
          activeImplementations += 1;
          if (worktree.workspace_ref === "current") activeCurrentWriters += 1;
          if (plan.meta.ticket_workspace_policy === "current" && worktree.workspace_ref !== "current") {
            memberErrors.push(`${worktree.ticket_id}: active workspace must follow parent current policy`);
          }
          if (plan.meta.ticket_workspace_policy === "required" && worktree.workspace_ref === "current") {
            memberErrors.push(`${worktree.ticket_id}: active workspace must follow parent required policy`);
          }
        }
        if (worktree?.status === "integrating") {
          const key = String(worktree.parent_branch ?? "<unknown-ref>");
          integratingByRef.set(key, (integratingByRef.get(key) ?? 0) + 1);
        }
        if (Number.isInteger(worktree?.integration?.attempts) && worktree.integration.attempts > plan.meta.integration_attempt_limit) {
          memberErrors.push(`${worktree.ticket_id}: integration attempts ${worktree.integration.attempts} exceed parent limit ${plan.meta.integration_attempt_limit}`);
        }
      }
    }

    const specPath = join(memberRoot, "spec.md");
    const childSpec = isFile(specPath) ? validateSpec(specPath, memberErrors, memberWarnings) : null;
    if (!childSpec) memberErrors.push("Ready Spec is required before parent creation");
    else {
      if (childSpec.meta.change !== member) memberErrors.push("spec.md: change must equal member directory name");
      if (childSpec.meta.status !== "ready" || childSpec.meta.ready_for_tickets !== true) {
        memberErrors.push("Spec must have status=ready and ready_for_tickets=true");
      }
    }

    const childMapPath = join(memberRoot, "tickets-map.md");
    const childMap = isFile(childMapPath) ? validateMap(childMapPath, memberErrors) : null;
    if (!childMap) memberErrors.push("Ready Tickets Map is required before parent creation");
    else {
      if (childMap.meta.change !== member) memberErrors.push("tickets-map.md: change must equal member directory name");
      if (!new Set(["ready", "in_progress", "completed"]).has(childMap.meta.status)) {
        memberErrors.push("Tickets Map status must be ready, in_progress, or completed");
      }
    }

    const ticketRoot = join(memberRoot, "ticket");
    const ticketFiles = isDirectory(ticketRoot)
      ? readdirSync(ticketRoot).filter((name) => name.endsWith(".md")).sort()
      : [];
    if (!ticketFiles.length) memberErrors.push("Ready Tickets are required before parent creation");
    const childTickets = new Map();
    for (const name of ticketFiles) {
      const artifact = validateTicket(join(ticketRoot, name), memberErrors);
      if (!artifact) continue;
      const ticketId = String(artifact.meta.id);
      if (artifact.meta.change !== member) memberErrors.push(`${name}: change must equal member directory name`);
      if (childTickets.has(ticketId)) memberErrors.push(`duplicate Ticket id ${ticketId}`);
      childTickets.set(ticketId, artifact);
      const numericId = ticketId.replace(/^T-/, "");
      if (!name.startsWith(`${numericId}-`)) memberErrors.push(`${name}: filename prefix must match ${ticketId}`);
      if (childMap && !childMap.body.includes(ticketId)) memberErrors.push(`${name}: Ticket id is absent from Tickets Map`);
      if (childSpec) {
        for (const contractId of artifact.meta.contract_ids ?? []) {
          if (!childSpec.body.includes(String(contractId))) memberErrors.push(`${name}: contract ${contractId} not found in Spec`);
        }
      }

      const taskId = `${member}::${ticketId}`;
      expectedTasks.add(taskId);
      ticketByTask.set(taskId, { artifact, member, memberRoot, status });
      const terminal = new Set(["done", "cancelled"]).has(artifact.meta.status);
      if (!terminal) {
        if (map.meta.status === "ready" && (artifact.meta.status !== "ready" || artifact.meta.ready !== true)) {
          memberErrors.push(`${ticketId}: parent creation requires status=ready and ready=true`);
        } else if (new Set(["ready", "in_progress", "review"]).has(artifact.meta.status) && artifact.meta.ready !== true) {
          memberErrors.push(`${ticketId}: executable Ticket must keep ready=true`);
        } else if (new Set(["blocked", "deviated"]).has(artifact.meta.status) && map.meta.status !== "blocked" && plan.meta.status !== "blocked") {
          memberErrors.push(`${ticketId}: blocked/deviated Ticket requires blocked parent artifacts`);
        } else if (artifact.meta.status === "draft") {
          memberErrors.push(`${ticketId}: draft Ticket cannot belong to a parent implementation`);
        }
      }
    }

    for (const [ticketId, artifact] of childTickets) {
      for (const dependency of (artifact.meta.blocked_by ?? []).map(String)) {
        if (!childTickets.has(dependency)) memberErrors.push(`${ticketId}: blocked_by references missing ${dependency}`);
        expectedInternalEdges.add(`${member}::${ticketId} <- ${member}::${dependency}`);
      }
    }
    const childGraph = new Map([...childTickets].map(([ticketId, artifact]) => [ticketId, (artifact.meta.blocked_by ?? []).map(String)]));
    const childCycle = findCycle(childGraph);
    if (childCycle) memberErrors.push(`Ticket dependency cycle: ${childCycle.join(" -> ")}`);

    if (childSpec) {
      const declared = new Set(childSpec.body.match(/\bAC-\d+\b/g) ?? []);
      const covered = new Set([...childTickets.values()].flatMap((artifact) => (artifact.meta.contract_ids ?? []).map(String)));
      const uncovered = [...declared].filter((id) => !covered.has(id) && !(childMap && new RegExp(`${escapeRegExp(id)}.*\\bdeferred\\b`, "i").test(childMap.body)));
      if (uncovered.length) memberErrors.push(`Spec acceptance contracts are not covered by Tickets: ${JSON.stringify(uncovered.sort())}`);
    }
    if (status?.change_status === "completed") {
      const unfinished = [...childTickets].filter(([, artifact]) => !new Set(["done", "cancelled"]).has(artifact.meta.status)).map(([id]) => id);
      if (unfinished.length) memberErrors.push(`completed member has unfinished Tickets: ${JSON.stringify(unfinished)}`);
    }

    const goalPath = join(memberRoot, "goal-plan.md");
    if (isFile(goalPath)) {
      const goal = validateGoalPlan(goalPath, memberErrors);
      if (goal && (
        goal.meta.ticket_workspace_policy !== plan.meta.ticket_workspace_policy ||
        goal.meta.integration_gate !== plan.meta.integration_gate
      )) {
        memberErrors.push("Goal Plan workspace/integration strategy conflicts with parent Implementation Plan");
      }
    }
    errors.push(...memberErrors.map((message) => `${member}: ${message}`));
    warnings.push(...memberWarnings.map((message) => `${member}: ${message}`));
  }

  const taskSet = new Set(tasks);
  for (const task of tasks) {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*::T-\d{2,}$/.test(task)) {
      errors.push(`implementation-map.md: invalid composite task '${task}'`);
    }
  }
  const missingTasks = [...expectedTasks].filter((task) => !taskSet.has(task)).sort();
  const extraTasks = tasks.filter((task) => !expectedTasks.has(task)).sort();
  if (missingTasks.length || extraTasks.length) {
    errors.push(`implementation-map.md: tasks must exactly match child Tickets; missing=${JSON.stringify(missingTasks)} extra=${JSON.stringify(extraTasks)}`);
  }

  const graph = new Map(tasks.map((task) => [task, []]));
  const dependencySet = new Set(dependencies);
  for (const edge of dependencies) {
    const match = /^([^ ]+::T-\d{2,}) <- ([^ ]+::T-\d{2,})$/.exec(edge);
    if (!match) {
      errors.push(`implementation-map.md: invalid dependency '${edge}'`);
      continue;
    }
    const [, dependent, prerequisite] = match;
    if (!taskSet.has(dependent) || !taskSet.has(prerequisite)) {
      errors.push(`implementation-map.md: dependency endpoints must be composite tasks: ${edge}`);
    } else if (dependent === prerequisite) {
      errors.push(`implementation-map.md: dependency cannot be self-referential: ${edge}`);
    } else {
      graph.get(dependent).push(prerequisite);
      const dependentMember = dependent.split("::")[0];
      const prerequisiteMember = prerequisite.split("::")[0];
      if (dependentMember === prerequisiteMember && !expectedInternalEdges.has(edge)) {
        errors.push(`implementation-map.md: same-member dependency must come from child blocked_by: ${edge}`);
      }
    }
  }
  const missingInternalEdges = [...expectedInternalEdges].filter((edge) => !dependencySet.has(edge)).sort();
  if (missingInternalEdges.length) {
    errors.push(`implementation-map.md: missing child Ticket dependencies ${JSON.stringify(missingInternalEdges)}`);
  }
  const cycle = findCycle(graph);
  if (cycle) errors.push(`implementation super-DAG cycle: ${cycle.join(" -> ")}`);

  const serializationPairs = new Set();
  for (const edge of serializations) {
    const match = /^([^ ]+::T-\d{2,}) <> ([^ ]+::T-\d{2,})$/.exec(edge);
    if (!match) {
      errors.push(`implementation-map.md: invalid serialization '${edge}'`);
      continue;
    }
    const [, left, right] = match;
    if (!taskSet.has(left) || !taskSet.has(right)) {
      errors.push(`implementation-map.md: serialization endpoints must be composite tasks: ${edge}`);
      continue;
    }
    if (left === right) {
      errors.push(`implementation-map.md: serialization cannot be self-referential: ${edge}`);
      continue;
    }
    const key = [left, right].sort().join("\0");
    if (serializationPairs.has(key)) errors.push(`implementation-map.md: duplicate unordered serialization pair: ${edge}`);
    serializationPairs.add(key);
  }

  const unfinishedTasks = [...ticketByTask]
    .filter(([, value]) => !new Set(["done", "cancelled"]).has(value.artifact.meta.status))
    .map(([task]) => task);
  for (let index = 0; index < unfinishedTasks.length; index += 1) {
    const leftId = unfinishedTasks[index];
    const left = ticketByTask.get(leftId).artifact;
    for (const rightId of unfinishedTasks.slice(index + 1)) {
      if (leftId.split("::")[0] === rightId.split("::")[0]) continue;
      if (
        transitivelyDepends(graph, leftId, rightId) ||
        transitivelyDepends(graph, rightId, leftId) ||
        serializationPairs.has([leftId, rightId].sort().join("\0"))
      ) continue;
      const right = ticketByTask.get(rightId).artifact;
      const overlaps = [];
      for (const leftPath of left.meta.writable_paths ?? []) {
        for (const rightPath of right.meta.writable_paths ?? []) {
          if (pathsOverlap(String(leftPath), String(rightPath))) overlaps.push([String(leftPath), String(rightPath)]);
        }
      }
      if (overlaps.length) {
        errors.push(`composite tasks ${leftId}/${rightId} have writable overlap without dependency or serialization: ${JSON.stringify(overlaps.slice(0, 3))}`);
      }
    }
  }

  for (const entry of readdirSync(changesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === parentName) continue;
    const otherMapPath = join(changesRoot, entry.name, "implementation-map.md");
    if (!isFile(otherMapPath)) continue;
    const otherMap = parseFrontmatter(otherMapPath).meta;
    if (!Array.isArray(otherMap.members)) continue;
    let otherStatus = null;
    try {
      otherStatus = JSON.parse(readText(join(changesRoot, entry.name, ".status.json"))).change_status;
    } catch {
      // Invalid competing parents still own their members conservatively.
    }
    if (new Set(["completed", "archived"]).has(otherStatus)) continue;
    const overlap = otherMap.members.map(String).filter((member) => memberSet.has(member));
    if (overlap.length) errors.push(`member changes already belong to unfinished parent implementation ${entry.name}: ${JSON.stringify(overlap)}`);
  }

  const config = findSpecdevConfig(change);
  const configuredAgents = positiveConfigLimit(config, "max_implementation_agents", 0);
  const configuredAttempts = positiveConfigLimit(config, "max_integration_attempts", 0);
  if (!config || config.schema_version !== CONFIG_SCHEMA_VERSION || configuredAgents === 0 || configuredAttempts === 0) {
    errors.push("implementation-plan.md: SpecDev config v5 with positive execution limits is required");
  } else {
    if (plan.meta.implementation_agent_limit > configuredAgents) {
      errors.push(`implementation-plan.md: implementation_agent_limit ${plan.meta.implementation_agent_limit} exceeds config max_implementation_agents ${configuredAgents}`);
    }
    if (plan.meta.integration_attempt_limit > configuredAttempts) {
      errors.push(`implementation-plan.md: integration_attempt_limit ${plan.meta.integration_attempt_limit} exceeds config max_integration_attempts ${configuredAttempts}`);
    }
  }
  if (activeImplementations > plan.meta.implementation_agent_limit) {
    errors.push(`parent implementation agent limit exceeded: ${activeImplementations} active for limit ${plan.meta.implementation_agent_limit}`);
  }
  if (plan.meta.ticket_workspace_policy === "current" && activeCurrentWriters > 1) {
    errors.push(`parent current policy permits only one active implementation writer; found ${activeCurrentWriters}`);
  }
  for (const [ref, count] of integratingByRef) {
    if (count > 1) errors.push(`repository/ref integration must be serialized for ${ref}; found ${count}`);
  }

  if (required && parentStatus && new Set(["active", "blocked"]).has(parentStatus.change_status) && parentStatus.current_work !== "specdev/orchestrate-implementation") {
    errors.push("parent active/blocked status must keep current_work=specdev/orchestrate-implementation");
  }
  if (parentStatus?.change_status === "completed") {
    const incomplete = members.filter((member) => memberStatuses.get(member)?.change_status !== "completed");
    if (incomplete.length) errors.push(`parent implementation is completed while members remain incomplete: ${JSON.stringify(incomplete)}`);
    const unfinished = [...ticketByTask].filter(([, value]) => !new Set(["done", "cancelled"]).has(value.artifact.meta.status)).map(([task]) => task);
    if (unfinished.length) errors.push(`completed parent implementation has unfinished composite tasks: ${JSON.stringify(unfinished)}`);
    if (map.meta.status !== "completed" || plan.meta.status !== "completed") {
      errors.push("completed parent requires completed Implementation Map and Implementation Plan");
    }
    if (
      parentStatus.current_work !== null ||
      !Array.isArray(parentStatus.blockers) || parentStatus.blockers.length > 0 ||
      !Array.isArray(parentStatus.deviations) || parentStatus.deviations.length > 0
    ) {
      errors.push("completed parent requires null current_work and no blockers or deviations");
    }
    const activeMemberWork = [...memberStatuses]
      .flatMap(([member, status]) => (status.worktrees ?? []).map((worktree) => ({ member, worktree })))
      .filter(({ worktree }) => new Set(["planned", "active", "review", "integrating", "blocked"]).has(worktree?.status) || worktree?.integration?.status === "candidate")
      .map(({ member, worktree }) => `${member}::${worktree.ticket_id}`);
    if (activeMemberWork.length) {
      errors.push(`completed parent has active member worktrees or candidates: ${JSON.stringify(activeMemberWork)}`);
    }
    for (const [task, value] of ticketByTask) {
      if (value.artifact.meta.status !== "done") continue;
      if (!isFile(join(value.memberRoot, "evidence", `${value.artifact.meta.id}.md`))) {
        errors.push(`${task}: completed parent requires child Ticket Evidence`);
      }
      const worktree = value.status?.worktrees?.find((entry) => entry?.ticket_id === value.artifact.meta.id);
      if (!worktree || !new Set(["integrated", "removed"]).has(worktree.status)) {
        errors.push(`${task}: completed parent requires integrated or removed child workspace record`);
      }
    }
    const evidencePath = join(change, "evidence", "implementation-orchestration.md");
    if (!isFile(evidencePath)) {
      errors.push("completed parent requires evidence/implementation-orchestration.md");
    } else {
      const evidence = readText(evidencePath);
      for (const heading of [
        "## 1. Parent Plan and Final Revision",
        "## 2. Member and Ticket Completion",
        "## 3. Dependency and Serialization Audit",
        "## 4. Repository Integration Audit",
        "## 5. Aggregate Verification",
        "## 6. Contract, Drift and Deviation Audit",
        "## 7. Residual Risk and Boundary",
      ]) {
        if (!evidence.includes(heading)) errors.push(`evidence/implementation-orchestration.md: missing '${heading}'`);
      }
    }
  } else if (map.meta.status === "completed" || plan.meta.status === "completed") {
    errors.push("completed Implementation Map/Plan requires completed parent change status");
  }
  if (plan.meta.ready_for_execution === true && !new Set(["ready", "in_progress"]).has(map.meta.status)) {
    errors.push("ready Implementation Plan requires a ready or in_progress Implementation Map");
  }
  return { map, plan, members, tasks, memberStatuses, ticketByTask };
}

function validateChange(change, stage = null, repoRoot = null) {
  const errors = [];
  const warnings = [];
  if (!isDirectory(change)) {
    return { errors: [`change directory does not exist: ${change}`], warnings };
  }

  const changeStatus = validateChangeStatus(join(change, ".status.json"), basename(change), errors);
  validateParentImplementation(change, changeStatus, stage, errors, warnings);
  if (isFile(join(change, "source-issue.md"))) {
    errors.push("obsolete source-issue.md is forbidden; use source.md without compatibility fallback");
  }
  const sourceRequired = stage === "triage";
  const sourcePath = join(change, "source.md");
  const source = isFile(sourcePath) || sourceRequired
    ? validateSource(sourcePath, basename(change), errors)
    : null;
  const triagePath = join(change, "triage.md");
  const triage = isFile(triagePath) || sourceRequired
    ? validateTriage(triagePath, basename(change), errors)
    : null;
  const diagnosisPath = join(change, "diagnosis.md");
  if (isFile(diagnosisPath) || stage === "diagnosis") {
    validateDiagnosis(diagnosisPath, basename(change), errors);
  }
  validateReviews(change, stage === "review", errors);
  validatePrototypes(change, stage === "prototype", errors);

  const specRequired = new Set(["spec", "tickets", "goal-plan", "implement", "complete"]).has(stage) && !isFile(join(change, "implementation-map.md"));
  const specPath = join(change, "spec.md");
  const spec = isFile(specPath) || specRequired
    ? validateSpec(specPath, errors, warnings)
    : null;
  const ticketMode = isDirectory(join(change, "ticket"));
  const mapRequired = new Set(["tickets", "goal-plan"]).has(stage) || (stage === "implement" && ticketMode);
  const mapPath = join(change, "tickets-map.md");
  const ticketsMap = isFile(mapPath) || mapRequired ? validateMap(mapPath, errors) : null;
  const goalPlanPath = join(change, "goal-plan.md");
  const goalPlan = isFile(goalPlanPath) || stage === "goal-plan"
    ? validateGoalPlan(goalPlanPath, errors)
    : null;
  validateDesignTree(join(change, "design-tree.json"), change, errors);
  validateWayfinder(change, errors);
  if (stage === "grill") {
    for (const name of ["design-tree.json", "LOG.md", "CONTEXT.md", "ADR.md"]) {
      if (!isFile(join(change, name))) errors.push(`grill stage requires ${name}`);
    }
  }
  if (stage === "wayfinder" && !isFile(join(change, "wayfinder-map.md"))) {
    errors.push("wayfinder stage requires wayfinder-map.md");
  }
  for (const artifact of [spec, ticketsMap, goalPlan]) {
    if (artifact && artifact.meta.change !== basename(change)) {
      errors.push(`${basename(artifact.path)}: change must equal directory name ${basename(change)}`);
    }
  }

  const ticketDir = join(change, "ticket");
  const ticketsRequired = new Set(["tickets", "goal-plan"]).has(stage) || (stage === "implement" && ticketMode);
  const ticketFiles = isDirectory(ticketDir)
    ? readdirSync(ticketDir)
        .filter((name) => name.endsWith(".md"))
        .sort()
        .map((name) => join(ticketDir, name))
    : [];
  if (ticketsRequired && !isDirectory(ticketDir)) errors.push("missing Ticket directory");
  if (ticketsRequired && !ticketFiles.length) errors.push("Ticket directory contains no Markdown tickets");
  if (stage === "implement" && !ticketMode && !isFile(join(change, "evidence", "direct-spec.md"))) {
    errors.push("Direct Spec implement stage requires evidence/direct-spec.md");
  }

  const tickets = new Map();
  for (const path of ticketFiles) {
    const artifact = validateTicket(path, errors);
    if (!artifact) continue;
    const ticketId = String(artifact.meta.id);
    if (artifact.meta.change !== basename(change)) {
      errors.push(`${basename(path)}: change must equal directory name ${basename(change)}`);
    }
    const numericId = ticketId.replace(/^T-/, "");
    if (!basename(path).startsWith(`${numericId}-`)) {
      errors.push(`${basename(path)}: filename prefix must match ${ticketId}`);
    }
    if (tickets.has(ticketId)) errors.push(`duplicate Ticket id ${ticketId}`);
    tickets.set(ticketId, artifact);
    if (ticketsMap && !ticketsMap.body.includes(ticketId)) {
      errors.push(`${basename(path)}: Ticket id is absent from Tickets Map`);
    }
    if (spec) {
      for (const contractId of artifact.meta.contract_ids ?? []) {
        if (!spec.body.includes(String(contractId))) {
          errors.push(`${basename(path)}: contract ${contractId} not found in Spec`);
        }
      }
    }
  }

  if (stage === "implement" && ticketMode && changeStatus) {
    const worktreesByTicket = new Map(
      (Array.isArray(changeStatus.worktrees) ? changeStatus.worktrees : [])
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => [String(entry.ticket_id), entry]),
    );
    for (const [ticketId, artifact] of tickets) {
      if (new Set(["draft", "cancelled"]).has(artifact.meta.status)) continue;
      if (!worktreesByTicket.has(ticketId)) {
        errors.push(`${ticketId}: Implement stage requires one Ticket workspace execution record`);
      }
    }
    for (const ticketId of worktreesByTicket.keys()) {
      if (!tickets.has(ticketId)) {
        errors.push(`${ticketId}: worktree record has no matching Ticket`);
      }
    }
  }
  if (changeStatus && goalPlan) {
    validateGoalPlanRuntimeLimits(goalPlan.path, change, goalPlan, errors);
    const attemptLimit = Number.isInteger(goalPlan.meta.integration_attempt_limit) ? goalPlan.meta.integration_attempt_limit : null;
    if (attemptLimit !== null) {
      for (const worktree of changeStatus.worktrees ?? []) {
        if (worktree?.integration && Number.isInteger(worktree.integration.attempts) && worktree.integration.attempts > attemptLimit) {
          errors.push(`${worktree.ticket_id}: integration attempts ${worktree.integration.attempts} exceed Goal Plan limit ${attemptLimit}`);
        }
      }
    }
    validateCurrentWorkspaceExecution(changeStatus, goalPlan, errors);
  }
  validateGitEvidence(repoRoot, changeStatus, errors);

  if (spec) {
    const declaredContracts = new Set(spec.body.match(/\bAC-\d+\b/g) ?? []);
    const coveredContracts = new Set(
      [...tickets.values()].flatMap((artifact) =>
        (artifact.meta.contract_ids ?? []).map(String),
      ),
    );
    let uncovered = [...declaredContracts].filter((id) => !coveredContracts.has(id)).sort();
    if (ticketsMap) {
      uncovered = uncovered.filter(
        (id) => !new RegExp(`${escapeRegExp(id)}.*\\bdeferred\\b`, "i").test(ticketsMap.body),
      );
    }
    if (uncovered.length) {
      errors.push(`Spec acceptance contracts are not covered by Tickets: ${JSON.stringify(uncovered)}`);
    }
    if (spec.meta.ready_for_tickets === true && !declaredContracts.size) {
      errors.push("ready Spec must define at least one AC-### acceptance contract");
    }
  }

  const graph = new Map();
  for (const [ticketId, artifact] of tickets) {
    const dependencies = (artifact.meta.blocked_by ?? []).map(String);
    graph.set(ticketId, dependencies);
    for (const dependency of dependencies) {
      if (!tickets.has(dependency)) {
        errors.push(`${basename(artifact.path)}: blocked_by references missing ${dependency}`);
      }
    }
  }
  const cycle = findCycle(graph);
  if (cycle) errors.push(`Ticket dependency cycle: ${cycle.join(" -> ")}`);

  const activeReady = [...tickets]
    .filter(([, artifact]) => artifact.meta.ready === true && artifact.meta.status !== "done")
    .map(([ticketId]) => ticketId);
  for (let index = 0; index < activeReady.length; index += 1) {
    const leftId = activeReady[index];
    const left = tickets.get(leftId);
    for (const rightId of activeReady.slice(index + 1)) {
      const right = tickets.get(rightId);
      if (
        transitivelyDepends(graph, leftId, rightId) ||
        transitivelyDepends(graph, rightId, leftId)
      ) {
        continue;
      }
      const overlaps = [];
      for (const leftPath of left.meta.writable_paths ?? []) {
        for (const rightPath of right.meta.writable_paths ?? []) {
          if (pathsOverlap(String(leftPath), String(rightPath))) {
            overlaps.push([String(leftPath), String(rightPath)]);
          }
        }
      }
      if (!overlaps.length) continue;
      const leftShared = (left.meta.shared_paths ?? []).map(String);
      const rightShared = (right.meta.shared_paths ?? []).map(String);
      const unresolved = overlaps.filter(
        ([leftPath, rightPath]) =>
          !leftShared.some((shared) => pathsOverlap(leftPath, shared)) &&
          !rightShared.some((shared) => pathsOverlap(rightPath, shared)),
      );
      if (unresolved.length) {
        errors.push(
          `concurrent Ready Tickets ${leftId}/${rightId} have unowned writable overlap: ${JSON.stringify(unresolved.slice(0, 3))}`,
        );
      } else {
        warnings.push(
          `concurrent Ready Tickets ${leftId}/${rightId} share owned paths; an explicit owner or serialization is required`,
        );
      }
    }
  }

  const evidenceDir = join(change, "evidence");
  for (const [ticketId, artifact] of tickets) {
    if (artifact.meta.status !== "done") continue;
    const evidence = join(evidenceDir, `${ticketId}.md`);
    if (!isFile(evidence)) {
      errors.push(`${ticketId}: status is done but Evidence is missing`);
      continue;
    }
    const text = readText(evidence);
    const currentWorkspace = goalPlan?.meta.ticket_workspace_policy === "current";
    const requiredHeadings = [
      "## 2. Lead Dispatch And Candidate Return",
      "## 3. 修改范围与路径所有权",
      "## 4. 验收与合同映射",
      "## 5. Workspace Verification",
      "## 6. 双轴审查",
      "## 7. Integration Verification",
      "## 8. 偏差与决策",
      "## 9. 残余风险与交付定位",
    ];
    for (const heading of requiredHeadings) {
      if (!text.includes(heading)) {
        errors.push(`${toPosix(relative(change, evidence))}: missing '${heading}'`);
      }
    }
    const workspaceVerification = sectionBody(text, "## 5. Workspace Verification");
    if (!/(current-workspace|source-worktree)/.test(workspaceVerification)) {
      errors.push(`${toPosix(relative(change, evidence))}: Workspace Verification must name current-workspace or source-worktree`);
    }
    if (!currentWorkspace && /E2E[^\n]*(?:\bpass(?:ed)?\b|通过)/i.test(workspaceVerification) && !/不得|禁止|not-run/i.test(workspaceVerification)) {
      errors.push(`${toPosix(relative(change, evidence))}: E2E pass cannot come from source-worktree`);
    }
    const worktree = Array.isArray(changeStatus?.worktrees)
      ? changeStatus.worktrees.find((entry) => entry?.ticket_id === ticketId)
      : null;
    if (!worktree || !new Set(["integrated", "removed"]).has(worktree.status)) {
      errors.push(`${ticketId}: status is done but no integrated or removed Ticket worktree exists`);
    }
  }

  if (goalPlan?.meta.ready_for_execution === true) {
    const notReady = [...tickets]
      .filter(
        ([, artifact]) =>
          !new Set(["done", "cancelled"]).has(artifact.meta.status) &&
          artifact.meta.ready !== true,
      )
      .map(([ticketId]) => ticketId);
    if (notReady.length) errors.push(`Goal Plan is Ready but Tickets are not Ready: ${JSON.stringify(notReady)}`);
    if (spec && spec.meta.ready_for_tickets !== true) {
      errors.push("Goal Plan is Ready but Spec is not ready_for_tickets");
    }
    if (
      ticketsMap &&
      !new Set(["ready", "in_progress", "completed"]).has(ticketsMap.meta.status)
    ) {
      errors.push("Goal Plan is Ready but Tickets Map status is not ready/in_progress/completed");
    }
  }

  if (changeStatus) {
    if (
      changeStatus.change_status === "completed" &&
      [...tickets.values()].some(
        (artifact) => !new Set(["done", "cancelled"]).has(artifact.meta.status),
      )
    ) {
      errors.push("change_status is completed while planned Tickets remain unfinished");
    }
    if (changeStatus.change_status === "archived") {
      warnings.push("validating an archived change in place; normally it lives under the archive root");
    }
    if (stage === "complete" && changeStatus.change_status !== "completed") {
      errors.push("complete stage requires change_status=completed");
    }
  }
  if (
    stage === "complete" &&
    !ticketFiles.length &&
    !isFile(join(change, "implementation-map.md")) &&
    !isFile(join(change, "evidence", "direct-spec.md"))
  ) {
    errors.push("complete stage without Tickets requires evidence/direct-spec.md");
  }
  if (
    stage === "complete" &&
    triage &&
    new Set(["pending-close", "close-failed"]).has(triage.meta.external_action)
  ) {
    errors.push(`complete stage cannot archive external_action=${triage.meta.external_action}`);
  }

  for (const path of walk(change).filter((item) => isFile(item) && extname(item) === ".md")) {
    const text = readText(path);
    if ((text.match(/<Path>/g) ?? []).length !== (text.match(/<\/Path>/g) ?? []).length) {
      errors.push(`${toPosix(relative(change, path))}: unbalanced <Path> tags`);
    }
    const withoutPaths = text.replace(PATH_TAG_RE, "");
    if (withoutPaths.includes("{roots.")) {
      errors.push(`${toPosix(relative(change, path))}: root variable outside <Path>`);
    }
    for (const match of text.matchAll(PATH_TAG_RE)) {
      const issue = validatePathValue(match[1]);
      if (issue) errors.push(`${toPosix(relative(change, path))}: invalid Path: ${issue}`);
    }
  }

  return { errors, warnings };
}

function printResults(errors, warnings) {
  for (const warning of warnings) console.log(`WARNING: ${warning}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);
  return errors.length ? 1 : 0;
}

function usage() {
  console.error("Usage: node validate-specdev.mjs [--stage <stage>] [--repo <project-root>] <change-directory> | --self-check");
  return 2;
}

function main(argv) {
  let selfCheckRequested = false;
  let stage = null;
  let repoRoot = null;
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-check") {
      selfCheckRequested = true;
    } else if (arg === "--stage") {
      stage = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--stage=")) {
      stage = arg.slice("--stage=".length);
    } else if (arg === "--repo") {
      repoRoot = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--repo=")) {
      repoRoot = arg.slice("--repo=".length);
    } else if (arg.startsWith("--")) {
      return usage();
    } else {
      positional.push(arg);
    }
  }
  if (stage !== null && !VALID_STAGES.has(stage)) return usage();
  if (selfCheckRequested) {
    if (positional.length || stage !== null) return usage();
    const scriptDirectory = dirname(fileURLToPath(import.meta.url));
    const root = resolve(scriptDirectory, "..", "..");
    const result = selfCheck(root);
    return printResults(result.errors, result.warnings);
  }
  if (positional.length === 1) {
    const result = validateChange(resolve(positional[0]), stage, repoRoot);
    return printResults(result.errors, result.warnings);
  }
  return usage();
}

process.exitCode = main(process.argv.slice(2));
