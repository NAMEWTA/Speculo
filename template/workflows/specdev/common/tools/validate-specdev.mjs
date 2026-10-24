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
  validateGoalMap, validateInitiative, resolveProjectSource, readSpecification, resolveToolContext, validateExecutionPolicy, canonicalToolPath, readLightweightGoal, validateAcceptanceEvidence,
} from "./plan-contract.mjs";

import { validateChangeClosure, readChangeOwner } from "./change-artifacts.mjs";
import { validateRecord, validateRecords, checkSchema, validatePublish, VALID_TICKET_KIND, FORBIDDEN_PUBLISH_LABELS } from "./delivery-artifacts.mjs";
import { ticketPolicy } from './execution-context.mjs';
import { validateChangeExecution } from './execution-validation.mjs';
import { diagnosticErrors, addDiagnostic, appendDiagnostics, validationResult } from './validation-diagnostics.mjs';
import { reviewScopeCLI } from "./review-scope.mjs";
import { hasIndependentReview, validateIndependentReview } from "./review-evidence.mjs";
import { ENGINEERING_KINDS, validateEngineeringArtifacts, validateEngineeringPackage } from "./engineering-evidence.mjs";

const DOMAIN_SCHEMA_VERSION = 3;
const CONFIG_SCHEMA_VERSION = 7;
const GOAL_PLAN_SCHEMA_VERSION = 8;
const IMPLEMENTATION_MAP_SCHEMA_VERSION = 1;
const IMPLEMENTATION_PLAN_SCHEMA_VERSION = 3;
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
  "specdev-d-delivery",
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
  "delivery",
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
  "delivery.md",
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
    const context = resolveToolContext(change, { ...options, repoRoot });
    const location = runtime.resolveChangeSync(context, basename(change), { includeArchived: true });
    const errors = canonicalToolPath(context, change) === location.root ? [] : ["change is outside the declared state root"];
    const configPath = join(context.specdevRoot, "config.json");
    const config = existsSync(configPath) ? JSON.parse(readText(runtime.safeWorkPathSync(context.specdevRoot, 'config.json', {mustExist:true,type:'file'}))) : null;
    return { context, errors, config, specdevRoot:context.specdevRoot, stateDeclared:relative(context.projectRoot,context.stateRoot) };
  } catch(error) { return {errors:[String(error)],config:null,specdevRoot:null}; }
}
function findSpecdevConfig(change,repoRoot=null,options={}) {return resolveWorkspaceContract(repoRoot,change,options).config;}

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

function validateRetiredSeeds(root) {
  const errors = [];
  for (const path of [join(root,"_state/status.json"),join(root,"specdev-i-init-setup/assets/status-template.json"),join(root,"specdev-i-init-setup/assets/change-status-template.json")]) {
    if (existsSync(path)) errors.push(`retired business status must not be distributed as a new seed: ${toPosix(relative(root,path))}`);
  }

  return errors;
}

