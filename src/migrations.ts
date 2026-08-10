import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { pathExists } from "./utils.js";

export type MigrationStatus = "not-required" | "migrated" | "pending";

export type MigrationBlocker = {
  code: string;
  path: string;
  message: string;
};

export type RuntimeMigrationResult = {
  status: MigrationStatus;
  sourceVersion: string | null;
  targetVersion: string;
  backupPath: string | null;
  blockers: MigrationBlocker[];
};

export type RuntimeMigrationOptions = {
  packageRoot: string;
  previousRoot: string;
  stagedRoot: string;
  selectedWorkflowIds: string[];
  unselectedWorkflowIds: string[];
};

type JsonObject = Record<string, unknown>;

type BackupEntry = {
  path: string;
  type: "file" | "symlink";
  bytes?: number;
  sha256?: string;
  target?: string;
};

const BACKUP_RELATIVE = ".speculo/back";
const INSTALL_RELATIVE = ".speculo/install.json";
const MIGRATION_RELATIVE = ".speculo/migration.json";
const SNAPSHOT_DIR = ".migration-snapshot";
const MANAGED_STATE_ENTRIES = new Set([
  "README.md",
  "workspace.json",
  "install.json",
  "migration.json",
  "back",
]);

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

async function readJson(path: string): Promise<JsonObject> {
  return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

async function nodeExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

async function readTargetVersion(packageRoot: string): Promise<string> {
  const manifest = await readJson(join(packageRoot, "package.json"));
  if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(manifest.version)) {
    throw new Error("package.json has no valid semantic version");
  }
  return manifest.version;
}

function versionBefore07(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return true;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major === 0 && minor < 7;
}

async function sourceVersion(snapshotState: string): Promise<{ version: string | null; blockers: MigrationBlocker[] }> {
  const installPath = join(snapshotState, "install.json");
  if (!(await pathExists(installPath))) return { version: "0.7.0-unversioned", blockers: [] };
  try {
    const install = await readJson(installPath);
    if (install.schema_version !== 1 || typeof install.package_version !== "string") {
      return {
        version: null,
        blockers: [{ code: "invalid-install-manifest", path: ".speculo/install.json", message: "install manifest must use schema v1 and contain package_version" }],
      };
    }
    return { version: install.package_version, blockers: [] };
  } catch (error) {
    return {
      version: null,
      blockers: [{ code: "invalid-json", path: ".speculo/install.json", message: String(error) }],
    };
  }
}

async function copySnapshot(previousRoot: string, snapshotRoot: string): Promise<void> {
  await mkdir(snapshotRoot, { recursive: true });
  const configPath = join(previousRoot, "config.json");
  if (await nodeExists(configPath)) await cp(configPath, join(snapshotRoot, "config.json"), { force: true, verbatimSymlinks: true });
  const previousState = join(previousRoot, ".speculo");
  if (!(await nodeExists(previousState))) return;
  await cp(previousState, join(snapshotRoot, "state"), {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
    filter: (source) => {
      const item = toPosix(relative(previousState, source));
      return item !== "back" && !item.startsWith("back/") && item !== "migration.json";
    },
  });
}

async function collectBackupEntries(root: string, current = root): Promise<BackupEntry[]> {
  if (!(await pathExists(current))) return [];
  const entries: BackupEntry[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      entries.push(...await collectBackupEntries(root, path));
      continue;
    }
    const itemPath = toPosix(relative(root, path));
    if (entry.isSymbolicLink()) {
      entries.push({ path: itemPath, type: "symlink", target: await readlink(path) });
      continue;
    }
    if (!entry.isFile()) continue;
    const content = await readFile(path);
    entries.push({
      path: itemPath,
      type: "file",
      bytes: content.byteLength,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

async function writeBackup(
  snapshotRoot: string,
  stagedRoot: string,
  source: string | null,
  target: string,
): Promise<void> {
  const backupRoot = join(stagedRoot, BACKUP_RELATIVE);
  await rm(backupRoot, { recursive: true, force: true });
  await mkdir(backupRoot, { recursive: true });
  const snapshotConfig = join(snapshotRoot, "config.json");
  const snapshotState = join(snapshotRoot, "state");
  if (await nodeExists(snapshotConfig)) await cp(snapshotConfig, join(backupRoot, "config.json"), { force: true, verbatimSymlinks: true });
  if (await nodeExists(snapshotState)) await cp(snapshotState, join(backupRoot, "state"), { recursive: true, force: true, verbatimSymlinks: true });
  const files = await collectBackupEntries(backupRoot);
  await writeFile(join(backupRoot, "manifest.json"), JSON.stringify({
    schema_version: 1,
    source_version: source,
    target_version: target,
    created_at: new Date().toISOString(),
    files,
  }, null, 2) + "\n", "utf8");
}

async function inspectJsonTree(root: string): Promise<MigrationBlocker[]> {
  if (!(await pathExists(root))) return [];
  const blockers: MigrationBlocker[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const label = toPosix(relative(dirname(root), path));
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isSymbolicLink()) {
        blockers.push({ code: "state-symlink", path: label, message: "runtime state symlinks require manual migration review" });
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          JSON.parse(await readFile(path, "utf8"));
        } catch (error) {
          blockers.push({ code: "invalid-json", path: label, message: String(error) });
        }
      }
    }
  }
  await visit(root);
  return blockers;
}

function expectArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: JsonObject, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const CHANGE_NAME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARCHIVE_PATH_PATTERN = /^<Path>\{roots\.state\}\/specdev\/archive\/[^<]+<\/Path>$/;
const EVIDENCE_PATH_PATTERN = /^<Path>\{roots\.state\}\/specdev\/changes\/[^<]+\/evidence\/T-[0-9]{2,}\.md<\/Path>$/;

function isChangeName(value: unknown): value is string {
  return typeof value === "string" && CHANGE_NAME_PATTERN.test(value);
}

