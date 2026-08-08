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
import { dirname, basename, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 3;
const GLOBAL_STATUS_SCHEMA_VERSION = 4;
const WORKFLOW_PREFIX = "{roots.workflows}/specdev/";
const STATE_PREFIX = "{roots.state}/specdev/";
const SKILLS_PREFIX = "{roots.skills}/";
const COMMANDS_PREFIX = "{roots.commands}/";

const EXPECTED_WORKS = new Set([
  "A-archive-and-consolidate",
  "C-code-review",
  "D-diagnose-bugs",
  "E-engineering-cognitive-mentor",
  "G-grill-with-docs",
  "I-implement",
  "I-init-setup",
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
  "coordination",
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
  "diagnosis",
  "grill",
  "spec",
  "tickets",
  "goal-plan",
  "implement",
  "review",
  "prototype",
  "wayfinder",
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
const DELEGATED_GOAL_PLAN_TRIGGERS = [
  "## Delegated Execution Addendum",
  "### Delivery Contract",
  "### Per-Ticket Dispatch Packets",
  "### Candidate Delivery Return and Lead Integration",
  "Lead / Provider",
  "Lead:",
  "Lead：",
  "Worker:",
  "Worker：",
  "Subagent",
  "subagent",
  "execution_model",
  "execution model: direct",
  "max_correction_rounds",
];
const REQUIRED_DELEGATED_GOAL_PLAN_MARKERS = [
  "## Delegated Execution Addendum",
  "### Delivery Contract",
  "### Per-Ticket Dispatch Packets",
  "### Candidate Delivery Return and Lead Integration",
  "native-subagent / external-web-subagent",
  "Lead / Provider",
  "#### Dispatch:",
];
const STATE_ARTIFACT_BASENAMES = new Set([
  "spec.md",
  "tickets-map.md",
  "goal-plan.md",
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
]);
const FORBIDDEN_OBSOLETE_BASENAMES = new Set([
  "source-issue.md",
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
  const knownFiles = new Set(entries.filter(isFile).map((path) => basename(path)));
  const knownDirectories = new Set(entries.filter(isDirectory).map((path) => basename(path)));

  for (const path of entries.filter(
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
      errors.push(`${toPosix(relative(root, path))}: invalid SpecDev global status v4 seed`);
    }
  }

  const schemaPath = join(root, "common", "schemas", "status.schema.json");
  if (!isFile(schemaPath)) {
    errors.push("missing common/schemas/status.schema.json");
    return errors;
  }
  const schema = JSON.parse(readText(schemaPath));
  if (
    schema.$id !== "urn:speculo:specdev:status:v4" ||
    schema.properties?.schema_version?.const !== GLOBAL_STATUS_SCHEMA_VERSION ||
    schema.additionalProperties !== false
  ) {
    errors.push("status.schema.json must define the strict SpecDev global status v4 contract");
  }
  for (const removed of ["work_history", "completed", "result"]) {
    if (JSON.stringify(schema).includes(`\"${removed}\"`)) {
      errors.push(`status.schema.json still contains removed global field ${removed}`);
    }
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
          "Authority",
          "DAG",
          "Gate",
          "Wave",
          "普通 Goal Plan",
          "委派 Goal Plan",
          "每次向用户询问",
          "delegated-execution.md",
          "Definition of Done",
        ],
      ],
    ],
    [
      "implement",
      [
        join(root, "I-implement", "I-implement.md"),
        ["codebase-design", "design-it-twice", "TDD", "双轴审查", "Evidence", "delegated execution", "subagent-delivery", "提交"],
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
        ["一个问题", "Logic", "UI", "临时 branch/worktree", "promotion target", "main"],
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
  ]) {
    if (!isFile(join(root, required))) errors.push(`missing architecture/wayfinding contract ${required}`);
  }

  const mapTemplate = join(root, "W-wayfinder", "wayfinder-map-template.md");
  if (isFile(mapTemplate) && /^## (?:开放 Tickets|调查清单)/m.test(readText(mapTemplate))) {
    errors.push("Wayfinder map template must query open Tickets instead of caching them");
  }

  const ordinaryGoalPlanTemplate = join(root, "P-goal-plan", "goal-plan-template.md");
  if (isFile(ordinaryGoalPlanTemplate)) {
    const text = readText(ordinaryGoalPlanTemplate);
    for (const forbidden of [
      "Lead",
      "Subagent",
      "subagent",
      "Provider",
      "Delivery Contract",
      "Dispatch Packet",
      "Worker",
      "max_correction_rounds",
      "execution_model",
    ]) {
      if (text.includes(forbidden)) {
        errors.push(`ordinary Goal Plan template contains delegated marker ${forbidden}`);
      }
    }
  }

  const delegatedTemplate = join(root, "P-goal-plan", "delegated-execution-template.md");
  if (!isFile(delegatedTemplate)) {
    errors.push("missing delegated Goal Plan template");
  } else {
    const text = readText(delegatedTemplate);
    const missing = REQUIRED_DELEGATED_GOAL_PLAN_MARKERS.filter((marker) => !text.includes(marker));
    if (missing.length) errors.push(`delegated Goal Plan template lost markers: ${JSON.stringify(missing)}`);
  }

  const sampleCore = [...REQUIRED_GOAL_PLAN_SECTIONS].join("\n");
  const partialErrors = [];
  validateDelegatedGoalPlan(`${sampleCore}\n## Delegated Execution Addendum\n### Delivery Contract`, "partial delegated self-check", partialErrors);
  if (!partialErrors.length) errors.push("partial delegated Goal Plan self-check did not fail");
  const strayRoleErrors = [];
  validateDelegatedGoalPlan(`${sampleCore}\nLead: owner`, "stray delegated role self-check", strayRoleErrors);
  if (!strayRoleErrors.length) errors.push("stray delegated role self-check did not fail");
  const completeErrors = [];
  validateDelegatedGoalPlan(`${sampleCore}\n${REQUIRED_DELEGATED_GOAL_PLAN_MARKERS.join("\n")}`, "complete delegated self-check", completeErrors);
  if (completeErrors.length) errors.push(...completeErrors);
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
  const paths = isDirectory(root)
    ? walk(root).filter((path) => isFile(path) && basename(path) === "record.md").sort()
    : [];
  if (required && !paths.length) errors.push("prototype stage requires a prototypes/<id>/record.md artifact");
  for (const path of paths) {
    const { meta, body } = parseFrontmatter(path);
    const label = toPosix(relative(change, path));
    if (meta.schema_version !== 1 || meta.artifact !== "prototype-record") {
      errors.push(`${label}: artifact/schema_version must be prototype-record/1`);
    }
    if (meta.change !== basename(change)) errors.push(`${label}: change must equal directory name`);
    if (!/^PROTO-\d{3,}$/.test(String(meta.prototype_id ?? ""))) errors.push(`${label}: invalid prototype_id`);
    if (!new Set(["logic", "ui"]).has(meta.branch)) errors.push(`${label}: invalid prototype branch`);
    if (!new Set(["active", "answered", "blocked", "discarded"]).has(meta.status)) errors.push(`${label}: invalid prototype status`);
    if (typeof meta.workspace_ref !== "string" || ABSOLUTE_MACHINE_PATH_RE.test(meta.workspace_ref)) {
      errors.push(`${label}: workspace_ref must be a portable locator`);
    }
    if (meta.status === "answered" && (!String(meta.winner ?? "").trim() || !String(meta.promotion_target ?? "").trim())) {
      errors.push(`${label}: answered prototype requires winner and promotion_target`);
    }
    if (!new Set(["pending", "clean", "registered"]).has(meta.cleanup_status)) errors.push(`${label}: invalid cleanup_status`);
    for (const heading of ["## Question and Assumption", "## Run and Assets", "## Evaluation", "## Promotion and Cleanup"]) {
      if (!body.includes(heading)) errors.push(`${label}: missing '${heading}'`);
    }
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
  if (meta.artifact !== "spec" || meta.schema_version !== SCHEMA_VERSION) {
    errors.push(`${label}: artifact/schema_version must be spec/${SCHEMA_VERSION}`);
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
  if (meta.artifact !== "tickets-map" || meta.schema_version !== SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be tickets-map/${SCHEMA_VERSION}`);
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

function validateDelegatedGoalPlan(body, label, errors) {
  if (!DELEGATED_GOAL_PLAN_TRIGGERS.some((marker) => body.includes(marker))) return;
  const missing = REQUIRED_DELEGATED_GOAL_PLAN_MARKERS.filter((marker) => !body.includes(marker));
  if (missing.length) {
    errors.push(`${label}: incomplete delegated execution addendum; missing ${JSON.stringify(missing)}`);
  }
}

function validateGoalPlan(path, errors) {
  if (!isFile(path)) return null;
  const { meta, body } = parseFrontmatter(path);
  if (meta.artifact !== "goal-plan" || meta.schema_version !== SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be goal-plan/${SCHEMA_VERSION}`);
  }
  const modes = requireList(meta, "modes", basename(path), errors);
  const invalidModes = modes.filter((mode) => !VALID_PLAN_MODES.has(mode));
  if (invalidModes.length) {
    errors.push(`${basename(path)}: invalid modes ${JSON.stringify(invalidModes)}`);
  }
  validateDelegatedGoalPlan(body, basename(path), errors);
  if (meta.ready_for_execution === true) {
    if (!new Set(["ready", "in_progress", "completed"]).has(meta.status)) {
      errors.push(`${basename(path)}: ready_for_execution conflicts with status`);
    }
    for (const heading of REQUIRED_GOAL_PLAN_SECTIONS) {
      if (!body.includes(heading)) {
        errors.push(`${basename(path)}: ready Goal Plan missing '${heading}'`);
      }
    }
    const assumptions = sectionBody(body, "## Assumptions");
    if (assumptions && assumptions.includes("高影响") && !assumptions.includes("必须为 `false`")) {
      errors.push(`${basename(path)}: high-impact assumptions cannot remain in a ready Goal Plan`);
    }
  }
  return { path, meta, body };
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
  if (meta.artifact !== "ticket" || meta.schema_version !== SCHEMA_VERSION) {
    errors.push(`${basename(path)}: artifact/schema_version must be ticket/${SCHEMA_VERSION}`);
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
    if (
      !lists.writable_paths.length &&
      !body.includes("无代码变更") &&
      !body.includes("仅文档")
    ) {
      errors.push(`${basename(path)}: Ready Ticket has no writable_paths and no no-code explanation`);
    }
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
    "created_at",
    "updated_at",
    "completed_at",
    "archived",
    "archive_path",
    "blockers",
    "deviations",
  ];
  const missing = required.filter((key) => !(key in data));
  if (missing.length) errors.push(`${basename(path)}: missing keys ${JSON.stringify(missing.sort())}`);
  if (data.schema_version !== SCHEMA_VERSION || data.artifact !== "change-status") {
    errors.push(`${basename(path)}: artifact/schema_version must be change-status/${SCHEMA_VERSION}`);
  }
  if (data.change !== expectedChange) {
    errors.push(`${basename(path)}: change must equal directory name ${expectedChange}`);
  }
  if (!new Set(["active", "blocked", "completed", "archived"]).has(data.change_status)) {
    errors.push(`${basename(path)}: invalid change_status ${data.change_status}`);
  }
  if (!Array.isArray(data.blockers) || !Array.isArray(data.deviations)) {
    errors.push(`${basename(path)}: blockers and deviations must be arrays`);
  }
  if (data.worktrees !== undefined && !Array.isArray(data.worktrees)) {
    errors.push(`${basename(path)}: worktrees must be an array when present`);
  }
  for (const worktree of Array.isArray(data.worktrees) ? data.worktrees : []) {
    if (!worktree || typeof worktree !== "object" || Array.isArray(worktree)) {
      errors.push(`${basename(path)}: invalid worktree entry`);
      continue;
    }
    const ref = worktree.workspace_ref;
    if (
      typeof ref !== "string" ||
      ref.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(ref)
    ) {
      errors.push(`${basename(path)}: workspace_ref must be a portable non-absolute locator`);
      continue;
    }
    if (worktree.provider === "git") {
      const expectedRef = `specdev-worktree/${worktree.ticket_id}`;
      if (ref !== expectedRef) {
        errors.push(`${basename(path)}: git workspace_ref must equal ${expectedRef}`);
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

function validateChange(change, stage = null) {
  const errors = [];
  const warnings = [];
  if (!isDirectory(change)) {
    return { errors: [`change directory does not exist: ${change}`], warnings };
  }

  const changeStatus = validateChangeStatus(join(change, ".status.json"), basename(change), errors);
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

  const specRequired = new Set(["spec", "tickets", "goal-plan", "implement", "complete"]).has(stage);
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
    for (const heading of [
      "## 2. 修改范围",
      "## 3. 验收与合同映射",
      "## 4. 验证执行",
      "## 5. 双轴审查",
      "## 6. 路径所有权审计",
      "## 7. 偏差与决策",
      "## 8. 残余风险与后续",
    ]) {
      if (!text.includes(heading)) {
        errors.push(`${toPosix(relative(change, evidence))}: missing '${heading}'`);
      }
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
  console.error("Usage: node validate-specdev.mjs [--stage <stage>] <change-directory> | --self-check");
  return 2;
}

function main(argv) {
  let selfCheckRequested = false;
  let stage = null;
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
    const result = validateChange(resolve(positional[0]), stage);
    return printResults(result.errors, result.warnings);
  }
  return usage();
}

process.exitCode = main(process.argv.slice(2));