function validateExecutionContractAssets(root) {
  const errors = [];
  const configTemplatePath = join(root, "specdev-i-init-setup", "assets/config-template.json");
  const configSchemaPath = join(root, "common", "schemas", "config.schema.json");
  const goalPlanSchemaPath = join(root, "common", "schemas", "goal-plan.schema.json");
  const implementationMapSchemaPath = join(root, "common", "schemas", "implementation-map.schema.json");
  const implementationPlanSchemaPath = join(root, "common", "schemas", "implementation-plan.schema.json");

  for (const path of [
    configTemplatePath,
    configSchemaPath,
    goalPlanSchemaPath,
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
    errors.push("goal-plan.schema.json must define the strict Lead-directed Goal Plan v8 workspace contract");
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
    errors.push("implementation-plan.schema.json must define the strict parent implementation plan v3 contract");
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
        ["intake", "capture", "capture.md", "queue", "ready-for-agent", "github-operations.md", "specdev-d-delivery"],
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
  errors.push(...validateRetiredSeeds(root));
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
  checkSchema(meta, JSON.parse(readFileSync(new URL('../schemas/triage.schema.json', import.meta.url), 'utf8')), 'triage.md', errors);
  if (meta.change !== expectedChange) errors.push('triage.md: change must equal directory name');
  if (meta.disposition === 'ready-for-agent' && meta.verification !== 'passed') errors.push('triage.md: ready-for-agent requires passed verification');
  if (meta.ready_for_implementation === true && (meta.verification !== 'passed' || meta.disposition !== 'ready-for-agent')) errors.push('triage.md: implementation readiness requires verified agent-ready assessment');
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
  const lines = runtime.markdownBodyLines(body, 'triage.md');
  for (const heading of ["## 当前判定", "## 未知项", "## 路由", "## 实施简报", "## 打标回执"]) {
    const matches = lines.filter(line => line.text === heading);
    if (matches.length !== 1) { errors.push(`triage.md: expected one '${heading}'`); continue; }
    const end = lines.find(line => line.line > matches[0].line && /^#{1,2} /.test(line.text))?.line;
    if (!body.split(/\r?\n/).slice(matches[0].line, end ? end - 1 : undefined).join('\n').trim()) errors.push(`triage.md: empty '${heading}'`);
  }
  return { path, meta, body };
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

function validateGoalPlanRuntimeLimits(path, change, goalPlan, errors, repoRoot = null, options = {}) {
  if (!goalPlan) return;
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

function ticketDiagnostics(errors, change, ticket, artifact = null, code = 'ticket-contract-invalid') {
  return diagnosticErrors({code, scope: /^T-\d{2,}$/.test(ticket ?? '') ? 'ticket' : 'change',
    change: basename(change), ...(/^T-\d{2,}$/.test(ticket ?? '') ? {ticket: String(ticket)} : {}),
    ...(artifact ? {artifact: toPosix(relative(change, artifact))} : {}),
  }, errors);
}

function validateTicket(path, errors) {
  const { meta, body } = parseFrontmatter(path);
  errors = ticketDiagnostics(errors, dirname(dirname(path)), meta.id, path);
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
    if (!verification.includes("E2E disposition") || !/\bchange-workspace\b/.test(verification)) {
      errors.push(`${basename(path)}: Ready Ticket must define E2E disposition and an explicit execution environment`);
    }
    const acceptance = semanticSection(body, ["验收标准"]).toLowerCase();
    if (!acceptance.includes("- [ ]") && !acceptance.includes("- [x]")) {
      errors.push(`${basename(path)}: Ready Ticket has no acceptance checklist`);
    }
  }
  return { path, meta, body };
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

    const memberErrors = diagnosticErrors({code: "member-contract-invalid", scope: "change", change: member});
    const memberWarnings = [];
    const status = validateChangeExecution(memberRoot, memberErrors, options.context);
    if (status) {
      memberStatuses.set(member, status);
      if (parentStatus?.location.kind !== "archive" && status.location.kind !== "active") memberErrors.push("archived change cannot be an implementation member");
      for (const record of status.executions ?? []) {
        if ((record.attempts ?? 0) > plan.meta.integration_attempt_limit) ticketDiagnostics(memberErrors, memberRoot, record.ticket_id, null, 'execution-attempt-limit').push(`${record.ticket_id}: verification attempts exceed parent limit`);
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
      if (!artifact) continue;
      const ticketId = String(artifact.meta.id);
      const localErrors = ticketDiagnostics(memberErrors, memberRoot, ticketId, artifact.path);
      localErrors.push(...validateTicketPlan(artifact, { repoRoot }).map(error => `${name}: ${error}`));
      if (artifact.meta.change !== member) localErrors.push(`${name}: change must equal member directory name`);
      if (childTickets.has(ticketId)) localErrors.push(`duplicate Ticket id ${ticketId}`);
      childTickets.set(ticketId, artifact);
      const numericId = ticketId.replace(/^T-/, "");
      if (!name.startsWith(`${numericId}-`)) localErrors.push(`${name}: filename prefix must match ${ticketId}`);
      if (childMap && !childMap.body.includes(ticketId)) localErrors.push(`${name}: Ticket id is absent from Tickets Map`);
      if (childSpec) {
        for (const contractId of artifact.meta.contract_ids ?? []) {
          if (!childSpec.body.includes(String(contractId))) localErrors.push(`${name}: contract ${contractId} not found in Spec`);
        }
      }

      const taskId = `${member}::${ticketId}`;
      expectedTasks.add(taskId);
      ticketByTask.set(taskId, { artifact, member, memberRoot, status });
      const terminal = new Set(["done", "cancelled"]).has(artifact.meta.status);
      if (!terminal) {
        if (map.meta.status === "ready" && (artifact.meta.status !== "ready" || artifact.meta.ready !== true)) {
          localErrors.push(`${ticketId}: parent creation requires status=ready and ready=true`);
        } else if (new Set(["ready", "in_progress", "review"]).has(artifact.meta.status) && artifact.meta.ready !== true) {
          localErrors.push(`${ticketId}: executable Ticket must keep ready=true`);
        } else if (new Set(["blocked", "deviated"]).has(artifact.meta.status)) {
          // A local blocker does not revoke unrelated nodes' execution gate.
          // The controller excludes this node and its dependency closure; only a
          // global blocker or an empty legal frontier pauses the whole parent.
        } else if (artifact.meta.status === "draft") {
          localErrors.push(`${ticketId}: draft Ticket cannot belong to a parent implementation`);
        }
      }
    }

    if (childMap) {
      for (const [id, artifact] of childTickets) {
        ticketDiagnostics(memberErrors, memberRoot, id, artifact.path, 'ticket-invocation-invalid')
          .push(...validateInvocationCoverage(new Map([[id, artifact]]), childMap.projectSkillMatrix));
      }
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
      appendDiagnostics(memberErrors, validateChange(memberRoot,'complete',repoRoot,null,null,options));
    }
    appendDiagnostics(errors, memberErrors, {prefix: `${member}: `});
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
    for (const member of overlap) addDiagnostic(errors, {
      code: 'parent-ownership-conflict', scope: 'change', change: member,
      artifact: `${entry.name}/implementation-map.md`,
    }, `member ${member} already belongs to unfinished parent implementation ${entry.name}`);
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
      .flatMap(([member, status]) => (status.executions ?? []).map((execution) => ({ member, execution })))
      .filter(({ execution }) => new Set(['active', 'review', 'blocked']).has(execution?.status))
      .map(({ member, execution }) => `${member}::${execution.ticket_id}`);
    if (activeMemberWork.length) {
      errors.push(`completed parent has active member executions: ${JSON.stringify(activeMemberWork)}`);
    }
    for (const [task, value] of ticketByTask) {
      if (value.artifact.meta.status !== "done") continue;
      if (!isFile(join(value.memberRoot, "evidence", `${value.artifact.meta.id}.md`))) {
        errors.push(`${task}: completed parent requires child Ticket Evidence`);
      }
      const execution = value.status?.executions?.find((entry) => entry?.ticket_id === value.artifact.meta.id);
      if (!execution || execution.status !== 'verified') {
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
  const errors = diagnosticErrors({code: "change-contract-invalid", scope: "change", change: basename(change)});
  const warnings = [];
  const archiveReady = stage === "archive-ready";
  if (archiveReady) stage = "complete";
  if (!isDirectory(change)) {
    errors.push(`change directory does not exist: ${change}`);
    return validationResult(errors, warnings);
  }

  const workspace = resolveWorkspaceContract(repoRoot, change, options);
  errors.push(...workspace.errors);
  if (errors.length) return validationResult(errors, warnings);
  options = {...options, context:workspace.context};
  change = canonicalToolPath(workspace.context, change);

  // Resolve every consumed artifact subtree before individual validators can read it.
  // Unrelated preserved links are not consumers and remain in the archive manifest.
  if(stage !== 'archived') try {
    for(const name of ['README.md','spec.md','goal-plan.md','implementation-map.md','implementation-plan.md','tickets-map.md','DESIGN.md','design-tree.json','source.md','triage.md','delivery.md','publish.md','diagnosis.md','wayfinder-map.md','LOG.md','ticket','evidence','investigation','learning','reviews','prototypes']) {
      const path=runtime.safeWorkPathSync(change,name);
      if(isDirectory(path)) for(const child of walk(path)) runtime.safeWorkPathSync(change,toPosix(relative(change,child)));
    }
  }catch(error){errors.push(error.message);return validationResult(errors,warnings);}

  // A partial parent must never fall back to the single-change artifact contract.
  const mapPath = join(change, "tickets-map.md");
  const isParentImplementation = isFile(join(change, "implementation-map.md")) ||
    isFile(join(change, "implementation-plan.md")) ||
    (isFile(mapPath) && parseFrontmatter(mapPath).meta.artifact === "goal-tickets-map");
  const changeStatus = stage === "archived" ? null : validateChangeExecution(change, errors, workspace.context);
  if (stage !== "archived" && !changeStatus) return validationResult(errors, warnings);
  if (stage === "complete" || changeStatus?.outcome === "completed") errors.push(...validateChangeClosure({context:workspace.context,change:basename(change),forArchive:archiveReady}).errors);
  if (archiveReady && changeStatus?.outcome === "cancelled") return validationResult(errors, warnings);
  if (stage === "archived") {
    const output=runDesignCheck("--archived", change, errors, workspace.context,options.sealed ? ['--sealed'] : []);
    let archive;
    if(output) {try {archive=JSON.parse(output);}catch {errors.push('archived consumer returned no verified receipt result');}}
    if(archive?.archive_state === 'moved') warnings.push('archive moved and checked, but is not sealed; finish the original A8 receipt');
    return validationResult(errors, warnings, archive ? {archive} : {});
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
  const deliveryPath = join(change, 'delivery.md');
  const delivery = isFile(deliveryPath) || stage === 'delivery'
    ? validateRecord(deliveryPath, 'delivery', parseFrontmatter, basename(change)) : null;
  if (delivery) {
    errors.push(...delivery.errors);
    if (delivery.meta.external_action !== 'not-applicable' && (!source || source.meta.source_type !== 'github-issue')) errors.push('delivery.md: reconcile requires a real GitHub Issue source');
  }
  const publishPath = join(change, 'publish.md');
  const publishRequired = delivery?.meta.publish === 'publish.md';
  const publication = isFile(publishPath) || publishRequired ? validatePublish(publishPath, basename(change), errors, parseFrontmatter) : null;
  if (publication && !publishRequired) errors.push('publish.md: requires delivery.md publish pointer');
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
    const ticketId = String(artifact.meta.id);
    const localErrors = ticketDiagnostics(errors, change, ticketId, path);
    localErrors.push(...validateTicketPlan(artifact, { repoRoot, requirePlan: stage === "implement" }).map(error => `${basename(path)}: ${error}`));
    if (artifact.meta.change !== basename(change)) {
      localErrors.push(`${basename(path)}: change must equal directory name ${basename(change)}`);
    }
    const numericId = ticketId.replace(/^T-/, "");
    if (!basename(path).startsWith(`${numericId}-`)) {
      localErrors.push(`${basename(path)}: filename prefix must match ${ticketId}`);
    }
    if (tickets.has(ticketId)) localErrors.push(`duplicate Ticket id ${ticketId}`);
    tickets.set(ticketId, artifact);
    if (ticketsMap && !ticketsMap.body.includes(ticketId)) {
      localErrors.push(`${basename(path)}: Ticket id is absent from Tickets Map`);
    }
    if (spec) {
      for (const contractId of artifact.meta.contract_ids ?? []) {
        if (!spec.body.includes(String(contractId))) {
          localErrors.push(`${basename(path)}: contract ${contractId} not found in Spec`);
        }
      }
    }
  }

  if (ticketsMap && !ticketsMap.goalMap) {
    for (const [id, artifact] of tickets) {
      ticketDiagnostics(errors, change, id, artifact.path, 'ticket-invocation-invalid')
        .push(...validateInvocationCoverage(new Map([[id, artifact]]), ticketsMap.projectSkillMatrix));
    }
    validateProjectSkillCoverage(
      ticketsMap.projectSkillMatrix,
      tickets.keys(),
      basename(ticketsMap.path),
      errors,
    );
  }

  if (stage === "implement" && ticketMode && changeStatus) {
    const executionsByTicket = new Map(
      (Array.isArray(changeStatus.executions) ? changeStatus.executions : [])
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => [String(entry.ticket_id), entry]),
    );
    for (const [ticketId, artifact] of tickets) {
      if (new Set(["draft", "ready", "cancelled"]).has(artifact.meta.status)) continue;
      if (!executionsByTicket.has(ticketId)) {
        ticketDiagnostics(errors, change, ticketId, artifact.path, 'ticket-execution-missing').push(`${ticketId}: Implement stage requires one Ticket workspace execution record`);
      }
    }
    for (const ticketId of executionsByTicket.keys()) {
      if (!tickets.has(ticketId)) {
        errors.push(`${ticketId}: execution record has no matching Ticket`);
      }
    }
  }
  if (changeStatus && goalPlan) {
    validateGoalPlanRuntimeLimits(goalPlan.path, change, goalPlan, errors, repoRoot, options);
    const attemptLimit = Number.isInteger(goalPlan.meta.integration_attempt_limit) ? goalPlan.meta.integration_attempt_limit : null;
    if (attemptLimit !== null) {
      for (const execution of changeStatus.executions ?? []) {
        if ((execution.attempts ?? 0) > attemptLimit) {
          ticketDiagnostics(errors, change, execution.ticket_id, null, 'execution-attempt-limit').push(`${execution.ticket_id}: verification attempts ${execution.attempts} exceed Goal Plan limit ${attemptLimit}`);
        }
      }
    }
  }
  const directExecution = changeStatus?.executions?.find(entry => entry.purpose === "direct-spec");
  if (changeStatus?.executionContext && workspace.config) {
    const execution=changeStatus.executionContext,limits=workspace.config.execution;
    if (execution.integration_attempt_limit > limits.max_integration_attempts) errors.push('Execution Context exceeds config max_integration_attempts');
    if (execution.concurrent_implementation_limit > limits.max_concurrent_implementations) errors.push('Execution Context exceeds config max_concurrent_implementations');
    for (const record of changeStatus.executions ?? []) if (record.attempts > limits.max_integration_attempts) ticketDiagnostics(errors, change, record.ticket_id, null, 'execution-attempt-limit').push(`${record.ticket_id ?? record.purpose}: verification attempts exceed config limit`);
  }
  if (directExecution && (ticketMode || isParentImplementation)) errors.push("Direct Spec execution cannot coexist with Ticket or parent implementation artifacts");
  if (directExecution && (stage === "complete" || changeStatus.outcome === "completed") && directExecution.status !== 'verified') errors.push("Direct Spec completion requires verified execution; active or failed checks cannot complete");

  if (stage === "implement" && spec && !ticketMode && (spec.meta.ready_for_tickets !== true || spec.meta.status !== "ready")) errors.push("Direct Spec implementation requires a ready Spec with ready_for_tickets=true");
  if (spec?.meta.ready_for_tickets === true && !/\bAC-\d+\b/.test(spec.body)) errors.push("ready Spec must define at least one AC-### acceptance contract");

  if (stage === "complete" && spec && !ticketMode && !isParentImplementation) errors.push(...validateAcceptanceEvidence(change,"evidence/direct-spec.md",[...new Set(spec.body.match(/\bAC-\d+\b/g) ?? [])]));

  // Completion consumes actual review evidence; sealed archive validation returned earlier.
  let nonImplementation = false;
  if (stage === 'complete' && !spec && !ticketMode && !simpleGoal && !goalPlan && !isParentImplementation && !changeStatus?.executions?.length && !isDirectory(join(change,'evidence'))) {
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
      const executions = [...(changeStatus.executions ?? []), ...[...(parentImplementation?.memberStatuses?.values() ?? [])].flatMap(status=>status.executions ?? [])];
      const owners = executions.flatMap(record => record.implementation_owners ?? []).filter(value => typeof value === 'string' && /^[a-z][a-z0-9-]*:\S+$/i.test(value));
      const bases = [...new Set([changeStatus.executionContext?.base_sha, ...[...(parentImplementation?.memberStatuses?.values() ?? [])].map(status=>status.executionContext?.base_sha)].filter(value=>/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value ?? '')))];
      const expectedBase = bases.length > 1 ? execFileSync('git',['-C',workspace.context.projectRoot,'merge-base','--octopus',...bases],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim() : bases[0] ?? null;
      const sourceLocator = path => toPosix(relative(workspace.context.projectRoot, path));
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
  for (const ticket of inFlight) for (const dependency of graph.get(ticket.meta.id) ?? []) if (tickets.get(dependency)?.meta.status !== 'done') ticketDiagnostics(errors, change, ticket.meta.id, ticket.path, 'ticket-dependency-incomplete').push(`${ticket.meta.id}: active Ticket prerequisite is not done: ${dependency}`);
  for (const record of changeStatus?.executions ?? []) if (record.ticket_id && ['active','review'].includes(record.status) && !['in_progress','review'].includes(tickets.get(record.ticket_id)?.meta.status)) ticketDiagnostics(errors, change, record.ticket_id, null, 'ticket-execution-status').push(`${record.ticket_id}: active execution requires an in_progress/review Ticket`);
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
    const localErrors = ticketDiagnostics(errors, change, ticketId, evidence, 'ticket-evidence-invalid');
    if (!isFile(evidence)) {
      localErrors.push(`${ticketId}: status is done but Evidence is missing`);
      continue;
    }
    const text = readText(evidence);
    localErrors.push(...validateAcceptanceEvidence(change,`evidence/${ticketId}.md`,artifact.meta.contract_ids ?? []));
    // The execution validator owns each record's independent review. The final
    // delivery gate above additionally checks current code and aggregate scope.
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
        localErrors.push(`${toPosix(relative(change, evidence))}: missing '${heading}'`);
      }
    }
    const workspaceVerification = sectionBody(text, "## 5. Workspace Verification");
    if (!/\bchange-workspace\b/.test(workspaceVerification)) {
      localErrors.push(`${toPosix(relative(change, evidence))}: Workspace Verification must name change-workspace`);
    }
    const execution = Array.isArray(changeStatus?.executions)
      ? changeStatus.executions.find((entry) => entry?.ticket_id === ticketId)
      : null;
    if (!execution || execution.status !== 'verified') {
      localErrors.push(`${ticketId}: status is done but no verified Ticket execution exists`);
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
    delivery &&
    new Set(["pending-close", "close-failed"]).has(delivery.meta.external_action)
  ) {
    errors.push(`complete stage cannot archive external_action=${delivery.meta.external_action}`);
  }
  if (
    archiveReady &&
    publication &&
    new Set(["pending", "publish-failed"]).has(publication.meta.publish_action)
  ) {
    errors.push(`complete stage cannot archive publish_action=${publication.meta.publish_action}`);
  }

  const artifactOwners = new Map([...tickets].flatMap(([id, artifact]) => [
    [artifact.path, id], [join(change, 'evidence', `${id}.md`), id],
  ]));
  for (const path of walk(change).filter((item) => lstatSync(item).isFile() && extname(item) === ".md")) {
    const owner = artifactOwners.get(path);
    const pathErrors = owner ? ticketDiagnostics(errors, change, owner, path, 'artifact-path-invalid') : errors;
    const text = readText(path);
    if ((text.match(/<Path>/g) ?? []).length !== (text.match(/<\/Path>/g) ?? []).length) {
      pathErrors.push(`${toPosix(relative(change, path))}: unbalanced <Path> tags`);
    }
    const withoutPaths = text.replace(PATH_TAG_RE, "");
    if (withoutPaths.includes("{roots.")) {
      pathErrors.push(`${toPosix(relative(change, path))}: root variable outside <Path>`);
    }
    for (const match of text.matchAll(PATH_TAG_RE)) {
      const issue = validatePathValue(match[1]);
      if (issue) pathErrors.push(`${toPosix(relative(change, path))}: invalid Path: ${issue}`);
    }
  }

  errors.push(...validateEngineeringArtifacts(change, engineeringKind));
  if (simpleGoal && changeStatus?.outcome === "completed" && /^[-*] \[ \]/m.test(simpleGoal.body)) errors.push("completed Goal still has unfinished tasks");
  return validationResult(errors, warnings);
}

function contextArguments(context) {
  if (!context) return [];
  return ['--repo',context.projectRoot,'--method-root',context.methodRoot,'--state-root',context.specdevRoot];
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
  console.error("Usage: node validate-specdev.mjs [--stage <stage>] [--sealed (archived only)] [--prototype-id UI-NNN|LOGIC-NNN] [--repo <project-root>] [--engineering <performance|documentation|incident>] <change-directory> | --review-scope --repo <project-root> --mode <baseline|range|commit|pr|source-files|working-tree> [comparison options or repeated --file <relative-path>] | --self-check | --capture <capture.md> | --delivery-run <DEL-NNN.md>");
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
  let deliveryRunPath = null;
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
    } else if (arg === "--delivery-run") {
      deliveryRunPath = argv[++index] ?? null;
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
  if (engineeringKind !== null && (selfCheckRequested || capturePath || deliveryRunPath || positional.length !== 1)) return usage();
  if (deliveryRunPath) {
    if (selfCheckRequested || positional.length || stage !== null || capturePath || repoRoot) return usage();
    return printResults(validateRecord(resolve(deliveryRunPath), "delivery-run", parseFrontmatter).errors, []);
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