function hasCompleteV4Integration(
  integration: JsonObject,
  worktreeStatus: unknown,
  sourceCheckpoint: unknown,
  change: string,
  ticketId: string,
): boolean {
  const required = [
    "status", "parent_before_sha", "source_sha", "candidate_sha", "candidate_branch",
    "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification",
    "e2e", "evidence", "attempts",
  ];
  if (!hasExactKeys(integration, required)) return false;
  if (!new Set(["pending", "candidate", "passed", "failed", "stale"]).has(String(integration.status))) return false;
  if (![null, "fast-forward", "merge-commit"].includes(integration.method as null | string)) return false;
  if (!new Set(["pending", "passed", "failed"]).has(String(integration.verification))) return false;
  for (const key of ["parent_before_sha", "source_sha", "candidate_sha", "candidate_branch", "result_sha"]) {
    if (!isStringOrNull(integration[key])) return false;
  }
  if (
    integration.candidate_workspace_ref !== null &&
    (typeof integration.candidate_workspace_ref !== "string" ||
      !/^specdev-worktree\/\.integration\/T-[0-9]{2,}$/.test(integration.candidate_workspace_ref))
  ) return false;
  if (!isStringArray(integration.conflict_paths)) return false;
  if (!Number.isInteger(integration.attempts) || Number(integration.attempts) < 0) return false;
  if (
    typeof integration.evidence !== "string" ||
    !EVIDENCE_PATH_PATTERN.test(integration.evidence) ||
    integration.evidence !== `<Path>{roots.state}/specdev/changes/${change}/evidence/${ticketId}.md</Path>`
  ) return false;

  const e2e = integration.e2e;
  if (!isJsonObject(e2e) || !hasExactKeys(e2e, ["required", "status", "evidence"])) return false;
  if (typeof e2e.required !== "boolean" || !new Set(["not-required", "pending", "passed", "failed"]).has(String(e2e.status))) return false;
  if (!isStringOrNull(e2e.evidence)) return false;
  if (e2e.required === false && e2e.status !== "not-required") return false;
  if (e2e.required === true && e2e.status === "not-required") return false;
  if (e2e.required === true && e2e.status === "passed" && !isNonEmptyString(e2e.evidence)) return false;

  const lifecycleNeedsCandidate = new Set(["integrating", "integrated", "removed"]).has(String(worktreeStatus));
  if (lifecycleNeedsCandidate) {
    if (
      !isNonEmptyString(integration.parent_before_sha) ||
      !isNonEmptyString(integration.source_sha) ||
      integration.source_sha !== sourceCheckpoint ||
      !isNonEmptyString(integration.candidate_sha) ||
      integration.candidate_branch !== `speculo/integration/${change}/${ticketId}` ||
      integration.candidate_workspace_ref !== `specdev-worktree/.integration/${ticketId}` ||
      !new Set(["fast-forward", "merge-commit"]).has(String(integration.method)) ||
      !Number.isInteger(integration.attempts) ||
      Number(integration.attempts) < 1
    ) return false;
  }
  if (worktreeStatus === "integrating" && integration.status !== "candidate") return false;

  if (new Set(["integrated", "removed"]).has(String(worktreeStatus))) {
    if (
      integration.status !== "passed" ||
      integration.verification !== "passed" ||
      !isNonEmptyString(integration.result_sha) ||
      integration.result_sha !== integration.candidate_sha ||
      !new Set(["not-required", "passed"]).has(String(e2e.status))
    ) return false;
    if (
      integration.method === "fast-forward" &&
      (integration.candidate_sha !== sourceCheckpoint || integration.conflict_paths.length > 0)
    ) return false;
    if (
      integration.method === "merge-commit" &&
      (integration.candidate_sha === sourceCheckpoint || integration.candidate_sha === integration.parent_before_sha)
    ) return false;
  }
  return true;
}

function hasLegacyWorktreeState(status: JsonObject): boolean {
  return status.schema_version === 3 &&
    status.worktrees !== undefined &&
    (!Array.isArray(status.worktrees) || status.worktrees.length > 0);
}

function hasUnsupportedV3ChangeStatusFields(status: JsonObject): boolean {
  const allowed = new Set([
    "schema_version", "artifact", "change", "change_status", "current_work",
    "created_at", "updated_at", "completed_at", "archived", "archive_path",
    "blockers", "deviations", "worktrees",
  ]);
  return status.schema_version === 3 && Object.keys(status).some((key) => !allowed.has(key));
}

function hasUnsupportedV3SpecdevConfigFields(config: JsonObject): boolean {
  if (config.schema_version !== 3) return false;
  const rootAllowed = new Set([
    "schema_version", "interaction_language", "artifact_language", "git",
    "execution", "verification", "planning",
  ]);
  if (Object.keys(config).some((key) => !rootAllowed.has(key))) return true;
  const git = isJsonObject(config.git) ? config.git : {};
  const execution = isJsonObject(config.execution) ? config.execution : {};
  return Object.keys(git).some((key) => !new Set(["auto_commit", "default_branch", "worktree_for_parallel"]).has(key)) ||
    Object.keys(execution).some((key) => !new Set(["max_parallel", "deep_ticket_human_approval", "shared_path_owner"]).has(key));
}

