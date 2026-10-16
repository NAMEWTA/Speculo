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
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, basename, extname, join, relative, resolve, sep, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter as parseYaml, validateSkill } from "../../../../lib/speculo-runtime.mjs";

import * as runtime from "../../../../lib/speculo-runtime.mjs";

import {
  validateTicketPlan, validatePlanMap, validateInvocationCoverage,
  validateGoalMap, validateInitiative, resolveProjectSource, readChangeExecution, readSpecification, resolveToolContext, validateExecutionPolicy, canonicalToolPath, resolveSnapshotContext, readLightweightGoal, validateAcceptanceEvidence,
} from "./plan-contract.mjs";

import { validateChangeClosure, readChangeOwner } from "./change-artifacts.mjs";
import { validateRecord, validateRecords } from "./delivery-artifacts.mjs";
import { readExecutionContext, ticketPolicy, resolveExecutionWorkspace, validateExecutionRecord } from './execution-context.mjs';
import { reviewScopeCLI } from "./review-scope.mjs";
import { hasIndependentReview, validateIndependentReview } from "./review-evidence.mjs";
import { ENGINEERING_KINDS, validateEngineeringArtifacts, validateEngineeringPackage } from "./engineering-evidence.mjs";

const DOMAIN_SCHEMA_VERSION = 3;
const CONFIG_SCHEMA_VERSION = 7;
const GOAL_PLAN_SCHEMA_VERSION = 8;
const IMPLEMENTATION_MAP_SCHEMA_VERSION = 1;
const IMPLEMENTATION_PLAN_SCHEMA_VERSION = 3;
const CHANGE_STATUS_SCHEMA_VERSION = 6;
const GLOBAL_STATUS_SCHEMA_VERSION = 5;
const WORKFLOW_PREFIX = "{roots.workflows}/specdev/";
const STATE_PREFIX = "{roots.state}/specdev/";
const STATE_ROOT_PREFIX = "{roots.state}/";
const REFERENCES_PREFIX = "{roots.references}/";
const SKILLS_PREFIX = "{roots.skills}/";
const COMMANDS_PREFIX = "{roots.commands}/";
const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EXPECTED_WORKS = new Set([
  "specdev-a-archive-and-consolidate",
  "specdev-c-code-review",
  "specdev-d-diagnose-bugs",
  "specdev-g-grill-with-docs",
  "specdev-i-implement",
  "specdev-i-init-setup",
  "specdev-l-learn",
  "specdev-p-goal-plan",
  "specdev-p-prototype",
  "specdev-r-review-architecture",
  "specdev-r-retro",
  "specdev-s-spec",
  "specdev-t-tickets",
  "specdev-t-triage",
  "specdev-w-wayfinder",
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
const VALID_TICKET_KIND = new Set([
  "bug",
  "feature",
  "refactor",
  "investigation",
  "operations",
  "documentation",
  "review",
]);
const VALID_TRIAGE_MODE = new Set(["intake", "reconcile", "publish"]);
const VALID_PUBLISH_ACTION = new Set([
  "not-requested",
  "pending",
  "published",
  "publish-failed",
  "waived",
]);
const VALID_PUBLISH_ROW_STATE = new Set([
  "planned",
  "created",
  "commented",
  "closed",
  "skipped:cancelled",
  "skipped:excluded",
  "failed",
]);
const FORBIDDEN_PUBLISH_LABELS = new Set([
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
  "duplicate",
  "invalid",
  "stale",
]);
const COUNTED_PUBLISH_STATES = new Set(["closed", "created", "commented"]);
const VALID_CAPTURE_ROW_STATE = new Set([
  "planned",
  "open",
  "skipped:duplicate",
  "intaken",
  "waived",
  "failed",
]);
const FORBIDDEN_CAPTURE_LABELS = new Set([
  ...FORBIDDEN_PUBLISH_LABELS,
  "specdev:published",
  "specdev:change",
]);
const COUNTED_CAPTURE_REMOTE_STATES = new Set(["open", "intaken"]);
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
  "learn",
  "pr-delivery",
  "review",
  "prototype",
  "wayfinder",
  "complete",
  "archive-ready",
  "archived",
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
  "Ticket scheduling",
  "Read-only agents",
  "execution-time dynamic",
  "### Change Workspace and Verification",
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
  "publish.md",
  "capture.md",
  "diagnosis.md",
  "source.md",
  "architecture-review.md",
  "wayfinder-map.md",
  "design-tree.json",
  "implementation-orchestration.md",
  "initiative.json",
  "goal-delivery.md",
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
  return runtime.readUtf8ArtifactSync(path);
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

function resolveWorkspaceContract(repoRoot, change, options = {}) {
  try {
    const context = options.readOnlySnapshot ? resolveSnapshotContext(options.readOnlySnapshot) : resolveToolContext(change, { ...options, repoRoot });
    const location = runtime.resolveChangeSync(context, basename(change), { includeArchived: true });
    const errors = canonicalToolPath(context, change) === location.root ? [] : ["change is outside the declared state root"];
    const configPath = join(context.specdevRoot, "config.json");
    const config = existsSync(configPath) ? JSON.parse(readText(runtime.safeWorkPathSync(context.specdevRoot, 'config.json', {mustExist:true,type:'file'}))) : null;
    return { context, errors, config, specdevRoot:context.specdevRoot, stateDeclared:relative(context.projectRoot,context.stateRoot) };
  } catch(error) { return {errors:[String(error)],config:null,specdevRoot:null}; }
}
function findSpecdevConfig(change,repoRoot=null,options={}) {return resolveWorkspaceContract(repoRoot,change,options).config;}

function positiveConfigLimit(config, key, fallback) {
  const value = config?.execution?.[key];
  return Number.isInteger(value) && value >= 1 ? value : fallback;
}

function parseFrontmatter(path) {
  const text=readText(path);
  if(!text.startsWith("---"))return {meta:{},body:text};
  const parsed=parseYaml(text);
  return {meta:parsed.fields,body:parsed.body};
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

// Accept the published long templates and the concise headings without making
// numbering, repeated instructions or a fixed count of implementation steps a gate.
function semanticSection(body, names) {
  const lines = runtime.markdownBodyLines(body);
  const matches = lines.filter(line => {
    const match = /^(#{2,3})\s+(?:\d+\.\s*)?(.+)$/.exec(line.text);
    return match && names.includes(match[2]);
  });
  if (matches.length !== 1) return "";
  const start = matches[0], level = /^#+/.exec(start.text)[0].length;
  const end = lines.find(line => line.line > start.line && /^#{1,3}\s/.test(line.text) && /^#+/.exec(line.text)[0].length <= level);
  return body.split(/\r?\n/).slice(start.line, end ? end.line-1 : undefined).join("\n").trim();
}

function stripPathTag(value) {
  const match = /^<Path>([^<]+)<\/Path>$/.exec(String(value).trim());
  return match ? match[1].trim() : null;
}

function stripInlineCode(value) {
  const trimmed = String(value).trim();
  const match = /^`([^`]+)`$/.exec(trimmed);
  return match ? match[1].trim() : trimmed;
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
  for (const [prefix, name] of [[SKILLS_PREFIX, "skills"], [REFERENCES_PREFIX,"references"], [COMMANDS_PREFIX, "commands"]]) {
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
    "specdev-p-prototype",
    "design-library",
    "research-snapshot",
  );
  const upstreamRoot = join(root, "specdev-p-prototype", "design-library", "upstream");
  const governedEntries = entries.filter(
    (path) => ![frozenResearchRoot, upstreamRoot].some(frozen => path === frozen || path.startsWith(`${frozen}${sep}`)),
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
      } else if (payload.startsWith(REFERENCES_PREFIX) || payload.startsWith(COMMANDS_PREFIX)) {
        const isSkill = payload.startsWith(REFERENCES_PREFIX);
        const prefix = isSkill ? REFERENCES_PREFIX : COMMANDS_PREFIX;
        const referenced = payload.slice(prefix.length);
        if (!PLACEHOLDER_RE.test(referenced)) {
          const templateRoot = resolve(root, "..", "..");
          const target = join(templateRoot, isSkill ? "references" : "commands", referenced);
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

    const workSegment = toPosix(relative(root, path)).split("/")[0];
    const skillRoot = EXPECTED_WORKS.has(workSegment) ? join(root, workSegment) : null;
    const acceptedLinks = [];
    for (const match of text.matchAll(RELATIVE_MD_LINK_RE)) {
      const target = resolve(dirname(path), match[1].split("#")[0]);
      if (skillRoot && target.startsWith(`${skillRoot}${sep}`) && existsSync(target)) acceptedLinks.push(match[0]);
      else errors.push(`${label}:${lineNumber(text, match.index)}: relative Markdown link crosses its Skill package or is missing: ${match[1]}`);
    }
    // Browser assets need executable relative href/src values, not agent Path
    // tags. Accept only existing targets inside the same Work package.
    if (extname(path).toLowerCase() === ".html" && skillRoot) {
      for (const match of text.matchAll(/(?:href|src)=["']([^"'#]+)(?:#[^"']*)?["']/g)) {
        if (/^[a-z]+:|^\/\//i.test(match[1])) continue;
        const target = resolve(dirname(path), match[1]);
        if (target.startsWith(`${skillRoot}${sep}`) && existsSync(target)) acceptedLinks.push(match[0]);
        else errors.push(`${label}: browser asset link crosses its Skill package or is missing: ${match[1]}`);
      }
    }

    let withoutTags = text
      .replace(/`?\s*<Path>.*?<\/Path>\s*`?/gs, "")
      .replace(/`?\s*<Url>.*?<\/Url>\s*`?/gs, "");
    for (const link of acceptedLinks) withoutTags = withoutTags.replaceAll(link, "");
    // This exact JSON field is a change-local data locator, not a static dependency.
    withoutTags = withoutTags.replace(/"workspace_context":\s*"README\.md#execution-context"/g, '"workspace_context": "change-local-anchor"');

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
  for (const path of [join(root,"_state/status.json"),join(root,"specdev-i-init-setup/assets/status-template.json"),join(root,"specdev-i-init-setup/assets/change-status-template.json")]) {
    if (existsSync(path)) errors.push(`retired business status must not be distributed as a new seed: ${toPosix(relative(root,path))}`);
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
  const configTemplatePath = join(root, "specdev-i-init-setup", "assets/config-template.json");
  const configSchemaPath = join(root, "common", "schemas", "config.schema.json");
  const goalPlanSchemaPath = join(root, "common", "schemas", "goal-plan.schema.json");
  const changeSchemaPath = join(root, "common", "schemas", "change-status.schema.json");
  const implementationMapSchemaPath = join(root, "common", "schemas", "implementation-map.schema.json");
  const implementationPlanSchemaPath = join(root, "common", "schemas", "implementation-plan.schema.json");

  for (const path of [
    configTemplatePath,
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
    !Number.isInteger(configTemplate.execution?.max_concurrent_implementations) ||
    configTemplate.execution.max_concurrent_implementations < 1 ||
    !Number.isInteger(configTemplate.execution?.max_integration_attempts) ||
    configTemplate.execution.max_integration_attempts < 1 ||
    !Number.isInteger(configTemplate.planning?.ui_design_default_candidates) ||
    !Number.isInteger(configTemplate.planning?.ui_design_max_candidates) ||
    configTemplate.planning.ui_design_default_candidates < 2 ||
    configTemplate.planning.ui_design_max_candidates > 4 ||
    configTemplate.planning.ui_design_max_candidates < configTemplate.planning.ui_design_default_candidates
  ) {
    errors.push("config-template.json must define SpecDev config v7 with positive execution limits and valid UI design candidate bounds");
  }
  for (const obsolete of ["auto_commit", "worktree_for_parallel", "max_parallel"]) {
    if (JSON.stringify(configTemplate).includes(`\"${obsolete}\"`)) {
      errors.push(`config-template.json still contains obsolete execution field ${obsolete}`);
    }
  }

  const configSchema = JSON.parse(readText(configSchemaPath));
  const limit = configSchema.properties?.execution?.properties?.max_concurrent_implementations;
  if (
    configSchema.$id !== "urn:speculo:specdev:config:v7" ||
    configSchema.properties?.schema_version?.const !== CONFIG_SCHEMA_VERSION ||
    limit?.minimum !== 1 ||
    configSchema.properties?.execution?.properties?.max_integration_attempts?.minimum !== 1 ||
    configSchema.additionalProperties !== false
  ) {
    errors.push("config.schema.json must define the strict SpecDev config v7 execution contract");
  }

  const goalPlanSchema = JSON.parse(readText(goalPlanSchemaPath));
  if (
    goalPlanSchema.$id !== "urn:speculo:specdev:goal-plan:v8" ||
    goalPlanSchema.properties?.schema_version?.const !== GOAL_PLAN_SCHEMA_VERSION ||
    goalPlanSchema.properties?.orchestration?.const !== "lead-directed" ||
    goalPlanSchema.properties?.concurrent_implementation_limit?.minimum !== 1 ||
    goalPlanSchema.properties?.integration_attempt_limit?.minimum !== 1 ||
    !["auto", "serial", "parallel"].every((value) => goalPlanSchema.properties?.ticket_execution?.enum?.includes(value)) ||
    goalPlanSchema.properties?.max_parallel_tickets?.minimum !== 1 ||
    goalPlanSchema.additionalProperties !== false
  ) {
    errors.push("goal-plan.schema.json must define the strict Lead-directed Goal Plan v7 workspace strategy contract");
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
    implementationPlanSchema.$id !== "urn:speculo:specdev:implementation-plan:v3" ||
    implementationPlanSchema.properties?.schema_version?.const !== IMPLEMENTATION_PLAN_SCHEMA_VERSION ||
    implementationPlanSchema.properties?.orchestration?.const !== "lead-directed" ||
    implementationPlanSchema.properties?.concurrent_implementation_limit?.minimum !== 1 ||
    implementationPlanSchema.properties?.integration_attempt_limit?.minimum !== 1 ||
    !["auto", "serial", "parallel"].every((value) => implementationPlanSchema.properties?.ticket_execution?.enum?.includes(value)) ||
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
        join(root, "specdev-i-init-setup", "SKILL.md"),
        [
          "first-setup.md",
          "current-facts-docs.md",
          "必要偏好",
          "README",
          "specdev-worktree/",
        ],
      ],
    ],
    [
      "triage",
      [
        join(root, "specdev-t-triage", "SKILL.md"),
        ["intake", "reconcile", "publish", "capture", "capture.md", "pr-delivery", "ci-security", "release-preflight", "recover", "remote-operations.md"],
      ],
    ],
    [
      "spec",
      [
        join(root, "specdev-s-spec", "SKILL.md"),
        ["用户端到端行为", "验收合同", "代码", "CONTEXT", "ADR", "验证接缝", "ready_for_tickets"],
      ],
    ],
    [
      "tickets",
      [
        join(root, "specdev-t-tickets", "SKILL.md"),
        ["Prefactor", "垂直切片", "Expand", "与用户核对", "Definition of Ready"],
      ],
    ],
    [
      "goal-plan",
      [
        join(root, "specdev-p-goal-plan", "SKILL.md"),
        [
          "Outcome",
          "权威来源",
          "DAG",
          "Gate",
          "Wave",
          "lead-directed",
          "concurrent_implementation_limit",
          "ticket_execution",
          "lead-orchestration.md",
          "Definition of Done",
        ],
      ],
    ],
    [
      "implement",
      [
        join(root, "specdev-i-implement", "SKILL.md"),
        ["codebase-design", "design-it-twice", "TDD", "双轴审查", "Evidence", "change 工作区", "共享编排方法", "checkpoint"],
      ],
    ],
    [
      "code-review",
      [
        join(root, "specdev-c-code-review", "SKILL.md"),
        ["--review-scope", "baseline", "range", "commit", "pr", "no-diff", "固定点", "标准轴", "规范轴", "未合并排名", "reviews/CR-###.md"],
      ],
    ],
    [
      "prototype",
      [
        join(root, "specdev-p-prototype", "SKILL.md"),
        ["设计定向", "风格", "design-system.md", "comparison", "HTML/CSS/JS", "design-library/INDEX.md"],
      ],
    ],
    [
      "learn",
      [
        join(root, "specdev-l-learn", "SKILL.md"),
        ["需求参考", "零专业背景", "$ARGUMENTS", "ASCII", "learning-change.md", "learning/index.md", "{number}_{topic}.md", "{roots.state}/learning/"],
      ],
    ],
    [
      "wayfinder",
      [
        join(root, "specdev-w-wayfinder", "SKILL.md"),
        ["共享地图", "调查认领", "wayfinder:prototype", "wayfinder:grilling", "solution comment", "每个会话"],
      ],
    ],
    [
      "architecture-review",
      [
        join(root, "specdev-r-review-architecture", "SKILL.md"),
        ["结构性坏味道", "code-judo", "删除测试", "高置信候选", "最佳推荐"],
      ],
    ],
    [
      "architecture-review-rubric",
      [
        join(root, "specdev-r-review-architecture", "references/review-rubric.md"),
        ["删除测试", "文件大小", "高置信候选", "spaghetti growth"],
      ],
    ],
    [
      "archive",
      [
        join(root, "specdev-a-archive-and-consolidate", "SKILL.md"),
        ["archive-single", "dry-run", "external_action", "publish_action", "consolidate-from-code", "archive-and-consolidate"],
      ],
    ],
    [
      "grill",
      [
        join(root, "specdev-g-grill-with-docs", "SKILL.md"),
        ["完整 frontier", "design-tree.json", "LOG.md", "CONTEXT.md", "ADR.md", "推荐答案", "永久 namespace 对 G 只读"],
      ],
    ],
    [
      "diagnosis",
      [
        join(root, "specdev-d-diagnose-bugs", "SKILL.md"),
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
  for (const required of [
    "common/rules/codebase-design.md",
    "common/schemas/design-tree.schema.json",
    "common/schemas/wayfinder-ticket.schema.json",
    "specdev-g-grill-with-docs/assets/design-tree-template.json",
    "specdev-w-wayfinder/references/local-tracker-contract.md",
    "specdev-w-wayfinder/assets/solution-comment-template.md",
    "common/rules/parent-implementation-orchestration.md",
    "common/schemas/implementation-map.schema.json",
    "common/schemas/implementation-plan.schema.json",
    "common/schemas/capture.schema.json",
    "specdev-t-triage/references/capture-protocol.md",
    "specdev-t-triage/assets/capture-template.md",
    "specdev-t-triage/assets/issue-record-template.md",
    "specdev-t-triage/scripts/capture-status.mjs",
  ]) {
    if (!isFile(join(root, required))) errors.push(`missing architecture/wayfinding contract ${required}`);
  }

  const mapTemplate = join(root, "specdev-w-wayfinder", "assets/wayfinder-map-template.md");
  if (isFile(mapTemplate) && /^## (?:开放 Tickets|调查清单)/m.test(readText(mapTemplate))) {
    errors.push("Wayfinder map template must query open Tickets instead of caching them");
  }

  const goalPlanTemplate = join(root, "specdev-p-goal-plan", "assets/goal-plan-template.md");
  if (!isFile(goalPlanTemplate)) {
    errors.push("missing Goal Plan template");
  } else {
    const text = readText(goalPlanTemplate);
    for (const required of [
      "schema_version: 8",
      "orchestration: lead-directed",
      "ticket_execution: auto",
      "integration_attempt_limit: 3",

      ...REQUIRED_LEAD_GOAL_PLAN_MARKERS,
      "Change workspace verification",
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

  if (!isFile(join(root, "SKILL.md"))) errors.push("missing domain Skill");

  const actualWorks = new Set(
    readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^specdev-[a-z]-/.test(entry.name))
      .map((entry) => entry.name),
  );
  const missingWorks = [...EXPECTED_WORKS].filter((name) => !actualWorks.has(name));
  const extraWorks = [...actualWorks].filter((name) => !EXPECTED_WORKS.has(name));
  if (missingWorks.length) errors.push(`missing workflow directories: ${JSON.stringify(missingWorks.sort())}`);
  if (extraWorks.length) warnings.push(`unexpected workflow directories: ${JSON.stringify(extraWorks.sort())}`);

  const ids = [];
  for (const directoryName of [...actualWorks].sort()) {
    const entry = join(root, directoryName, "SKILL.md");
    if (!isFile(entry)) {
      errors.push(`missing work entry ${toPosix(relative(root, entry))}`);
      continue;
    }
    const { meta } = parseFrontmatter(entry);
    errors.push(...validateSkill(readText(entry),directoryName).map(error=>entry+": "+error));
    if(meta.metadata?.["speculo-kind"]!=="work-skill" || meta.metadata?.["speculo-domain"]!=="specdev")errors.push(entry+": invalid Work metadata");
    const id=meta.metadata?.["speculo-id"];
    if(typeof id!=="string"||!id.startsWith("specdev/"))errors.push(entry+": invalid work id");else ids.push(id);
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
  errors.push(...validateEngineeringPackage(root));
  // Run real runner regressions; these tests never recursively request self-check.
  try {
    execFileSync(process.execPath, ["--test", join(root, "common", "tools", "tests", "engineering.test.mjs")], {
      encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    errors.push(`engineering regressions failed: ${error.stdout ?? ""}${error.stderr ?? error.message}`);
  }

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
  if (meta.schema_version !== 2 || meta.artifact !== "triage") {
    errors.push("triage.md: artifact/schema_version must be triage/2");
  }
  if (meta.schema_version === 2) {
    if (!["needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "wontfix"].includes(meta.disposition)) errors.push("triage.md: invalid disposition");
    if (!["pending", "passed", "failed", "unknown"].includes(meta.verification)) errors.push("triage.md: invalid verification");
    if (!Array.isArray(meta.remote_actions) || meta.remote_actions.some(v => typeof v !== "string")) errors.push("triage.md: remote_actions must be an array of locators");
    if (meta.disposition === "ready-for-agent" && meta.verification !== "passed") errors.push("triage.md: ready-for-agent requires passed verification");
  }
  if (meta.change !== expectedChange) errors.push("triage.md: change must equal directory name");
  if (!VALID_TRIAGE_MODE.has(meta.mode)) errors.push(`triage.md: invalid mode ${meta.mode}`);
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
  const publishAction = meta.publish_action == null || meta.publish_action === ""
    ? "not-requested"
    : meta.publish_action;
  if (!VALID_PUBLISH_ACTION.has(publishAction)) {
    errors.push(`triage.md: invalid publish_action ${meta.publish_action}`);
  }
  meta.publish_action = publishAction;
  const prefix = `<Path>{roots.state}/specdev/changes/${expectedChange}/`;
  const sourceRef = typeof meta.source === "string" ? meta.source.replaceAll("{change}", expectedChange) : "";
  const localSource = sourceRef.startsWith(prefix) && sourceRef.endsWith("</Path>") ? sourceRef.slice(prefix.length, -7) : null;
  if (!localSource || !/^(?:source\.md|sources\/SRC-[0-9]{3,}\.md)$/.test(localSource)) errors.push("triage.md: source must reference a local source artifact in this change");
  else if (localSource !== "source.md") {
    const selected = validateSource(join(dirname(path),localSource),expectedChange,errors);
    const previous = typeof selected?.meta.supersedes_source === "string" ? selected.meta.supersedes_source.replaceAll("{change}",expectedChange) : "";
    const previousLocal = previous.startsWith(prefix) && previous.endsWith("</Path>") ? previous.slice(prefix.length,-7) : "";
    if (!/^(?:source\.md|sources\/SRC-[0-9]{3,}\.md)$/.test(previousLocal) || previousLocal === localSource || !isFile(join(dirname(path),previousLocal))) errors.push("triage.md: evolved snapshot requires an existing distinct supersedes_source in this change");
  }
  for (const heading of ["## 当前判定", "## 未知项", "## 路由", "## 外部动作"]) {
    if (!body.includes(heading)) errors.push(`triage.md: missing '${heading}'`);
  }
  if (publishAction !== "not-requested" && !body.includes("## 发布投影")) {
    errors.push("triage.md: missing '## 发布投影'");
  }
  return { path, meta, body };
}

function parsePublishLedger(body) {
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /^\|\s*ticket\s*\|/i.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const inner = cells.slice(1, cells.length - 1);
    if (inner.length < 8) continue;
    rows.push({
      ticket: inner[0],
      kind: inner[1],
      labels: inner[2],
      number: inner[3],
      url: inner[4],
      marker: inner[5],
      sha256: inner[6],
      state: inner[7],
    });
  }
  return rows;
}

function validatePublish(path, expectedChange, triage, errors) {
  if (!isFile(path)) {
    errors.push("missing publish.md ledger");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  const required = [
    "schema_version",
    "artifact",
    "change",
    "mode",
    "repo",
    "publish_action",
    "include_cancelled",
    "origin",
    "updated_at",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`publish.md: missing keys ${JSON.stringify(missing)}`);
  if (meta.schema_version !== 1 || meta.artifact !== "publish") {
    errors.push("publish.md: artifact/schema_version must be publish/1");
  }
  if (meta.change !== expectedChange) errors.push("publish.md: change must equal directory name");
  if (meta.mode !== "publish") errors.push(`publish.md: invalid mode ${meta.mode}`);
  if (!new Set(["pending", "published", "publish-failed", "waived"]).has(meta.publish_action)) {
    errors.push(`publish.md: invalid publish_action ${meta.publish_action}`);
  }
  if (!new Set(["local", "intake"]).has(meta.origin)) {
    errors.push(`publish.md: invalid origin ${meta.origin}`);
  }
  if (typeof meta.repo !== "string" || !/.+\/.+/.test(meta.repo)) {
    errors.push("publish.md: repo must be owner/repo");
  }
  for (const heading of ["## 发布计划", "## 账本", "## 计数", "## 重试"]) {
    if (!body.includes(heading)) errors.push(`publish.md: missing '${heading}'`);
  }
  const rows = parsePublishLedger(body);
  if (!rows.length) errors.push("publish.md: ledger table has no ticket rows");
  const mixed = triage && triage.meta.classification === "mixed";
  for (const row of rows) {
    if (!/^T-\d{2,}$/.test(row.ticket)) {
      errors.push(`publish.md: invalid ticket id ${row.ticket}`);
    }
    if (!VALID_PUBLISH_ROW_STATE.has(row.state)) {
      errors.push(`publish.md: ${row.ticket}: invalid state ${row.state}`);
    }
    const labels = row.labels.split(",").map((item) => item.trim()).filter(Boolean);
    for (const label of labels) {
      if (FORBIDDEN_PUBLISH_LABELS.has(label)) {
        errors.push(`publish.md: ${row.ticket}: forbidden label ${label}`);
      }
    }
    const skipped = row.state.startsWith("skipped:");
    if (!skipped && !VALID_TICKET_KIND.has(row.kind)) {
      errors.push(`publish.md: ${row.ticket}: invalid kind ${row.kind}`);
    }
    if (mixed && !skipped && !VALID_TICKET_KIND.has(row.kind)) {
      errors.push(`publish.md: mixed change requires kind on ${row.ticket}`);
    }
    if (COUNTED_PUBLISH_STATES.has(row.state) || row.state === "closed") {
      if (!/^\d+$/.test(row.number)) {
        errors.push(`publish.md: ${row.ticket}: ${row.state} row requires issue number`);
      }
      if (!String(row.url).startsWith("https://github.com/")) {
        errors.push(`publish.md: ${row.ticket}: ${row.state} row requires GitHub url`);
      }
      const expectedMarker = `specdev:${expectedChange}:${row.ticket}:published`;
      if (row.marker !== expectedMarker) {
        errors.push(`publish.md: ${row.ticket}: marker must be ${expectedMarker}`);
      }
    }
    if (row.state === "closed" || row.state === "created" || row.state === "commented") {
      if (!labels.includes("specdev:published")) {
        errors.push(`publish.md: ${row.ticket}: missing specdev:published`);
      }
      const originLabel = meta.origin === "intake" ? "origin:intake" : "origin:local";
      if (!labels.includes(originLabel)) {
        errors.push(`publish.md: ${row.ticket}: missing ${originLabel}`);
      }
    }
  }
  return { path, meta, body, rows };
}

function parseCaptureLedger(body) {
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /^\|\s*id\s*\|/i.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const inner = cells.slice(1, cells.length - 1);
    if (inner.length < 9) continue;
    rows.push({
      id: inner[0],
      kind: inner[1],
      title: inner[2],
      labels: inner[3],
      number: inner[4],
      url: inner[5],
      marker: inner[6],
      sha256: inner[7],
      state: inner[8],
    });
  }
  return rows;
}

function validateCapture(path, errors) {
  if (!isFile(path)) {
    errors.push("missing capture.md ledger");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  const required = [
    "schema_version",
    "artifact",
    "mode",
    "repo",
    "updated_at",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`capture.md: missing keys ${JSON.stringify(missing)}`);
  if (meta.schema_version !== 1 || meta.artifact !== "capture-index") {
    errors.push("capture.md: artifact/schema_version must be capture-index/1");
  }
  if (meta.mode !== "capture") errors.push(`capture.md: invalid mode ${meta.mode}`);
  if (typeof meta.repo !== "string" || !/.+\/.+/.test(meta.repo)) {
    errors.push("capture.md: repo must be owner/repo");
  }
  for (const heading of ["## 捕获计划", "## 账本", "## 计数", "## 重试"]) {
    if (!body.includes(heading)) errors.push(`capture.md: missing '${heading}'`);
  }
  const rows = parseCaptureLedger(body);
  for (const row of rows) {
    if (!CHANGE_NAME.test(row.id)) {
      errors.push(`capture.md: invalid id ${row.id}`);
    }
    if (!VALID_CAPTURE_ROW_STATE.has(row.state)) {
      errors.push(`capture.md: ${row.id}: invalid state ${row.state}`);
    }
    const labels = row.labels.split(",").map((item) => item.trim()).filter(Boolean);
    for (const label of labels) {
      if (FORBIDDEN_CAPTURE_LABELS.has(label)) {
        errors.push(`capture.md: ${row.id}: forbidden label ${label}`);
      }
    }
    const skipped = row.state.startsWith("skipped:") || row.state === "waived" || row.state === "planned" || row.state === "failed";
    if (!skipped && !VALID_TICKET_KIND.has(row.kind)) {
      errors.push(`capture.md: ${row.id}: invalid kind ${row.kind}`);
    }
    if (COUNTED_CAPTURE_REMOTE_STATES.has(row.state)) {
      if (!VALID_TICKET_KIND.has(row.kind)) {
        errors.push(`capture.md: ${row.id}: invalid kind ${row.kind}`);
      }
      if (!/^\d+$/.test(row.number)) {
        errors.push(`capture.md: ${row.id}: ${row.state} row requires issue number`);
      }
      if (!String(row.url).startsWith("https://github.com/")) {
        errors.push(`capture.md: ${row.id}: ${row.state} row requires GitHub url`);
      }
      const expectedMarker = `specdev:capture:${row.id}`;
      if (row.marker !== expectedMarker) {
        errors.push(`capture.md: ${row.id}: marker must be ${expectedMarker}`);
      }
      if (!labels.includes("specdev:captured")) {
        errors.push(`capture.md: ${row.id}: missing specdev:captured`);
      }
      if (!labels.includes("origin:local")) {
        errors.push(`capture.md: ${row.id}: missing origin:local`);
      }
      if (labels.includes("origin:intake")) {
        errors.push(`capture.md: ${row.id}: capture origin must be local`);
      }
    }
  }
  return { path, meta, body, rows };
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
  if (["minimizing", "testing-hypotheses", "root-cause-confirmed"].includes(meta.status) && meta.feedback_loop_ready !== true) {
    errors.push("diagnosis.md: advanced diagnosis requires ready feedback loop and real red evidence");
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

function validateReviews(change, required, errors, repoRoot = null) {
  const root = join(change, "reviews");
  const paths = isDirectory(root)
    ? readdirSync(root).filter((name) => /^CR-\d{3,}\.md$/.test(name)).sort().map((name) => join(root, name))
    : [];
  if (required && !paths.length) errors.push("review stage requires a CR-###.md report");
  const latest = [...paths].sort((a,b) => Number(basename(a).match(/\d+/)[0])-Number(basename(b).match(/\d+/)[0])).at(-1);
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
    // Historical CRs remain readable. Only the current review or an explicitly
    // supplied new record is checked against the independent execution contract.
    if (required && path === latest || hasIndependentReview(path)) {
      errors.push(...validateIndependentReview(change, toPosix(relative(change,path)), {repoRoot,requirePassed:meta.status === 'approved',expectedResults:{standards:meta.standards_result,specification:meta.specification_result},expectedHead:meta.head,checkCurrent:required && path === latest}));
      if (meta.status === 'approved' && (meta.standards_result !== 'pass' || meta.specification_result !== 'pass')) errors.push(`${basename(path)}: approved requires both review axes to pass`);
    }
  }
  return paths;
}

function validatePrototypes(change, required, errors, prototypeId = null, consumingDesign = false, context = null) {
  const root = join(change, "prototypes");
  const changeDesign = isFile(join(change, "DESIGN.md")) ? parseFrontmatter(join(change, "DESIGN.md")).meta : null;
  const boundId = changeDesign?.prototype_ref?.id;
  if (!isDirectory(root)) {
    if (required || boundId) errors.push("prototype stage requires a prototypes/UI-NNN/design-system.md artifact");
    return [];
  }

  const validator = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "specdev-p-prototype",
    "scripts",
    "validate-design-package.mjs",
  );
  const paths = [];
  let readyCount = 0;
  const candidates = readdirSync(root).filter(name => /^(?:UI|LOGIC)-\d{3,}$/.test(name));
  if (required && !prototypeId && candidates.length !== 1) errors.push("prototype stage requires --prototype-id when multiple packages exist");
  const selectedId = prototypeId ?? (required && candidates.length === 1 ? candidates[0] : !required ? boundId : null);
  if (selectedId && !candidates.includes(selectedId)) errors.push(`prototype not found: ${selectedId}`);

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    const label = toPosix(relative(change, entryPath));
    if (selectedId && entry.name !== selectedId) continue;
    if (entry.isSymbolicLink()) {
      errors.push(`${label}: prototype design directories and files must not be symlinks`);
      continue;
    }
    if (!entry.isDirectory()) {
      errors.push(`${label}: prototypes may only contain UI-NNN or LOGIC-NNN directories`);
      continue;
    }
    if (/^LOGIC-\d{3,}$/.test(entry.name)) {
      const logic = validateRecord(join(entryPath, "logic.md"), "logic-prototype", parseFrontmatter, basename(change));
      errors.push(...logic.errors);
      if (logic.meta.status === "ready" && logic.errors.length === 0) readyCount++;
      paths.push(join(entryPath, "logic.md"));
      continue;
    }
    if (!/^UI-\d{3,}$/.test(entry.name)) {
      errors.push(`${label}: prototype design directory must use UI-NNN or LOGIC-NNN`);
      continue;
    }

    const designPath = join(entryPath, "design-system.md");
    if (!isFile(designPath)) {
      errors.push(`${label}: missing design-system.md`);
      continue;
    }
    paths.push(designPath);
    const { meta } = parseFrontmatter(designPath);
    if (consumingDesign && entry.name === boundId && meta.status !== "ready") errors.push(`${label}: bound UI prototype must be ready before downstream consumption`);
    if (meta.status === "ready") readyCount += 1;
    try {
      execFileSync(process.execPath, [validator, ...contextArguments(context), ...(consumingDesign && entry.name === boundId ? ["--check-ready"] : []), designPath], {
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

  const scanRoot = selectedId && isDirectory(join(root, selectedId)) ? join(root, selectedId) : root;
  const obsoleteRecords = walk(scanRoot).filter(
    (path) => isFile(path) && basename(path) === "record.md",
  );
  for (const path of obsoleteRecords) {
    errors.push(`${toPosix(relative(change, path))}: obsolete prototype record is forbidden; use UI-NNN/design-system.md`);
  }
  const discoveredDesigns = walk(scanRoot).filter(
    (path) => isFile(path) && basename(path) === "design-system.md",
  );
  for (const path of discoveredDesigns) {
    if (!paths.includes(path)) {
      errors.push(`${toPosix(relative(change, path))}: design-system.md must be directly under prototypes/UI-NNN`);
    }
  }
  if (required && readyCount === 0) {
    errors.push("prototype stage requires the selected ready UI or logic design package");
  }
  return paths;
}

function validateChangeLearning(change, required, errors) {
  const learningRoot = join(change, "learning");
  const indexPath = join(learningRoot, "index.md");
  const diagramName = /^\d{2,}_[\p{L}\p{N}_-]+\.md$/u;

  if (!existsSync(learningRoot)) {
    if (required) errors.push("learn stage requires learning/index.md");
    return null;
  }
  if (lstatSync(learningRoot).isSymbolicLink() || !isDirectory(learningRoot)) {
    errors.push("learning/: change learning directory must be a real directory");
    return null;
  }

  const diagramFiles = [];
  const diagramNumbers = new Set();
  for (const entry of readdirSync(learningRoot, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      errors.push(`learning/${entry.name}: learning artifacts must not be symlinks`);
    } else if (entry.isFile() && diagramName.test(entry.name)) {
      diagramFiles.push(entry.name);
      const number = Number(entry.name.split("_")[0]);
      if (diagramNumbers.has(number)) errors.push(`learning/${entry.name}: duplicate diagram number ${number}`);
      diagramNumbers.add(number);
    }
  }
  diagramFiles.sort();

  if (!isFile(indexPath)) {
    errors.push("learn stage requires learning/index.md");
    return null;
  }

  const index = readText(indexPath);
  // Historical titles remain readable without rewriting existing learning records.
  if (!/^# (?:Change )?学习图解索引\s*$/m.test(index)) {
    errors.push("learning/index.md: missing index heading");
  }
  const entries = Array.from(
    index.matchAll(/^\|\s*(\d{2,})\s*\|\s*([^|\s]+\.md)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*$/gm),
  );
  if (!entries.length && required) {
    errors.push("learning/index.md: requires at least one diagram entry");
  }

  const indexedFiles = new Set();
  let previousNumber = 0;
  for (const entry of entries) {
    const [, number, fileName, topic, summary] = entry;
    const numericNumber = Number(number);
    if (!diagramName.test(fileName)) {
      errors.push(`learning/index.md: invalid diagram filename '${fileName}'`);
      continue;
    }
    if (numericNumber <= previousNumber) {
      errors.push("learning/index.md: diagram numbers must increase");
    }
    if (numericNumber !== previousNumber + 1) {
      errors.push("learning/index.md: diagram numbers must start at 01 and be continuous");
    }
    previousNumber = numericNumber;
    if (!fileName.startsWith(`${number}_`)) {
      errors.push(`learning/index.md: '${fileName}' must start with '${number}_'`);
    }
    if (!topic.trim() || !summary.trim()) {
      errors.push(`learning/index.md: '${fileName}' requires a topic and summary`);
    }
    indexedFiles.add(fileName);
  }

  for (const fileName of diagramFiles) {
    if (!indexedFiles.has(fileName)) {
      errors.push(`learning/index.md: missing entry for '${fileName}'`);
    }
  }
  for (const fileName of indexedFiles) {
    if (!diagramFiles.includes(fileName)) {
      errors.push(`learning/index.md: '${fileName}' does not exist`);
    }
  }

  for (const fileName of diagramFiles) {
    const markdown = readText(join(learningRoot, fileName));
    for (const heading of ["## 先看全图", "## 一步一步看", "## 术语小词典", "## 你现在能复述什么"]) {
      if (!markdown.includes(heading)) errors.push(`learning/${fileName}: missing '${heading}'`);
    }
    if (!/```(?:text)?\s*[\s\S]*?(?:->|\||\+--)[\s\S]*?```/.test(markdown)) {
      errors.push(`learning/${fileName}: requires an ASCII diagram in a fenced code block`);
    }
    if (
      /<\/?(?:html|head|body|svg|canvas|img|picture)\b/i.test(markdown) ||
      /!\[[^\]]*\]\([^)]+\)/.test(markdown)
    ) {
      errors.push(`learning/${fileName}: must be pure Markdown without HTML or image dependencies`);
    }
  }
  return indexPath;
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
    const unresolved = semanticSection(body, ["未决问题"]);
    if (unresolved && !/^无[。.]?$/.test(unresolved.trim())) {
      errors.push(`${label}: ready Spec has unresolved high-impact questions`);
    }
    for (const heading of ["问题与目标", "解决方案与外部行为", "验收合同", "范围", "验证策略"]) {
      if (!semanticSection(body,[heading])) errors.push(`${label}: ready Spec missing '${heading}' content`);
    }
  }
  return { path, meta, body };
}

function validateProjectSkillMatrix(body, label, errors, repoRoot = null) {
  const section = sectionBody(body, "### 项目 Skill 读取矩阵");
  if (!section) return [];

  const lines = section.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((line) =>
    line.startsWith("|") &&
    line.includes("Applies To") &&
    line.includes("Project Skill") &&
    line.includes("Trigger / Scope") &&
    line.includes("Read Timing") &&
    line.includes("Purpose"),
  );
  if (headerIndex < 0) {
    errors.push(`${label}: project Skill matrix is missing the required five-column header`);
    return [];
  }

  const entries = [];
  const seenSkillPaths = new Set();
  for (const line of lines.slice(headerIndex + 1)) {
    if (!line.startsWith("|")) continue;
    if (/^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(line)) continue;
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (cells.length !== 5) {
      errors.push(`${label}: project Skill matrix row must contain five columns: ${line}`);
      continue;
    }

    const appliesTo = stripInlineCode(cells[0]).split(/[\s,]+/).filter(Boolean);
    if (!appliesTo.length || appliesTo.some((value) => value !== "ALL" && !/^T-\d{2,}$/.test(value))) {
      errors.push(`${label}: invalid project Skill Applies To value '${cells[0]}'`);
      continue;
    }
    if (new Set(appliesTo).size !== appliesTo.length) {
      errors.push(`${label}: duplicate project Skill Applies To value '${cells[0]}'`);
    }
    for (const [column, value] of [
      ["Trigger / Scope", cells[2]],
      ["Read Timing", cells[3]],
      ["Purpose", cells[4]],
    ]) {
      if (!value || value === "...") errors.push(`${label}: project Skill ${column} must be explicit`);
    }

    const skillValue = stripInlineCode(cells[1]);
    if (skillValue.startsWith("无")) {
      if (!`${skillValue} ${cells[2]}`.includes("已扫描")) {
        errors.push(`${label}: no-project-Skill row must record the scanned scope`);
      }
      entries.push({ appliesTo: new Set(appliesTo), path: null });
      continue;
    }

    const skillPath = stripPathTag(skillValue);
    if (!skillPath) {
      errors.push(`${label}: project Skill must be a Path-tagged SKILL.md or an explicit no-Skill row`);
      continue;
    }
    const pathIssue = validatePathValue(skillPath);
    if (pathIssue) errors.push(`${label}: invalid project Skill Path ${skillPath}: ${pathIssue}`);
    if (skillPath.includes("{roots.")) {
      errors.push(`${label}: project Skill Path must be project-relative, not a Speculo root Path: ${skillPath}`);
    }
    if (!skillPath.endsWith("/SKILL.md")) {
      errors.push(`${label}: project Skill Path must end with /SKILL.md: ${skillPath}`);
    }
    if (PLACEHOLDER_RE.test(skillPath)) {
      errors.push(`${label}: project Skill Path contains an unresolved placeholder: ${skillPath}`);
    }
    if (seenSkillPaths.has(skillPath)) {
      errors.push(`${label}: duplicate project Skill Path ${skillPath}; combine its Applies To values`);
    }
    seenSkillPaths.add(skillPath);

    if (repoRoot && !pathIssue && !skillPath.includes("{roots.") && !PLACEHOLDER_RE.test(skillPath)) {
      const resolvedRepo = resolve(repoRoot);
      const resolvedSkill = resolve(resolvedRepo, normalizeProjectPath(skillPath));
      const relativeSkill = relative(resolvedRepo, resolvedSkill);
      if (relativeSkill === "" || relativeSkill.split(sep)[0] === "..") {
        errors.push(`${label}: project Skill Path escapes the project root: ${skillPath}`);
      } else if (!isFile(resolvedSkill)) {
        errors.push(`${label}: project Skill does not exist under --repo: ${skillPath}`);
      } else {
        try { resolveProjectSource(resolvedRepo, `<Path>${skillPath}</Path>`); }
        catch (error) { errors.push(`${label}: ${error.message}`); }
      }
    }
    entries.push({ appliesTo: new Set(appliesTo), path: skillPath });
  }

  if (!entries.length) errors.push(`${label}: project Skill matrix contains no data rows`);
  const allNoSkill = entries.some((entry) => entry.path === null && entry.appliesTo.has("ALL"));
  if (allNoSkill && entries.some((entry) => entry.path !== null)) {
    errors.push(`${label}: an ALL no-project-Skill row conflicts with listed project Skills`);
  }
  return entries;
}

function validateProjectSkillCoverage(matrix, ticketIds, label, errors) {
  if (!matrix.length) return;
  const knownTicketIds = new Set(ticketIds);
  for (const entry of matrix) {
    for (const appliesTo of entry.appliesTo) {
      if (appliesTo !== "ALL" && !knownTicketIds.has(appliesTo)) {
        errors.push(`${label}: project Skill matrix references missing Ticket ${appliesTo}`);
      }
    }
  }
  for (const ticketId of knownTicketIds) {
    if (!matrix.some((entry) => entry.appliesTo.has("ALL") || entry.appliesTo.has(ticketId))) {
      errors.push(`${label}: project Skill matrix does not cover ${ticketId}`);
    }
  }
}

function validateMap(path, errors, repoRoot = null) {
  if (!isFile(path)) {
    errors.push("missing Tickets Map");
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  if (meta.artifact === "goal-tickets-map") {
    errors.push(...validateGoalMap({ path, meta, body }, dirname(path)).map(error => `${basename(path)}: ${error}`));
    return { path, meta, body, projectSkillMatrix: [], goalMap: true };
  }
  errors.push(...validatePlanMap({ path, meta, body }, dirname(path)).map(error => `${basename(path)}: ${error}`));
  if (meta.artifact !== "tickets-map" || meta.schema_version !== DOMAIN_SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be tickets-map/${DOMAIN_SCHEMA_VERSION}`);
  }
  for (const heading of [
    "### 总体实施背景",
    "### 项目 Skill 读取矩阵",
    "## 2. 执行清单",
    "## 3. 依赖 DAG",
    "## 4. 合同覆盖矩阵",
    "## 5. 并行与路径所有权",
  ]) {
    if (!body.includes(heading)) errors.push(`${basename(path)}: missing '${heading}'`);
  }
  const projectSkillMatrix = validateProjectSkillMatrix(body, basename(path), errors, repoRoot);
  return { path, meta, body, projectSkillMatrix };
}

function validateGoalPlan(path, errors) {
  if (!isFile(path)) { errors.push(`missing Goal Plan: ${basename(path)}`); return null; }
  const {meta,body} = parseFrontmatter(path);
  if (meta.schema_version === 7 && /^Outcome: completed$/m.test(readText(join(dirname(path),'README.md')))) return validateLegacyGoalPlan(path,errors);
  const schema = JSON.parse(readText(fileURLToPath(new URL('../schemas/goal-plan.schema.json', import.meta.url))));
  if (/^## (?:Delegated Execution|Isolated Workspace) Addendum$/m.test(body)) errors.push('goal-plan.md: obsolete Goal Plan addendum');
  for (const key of schema.required) if (!(key in meta)) errors.push(`${basename(path)}: missing ${key}`);
  for (const key of Object.keys(meta)) if (!(key in schema.properties)) errors.push(`${basename(path)}: obsolete or unexpected field ${key}; explicit reconciliation required`);
  if (meta.schema_version !== GOAL_PLAN_SCHEMA_VERSION || meta.artifact !== 'goal-plan') errors.push('goal-plan.md: requires schema v8; explicit reconciliation required');
  if (meta.orchestration !== 'lead-directed' || typeof meta.lead !== 'string' || !meta.lead.trim()) errors.push('goal-plan.md: needs a recoverable Lead');
  if (!Array.isArray(meta.modes) || meta.modes.some(mode=>!VALID_PLAN_MODES.has(mode)) || new Set(meta.modes).size !== meta.modes.length) errors.push('goal-plan.md: has invalid/duplicate modes');
  if (!['draft','ready','in_progress','completed','blocked'].includes(meta.status) || typeof meta.ready_for_execution !== 'boolean' || meta.ready_for_execution !== ['ready','in_progress'].includes(meta.status)) errors.push('goal-plan.md: ready_for_execution must match status');
  errors.push(...validateExecutionPolicy({meta,body}));
  if (meta.ready_for_execution) {
    for (const heading of [...REQUIRED_GOAL_PLAN_SECTIONS,...REQUIRED_LEAD_GOAL_PLAN_MARKERS]) if (!body.includes(heading)) errors.push(`${basename(path)}: ready Goal Plan missing '${heading}'`);
    const assumptions=sectionBody(body,'## Assumptions');
    if (assumptions && assumptions.includes('高影响') && !assumptions.includes('必须为 `false`')) errors.push(`${basename(path)}: high-impact assumptions cannot remain in a ready Goal Plan`);
  }
  return {path,meta,body};
}

function validateLegacyGoalPlan(path, errors) {
  if (!isFile(path)) {
    errors.push(`missing Goal Plan: ${basename(path)}`);
    return null;
  }
  const { meta, body } = parseFrontmatter(path);
  const required = [
    "schema_version",
    "artifact",
    "change",
    "status",
    "modes",
    "orchestration",
      "lead",
      "concurrent_implementation_limit",
      "integration_attempt_limit",
    "ticket_workspace_policy",
    "integration_gate",
    "ready_for_execution",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`${basename(path)}: missing keys ${JSON.stringify(missing.sort())}`);
  const unexpected = Object.keys(meta).filter((key) => !required.includes(key));
  if (unexpected.length) errors.push(`${basename(path)}: unexpected keys ${JSON.stringify(unexpected.sort())}`);
  if (meta.artifact !== "goal-plan" || meta.schema_version !== 7) {
    errors.push(`${basename(path)}: artifact/schema_version must be goal-plan/7`);
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
  if (!Number.isInteger(meta.concurrent_implementation_limit) || meta.concurrent_implementation_limit < 1) {
    errors.push(`${basename(path)}: concurrent_implementation_limit must be a positive integer`);
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
    typeof meta.ready_for_execution !== "boolean" ||
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
    const legacyMarkers = REQUIRED_LEAD_GOAL_PLAN_MARKERS.map(marker=>marker === 'Ticket scheduling' ? 'Concurrent implementations' : marker === '### Change Workspace and Verification' ? '### Ticket Workspace and Integration' : marker);
    const requiredMarkers = meta.ticket_workspace_policy === "current"
      ? [...legacyMarkers, "Local direct-parent verification and parent update"]
      : [...legacyMarkers, "source worktree 不运行 E2E", "Local candidate integration and parent update"];
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

function validateGoalPlanRuntimeLimits(path, change, goalPlan, errors, repoRoot = null, options = {}) {
  if (!goalPlan) return;
  if (goalPlan.meta.schema_version === 7 && /^Outcome: completed$/m.test(readText(join(change,'README.md')))) return;
  errors.push(...validateExecutionPolicy(goalPlan, findSpecdevConfig(change, repoRoot, options)).map(error => `${basename(path)}: ${error}`));
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
  if (typeof meta.ready !== "boolean") errors.push(`${basename(path)}: ready must be a boolean`);
  if (new Set(["ready", "in_progress", "review"]).has(meta.status) && meta.ready !== true) {
    errors.push(`${basename(path)}: executable Ticket must keep ready=true`);
  }
  if (meta.kind != null && meta.kind !== "" && !VALID_TICKET_KIND.has(meta.kind)) {
    errors.push(`${basename(path)}: invalid kind ${meta.kind}`);
  }
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
    for (const names of [["目标与来源","战略与来源"],["行为与范围","要构建什么"],["验收标准"],["验证方法","验证矩阵"]]) {
      if (!semanticSection(body,names)) errors.push(`${basename(path)}: Ready Ticket missing '${names[0]}' content`);
    }
    const unresolved = semanticSection(body, ["未决问题"]);
    if (unresolved && !/^无[。.]?$/.test(unresolved.trim())) {
      errors.push(`${basename(path)}: Ready Ticket has unresolved questions`);
    }
    if (!lists.writable_paths.length) errors.push(`${basename(path)}: Ready implementation Ticket requires writable_paths`);
    const verification = semanticSection(body, ["验证方法","验证矩阵"]);
    if (!verification || !verification.includes("|")) {
      errors.push(`${basename(path)}: Ready Ticket has no usable verification matrix`);
    }
    if (!verification.includes("E2E disposition") || !/(change-workspace|current-workspace|source-worktree|parent-candidate|direct-parent)/.test(verification)) {
      errors.push(`${basename(path)}: Ready Ticket must define E2E disposition and an explicit execution environment`);
    }
    const acceptance = semanticSection(body, ["验收标准"]).toLowerCase();
    if (!acceptance.includes("- [ ]") && !acceptance.includes("- [x]")) {
      errors.push(`${basename(path)}: Ready Ticket has no acceptance checklist`);
    }
  }
  return { path, meta, body };
}

function validateChangeExecution(change, errors, context) {
  const path = join(change, "evidence"), expectedChange = basename(change);
  let data;
  try {
    const facts = runtime.readChangeFactsSync(context, basename(change));
    if (facts.location.root !== resolve(change)) throw new Error('change identity does not match requested location');
    data = { ...facts, worktrees:readChangeExecution(change), executionContext:readExecutionContext(change) };
  } catch (error) { errors.push(`${change}: ${error.message}`); return null; }
  const modern = data.worktrees.filter(record=>record.schema_version === 1);
  const legacy = data.worktrees.filter(record=>record.schema_version !== 1);
  if (legacy.length && (data.outcome === 'active' || modern.length || data.executionContext)) errors.push('legacy-active-execution: explicit reconciliation by original owner required; preserve old worktrees and evidence');
  if (data.executionContext) {
    try {
      const owner = readChangeOwner(context,expectedChange).owner;
      if (owner !== data.executionContext.owner) errors.push('Execution Context owner differs from original Lead');
      data.workspaceRoot = resolveExecutionWorkspace(context.projectRoot,data.executionContext);
    } catch(error) { errors.push(error.message); }
  }
  for (const record of modern) {
    errors.push(...validateExecutionRecord(change,record,data.executionContext,{repoRoot:data.workspaceRoot ?? context.projectRoot,sourceRoot:context.projectRoot}));
    if (record.purpose === 'direct-spec' && record.status === 'cancelled' && data.outcome !== 'cancelled') errors.push('cancelled Direct Spec execution requires the original whole-change cancellation');
  }
  const seenWorktreeTickets = new Set();
  for (const worktree of legacy) {
    if (!worktree || typeof worktree !== "object" || Array.isArray(worktree)) {
      errors.push(`${basename(path)}: invalid worktree entry`);
      continue;
    }
    const direct = worktree.purpose === "direct-spec";
    const unit = direct ? "direct-spec" : worktree.ticket_id;
    const requiredWorktreeKeys = [
      ...(direct ? ["purpose", "change", "integration_attempt_limit"] : ["ticket_id"]),
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
      errors.push(`${basename(path)}: worktree ${unit} has unexpected keys ${JSON.stringify(unexpectedWorktreeKeys.sort())}`);
    }
    if (direct) {
      if (worktree.change !== expectedChange) errors.push("Direct Spec execution belongs to another change");
      try {
        if (readChangeOwner(context, expectedChange).owner !== worktree.owner) errors.push("Direct Spec execution owner differs from original Lead");
      } catch (error) { errors.push(error.message); }
      if (!Number.isInteger(worktree.integration_attempt_limit) || worktree.integration_attempt_limit < 1) errors.push("Direct Spec requires a positive integration_attempt_limit");
      if (worktree.integration?.attempts > worktree.integration_attempt_limit) errors.push("Direct Spec integration attempts exceed integration_attempt_limit");
      if (worktree.integration_owner !== worktree.owner) errors.push("Direct Spec integration owner must be Lead");
      if (worktree.status === "cancelled" && data.outcome !== "cancelled") errors.push("cancelled Direct Spec execution requires the original whole-change cancellation");
      if (worktree.workspace_ref !== "current" && worktree.branch !== `speculo/${expectedChange}/direct-spec`) errors.push("Direct Spec source branch must match its change");
    } else if (!/^T-[0-9]{2,}$/.test(String(unit))) {
      errors.push(`${basename(path)}: invalid worktree ticket_id ${unit}`);
    } else if (seenWorktreeTickets.has(unit)) {
      errors.push(`${basename(path)}: duplicate worktree for ${unit}`);
    }
    seenWorktreeTickets.add(unit);
    const ref = worktree.workspace_ref;
    if (
      typeof ref !== "string" ||
      ref.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(ref)
    ) {
      errors.push(`${basename(path)}: workspace_ref must be a portable non-absolute locator`);
      continue;
    }
    if (!VALID_WORKTREE_STATUS.has(worktree.status) && !(direct && worktree.status === "cancelled")) {
      errors.push(`${basename(path)}: invalid worktree status ${worktree.status}`);
    }
    const currentWorkspace = ref === "current";
    if (worktree.provider !== "git") {
      errors.push(`${basename(path)}: Ticket worktree ${unit} provider must be git`);
    }
    const expectedRef = `specdev-worktree/${expectedChange}/${unit}`;
    if (!currentWorkspace && ref !== expectedRef) {
      errors.push(`${basename(path)}: git workspace_ref must equal ${expectedRef}`);
    }

    if ("terminal_action" in worktree) {
      errors.push(`${basename(path)}: worktree ${unit} obsolete terminal_action is not allowed`);
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
      errors.push(`${basename(path)}: worktree ${unit} integration contract missing ${JSON.stringify(missingIntegrationKeys)}`);
      continue;
    }
    for (const key of ["owner", "implementation_owner", "integration_owner", "base_sha", "parent_branch", "branch", "updated_at"]) {
      if (typeof worktree[key] !== "string" || !worktree[key].trim()) {
        errors.push(`${basename(path)}: worktree ${unit} ${key} is required`);
      }
    }
    if (typeof worktree.parent_branch !== "string" || !worktree.parent_branch.trim()) {
      errors.push(`${basename(path)}: worktree ${unit} parent_branch is required`);
    } else if (currentWorkspace && worktree.parent_branch !== worktree.branch) {
      errors.push(`${basename(path)}: current workspace ${unit} branch must equal parent_branch`);
    } else if (!currentWorkspace && worktree.parent_branch === worktree.branch) {
      errors.push(`${basename(path)}: worktree ${unit} parent_branch must differ from branch`);
    }

    const sourceRequired = new Set(["review", "integrating", "integrated", "removed"]).has(worktree.status);
    if (sourceRequired && (typeof worktree.source_checkpoint !== "string" || !worktree.source_checkpoint.trim())) {
      errors.push(`${basename(path)}: worktree ${unit} ${worktree.status} requires source_checkpoint`);
    } else if (
      worktree.source_checkpoint !== null &&
      (typeof worktree.source_checkpoint !== "string" || !worktree.source_checkpoint.trim())
    ) {
      errors.push(`${basename(path)}: worktree ${unit} source_checkpoint must be null or non-empty`);
    }

    const integration = worktree.integration;
    if (!integration || typeof integration !== "object" || Array.isArray(integration)) {
      errors.push(`${basename(path)}: worktree ${unit} integration must be an object`);
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
      errors.push(`${basename(path)}: worktree ${unit} integration missing ${JSON.stringify(missingResultKeys)}`);
    }
    const unexpectedResultKeys = Object.keys(integration).filter((key) => !requiredResultKeys.includes(key));
    if (unexpectedResultKeys.length) {
      errors.push(`${basename(path)}: worktree ${unit} integration has unexpected keys ${JSON.stringify(unexpectedResultKeys.sort())}`);
    }
    if (!VALID_INTEGRATION_STATUS.has(integration.status)) {
      errors.push(`${basename(path)}: worktree ${unit} has invalid integration status ${integration.status}`);
    }
    if (!VALID_INTEGRATION_METHOD.has(integration.method)) {
      errors.push(`${basename(path)}: worktree ${unit} has invalid integration method ${integration.method}`);
    }
    if (!VALID_INTEGRATION_VERIFICATION.has(integration.verification)) {
      errors.push(`${basename(path)}: worktree ${unit} has invalid integration verification ${integration.verification}`);
    }
    if (!Array.isArray(integration.conflict_paths)) {
      errors.push(`${basename(path)}: worktree ${unit} conflict_paths must be an array`);
    }
    if (!Number.isInteger(integration.attempts) || integration.attempts < 0) {
      errors.push(`${basename(path)}: worktree ${unit} attempts must be a non-negative integer`);
    }
    const expectedEvidence = `<Path>{roots.state}/specdev/changes/${expectedChange}/evidence/${unit}.md</Path>`;
    if (direct ? integration.evidence !== expectedEvidence : typeof integration.evidence !== "string" || !/^<Path>\{roots\.state\}\/specdev\/changes\/[^<]+\/evidence\/T-[0-9]{2,}\.md<\/Path>$/.test(integration.evidence)) {
      errors.push(`${basename(path)}: worktree ${unit} integration evidence must be its rooted Evidence path: ${expectedEvidence}`);
    }
    if (!new Set(["pending", "applying", "applied", "failed", "stale"]).has(integration.promotion_status)) {
      errors.push(`${basename(path)}: worktree ${unit} has invalid promotion_status ${integration.promotion_status}`);
    }
    for (const [name, suite] of [["full_suite", integration.full_suite], ["e2e", integration.e2e]]) {
      if (!suite || typeof suite !== "object" || Array.isArray(suite) || typeof suite.required !== "boolean" || !VALID_E2E_STATUS.has(suite.status)) {
        errors.push(`${basename(path)}: worktree ${unit} ${name} contract is invalid`);
        continue;
      }
      const unexpectedSuiteKeys = Object.keys(suite).filter((key) => !new Set(["required", "status", "reason", "evidence"]).has(key));
      if (unexpectedSuiteKeys.length) errors.push(`${basename(path)}: worktree ${unit} ${name} has unexpected keys ${JSON.stringify(unexpectedSuiteKeys.sort())}`);
      if (suite.required === false && (suite.status !== "not-required" || typeof suite.reason !== "string" || !suite.reason.trim())) {
        errors.push(`${basename(path)}: worktree ${unit} non-required ${name} needs not-required status and reason`);
      }
      if (suite.required === true && suite.status === "not-required") {
        errors.push(`${basename(path)}: worktree ${unit} required ${name} cannot be not-required`);
      }
      if (direct && suite.required === true && suite.status === "passed" && (typeof suite.evidence !== "string" || !suite.evidence.trim())) errors.push(`Direct Spec passed ${name} requires actual evidence`);
    }
    const e2e = integration.e2e;
    if (
      !e2e ||
      typeof e2e !== "object" ||
      Array.isArray(e2e) ||
      typeof e2e.required !== "boolean" ||
      !VALID_E2E_STATUS.has(e2e.status)
    ) {
      errors.push(`${basename(path)}: worktree ${unit} integration e2e contract is invalid`);
    } else {
      const unexpectedE2eKeys = Object.keys(e2e).filter((key) => !new Set(["required", "status", "reason", "evidence"]).has(key));
      if (unexpectedE2eKeys.length) {
        errors.push(`${basename(path)}: worktree ${unit} integration e2e has unexpected keys ${JSON.stringify(unexpectedE2eKeys.sort())}`);
      }
      if (e2e.required === false && e2e.status !== "not-required") {
        errors.push(`${basename(path)}: worktree ${unit} non-required E2E must use status=not-required`);
      }
      if (e2e.required === true && e2e.status === "not-required") {
        errors.push(`${basename(path)}: worktree ${unit} required E2E cannot be not-required`);
      }
      if (
        e2e.required === true &&
        e2e.status === "passed" &&
        (typeof e2e.evidence !== "string" || !e2e.evidence.trim())
      ) {
        errors.push(`${basename(path)}: worktree ${unit} passed required E2E needs evidence`);
      }
    }
    const integrationLifecycleActive = new Set(["integrating", "integrated", "removed"]).has(worktree.status);
    if (integrationLifecycleActive) {
      if (typeof integration.parent_before_sha !== "string" || !integration.parent_before_sha.trim()) {
        errors.push(`${basename(path)}: worktree ${unit} ${worktree.status} requires parent_before_sha`);
      }
      if (typeof integration.source_sha !== "string" || !integration.source_sha.trim()) {
        errors.push(`${basename(path)}: worktree ${unit} ${worktree.status} requires source_sha`);
      } else if (integration.source_sha !== worktree.source_checkpoint) {
        errors.push(`${basename(path)}: worktree ${unit} source_sha must equal source_checkpoint`);
      }
      if (currentWorkspace) {
        if (integration.candidate_sha !== null || integration.candidate_tree_sha !== null || integration.candidate_branch !== null || integration.candidate_workspace_ref !== null) {
          errors.push(`${basename(path)}: current workspace ${unit} cannot record candidate workspace fields`);
        }
        if (integration.method !== "direct-parent") {
          errors.push(`${basename(path)}: current workspace ${unit} requires integration.method=direct-parent`);
        }
      } else {
        if (typeof integration.candidate_sha !== "string" || !integration.candidate_sha.trim()) {
          errors.push(`${basename(path)}: worktree ${unit} ${worktree.status} requires candidate_sha`);
        }
        const expectedCandidateBranch = `speculo/integration/${expectedChange}/${unit}`;
        if (integration.candidate_branch !== expectedCandidateBranch) {
          errors.push(`${basename(path)}: worktree ${unit} candidate_branch must equal ${expectedCandidateBranch}`);
        }
        const expectedCandidateRef = `specdev-worktree/.integration/${expectedChange}/${unit}`;
        if (integration.candidate_workspace_ref !== expectedCandidateRef) {
          errors.push(`${basename(path)}: worktree ${unit} candidate_workspace_ref must equal ${expectedCandidateRef}`);
        }
        if (!new Set(["fast-forward", "merge-commit"]).has(integration.method)) {
          errors.push(`${basename(path)}: worktree ${unit} ${worktree.status} requires an integration method`);
        }
      }
    if (!Number.isInteger(integration.attempts) || integration.attempts < 1) {
      errors.push(`${basename(path)}: worktree ${unit} ${worktree.status} requires attempts >= 1`);
    }
    }
    if (worktree.status === "integrating" && integration.status !== "candidate") {
      errors.push(`${basename(path)}: integrating worktree ${unit} requires integration.status=candidate`);
    }
    if (new Set(["integrated", "removed"]).has(worktree.status)) {
      if (
        integration.status !== "passed" ||
        integration.verification !== "passed" ||
        !(currentWorkspace ? integration.method === "direct-parent" : new Set(["fast-forward", "merge-commit"]).has(integration.method)) ||
        typeof integration.result_sha !== "string" ||
        !integration.result_sha.trim() ||
        (currentWorkspace ? integration.result_sha !== worktree.source_checkpoint : integration.result_sha !== integration.candidate_sha) ||
        (direct && (integration.promotion_status !== "applied" || !new Set(["not-required", "passed"]).has(integration.full_suite?.status))) ||
        !e2e ||
        !new Set(["not-required", "passed"]).has(e2e.status)
      ) {
        errors.push(`${basename(path)}: ${worktree.status} worktree ${unit} requires passed candidate/result/E2E state`);
      }
      if (currentWorkspace && integration.method === "direct-parent") {
        if (integration.candidate_sha !== null || integration.candidate_tree_sha !== null || integration.candidate_branch !== null || integration.candidate_workspace_ref !== null) {
          errors.push(`${basename(path)}: current workspace ${unit} direct-parent cannot record candidate fields`);
        }
        if (integration.result_sha !== worktree.source_checkpoint) {
          errors.push(`${basename(path)}: current workspace ${worktree.status} ${unit} result_sha must equal source_checkpoint`);
        }
      } else if (integration.method === "fast-forward") {
        if (integration.candidate_sha !== worktree.source_checkpoint) {
          errors.push(`${basename(path)}: ${worktree.status} worktree ${unit} fast-forward candidate/result must equal source_checkpoint`);
        }
        if (Array.isArray(integration.conflict_paths) && integration.conflict_paths.length > 0) {
          errors.push(`${basename(path)}: ${worktree.status} worktree ${unit} fast-forward cannot record conflict_paths`);
        }
      } else if (
        integration.method === "merge-commit" &&
        typeof integration.candidate_sha === "string" &&
        (integration.candidate_sha === worktree.source_checkpoint || integration.candidate_sha === integration.parent_before_sha)
      ) {
        errors.push(`${basename(path)}: ${worktree.status} worktree ${unit} merge-commit candidate must be a distinct checkpoint`);
      }
    }
  }
  return data;
}

function validateCurrentWorkspaceExecution(changeStatus, goalPlan, errors) {
  const allEntries = (changeStatus?.worktrees ?? []).filter(record=>record.schema_version !== 1);
  const entries = goalPlan?.meta.ticket_workspace_policy === "current" ? allEntries : allEntries.filter(entry => entry.workspace_ref === "current");
  const active = [];
  for (const worktree of entries) {
    if (worktree.workspace_ref !== "current") {
      errors.push(`${worktree.ticket_id}: current Goal Plan requires workspace_ref=current; source worktrees are not allowed`);
    }
    if (worktree.parent_branch !== worktree.branch) {
      errors.push(`${worktree.ticket_id}: current workspace execution must commit directly on parent_branch`);
    }
    if (new Set(["active", "review", "integrating", "blocked"]).has(worktree.status)) {
      active.push(worktree.ticket_id ?? worktree.purpose);
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
  if (!repoRoot || !changeStatus?.worktrees?.length) return;
  const resolvedRoot = resolve(repoRoot);
  if (gitOutput(resolvedRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    errors.push(`--repo is not a Git worktree: ${resolvedRoot}`);
    return;
  }
  const currentBranch = gitOutput(resolvedRoot, ["branch", "--show-current"]);
  for (const worktree of (changeStatus?.worktrees ?? []).filter(record=>record.schema_version !== 1)) {
    const label = String(worktree.ticket_id ?? worktree.purpose ?? "worktree");
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
    if (worktree.workspace_ref !== "current" && new Set(["active","review","integrating","blocked"]).has(worktree.status)) {
      try {
        const source = runtime.safeWorkPathSync(resolvedRoot,worktree.workspace_ref,{mustExist:true,type:"directory"});
        const common = gitOutput(resolvedRoot,["rev-parse","--path-format=absolute","--git-common-dir"]);
        if (gitOutput(source,["rev-parse","--path-format=absolute","--git-common-dir"]) !== common || gitOutput(source,["branch","--show-current"]) !== worktree.branch) errors.push(`${label}: source workspace must be a real isolated worktree of the recorded repository and branch`);
      } catch(error) { errors.push(`${label}: actual source isolation is missing: ${error.message}`); }
    }
    if (worktree.status === "integrating" && worktree.workspace_ref !== "current") {
      try {
        const candidate = runtime.safeWorkPathSync(resolvedRoot,worktree.integration.candidate_workspace_ref,{mustExist:true,type:"directory"});
        if (gitOutput(candidate,["rev-parse","HEAD"]) !== worktree.integration.candidate_sha || gitOutput(candidate,["rev-parse","HEAD^{tree}"]) !== worktree.integration.candidate_tree_sha) errors.push(`${label}: actual candidate workspace differs from the recorded checkpoint/tree`);
      } catch(error) { errors.push(`${label}: actual candidate isolation is missing: ${error.message}`); }
    }
    if (worktree.purpose === "direct-spec") {
      const integration = worktree.integration;
      if (worktree.source_checkpoint && gitOutput(resolvedRoot, ["rev-parse", worktree.branch]) !== worktree.source_checkpoint && worktree.status !== "removed") errors.push(`${label}: source branch tip differs from source_checkpoint`);
      if (worktree.source_checkpoint && !gitSucceeds(resolvedRoot, ["merge-base", "--is-ancestor", worktree.base_sha, worktree.source_checkpoint])) errors.push(`${label}: source_checkpoint must descend from base_sha`);
      if (worktree.workspace_ref !== "current" && new Set(["review", "integrating", "integrated"]).has(worktree.status)) {
        try {
          const source = runtime.safeWorkPathSync(resolvedRoot, worktree.workspace_ref, {mustExist:true,type:"directory"});
          if (gitOutput(source, ["status", "--porcelain"])) errors.push(`${label}: source worktree is dirty`);
        } catch (error) { errors.push(`${label}: source worktree missing before cleanup: ${error.message}`); }
      }
      if (integration?.candidate_sha) {
        if (gitOutput(resolvedRoot, ["rev-parse", `${integration.candidate_sha}^{tree}`]) !== integration.candidate_tree_sha) errors.push(`${label}: candidate tree differs from recorded tree`);
        for (const sha of [integration.parent_before_sha, worktree.source_checkpoint]) {
          if (sha && !gitSucceeds(resolvedRoot, ["merge-base", "--is-ancestor", sha, integration.candidate_sha])) errors.push(`${label}: candidate must contain parent and source checkpoints`);
        }
      }
      const parent = gitOutput(resolvedRoot, ["rev-parse", worktree.parent_branch]);
      if (worktree.status === "integrating" && worktree.workspace_ref !== "current") {
        try {
          const candidate = runtime.safeWorkPathSync(resolvedRoot, integration.candidate_workspace_ref, {mustExist:true,type:"directory"});
          if (gitOutput(candidate, ["rev-parse", "--path-format=absolute", "--git-common-dir"]) !== gitOutput(resolvedRoot, ["rev-parse", "--path-format=absolute", "--git-common-dir"]) || gitOutput(candidate, ["branch", "--show-current"]) !== integration.candidate_branch || gitOutput(candidate, ["status", "--porcelain"])) errors.push(`${label}: candidate must be a clean worktree of the recorded repository and branch`);
        } catch (error) { errors.push(`${label}: candidate cannot be inspected: ${error.message}`); }
      }
      if (worktree.status === "integrating" && parent !== integration?.parent_before_sha) errors.push(`${label}: parent HEAD drifted; candidate must be marked stale and rebuilt`);
      if (new Set(["failed", "stale"]).has(integration?.status) && parent === integration.candidate_sha && parent !== integration.parent_before_sha) errors.push(`${label}: failed or stale candidate has already advanced the parent; reconcile before continuing`);
      if (new Set(["integrated", "removed"]).has(worktree.status)) {
        if (parent !== integration?.result_sha) errors.push(`${label}: parent branch HEAD must equal recorded result_sha`);
        if (!gitSucceeds(resolvedRoot, ["merge-base", "--is-ancestor", worktree.source_checkpoint, parent])) errors.push(`${label}: parent must contain source_checkpoint`);
      }
    }
    if (new Set(["integrated", "removed"]).has(worktree.status) && gitOutput(resolvedRoot, ["status", "--porcelain"])) {
      errors.push(`${label}: repository is dirty while Ticket is recorded as ${worktree.status}`);
    }
  }
}

function validateParentImplementation(change, parentStatus, stage, errors, warnings, repoRoot = null, options = {}) {
  const mapPath = join(change, "implementation-map.md");
  const planPath = join(change, "implementation-plan.md");
  if (!isFile(mapPath)) errors.push("parent implementation requires implementation-map.md");
  if (!isFile(planPath)) errors.push("parent implementation requires implementation-plan.md");
  if (!isFile(mapPath) || !isFile(planPath)) return null;

  const parentName = basename(change);
  const map = parseFrontmatter(mapPath);
  const plan = parseFrontmatter(planPath);
  const mapKeys = ["schema_version", "artifact", "change", "status", "revision", "members", "tasks", "dependencies", "serializations"];
  const planKeys = ["schema_version", "artifact", "change", "status", "source_map_revision", "orchestration", "lead", "concurrent_implementation_limit", "integration_attempt_limit", "ticket_execution", "ready_for_execution"];
  for (const [label, meta, expected] of [
    ["implementation-map.md", map.meta, mapKeys],
    ["implementation-plan.md", plan.meta, planKeys],
  ]) {
    const missing = expected.filter((key) => key !== "concurrent_implementation_limit" && !(key in meta));
    const unexpected = Object.keys(meta).filter((key) => !expected.includes(key) && key !== "max_parallel_tickets");
    if (missing.length) errors.push(`${label}: missing keys ${JSON.stringify(missing)}`);
    if (unexpected.length) errors.push(`${label}: unexpected keys ${JSON.stringify(unexpected.sort())}`);
  }
  if (map.meta.schema_version !== IMPLEMENTATION_MAP_SCHEMA_VERSION || map.meta.artifact !== "implementation-map") {
    errors.push("implementation-map.md: artifact/schema_version must be implementation-map/1");
  }
  if (plan.meta.schema_version !== IMPLEMENTATION_PLAN_SCHEMA_VERSION || plan.meta.artifact !== "implementation-plan") {
    errors.push("implementation-plan.md: artifact/schema_version must be implementation-plan/3");
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
  errors.push(...validateExecutionPolicy(plan, findSpecdevConfig(change, repoRoot, options)));
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

  for (const member of members) {
    if (!CHANGE_NAME.test(member)) {
      errors.push(`implementation-map.md: invalid member change name ${member}`);
      continue;
    }
    let memberRoot;
    try { memberRoot = runtime.resolveChangeSync(options.context,member,{includeArchived:parentStatus?.location.kind === "archive"}).root; } catch(error) { errors.push(`member change does not exist or has invalid identity: ${member}: ${error.message}`); continue; }
    if (!isDirectory(memberRoot)) {
      errors.push(`implementation-map.md: member change does not exist: ${member}`);
      continue;
    }
    if (isFile(join(memberRoot, "implementation-map.md"))) {
      errors.push(`implementation-map.md: nested parent implementation is not supported in v1: ${member}`);
    }

    const memberErrors = [];
    const memberWarnings = [];
    const status = validateChangeExecution(memberRoot, memberErrors, options.context);
    if (status) {
      memberStatuses.set(member, status);
      if (parentStatus?.outcome === "completed") validateGitEvidence(options.context.projectRoot,status,memberErrors);
      if (parentStatus?.location.kind !== "archive" && status.location.kind !== "active") memberErrors.push("archived change cannot be an implementation member");
      for (const record of status.worktrees ?? []) {
        if ((record.attempts ?? record.integration?.attempts ?? 0) > plan.meta.integration_attempt_limit) memberErrors.push(`${record.ticket_id}: verification attempts exceed parent limit`);
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
    const childMap = isFile(childMapPath) ? validateMap(childMapPath, memberErrors, repoRoot) : null;
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
      if (artifact) memberErrors.push(...validateTicketPlan(artifact, { repoRoot }).map(error => `${name}: ${error}`));
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
        } else if (new Set(["blocked", "deviated"]).has(artifact.meta.status)) {
          // A local blocker does not revoke unrelated nodes' execution gate.
          // The controller excludes this node and its dependency closure; only a
          // global blocker or an empty legal frontier pauses the whole parent.
        } else if (artifact.meta.status === "draft") {
          memberErrors.push(`${ticketId}: draft Ticket cannot belong to a parent implementation`);
        }
      }
    }

    if (childMap) {
      memberErrors.push(...validateInvocationCoverage(childTickets, childMap.projectSkillMatrix));
      validateProjectSkillCoverage(
        childMap.projectSkillMatrix,
        childTickets.keys(),
        basename(childMap.path),
        memberErrors,
      );
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
    if (status?.outcome === "completed") {
      const unfinished = [...childTickets].filter(([, artifact]) => !new Set(["done", "cancelled"]).has(artifact.meta.status)).map(([id]) => id);
      if (unfinished.length) memberErrors.push(`completed member has unfinished Tickets: ${JSON.stringify(unfinished)}`);
    }

    activeImplementations += [...childTickets.values()].filter(ticket=>['in_progress','review'].includes(ticket.meta.status)).length;
    const goalPath = join(memberRoot, "goal-plan.md");
    const goal = isFile(goalPath) ? validateGoalPlan(goalPath, memberErrors) : null;
    const childPolicy = ticketPolicy(plan.meta,goal?.meta,status?.executionContext);
    const active = [...childTickets.values()].filter(ticket=>['in_progress','review'].includes(ticket.meta.status));
    if (childPolicy.max_parallel_tickets !== null && active.length > childPolicy.max_parallel_tickets) memberErrors.push('child concurrent Ticket limit exceeded');
    if (stage === 'complete' && status?.outcome === 'completed' && !isFile(join(memberRoot,'implementation-map.md'))) {
      memberErrors.push(...validateChange(memberRoot,'complete',repoRoot,null,null,options).errors);
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
  const activeTasks = [...ticketByTask].filter(([,value])=>['in_progress','review'].includes(value.artifact.meta.status)).map(([task])=>task);
  for (const task of activeTasks) {
    for (const prerequisite of graph.get(task) ?? []) if (ticketByTask.get(prerequisite)?.artifact.meta.status !== 'done') errors.push(`${task}: active Ticket prerequisite is not done: ${prerequisite}`);
  }
  for (let index=0; index<activeTasks.length; index++) for (const right of activeTasks.slice(index+1)) {
    const left=activeTasks[index], a=ticketByTask.get(left).artifact.meta, b=ticketByTask.get(right).artifact.meta;
    if (serializationPairs.has([left,right].sort().join('\0'))) errors.push(`${left}/${right}: serialized Tickets cannot be active together`);
    if ((a.writable_paths ?? []).some(x=>(b.writable_paths ?? []).some(y=>pathsOverlap(String(x),String(y))))) errors.push(`${left}/${right}: active Tickets have conflicting writable paths`);
    if ((a.resource_claims ?? []).some(x=>(b.resource_claims ?? []).some(y=>x === y || x.endsWith('*') && y.startsWith(x.slice(0,-1)) || y.endsWith('*') && x.startsWith(y.slice(0,-1))))) errors.push(`${left}/${right}: active Tickets have conflicting semantic resources`);
  }
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
      otherStatus = runtime.readChangeFactsSync(options.context, entry.name).outcome;
    } catch {
      // Invalid competing parents still own their members conservatively.
    }
    if (new Set(["completed", "cancelled"]).has(otherStatus)) continue;
    const overlap = otherMap.members.map(String).filter((member) => memberSet.has(member));
    if (overlap.length) errors.push(`member changes already belong to unfinished parent implementation ${entry.name}: ${JSON.stringify(overlap)}`);
  }

  errors.push(...validateExecutionPolicy(plan, findSpecdevConfig(change, repoRoot, options)).map(error => `implementation-plan.md: ${error}`));
  const parentTicketPolicy = ticketPolicy(plan.meta);
  if (parentTicketPolicy.max_parallel_tickets !== null && activeImplementations > parentTicketPolicy.max_parallel_tickets) errors.push('parent concurrent Ticket limit exceeded');

  if (parentStatus?.outcome === "completed") {
    const incomplete = members.filter((member) => memberStatuses.get(member)?.outcome !== "completed");
    if (incomplete.length) errors.push(`parent implementation is completed while members remain incomplete: ${JSON.stringify(incomplete)}`);
    const unfinished = [...ticketByTask].filter(([, value]) => !new Set(["done", "cancelled"]).has(value.artifact.meta.status)).map(([task]) => task);
    if (unfinished.length) errors.push(`completed parent implementation has unfinished composite tasks: ${JSON.stringify(unfinished)}`);
    if (map.meta.status !== "completed" || plan.meta.status !== "completed") {
      errors.push("completed parent requires completed Implementation Map and Implementation Plan");
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
      if (!worktree || !new Set(["verified", "integrated", "removed"]).has(worktree.status)) {
        errors.push(`${task}: completed parent requires verified child execution evidence`);
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

function validateChange(change, stage = null, repoRoot = null, engineeringKind = null, prototypeId = null, options = {}) {
  const errors = [];
  const warnings = [];
  const archiveReady = stage === "archive-ready";
  if (archiveReady) stage = "complete";
  if (!isDirectory(change)) {
    return { errors: [`change directory does not exist: ${change}`], warnings };
  }

  const workspace = resolveWorkspaceContract(repoRoot, change, options);
  errors.push(...workspace.errors);
  if (errors.length) return {errors,warnings};
  options = {...options, context:workspace.context};
  change = canonicalToolPath(workspace.context, change);

  // Resolve every consumed artifact subtree before individual validators can read it.
  // Unrelated preserved links are not consumers and remain in the archive manifest.
  if(stage !== 'archived') try {
    for(const name of ['README.md','spec.md','goal-plan.md','implementation-map.md','implementation-plan.md','tickets-map.md','DESIGN.md','design-tree.json','source.md','triage.md','publish.md','diagnosis.md','wayfinder-map.md','LOG.md','ticket','evidence','investigation','learning','reviews','prototypes']) {
      const path=runtime.safeWorkPathSync(change,name);
      if(isDirectory(path)) for(const child of walk(path)) runtime.safeWorkPathSync(change,toPosix(relative(change,child)));
    }
  }catch(error){return {errors:[...errors,error.message],warnings};}

  // A partial parent must never fall back to the single-change artifact contract.
  const mapPath = join(change, "tickets-map.md");
  const isParentImplementation = isFile(join(change, "implementation-map.md")) ||
    isFile(join(change, "implementation-plan.md")) ||
    (isFile(mapPath) && parseFrontmatter(mapPath).meta.artifact === "goal-tickets-map");
  const changeStatus = stage === "archived" ? null : validateChangeExecution(change, errors, workspace.context);
  if (errors.length) return {errors,warnings};
  if (stage === "complete" || changeStatus?.outcome === "completed") errors.push(...validateChangeClosure({context:workspace.context,change:basename(change),forArchive:archiveReady}).errors);
  if (archiveReady && changeStatus?.outcome === "cancelled") return {errors,warnings};
  if (stage === "archived") {
    const output=runDesignCheck("--archived", change, errors, workspace.context,options.sealed ? ['--sealed'] : []);
    let archive;
    if(output) {try {archive=JSON.parse(output);}catch {errors.push('archived consumer returned no verified receipt result');}}
    if(archive?.archive_state === 'moved') warnings.push('archive moved and checked, but is not sealed; finish the original A8 receipt');
    return { errors, warnings, ...(archive ? {archive} : {}) };
  }
  const parentImplementation = isParentImplementation ? validateParentImplementation(change, changeStatus, stage, errors, warnings, repoRoot, options) : null;
  errors.push(...validateInitiative(change));
  if (isFile(join(change, "source-issue.md"))) {
    errors.push("obsolete source-issue.md is forbidden; use source.md without compatibility fallback");
  }
  if (isFile(join(change, "capture.md"))) {
    errors.push("capture.md is workspace-owned at specdev/capture.md; change-level copies are forbidden");
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
  const publishPath = join(change, "publish.md");
  const publishRequired = Boolean(
    triage && new Set(["pending", "published", "publish-failed", "waived"]).has(triage.meta.publish_action),
  );
  if (isFile(publishPath) || publishRequired) {
    validatePublish(publishPath, basename(change), triage, errors);
  }
  const diagnosisPath = join(change, "diagnosis.md");
  if (isFile(diagnosisPath) || stage === "diagnosis") {
    validateDiagnosis(diagnosisPath, basename(change), errors);
  }
  validateReviews(change, stage === "review", errors, workspace.context.projectRoot);
  validatePrototypes(change, stage === "prototype", errors, prototypeId, new Set(["spec", "tickets", "goal-plan", "implement", "review", "complete"]).has(stage), workspace.context);
  if (new Set(["tickets", "goal-plan", "implement", "review", "complete"]).has(stage)) runDesignCheck("--handoff", change, errors, workspace.context);
  validateChangeLearning(change, stage === "learn", errors);
  const prs = validateRecords(change, "pull-request", parseFrontmatter);
  errors.push(...prs.errors);
  if (stage === "pr-delivery" && !prs.records.length) errors.push("pr-delivery stage requires a PR record");
  if (archiveReady && prs.records.some(r => r.meta.requested === true && (["planned", "failed"].includes(r.meta.status) || (r.meta.delivery_target === "ready" && r.meta.status === "draft")))) errors.push("complete stage cannot archive pending PR delivery");


  let simpleGoal = null;
  try { simpleGoal = readLightweightGoal(change); } catch (error) { errors.push(error.message); }
  const specRequired = new Set(["spec", "tickets", "goal-plan", "implement", "complete"]).has(stage) && !isParentImplementation;
  const specPath = join(change, "spec.md");
  let specification = null;
  if (!isParentImplementation && (isFile(specPath) || specRequired)) {
    try { specification = readSpecification(change, {allowLightweight: stage !== "tickets" && (stage !== "goal-plan" || Boolean(simpleGoal)), requiredArtifact:options.requiredArtifact, depth:options.depth}); }
    catch(error) { errors.push(error.message); }
  }
  const lightweight = specification?.lightweight === true;
  const spec = isFile(specPath) ? validateSpec(specPath, errors, warnings) : null;
  const ticketMode = isDirectory(join(change, "ticket"));
  const mapRequired = !simpleGoal && !isParentImplementation && (new Set(["tickets", "goal-plan"]).has(stage) || (stage === "implement" && ticketMode));
  const ticketsMap = isFile(mapPath) || mapRequired ? validateMap(mapPath, errors, repoRoot) : null;
  const goalPlanPath = join(change, "goal-plan.md");
  const goalPlan = !simpleGoal && (isFile(goalPlanPath) || (stage === "goal-plan" && !isParentImplementation))
    ? validateGoalPlan(goalPlanPath, errors)
    : null;
  validateDesignTree(join(change, "design-tree.json"), change, errors);
  validateWayfinder(change, errors);
  if (stage === "grill") {
    for (const name of ["design-tree.json"]) {
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
  const ticketsRequired = !simpleGoal && !isParentImplementation && (new Set(["tickets", "goal-plan"]).has(stage) || (stage === "implement" && ticketMode));
  const ticketFiles = isDirectory(ticketDir)
    ? readdirSync(ticketDir)
        .filter((name) => name.endsWith(".md"))
        .sort()
        .map((name) => join(ticketDir, name))
    : [];
  if (ticketsRequired && !isDirectory(ticketDir)) errors.push("missing Ticket directory");
  if (ticketsRequired && !ticketFiles.length) errors.push("Ticket directory contains no Markdown tickets");
  if (stage === "implement" && !ticketMode && !lightweight && !isFile(join(change, "evidence", "direct-spec.md"))) {
    errors.push("Direct Spec implement stage requires evidence/direct-spec.md");
  }

  const tickets = new Map();
  for (const path of ticketFiles) {
    const artifact = validateTicket(path, errors);
    if (!artifact) continue;
    errors.push(...validateTicketPlan(artifact, { repoRoot, requirePlan: stage === "implement" }).map(error => `${basename(path)}: ${error}`));
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

  if (ticketsMap && !ticketsMap.goalMap) {
    errors.push(...validateInvocationCoverage(tickets, ticketsMap.projectSkillMatrix));
    validateProjectSkillCoverage(
      ticketsMap.projectSkillMatrix,
      tickets.keys(),
      basename(ticketsMap.path),
      errors,
    );
  }

  if (stage === "implement" && ticketMode && changeStatus) {
    const worktreesByTicket = new Map(
      (Array.isArray(changeStatus.worktrees) ? changeStatus.worktrees : [])
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => [String(entry.ticket_id), entry]),
    );
    for (const [ticketId, artifact] of tickets) {
      if (new Set(["draft", "ready", "cancelled"]).has(artifact.meta.status)) continue;
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
    validateGoalPlanRuntimeLimits(goalPlan.path, change, goalPlan, errors, repoRoot, options);
    const attemptLimit = Number.isInteger(goalPlan.meta.integration_attempt_limit) ? goalPlan.meta.integration_attempt_limit : null;
    if (attemptLimit !== null) {
      for (const worktree of changeStatus.worktrees ?? []) {
        if ((worktree.attempts ?? worktree.integration?.attempts ?? 0) > attemptLimit) {
          errors.push(`${worktree.ticket_id}: integration attempts ${worktree.attempts ?? worktree.integration?.attempts} exceed Goal Plan limit ${attemptLimit}`);
        }
      }
    }
  }
  validateCurrentWorkspaceExecution(changeStatus, goalPlan, errors);
  const directExecution = changeStatus?.worktrees?.find(entry => entry.purpose === "direct-spec");
  if (changeStatus?.executionContext && workspace.config) {
    const execution=changeStatus.executionContext,limits=workspace.config.execution;
    if (execution.integration_attempt_limit > limits.max_integration_attempts) errors.push('Execution Context exceeds config max_integration_attempts');
    if (execution.concurrent_implementation_limit > limits.max_concurrent_implementations) errors.push('Execution Context exceeds config max_concurrent_implementations');
    for (const record of changeStatus.worktrees ?? []) if (record.attempts > limits.max_integration_attempts) errors.push(`${record.ticket_id ?? record.purpose}: verification attempts exceed config limit`);
  }
  if (directExecution && (ticketMode || isParentImplementation)) errors.push("Direct Spec execution cannot coexist with Ticket or parent implementation artifacts");
  if (directExecution && (stage === "complete" || changeStatus.outcome === "completed") && !new Set(["verified", "integrated", "removed"]).has(directExecution.status)) errors.push("Direct Spec completion requires verified execution; active or failed checks cannot complete");
  validateGitEvidence(stage === "complete" ? workspace.context.projectRoot : repoRoot, changeStatus, errors);

  if (stage === "implement" && spec && !ticketMode && (spec.meta.ready_for_tickets !== true || spec.meta.status !== "ready")) errors.push("Direct Spec implementation requires a ready Spec with ready_for_tickets=true");
  if (spec?.meta.ready_for_tickets === true && !/\bAC-\d+\b/.test(spec.body)) errors.push("ready Spec must define at least one AC-### acceptance contract");

  if (stage === "complete" && spec && !ticketMode && !isParentImplementation) errors.push(...validateAcceptanceEvidence(change,"evidence/direct-spec.md",[...new Set(spec.body.match(/\bAC-\d+\b/g) ?? [])]));

  // New completion/archival consumes actual review evidence. Historical records
  // remain readable outside these gates; archived validation returned earlier.
  let nonImplementation = false;
  if (stage === 'complete' && !spec && !ticketMode && !simpleGoal && !goalPlan && !isParentImplementation && !changeStatus?.worktrees?.length && !isDirectory(join(change,'evidence'))) {
    try {
      const owner = readChangeOwner(workspace.context,basename(change));
      if (owner.work === 'specdev/learn' && isFile(join(change,'learning','index.md'))) {
        validateChangeLearning(change,true,errors);
        nonImplementation = true;
      } else if (owner.work === 'specdev/triage' && source && triage?.meta.ready_for_implementation === false) nonImplementation = true;
    } catch(error) { errors.push(error.message); }
  }
  if (stage === 'complete' && changeStatus?.location.kind === 'active' && changeStatus?.outcome !== 'cancelled' && !nonImplementation) {
    const units = [...tickets.values()].filter(ticket => ticket.meta.status !== 'cancelled');
    const finalArtifact = isParentImplementation ? 'evidence/implementation-orchestration.md'
      : units.length > 1 ? 'evidence/final-review.md'
      : units.length === 1 ? `evidence/${units[0].meta.id}.md`
      : lightweight ? 'README.md' : 'evidence/direct-spec.md';
    try {
      const deliveryRoot = changeStatus.workspaceRoot ?? workspace.context.projectRoot;
      const head = execFileSync('git',['-C',deliveryRoot,'rev-parse','--verify','HEAD^{commit}'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
      const executions = [...(changeStatus.worktrees ?? []), ...[...(parentImplementation?.memberStatuses?.values() ?? [])].flatMap(status=>status.worktrees ?? [])];
      const owners = executions.flatMap(record => [...(record.implementation_owners ?? []), record.implementation_owner, ...(record.integration?.conflict_paths?.length ? [record.integration_owner] : [])]).filter(value => typeof value === 'string' && /^[a-z][a-z0-9-]*:\S+$/i.test(value));
      const bases = [...new Set([changeStatus.executionContext?.base_sha, ...executions.map(record=>record.base_sha)].filter(value=>/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value ?? '')))];
      const expectedBase = bases.length > 1 ? execFileSync('git',['-C',workspace.context.projectRoot,'merge-base','--octopus',...bases],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim() : bases[0] ?? null;
      const sourceLocator = path => {
        const snapshot = workspace.context.readOnlySnapshot;
        const original = snapshot ? join(snapshot.sourceContext.specdevRoot,relative(workspace.context.specdevRoot,path)) : path;
        return toPosix(relative(workspace.context.projectRoot,original));
      };
      const specLocator = sourceLocator(spec ? spec.path : join(change,'README.md'));
      const requiredSpecifications = isParentImplementation
        ? [sourceLocator(join(change,'implementation-plan.md')),sourceLocator(join(change,'implementation-map.md')),...new Set([...(parentImplementation?.ticketByTask?.values() ?? [])].map(unit=>sourceLocator(join(unit.memberRoot,'spec.md')))),...[...(parentImplementation?.memberStatuses ?? [])].filter(([,status])=>status.executionContext).map(([member])=>{
          const units=[...parentImplementation.ticketByTask.values()].filter(unit=>unit.member===member && unit.artifact.meta.status !== 'cancelled');
          return units.length ? `${sourceLocator(join(units[0].memberRoot,'evidence',units.length>1?'final-review.md':`${units[0].artifact.meta.id}.md`))}#review-input` : null;
        }).filter(Boolean)]
        : spec ? [specLocator] : [`${specLocator}#scope`,`${specLocator}#acceptance`];
      errors.push(...validateIndependentReview(change,finalArtifact,{repoRoot:deliveryRoot,sourceRoot:workspace.context.projectRoot,expectedHead:isParentImplementation?null:head,expectedBase:isParentImplementation?null:expectedBase,requiredImplementers:owners,requiredSpecifications,checkCurrent:true,requireDelivery:!isParentImplementation,allowSourceFiles:isParentImplementation}));
    } catch(error) { errors.push(`independent-review: final delivery checkpoint unavailable: ${error.message}`); }
  }

  if (spec && ticketMode) {
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

  const scheduling = ticketPolicy(goalPlan?.meta,changeStatus?.executionContext);
  const inFlight = [...tickets.values()].filter(ticket=>['in_progress','review'].includes(ticket.meta.status));
  if (scheduling.max_parallel_tickets !== null && inFlight.length > scheduling.max_parallel_tickets) errors.push('concurrent Ticket limit exceeded');
  for (const ticket of inFlight) for (const dependency of graph.get(ticket.meta.id) ?? []) if (tickets.get(dependency)?.meta.status !== 'done') errors.push(`${ticket.meta.id}: active Ticket prerequisite is not done: ${dependency}`);
  for (const record of changeStatus?.worktrees ?? []) if (record.schema_version === 1 && record.ticket_id && ['active','review'].includes(record.status) && !['in_progress','review'].includes(tickets.get(record.ticket_id)?.meta.status)) errors.push(`${record.ticket_id}: active execution requires an in_progress/review Ticket`);
  for (let i=0;i<inFlight.length;i++) for (const other of inFlight.slice(i+1)) {
    const ticket = inFlight[i];
    if ((ticket.meta.writable_paths ?? []).some(a=>(other.meta.writable_paths ?? []).some(b=>pathsOverlap(a,b)))) errors.push(`active Tickets ${ticket.meta.id}/${other.meta.id} have conflicting writable paths`);
    if ((ticket.meta.resource_claims ?? []).some(a=>(other.meta.resource_claims ?? []).some(b=>a === b || a.endsWith('*') && b.startsWith(a.slice(0,-1)) || b.endsWith('*') && a.startsWith(b.slice(0,-1))))) errors.push(`active Tickets ${ticket.meta.id}/${other.meta.id} have conflicting semantic resources`);
    if (transitivelyDepends(graph,ticket.meta.id,other.meta.id) || transitivelyDepends(graph,other.meta.id,ticket.meta.id)) errors.push('active Ticket dependency is not completed');
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
    if (changeStatus?.worktrees?.find(entry=>entry.ticket_id === ticketId)?.schema_version === 1) errors.push(...validateAcceptanceEvidence(change,`evidence/${ticketId}.md`,artifact.meta.contract_ids ?? []));
    if (stage === 'complete' && changeStatus?.location.kind === 'active' || hasIndependentReview(evidence)) {
      const execution = changeStatus?.worktrees?.find(entry => entry.ticket_id === ticketId);
      errors.push(...validateIndependentReview(change, `evidence/${ticketId}.md`, {
        repoRoot:workspace.context.projectRoot,
        expectedHead:execution?.integration?.result_sha ?? execution?.source_checkpoint ?? null,
        checkCurrent:false,
      }));
    }
    const currentWorkspace = changeStatus?.worktrees?.find(entry => entry.ticket_id === ticketId)?.workspace_ref === "current";
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
    if (!/(change-workspace|current-workspace|source-worktree)/.test(workspaceVerification)) {
      errors.push(`${toPosix(relative(change, evidence))}: Workspace Verification must name change-workspace`);
    }
    if (changeStatus?.worktrees?.find(entry=>entry.ticket_id === ticketId)?.schema_version !== 1 && !currentWorkspace && /E2E[^\n]*(?:\bpass(?:ed)?\b|通过)/i.test(workspaceVerification) && !/不得|禁止|not-run/i.test(workspaceVerification)) {
      errors.push(`${toPosix(relative(change, evidence))}: E2E pass cannot come from source-worktree`);
    }
    const worktree = Array.isArray(changeStatus?.worktrees)
      ? changeStatus.worktrees.find((entry) => entry?.ticket_id === ticketId)
      : null;
    if (!worktree || !new Set(["verified", "integrated", "removed"]).has(worktree.status)) {
      errors.push(`${ticketId}: status is done but no verified Ticket execution exists`);
    }
  }

  if (goalPlan?.meta.ready_for_execution === true) {
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
      changeStatus.outcome === "completed" &&
      [...tickets.values()].some(
        (artifact) => !new Set(["done", "cancelled"]).has(artifact.meta.status),
      )
    ) {
      errors.push("Outcome is completed while planned Tickets remain unfinished");
    }
    if (changeStatus.location.kind === "archive") {
      warnings.push("validating an archived change in place; normally it lives under the archive root");
    }
    if (stage === "complete" && changeStatus.outcome !== "completed") {
      errors.push("complete stage requires Outcome: completed");
    }
  }
  if (
    stage === "complete" &&
    !ticketFiles.length && !lightweight &&
    !isFile(join(change, "implementation-map.md")) &&
    !isFile(join(change, "evidence", "direct-spec.md"))
  ) {
    errors.push("complete stage without Tickets requires evidence/direct-spec.md");
  }
  if (
    archiveReady &&
    triage &&
    new Set(["pending-close", "close-failed"]).has(triage.meta.external_action)
  ) {
    errors.push(`complete stage cannot archive external_action=${triage.meta.external_action}`);
  }
  if (
    archiveReady &&
    triage &&
    new Set(["pending", "publish-failed"]).has(triage.meta.publish_action)
  ) {
    errors.push(`complete stage cannot archive publish_action=${triage.meta.publish_action}`);
  }

  for (const path of walk(change).filter((item) => lstatSync(item).isFile() && extname(item) === ".md")) {
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

  errors.push(...validateEngineeringArtifacts(change, engineeringKind));
  if (simpleGoal && changeStatus?.outcome === "completed" && /^[-*] \[ \]/m.test(simpleGoal.body)) errors.push("completed Goal still has unfinished tasks");
  return { errors, warnings, ...(options.readOnlySnapshot ? {snapshot:true,preflight:true} : {}) };
}

function contextArguments(context) {
  if (!context) return [];
  const source = context.readOnlySnapshot?.sourceContext ?? context;
  return ['--repo',source.projectRoot,'--method-root',source.methodRoot,'--state-root',source.specdevRoot,...(context.readOnlySnapshot ? ['--snapshot-specdev',context.specdevRoot] : [])];
}
function runDesignCheck(operation, path, errors, context = null, flags = []) {
  try { return execFileSync(process.execPath, [fileURLToPath(new URL("./design-artifacts.mjs", import.meta.url)), operation, path, ...contextArguments(context),...flags], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (error) { errors.push(String(error.stderr || error.stdout || error.message).trim()); }
}

function printResults(errors, warnings) {
  for (const warning of warnings) console.log(`WARNING: ${warning}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);
  return errors.length ? 1 : 0;
}

function usage() {
  console.error("Usage: node validate-specdev.mjs [--stage <stage>] [--sealed (archived only)] [--prototype-id UI-NNN|LOGIC-NNN] [--repo <project-root>] [--engineering <performance|documentation|incident>] <change-directory> | --review-scope --repo <project-root> --mode <baseline|range|commit|pr|source-files|working-tree> [comparison options or repeated --file <relative-path>] | --self-check | --capture <capture.md> | --triage-run <TRI-NNN.md>");
  return 2;
}

function main(argv) {
  if (argv[0] === "--review-scope") return reviewScopeCLI(argv.slice(1));
  let engineeringKind = null;
  let prototypeId = null;
  let selfCheckRequested = false;
  let stage = null;
  let repoRoot = null;
  const contextOptions = {};
  let capturePath = null;
  let triageRunPath = null;
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--prototype-id") {
      if (prototypeId !== null || !/^(?:UI|LOGIC)-\d{3,}$/.test(argv[index + 1] ?? "")) return usage();
      prototypeId = argv[++index];
    } else if (arg === "--sealed") {
      if(contextOptions.sealed) return usage();
      contextOptions.sealed=true;
    } else if (arg === "--engineering") {
      if (engineeringKind !== null || !ENGINEERING_KINDS.has(argv[index + 1])) return usage();
      engineeringKind = argv[++index];
    } else if (arg === "--self-check") {
      selfCheckRequested = true;
    } else if (arg === "--stage") {
      stage = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--stage=")) {
      stage = arg.slice("--stage=".length);
    } else if (arg === "--method-root" || arg === "--state-root") {
      contextOptions[arg === "--method-root" ? "methodRoot" : "stateRoot"] = argv[++index];
    } else if (arg === "--repo") {
      repoRoot = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--repo=")) {
      repoRoot = arg.slice("--repo=".length);
    } else if (arg === "--triage-run") {
      triageRunPath = argv[++index] ?? null;
    } else if (arg === "--capture") {
      capturePath = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--capture=")) {
      capturePath = arg.slice("--capture=".length);
    } else if (arg.startsWith("--")) {
      return usage();
    } else {
      positional.push(arg);
    }
  }
  if (stage !== null && !VALID_STAGES.has(stage)) return usage();
  if(contextOptions.sealed && stage !== 'archived') return usage();
  if (prototypeId && stage !== "prototype") return usage();
  if (engineeringKind !== null && (selfCheckRequested || capturePath || triageRunPath || positional.length !== 1)) return usage();
  if (triageRunPath) {
    if (selfCheckRequested || positional.length || stage !== null || capturePath || repoRoot) return usage();
    return printResults(validateRecord(resolve(triageRunPath), "triage-run", parseFrontmatter).errors, []);
  }
  if (selfCheckRequested) {
    if (positional.length || stage !== null || capturePath) return usage();
    const scriptDirectory = dirname(fileURLToPath(import.meta.url));
    const root = resolve(scriptDirectory, "..", "..");
    const result = selfCheck(root);
    return printResults(result.errors, result.warnings);
  }
  if (capturePath) {
    if (positional.length || stage !== null || repoRoot) return usage();
    const errors = [];
    validateCapture(resolve(capturePath), errors);
    return printResults(errors, []);
  }
  if (positional.length === 1) {
    const result = validateChange(resolve(positional[0]), stage, repoRoot, engineeringKind, prototypeId, contextOptions);
    return printResults(result.errors, result.warnings);
  }
  return usage();
}

export { parseFrontmatter, validateChange, validateTicket, validateMap, pathsOverlap, findCycle, validateCapture };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}