function hasCompleteV4ChangeStatus(status: JsonObject): boolean {
  const required = [
    "schema_version", "artifact", "change", "change_status", "current_work", "created_at",
    "updated_at", "completed_at", "archived", "archive_path", "blockers", "deviations", "worktrees",
  ];
  if (
    status.schema_version !== 4 ||
    status.artifact !== "change-status" ||
    !hasExactKeys(status, required) ||
    typeof status.change !== "string" ||
    !CHANGE_NAME_PATTERN.test(status.change) ||
    !new Set(["active", "blocked", "completed", "archived"]).has(String(status.change_status)) ||
    !(status.current_work === null || typeof status.current_work === "string") ||
    !isNonEmptyString(status.created_at) ||
    !isNonEmptyString(status.updated_at) ||
    !(status.completed_at === null || isNonEmptyString(status.completed_at)) ||
    typeof status.archived !== "boolean" ||
    !(status.archive_path === null || (typeof status.archive_path === "string" && ARCHIVE_PATH_PATTERN.test(status.archive_path))) ||
    !isStringArray(status.blockers) ||
    !isStringArray(status.deviations) ||
    !Array.isArray(status.worktrees)
  ) return false;

  if (status.change_status === "archived") {
    if (status.archived !== true || typeof status.archive_path !== "string" || !ARCHIVE_PATH_PATTERN.test(status.archive_path)) return false;
  } else if (status.archived !== false) {
    return false;
  }

  const seenTickets = new Set<string>();
  return status.worktrees.every((entry) => {
    const requiredWorktree = [
      "ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha",
      "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at",
    ];
    if (!isJsonObject(entry) || !hasExactKeys(entry, requiredWorktree) || entry.provider !== "git") return false;
    if (typeof entry.ticket_id !== "string" || !/^T-[0-9]{2,}$/.test(entry.ticket_id)) return false;
    if (seenTickets.has(entry.ticket_id)) return false;
    seenTickets.add(entry.ticket_id);
    for (const key of ["owner", "implementation_owner", "integration_owner", "base_sha", "parent_branch", "branch", "updated_at"]) {
      if (!isNonEmptyString(entry[key])) return false;
    }
    if (entry.parent_branch === entry.branch) return false;
    if (entry.workspace_ref !== `specdev-worktree/${entry.ticket_id}`) return false;
    if (!new Set(["planned", "active", "review", "integrating", "integrated", "removed", "blocked"]).has(String(entry.status))) return false;
    const sourceRequired = new Set(["review", "integrating", "integrated", "removed"]).has(String(entry.status));
    if (sourceRequired ? !isNonEmptyString(entry.source_checkpoint) : !isStringOrNull(entry.source_checkpoint)) return false;
    const integration = entry.integration;
    return isJsonObject(integration) && hasCompleteV4Integration(
      integration,
      entry.status,
      entry.source_checkpoint,
      String(status.change),
      entry.ticket_id,
    );
  });
}

function hasCompleteV4SpecdevConfig(config: JsonObject): boolean {
  const rootKeys = ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"];
  if (
    config.schema_version !== 4 ||
    !hasExactKeys(config, rootKeys) ||
    !isNonEmptyString(config.interaction_language) ||
    !isNonEmptyString(config.artifact_language) ||
    !isJsonObject(config.git) ||
    !isJsonObject(config.execution) ||
    !isJsonObject(config.verification) ||
    !isJsonObject(config.planning)
  ) {
    return false;
  }
  if (!hasExactKeys(config.git, ["default_branch"]) || !(config.git.default_branch === null || typeof config.git.default_branch === "string")) return false;
  if (!hasExactKeys(config.execution, ["max_implementation_agents", "deep_ticket_human_approval", "shared_path_owner"])) return false;
  const limit = config.execution.max_implementation_agents;
  if (
    !Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 3 ||
    typeof config.execution.deep_ticket_human_approval !== "boolean" ||
    !isNonEmptyString(config.execution.shared_path_owner)
  ) return false;
  for (const key of ["test", "typecheck", "lint", "build"]) {
    if (!(key in config.verification) || !isStringOrNull(config.verification[key])) return false;
  }
  return new Set(["lite", "standard", "deep"]).has(String(config.planning.default_depth)) &&
    typeof config.planning.require_ready_gate === "boolean" &&
    typeof config.planning.require_evidence === "boolean";
}

function parseGoalPlanFrontmatter(text: string): JsonObject | null {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return null;
  const meta: JsonObject = {};
  let currentListKey: string | null = null;
  for (const line of lines.slice(1, end)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (currentListKey && /^\s+-\s+/.test(line)) {
      (meta[currentListKey] as unknown[]).push(parseGoalPlanScalar(line.replace(/^\s+-\s+/, "")));
      continue;
    }
    currentListKey = null;
    const colon = line.indexOf(":");
    if (colon < 1) return null;
    const key = line.slice(0, colon).trim();
    if (key in meta) return null;
    const raw = line.slice(colon + 1).trim();
    if (!raw) {
      meta[key] = [];
      currentListKey = key;
    } else {
      meta[key] = parseGoalPlanScalar(raw);
    }
  }
  return meta;
}

function parseGoalPlanScalar(raw: string): unknown {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(",").map((item) => parseGoalPlanScalar(item)) : [];
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function hasCompleteV5GoalPlan(meta: JsonObject, change: string): boolean {
  if (meta.schema_version !== 5) return false;
  const v4Shape = { ...meta, schema_version: 4 };
  if (!hasCompleteV4GoalPlan(v4Shape, change)) return false;
  const status = String(meta.status);
  return (new Set(["ready", "in_progress"]).has(status) && meta.ready_for_execution === true) ||
    (new Set(["draft", "blocked", "completed"]).has(status) && meta.ready_for_execution === false);
}

function normalizeGoalPlanV5(text: string): string {
  const meta = parseGoalPlanFrontmatter(text);
  if (meta === null || !hasCompleteV4GoalPlan(meta, String(meta.change))) return text;
  return text.replace(/^schema_version:\s*4\s*$/m, "schema_version: 5");
}

function v5Authorization(scope: string): JsonObject {
  return { status: "not-authorized", source: null, granted_at: null, scope };
}

function normalizeChangeStatusV5(previous: JsonObject, globalEntry: JsonObject | null): JsonObject {
  if (previous.schema_version === 5) return previous;
  const change = String(previous.change);
  const worktrees = Array.isArray(previous.worktrees) ? previous.worktrees.map((entry) => {
    if (!isJsonObject(entry)) return entry;
    const ticketId = String(entry.ticket_id);
    const integration = isJsonObject(entry.integration) ? entry.integration : {};
    const sourceCheckpoint = isStringOrNull(entry.source_checkpoint) ? entry.source_checkpoint : null;
    return {
      ...entry,
      workspace_ref: `specdev-worktree/${change}/${ticketId}`,
      integration: {
        ...integration,
        parent_ref: typeof entry.parent_branch === "string" ? entry.parent_branch : null,
        candidate_tree_sha: integration.candidate_sha ?? null,
        candidate_workspace_ref: integration.candidate_workspace_ref === null ? null : `specdev-worktree/.integration/${change}/${ticketId}`,
        full_suite: { required: true, status: "pending", reason: null, evidence: null },
        promotion_status: integration.status === "passed" ? "applied" : "pending",
        source_sha: integration.source_sha ?? sourceCheckpoint,
      },
    };
  }) : [];
  const status = String(previous.change_status);
  return {
    ...previous,
    schema_version: 5,
    current_work: typeof previous.current_work === "string" ? previous.current_work : globalEntry?.current_work ?? null,
    works_run: Array.isArray(globalEntry?.works_run) && globalEntry.works_run.every((item) => typeof item === "string") ? globalEntry.works_run : [],
    claimed_investigations: Array.isArray(globalEntry?.claimed_investigations) ? globalEntry.claimed_investigations.map((claim) => isJsonObject(claim) ? {
      id: String(claim.id ?? ""), owner: String(claim.owner ?? ""), session: typeof claim.session === "string" ? claim.session : null, claimed_at: String(claim.claimed_at ?? ""),
    } : claim) : [],
    execution_authorization: {
      implementation_commit: v5Authorization("Ticket source commits"),
      local_candidate_integration: v5Authorization("Lead-owned local parent candidate integration and parent update"),
      source_cleanup: v5Authorization("Source worktree and branch cleanup"),
    },
    leadership: { current: "unassigned", epoch: 1, assigned_at: String(previous.updated_at), history: [] },
    archived: status === "archived",
    archive_path: status === "archived" ? `<Path>{roots.state}/specdev/archive/${change.slice(0, 7)}/${change}</Path>` : null,
    worktrees,
  };
}

function hasCompleteV5ChangeStatus(status: JsonObject): boolean {
  const required = [
    "schema_version", "artifact", "change", "change_status", "current_work", "works_run", "claimed_investigations",
    "execution_authorization", "leadership", "created_at", "updated_at", "completed_at", "archived", "archive_path", "blockers", "deviations", "worktrees",
  ];
  if (status.schema_version !== 5 || !hasExactKeys(status, required) || !isChangeName(status.change) ||
    !isStringArray(status.works_run) || new Set(status.works_run).size !== status.works_run.length ||
    !Array.isArray(status.claimed_investigations) || !isJsonObject(status.execution_authorization) || !isJsonObject(status.leadership)) return false;
  const authorization = status.execution_authorization;
  for (const key of ["implementation_commit", "local_candidate_integration", "source_cleanup"]) {
    const entry = authorization[key];
    if (!isJsonObject(entry) || !hasExactKeys(entry, ["status", "source", "granted_at", "scope"]) ||
      !new Set(["authorized", "not-authorized", "revoked"]).has(String(entry.status)) || !isNonEmptyString(entry.scope) ||
      !isStringOrNull(entry.source) || !isStringOrNull(entry.granted_at)) return false;
  }
  const leadership = status.leadership;
  return isNonEmptyString(leadership.current) && Number.isInteger(leadership.epoch) && Number(leadership.epoch) >= 1 &&
    isNonEmptyString(leadership.assigned_at) && Array.isArray(leadership.history);
}

function hasCompleteV4GoalPlan(meta: JsonObject, change: string): boolean {
  const required = [
    "schema_version", "artifact", "change", "status", "modes", "orchestration", "lead",
    "implementation_agent_limit", "ticket_workspace_policy", "integration_gate", "ready_for_execution",
  ];
  if (!hasExactKeys(meta, required)) return false;
  if (
    meta.schema_version !== 4 ||
    meta.artifact !== "goal-plan" ||
    meta.change !== change ||
    !new Set(["draft", "ready", "in_progress", "completed", "blocked"]).has(String(meta.status)) ||
    meta.orchestration !== "lead-directed" ||
    !isNonEmptyString(meta.lead) ||
    !Number.isInteger(meta.implementation_agent_limit) ||
    Number(meta.implementation_agent_limit) < 1 ||
    Number(meta.implementation_agent_limit) > 3 ||
    meta.ticket_workspace_policy !== "required" ||
    meta.integration_gate !== "candidate-merge" ||
    typeof meta.ready_for_execution !== "boolean" ||
    !Array.isArray(meta.modes)
  ) return false;
  const modes = meta.modes;
  return modes.every((mode) => new Set(["migration", "high-assurance", "reference-conformance", "release-coordination"]).has(String(mode))) &&
    new Set(modes.map(String)).size === modes.length;
}

async function inspectGoalPlanVersion(
  stateRoot: string,
  change: string,
  blockers: MigrationBlocker[],
): Promise<void> {
  const path = join(stateRoot, "specdev", "changes", change, "goal-plan.md");
  if (!(await pathExists(path))) return;
  const frontmatter = parseGoalPlanFrontmatter(await readFile(path, "utf8"));
  const currentContract = frontmatter !== null && hasCompleteV5GoalPlan(frontmatter, change);
  if (!currentContract) {
    blockers.push({
      code: "unsupported-goal-plan-contract",
      path: `.speculo/specdev/changes/${change}/goal-plan.md`,
      message: "Goal Plan must contain the complete fixed Lead and candidate-integration v5 frontmatter contract",
    });
  }
}

async function inspectSpecdevState(stateRoot: string): Promise<MigrationBlocker[]> {
  const blockers: MigrationBlocker[] = [];
  const statusPath = join(stateRoot, "specdev", "status.json");
  if (!(await pathExists(statusPath))) return blockers;
  let status: JsonObject;
  try {
    status = await readJson(statusPath);
  } catch {
    return blockers;
  }
  if (!isJsonObject(status) || !new Set([4, 5]).has(Number(status.schema_version)) || status.workflow !== "specdev" || !expectArray(status.active) || !expectArray(status.archived)) {
    blockers.push({ code: "unsupported-specdev-status", path: ".speculo/specdev/status.json", message: "automatic migration supports SpecDev global status schema v4/v5 only" });
    return blockers;
  }
  const activeNames = new Set<string>();
  for (const item of status.active) {
    if (!item || typeof item !== "object" || typeof (item as JsonObject).change !== "string") {
      blockers.push({ code: "invalid-active-entry", path: ".speculo/specdev/status.json", message: "active entries must contain a change name" });
      continue;
    }
    const name = (item as JsonObject).change;
    if (!isChangeName(name)) {
      blockers.push({ code: "invalid-change-name", path: ".speculo/specdev/status.json", message: "active entries must use canonical change names" });
      continue;
    }
    if (activeNames.has(name)) {
      blockers.push({ code: "duplicate-active-change", path: ".speculo/specdev/status.json", message: `${name} appears more than once in active` });
    }
    activeNames.add(name);
    const changeStatusPath = join(stateRoot, "specdev", "changes", name, ".status.json");
    if (!(await pathExists(changeStatusPath))) {
      blockers.push({ code: "missing-active-change", path: `.speculo/specdev/changes/${name}/.status.json`, message: "active status entry has no matching change state" });
    } else {
      try {
        const changeStatus = await readJson(changeStatusPath);
        if (
          !new Set([3, 4, 5]).has(Number(changeStatus.schema_version)) ||
          changeStatus.artifact !== "change-status" ||
          changeStatus.change !== name ||
          !new Set(["active", "blocked", "completed"]).has(String(changeStatus.change_status))
        ) {
          blockers.push({ code: "unsupported-change-status", path: `.speculo/specdev/changes/${name}/.status.json`, message: "active change state must use schema v3/v4 and match its index entry" });
        } else if (hasLegacyWorktreeState(changeStatus)) {
          blockers.push({
            code: "ambiguous-ticket-worktree-contract",
            path: `.speculo/specdev/changes/${name}/.status.json`,
            message: "legacy worktree state cannot determine required implementation owner, source commit, candidate gate, or E2E disposition",
          });
        } else if (hasUnsupportedV3ChangeStatusFields(changeStatus)) {
          blockers.push({
            code: "unmapped-change-status-fields",
            path: `.speculo/specdev/changes/${name}/.status.json`,
            message: "legacy change-status contains additional fields that cannot be dropped during automatic migration",
          });
        } else if (changeStatus.schema_version === 4) {
          blockers.push({
            code: "unmapped-change-runtime-authority",
            path: `.speculo/specdev/changes/${name}/.status.json`,
            message: "v4 change-status cannot infer execution authorization or Lead leadership; reconcile explicitly before v5 migration",
          });
        } else if (changeStatus.schema_version === 5 && !hasCompleteV5ChangeStatus(changeStatus)) {
          blockers.push({
            code: "invalid-change-status-v5",
            path: `.speculo/specdev/changes/${name}/.status.json`,
            message: "change-status v5 is missing required runtime authority fields",
          });
        }
        await inspectGoalPlanVersion(stateRoot, name, blockers);
      } catch {
        // The JSON tree check reports the parse failure with the precise path.
      }
    }
  }
  const archivedNames = new Set<string>();
  for (const item of status.archived) {
    if (typeof item !== "string") {
      blockers.push({ code: "invalid-archived-entry", path: ".speculo/specdev/status.json", message: "archived entries must be change names" });
      continue;
    }
    if (!isChangeName(item)) {
      blockers.push({ code: "invalid-change-name", path: ".speculo/specdev/status.json", message: "archived entries must use canonical change names" });
      continue;
    }
    if (archivedNames.has(item)) blockers.push({ code: "duplicate-archived-change", path: ".speculo/specdev/status.json", message: `${item} appears more than once in archived` });
    archivedNames.add(item);
    if (activeNames.has(item)) blockers.push({ code: "status-overlap", path: ".speculo/specdev/status.json", message: `${item} appears in both active and archived` });
    const month = item.slice(0, 7);
    const archivedStatusPath = join(stateRoot, "specdev", "archive", month, item, ".status.json");
    if (!(await pathExists(archivedStatusPath))) {
      blockers.push({ code: "missing-archived-change", path: `.speculo/specdev/archive/${month}/${item}/.status.json`, message: "archived status entry has no matching archived change state" });
    } else {
      try {
        const archivedStatus = await readJson(archivedStatusPath);
        if (
          !new Set([3, 4]).has(Number(archivedStatus.schema_version)) ||
          archivedStatus.artifact !== "change-status" ||
          archivedStatus.change !== item ||
          archivedStatus.change_status !== "archived"
        ) {
          blockers.push({ code: "unsupported-archived-status", path: `.speculo/specdev/archive/${month}/${item}/.status.json`, message: "archived change state must use schema v3/v4 and match its index entry" });
        } else if (hasLegacyWorktreeState(archivedStatus)) {
          blockers.push({
            code: "ambiguous-archived-worktree-contract",
            path: `.speculo/specdev/archive/${month}/${item}/.status.json`,
            message: "legacy archived worktree state requires an explicit v4 reconciliation decision",
          });
        } else if (hasUnsupportedV3ChangeStatusFields(archivedStatus)) {
          blockers.push({
            code: "unmapped-archived-status-fields",
            path: `.speculo/specdev/archive/${month}/${item}/.status.json`,
            message: "legacy archived status contains additional fields that require an explicit migration decision",
          });
        } else if (archivedStatus.schema_version === 4 && !hasCompleteV4ChangeStatus(archivedStatus)) {
          blockers.push({
            code: "invalid-archived-status-v4",
            path: `.speculo/specdev/archive/${month}/${item}/.status.json`,
            message: "archived change-status v4 is incomplete",
          });
        }
      } catch {
        // The JSON tree check reports the parse failure with the precise path.
      }
    }
  }
  const changesRoot = join(stateRoot, "specdev", "changes");
  if (await pathExists(changesRoot)) {
    for (const entry of await readdir(changesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const changeStatusPath = join(changesRoot, entry.name, ".status.json");
      if (!(await pathExists(changeStatusPath))) {
        blockers.push({ code: "missing-change-status", path: `.speculo/specdev/changes/${entry.name}/.status.json`, message: "change directory has no status file" });
      } else if (!activeNames.has(entry.name)) {
        blockers.push({ code: "unindexed-active-change", path: `.speculo/specdev/changes/${entry.name}`, message: "change directory is missing from the active index" });
      }
    }
  }
  const archiveRoot = join(stateRoot, "specdev", "archive");
  if (await pathExists(archiveRoot)) {
    for (const monthEntry of await readdir(archiveRoot, { withFileTypes: true })) {
      if (!monthEntry.isDirectory()) continue;
      const monthRoot = join(archiveRoot, monthEntry.name);
      for (const changeEntry of await readdir(monthRoot, { withFileTypes: true })) {
        if (!changeEntry.isDirectory()) continue;
        const archivedStatusPath = join(monthRoot, changeEntry.name, ".status.json");
        if (!(await pathExists(archivedStatusPath))) {
          blockers.push({ code: "missing-archived-status", path: `.speculo/specdev/archive/${monthEntry.name}/${changeEntry.name}/.status.json`, message: "archived change directory has no status file" });
        } else if (!archivedNames.has(changeEntry.name)) {
          blockers.push({ code: "unindexed-archived-change", path: `.speculo/specdev/archive/${monthEntry.name}/${changeEntry.name}`, message: "archived change directory is missing from the archived index" });
        }
      }
    }
  }
  const configPath = join(stateRoot, "specdev", "config.json");
  if (await pathExists(configPath)) {
    try {
      const config = await readJson(configPath);
      if (!new Set([3, 4]).has(Number(config.schema_version))) {
        blockers.push({ code: "unsupported-specdev-config", path: ".speculo/specdev/config.json", message: "automatic migration supports SpecDev config schema v3/v4 only" });
      } else if (hasUnsupportedV3SpecdevConfigFields(config)) {
        blockers.push({ code: "unmapped-specdev-config-fields", path: ".speculo/specdev/config.json", message: "SpecDev config v3 contains additional fields that require an explicit migration decision" });
      } else if (config.schema_version === 4 && !hasCompleteV4SpecdevConfig(config)) {
        blockers.push({ code: "invalid-specdev-config-v4", path: ".speculo/specdev/config.json", message: "SpecDev config v4 is incomplete or contains legacy execution fields" });
      }
    } catch {
      // The JSON tree check reports the parse failure with the precise path.
    }
  }
  return blockers;
}

async function inspectCommandState(stateRoot: string): Promise<MigrationBlocker[]> {
  const commandsRoot = join(stateRoot, "commands");
  if (!(await pathExists(commandsRoot))) return [];
  const blockers: MigrationBlocker[] = [];
  for (const entry of await readdir(commandsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const statePath = join(commandsRoot, entry.name, "state.json");
    if (!(await pathExists(statePath))) continue;
    if (entry.name !== "docs-sync") {
      blockers.push({ code: "unknown-command-state", path: `.speculo/commands/${entry.name}/state.json`, message: "command state has no current migration contract" });
      continue;
    }
    try {
      const state = await readJson(statePath);
      if (state.schema_version !== 4 || state.command !== "docs-sync") {
        blockers.push({ code: "unsupported-command-state", path: ".speculo/commands/docs-sync/state.json", message: "automatic migration supports docs-sync state schema v4 only" });
      }
    } catch {
      // The JSON tree check reports the parse failure with the precise path.
    }
  }
  return blockers;
}

async function inspectPersonState(stateRoot: string): Promise<MigrationBlocker[]> {
  const statusPath = join(stateRoot, "person", "status.json");
  if (!(await pathExists(statusPath))) return [];
  try {
    const status = await readJson(statusPath);
    if (status.schema_version !== 1 || status.workflow !== "person" || !expectArray(status.active)) {
      return [{ code: "unsupported-person-status", path: ".speculo/person/status.json", message: "automatic migration supports person status schema v1 only" }];
    }
  } catch {
    // The JSON tree check reports the parse failure with the precise path.
  }
  return [];
}

async function inspectSnapshot(snapshotRoot: string, source: string | null): Promise<MigrationBlocker[]> {
  const blockers: MigrationBlocker[] = [];
  const configPath = join(snapshotRoot, "config.json");
  if (!(await pathExists(configPath))) {
    blockers.push({ code: "missing-config", path: "config.json", message: "existing installation has no project configuration" });
  } else if ((await lstat(configPath)).isSymbolicLink()) {
    blockers.push({ code: "state-symlink", path: "config.json", message: "project configuration symlinks require manual migration review" });
  } else {
    try {
      const config = await readJson(configPath);
      if (config.schema_version !== 1) blockers.push({ code: "unsupported-config", path: "config.json", message: "automatic migration supports project config schema v1 only" });
    } catch (error) {
      blockers.push({ code: "invalid-json", path: "config.json", message: String(error) });
    }
  }
  const stateRoot = join(snapshotRoot, "state");
  const stateRootIsSymlink = await pathExists(stateRoot) && (await lstat(stateRoot)).isSymbolicLink();
  if (stateRootIsSymlink) {
    blockers.push({ code: "state-symlink", path: ".speculo", message: "runtime state root symlinks require manual migration review" });
  }
  const workspacePath = join(stateRoot, "workspace.json");
  if (!stateRootIsSymlink && !(await pathExists(workspacePath))) {
    blockers.push({ code: "missing-workspace", path: ".speculo/workspace.json", message: "existing installation has no workspace root manifest" });
  } else if (!stateRootIsSymlink) {
    try {
      const workspace = await readJson(workspacePath);
      const roots = workspace.roots as JsonObject | undefined;
      if (
        workspace.schema_version !== 1 || workspace.path_base !== "project-root" ||
        !roots || typeof roots !== "object" ||
        ["config", "speculo", "state", "commands", "skills", "workflows"].some((key) => typeof roots[key] !== "string")
      ) {
        blockers.push({ code: "unsupported-workspace", path: ".speculo/workspace.json", message: "automatic migration supports workspace schema v1 with project-root aliases only" });
      }
    } catch {
      // The JSON tree check reports the parse failure with the precise path.
    }
  }
  if (source === null || versionBefore07(source)) {
    blockers.push({ code: "unsupported-source-version", path: ".speculo/install.json", message: "automatic migration supports v0.7 and newer installations only" });
  }
  if (!stateRootIsSymlink) {
    blockers.push(...await inspectJsonTree(stateRoot));
    blockers.push(...await inspectSpecdevState(stateRoot));
    blockers.push(...await inspectPersonState(stateRoot));
    blockers.push(...await inspectCommandState(stateRoot));
  }
  return blockers;
}

function mergeDefaults(defaults: unknown, previous: unknown): unknown {
  if (
    defaults && typeof defaults === "object" && !Array.isArray(defaults) &&
    previous && typeof previous === "object" && !Array.isArray(previous)
  ) {
    const merged: JsonObject = { ...(defaults as JsonObject) };
    for (const [key, value] of Object.entries(previous as JsonObject)) {
      merged[key] = key in merged ? mergeDefaults(merged[key], value) : value;
    }
    return merged;
  }
  return previous;
}

function normalizeSpecdevConfigV4(previous: JsonObject, defaults: JsonObject): JsonObject {
  if (previous.schema_version === 4) return previous;
  const previousGit = isJsonObject(previous.git) ? previous.git : {};
  const previousExecution = isJsonObject(previous.execution) ? previous.execution : {};
  const defaultGit = isJsonObject(defaults.git) ? defaults.git : {};
  const defaultExecution = isJsonObject(defaults.execution) ? defaults.execution : {};
  const legacyLimit = Number(previousExecution.max_parallel);
  const maxImplementationAgents = Number.isInteger(legacyLimit)
    ? Math.max(1, Math.min(3, legacyLimit))
    : Number(defaultExecution.max_implementation_agents ?? 3);
  return {
    schema_version: 4,
    interaction_language: typeof previous.interaction_language === "string"
      ? previous.interaction_language
      : defaults.interaction_language,
    artifact_language: typeof previous.artifact_language === "string"
      ? previous.artifact_language
      : defaults.artifact_language,
    git: {
      default_branch: typeof previousGit.default_branch === "string" || previousGit.default_branch === null
        ? previousGit.default_branch
        : defaultGit.default_branch ?? null,
    },
    execution: {
      max_implementation_agents: maxImplementationAgents,
      deep_ticket_human_approval: typeof previousExecution.deep_ticket_human_approval === "boolean"
        ? previousExecution.deep_ticket_human_approval
        : defaultExecution.deep_ticket_human_approval,
      shared_path_owner: typeof previousExecution.shared_path_owner === "string"
        ? previousExecution.shared_path_owner
        : defaultExecution.shared_path_owner,
    },
    verification: isJsonObject(previous.verification)
      ? mergeDefaults(defaults.verification, previous.verification)
      : defaults.verification,
    planning: isJsonObject(previous.planning)
      ? mergeDefaults(defaults.planning, previous.planning)
      : defaults.planning,
  };
}

function normalizeChangeStatusV4(previous: JsonObject): JsonObject {
  if (previous.schema_version === 4) return previous;
  const change = String(previous.change);
  const status = String(previous.change_status);
  const timestamp = typeof previous.updated_at === "string" && previous.updated_at
    ? previous.updated_at
    : typeof previous.created_at === "string" && previous.created_at
      ? previous.created_at
      : new Date().toISOString();
  const archived = status === "archived";
  return {
    schema_version: 4,
    artifact: "change-status",
    change,
    change_status: status,
    current_work: typeof previous.current_work === "string" ? previous.current_work : null,
    created_at: typeof previous.created_at === "string" && previous.created_at ? previous.created_at : timestamp,
    updated_at: timestamp,
    completed_at: typeof previous.completed_at === "string" ? previous.completed_at : null,
    archived,
    archive_path: archived
      ? typeof previous.archive_path === "string" && previous.archive_path
        ? previous.archive_path
        : `<Path>{roots.state}/specdev/archive/${change.slice(0, 7)}/${change}</Path>`
      : null,
    blockers: Array.isArray(previous.blockers) ? previous.blockers : [],
    deviations: Array.isArray(previous.deviations) ? previous.deviations : [],
    worktrees: [],
  };
}

async function upgradeSpecdevRuntimeV5(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "specdev");
  if (!(await pathExists(stateRoot))) return;
  const configPath = join(stateRoot, "config.json");
  if (await pathExists(configPath)) {
    const previous = await readJson(configPath);
    if (previous.schema_version === 3) {
      const defaults = await readJson(join(stagedRoot, "workflows", "specdev", "I-init-setup", "config-template.json"));
      await writeFile(configPath, JSON.stringify(normalizeSpecdevConfigV4(previous, defaults), null, 2) + "\n", "utf8");
    }
  }
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readJson(statusPath);
  const activeEntries = expectArray(status.active) ? status.active.filter(isJsonObject) : [];
  const changeStatusPaths: Array<{ path: string; entry: JsonObject | null }> = [];
  for (const entry of activeEntries) {
    if (isChangeName(entry.change)) changeStatusPaths.push({ path: join(stateRoot, "changes", entry.change, ".status.json"), entry });
  }
  for (const entry of expectArray(status.archived) ? status.archived : []) {
    if (isChangeName(entry)) changeStatusPaths.push({ path: join(stateRoot, "archive", entry.slice(0, 7), entry, ".status.json"), entry: null });
  }
  for (const { path, entry } of changeStatusPaths) {
    if (!(await pathExists(path))) continue;
    const previous = await readJson(path);
    if (previous.schema_version === 3) {
      await writeFile(path, JSON.stringify(normalizeChangeStatusV4(previous), null, 2) + "\n", "utf8");
      continue;
    }
    if (previous.schema_version === 4) {
      await writeFile(path, JSON.stringify(normalizeChangeStatusV5(previous, entry), null, 2) + "\n", "utf8");
    }
  }
  if (status.schema_version === 4) {
    await writeFile(statusPath, JSON.stringify({
      schema_version: 5,
      workflow: "specdev",
      active: activeEntries.map((entry) => ({ change: entry.change })),
      archived: expectArray(status.archived) ? status.archived : [],
    }, null, 2) + "\n", "utf8");
  }
}

async function copyNode(source: string, target: string, recursive = false): Promise<void> {
  await cp(source, target, { recursive, force: true, verbatimSymlinks: true });
}

async function restoreCompatibleState(snapshotRoot: string, stagedRoot: string): Promise<void> {
  const snapshotState = join(snapshotRoot, "state");
  const stagedState = join(stagedRoot, ".speculo");
  if (await nodeExists(snapshotState)) {
    for (const entry of await readdir(snapshotState, { withFileTypes: true })) {
      if (MANAGED_STATE_ENTRIES.has(entry.name)) continue;
      await copyNode(join(snapshotState, entry.name), join(stagedState, entry.name), entry.isDirectory());
    }
  }
  const previousConfig = join(snapshotRoot, "config.json");
  if (await nodeExists(previousConfig)) {
    const defaults = await readJson(join(stagedRoot, "config.json"));
    const previous = await readJson(previousConfig);
    await writeFile(join(stagedRoot, "config.json"), JSON.stringify(mergeDefaults(defaults, previous), null, 2) + "\n", "utf8");
  }
  await upgradeSpecdevRuntimeV5(stagedRoot);
}

async function restoreUnselectedState(snapshotRoot: string, stagedRoot: string, workflowIds: string[]): Promise<void> {
  for (const workflowId of workflowIds) {
    const source = join(snapshotRoot, "state", workflowId);
    if (await nodeExists(source)) await copyNode(source, join(stagedRoot, ".speculo", workflowId), true);
  }
}

async function writeInstallManifest(stagedRoot: string, targetVersion: string, workflowIds: string[]): Promise<void> {
  await writeFile(join(stagedRoot, INSTALL_RELATIVE), JSON.stringify({
    schema_version: 1,
    package_version: targetVersion,
    workflows: [...new Set(workflowIds)].sort(),
  }, null, 2) + "\n", "utf8");
}

async function writePendingMarker(
  stagedRoot: string,
  source: string | null,
  target: string,
  blockers: MigrationBlocker[],
): Promise<void> {
  await writeFile(join(stagedRoot, MIGRATION_RELATIVE), JSON.stringify({
    schema_version: 1,
    status: "pending",
    source_version: source,
    target_version: target,
    backup_root: "speculo/.speculo/back",
    created_at: new Date().toISOString(),
    blockers,
  }, null, 2) + "\n", "utf8");
}

export async function assertNoPendingMigration(previousRoot: string): Promise<void> {
  const marker = join(previousRoot, MIGRATION_RELATIVE);
  if (!(await pathExists(marker))) return;
  throw new Error("Speculo runtime migration is pending. Run the migrate-runtime-state command before speculo init.");
}

export async function migrateRuntimeState(options: RuntimeMigrationOptions): Promise<RuntimeMigrationResult> {
  const targetVersion = await readTargetVersion(options.packageRoot);
  const snapshotRoot = join(options.stagedRoot, SNAPSHOT_DIR);
  await copySnapshot(options.previousRoot, snapshotRoot);
  const snapshotState = join(snapshotRoot, "state");
  const snapshotStateIsSymlink = await pathExists(snapshotState) && (await lstat(snapshotState)).isSymbolicLink();
  const versionResult = snapshotStateIsSymlink
    ? { version: null, blockers: [] }
    : await sourceVersion(snapshotState);
  const blockers = [...versionResult.blockers, ...await inspectSnapshot(snapshotRoot, versionResult.version)];

  await writeBackup(snapshotRoot, options.stagedRoot, versionResult.version, targetVersion);
  if (blockers.length === 0) {
    await restoreCompatibleState(snapshotRoot, options.stagedRoot);
  } else {
    await restoreUnselectedState(snapshotRoot, options.stagedRoot, options.unselectedWorkflowIds);
    await writePendingMarker(options.stagedRoot, versionResult.version, targetVersion, blockers);
  }
  await writeInstallManifest(options.stagedRoot, targetVersion, [...options.selectedWorkflowIds, ...options.unselectedWorkflowIds]);
  await rm(snapshotRoot, { recursive: true, force: true });
  return {
    status: blockers.length === 0 ? "migrated" : "pending",
    sourceVersion: versionResult.version,
    targetVersion,
    backupPath: "speculo/.speculo/back",
    blockers,
  };
}

export async function initializeRuntimeManifest(
  packageRoot: string,
  stagedRoot: string,
  workflowIds: string[],
): Promise<RuntimeMigrationResult> {
  const targetVersion = await readTargetVersion(packageRoot);
  await writeInstallManifest(stagedRoot, targetVersion, workflowIds);
  return {
    status: "not-required",
    sourceVersion: null,
    targetVersion,
    backupPath: null,
    blockers: [],
  };
}
