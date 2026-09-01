import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertJsonObject, type JsonObject } from "./config.js";
import { pathExists } from "./utils.js";

export type StructuredChange = {
  path: string;
  before: Buffer;
  reason: string;
};

const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readObject(path: string, label: string): Promise<JsonObject> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(label + " is not valid JSON: " + String(error));
  }
  assertJsonObject(value, label);
  return value;
}

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function positiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : fallback;
}

export function migrateSpecdevConfig(local: JsonObject, defaults: JsonObject): { value: JsonObject; migrated: boolean } {
  const version = Number(local.schema_version);
  if (version === 5) return { value: local, migrated: false };
  if (version !== 3 && version !== 4) {
    throw new Error("SpecDev config supports schema v3, v4, or v5; found " + String(local.schema_version));
  }

  const localGit = object(local.git);
  const localExecution = object(local.execution);
  const defaultGit = object(defaults.git);
  const defaultExecution = object(defaults.execution);
  const allowedRoot = new Set([
    "schema_version", "interaction_language", "artifact_language", "git",
    "execution", "verification", "planning",
  ]);
  const unknownRoot = Object.keys(local).filter((key) => !allowedRoot.has(key));
  if (unknownRoot.length > 0) throw new Error("SpecDev config has unmapped root fields: " + unknownRoot.join(", "));

  const legacyLimit = positiveInteger(
    localExecution.max_implementation_agents ?? localExecution.max_parallel,
    positiveInteger(defaultExecution.max_implementation_agents, 3),
  );
  return {
    migrated: true,
    value: {
      schema_version: 5,
      interaction_language: local.interaction_language ?? defaults.interaction_language,
      artifact_language: local.artifact_language ?? defaults.artifact_language,
      git: {
        default_branch: typeof localGit.default_branch === "string" || localGit.default_branch === null
          ? localGit.default_branch
          : defaultGit.default_branch ?? null,
      },
      execution: {
        max_implementation_agents: legacyLimit,
        max_integration_attempts: positiveInteger(
          localExecution.max_integration_attempts,
          positiveInteger(defaultExecution.max_integration_attempts, 3),
        ),
        deep_ticket_human_approval: typeof localExecution.deep_ticket_human_approval === "boolean"
          ? localExecution.deep_ticket_human_approval
          : defaultExecution.deep_ticket_human_approval,
        shared_path_owner: typeof localExecution.shared_path_owner === "string"
          ? localExecution.shared_path_owner
          : defaultExecution.shared_path_owner,
      },
      verification: Object.keys(object(local.verification)).length > 0 ? local.verification : defaults.verification,
      planning: Object.keys(object(local.planning)).length > 0 ? local.planning : defaults.planning,
    },
  };
}

export function validateSpecdevConfig(config: JsonObject): void {
  if (config.schema_version !== 5) throw new Error("SpecDev config schema_version must be 5");
  if (typeof config.interaction_language !== "string" || typeof config.artifact_language !== "string") {
    throw new Error("SpecDev config language values must be strings");
  }
  const git = object(config.git);
  if (!(git.default_branch === null || typeof git.default_branch === "string")) {
    throw new Error("SpecDev config git.default_branch must be a string or null");
  }
  const execution = object(config.execution);
  for (const key of ["max_implementation_agents", "max_integration_attempts"]) {
    if (!Number.isInteger(execution[key]) || Number(execution[key]) < 1) {
      throw new Error("SpecDev config execution." + key + " must be a positive integer");
    }
  }
  if (typeof execution.deep_ticket_human_approval !== "boolean" || typeof execution.shared_path_owner !== "string") {
    throw new Error("SpecDev config execution settings are incomplete");
  }
}

function authorization(scope: string): JsonObject {
  return { status: "not-authorized", source: null, granted_at: null, scope };
}

function normalizeChangeStatus(previous: JsonObject, globalEntry: JsonObject | null): JsonObject {
  const version = Number(previous.schema_version);
  if (![3, 4, 5, 6].includes(version)) {
    throw new Error("change status supports schema v3-v6; found " + String(previous.schema_version));
  }
  if (previous.artifact !== "change-status" || typeof previous.change !== "string" || !CHANGE_NAME.test(previous.change)) {
    throw new Error("change status has an invalid artifact or change name");
  }
  const worktrees = Array.isArray(previous.worktrees) ? previous.worktrees : [];
  if (version <= 3 && worktrees.length > 0) {
    throw new Error("schema v3 worktree state requires an explicit migration decision");
  }
  if (version === 6) return previous;

  const now = typeof previous.updated_at === "string"
    ? previous.updated_at
    : typeof previous.created_at === "string" ? previous.created_at : new Date().toISOString();
  const status = String(previous.change_status);
  const change = previous.change;
  const base: JsonObject = version === 3 ? {
    schema_version: 4,
    artifact: "change-status",
    change,
    change_status: status,
    current_work: typeof previous.current_work === "string" ? previous.current_work : null,
    created_at: typeof previous.created_at === "string" ? previous.created_at : now,
    updated_at: now,
    completed_at: typeof previous.completed_at === "string" ? previous.completed_at : null,
    archived: status === "archived",
    archive_path: status === "archived" ? `<Path>{roots.state}/specdev/archive/${change.slice(0, 7)}/${change}</Path>` : null,
    blockers: Array.isArray(previous.blockers) ? previous.blockers : [],
    deviations: Array.isArray(previous.deviations) ? previous.deviations : [],
    worktrees: [],
  } : previous;

  const upgraded: JsonObject = Number(base.schema_version) === 4 ? {
    ...base,
    schema_version: 5,
    current_work: typeof base.current_work === "string" ? base.current_work : globalEntry?.current_work ?? null,
    works_run: Array.isArray(globalEntry?.works_run) ? globalEntry.works_run : [],
    claimed_investigations: Array.isArray(globalEntry?.claimed_investigations) ? globalEntry.claimed_investigations : [],
    execution_authorization: {
      implementation_commit: authorization("Ticket implementation commits"),
      local_candidate_integration: authorization("Lead-owned local integration and parent update"),
      source_cleanup: authorization("Source worktree and branch cleanup"),
    },
    leadership: { current: "unassigned", epoch: 1, assigned_at: now, history: [] },
  } : base;
  return { ...upgraded, schema_version: 6 };
}

function migrateGoalPlan(text: string, attempts: number): string {
  if (!/^---\s*$/m.test(text)) return text;
  let next = text;
  if (/^schema_version:\s*4\s*$/m.test(next)) next = next.replace(/^schema_version:\s*4\s*$/m, "schema_version: 5");
  if (/^schema_version:\s*5\s*$/m.test(next)) {
    next = next
      .replace(/^schema_version:\s*5\s*$/m, "schema_version: 6")
      .replace(/^(implementation_agent_limit:\s*[^\n]+)$/m, `$1\nintegration_attempt_limit: ${attempts}`);
  }
  return next;
}

async function rewriteIfChanged(path: string, value: string, reason: string, changes: StructuredChange[]): Promise<void> {
  const before = await readFile(path);
  if (before.equals(Buffer.from(value))) return;
  changes.push({ path, before, reason });
  await writeFile(path, value, "utf8");
}

async function migrateSpecdevState(stagedRoot: string): Promise<StructuredChange[]> {
  const changes: StructuredChange[] = [];
  const stateRoot = join(stagedRoot, ".speculo", "specdev");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return changes;
  const status = await readObject(statusPath, ".speculo/specdev/status.json");
  if (![4, 5].includes(Number(status.schema_version)) || status.workflow !== "specdev" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    throw new Error("SpecDev status must use schema v4/v5 with active and archived arrays");
  }
  assertExactKeys(status, ["schema_version", "workflow", "active", "archived"], "SpecDev status");
  const legacyActive = status.active.map((entry) => {
    assertJsonObject(entry, "SpecDev active status entry");
    assertExactKeys(entry, ["change", "current_work", "works_run", "claimed_investigations"], "SpecDev active status entry");
    if (typeof entry.change !== "string" || !CHANGE_NAME.test(entry.change)) throw new Error("SpecDev active change name is invalid");
    return entry;
  });
  const active = legacyActive.map((entry) => ({ change: entry.change }));
  const archived = status.archived.map((entry) => {
    if (typeof entry !== "string" || !CHANGE_NAME.test(entry)) throw new Error("SpecDev archived change name is invalid");
    return entry;
  });
  const activeNames = new Set(active.map((entry) => String(entry.change)));
  if (activeNames.size !== active.length || new Set(archived).size !== archived.length || archived.some((name) => activeNames.has(name))) {
    throw new Error("SpecDev status contains duplicate or overlapping change names");
  }

  const hasLegacyActiveFields = legacyActive.some((entry) => Object.keys(entry).some((key) => key !== "change"));
  if (status.schema_version === 4 || hasLegacyActiveFields) {
    await rewriteIfChanged(statusPath, JSON.stringify({
      schema_version: 5,
      workflow: "specdev",
      active,
      archived,
    }, null, 2) + "\n", "normalize SpecDev global status to the strict v5 index", changes);
  }

  let attempts = 3;
  const configPath = join(stateRoot, "config.json");
  if (await pathExists(configPath)) {
    const config = await readObject(configPath, ".speculo/specdev/config.json");
    attempts = positiveInteger(object(config.execution).max_integration_attempts, 3);
  }

  const indexed: Array<{ path: string; entry: JsonObject | null }> = [
    ...legacyActive.map((entry) => ({ path: join(stateRoot, "changes", String(entry.change), ".status.json"), entry })),
    ...archived.map((name) => ({ path: join(stateRoot, "archive", name.slice(0, 7), name, ".status.json"), entry: null })),
  ];
  for (const item of indexed) {
    if (!(await pathExists(item.path))) throw new Error("indexed SpecDev change is missing " + item.path);
    const previous = await readObject(item.path, item.path);
    const normalized = normalizeChangeStatus(previous, item.entry);
    await rewriteIfChanged(item.path, JSON.stringify(normalized, null, 2) + "\n", "upgrade SpecDev change status schema", changes);
    const goalPlanPath = join(dirname(item.path), "goal-plan.md");
    if (await pathExists(goalPlanPath)) {
      const goalPlan = await readFile(goalPlanPath, "utf8");
      await rewriteIfChanged(goalPlanPath, migrateGoalPlan(goalPlan, attempts), "upgrade Goal Plan schema", changes);
    }
  }
  return changes;
}

async function validatePersonState(stagedRoot: string): Promise<void> {
  const statusPath = join(stagedRoot, ".speculo", "person", "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readObject(statusPath, ".speculo/person/status.json");
  if (status.schema_version !== 1 || status.workflow !== "person" || !Array.isArray(status.active)) {
    throw new Error("Person status must use schema v1 with an active array");
  }
}

function assertLearningWork(value: unknown, label: string): void {
  if (!(value === null || (typeof value === "string" && /^learning\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))) {
    throw new Error(label + " must be null or a learning work id");
  }
}

function assertLearningWorks(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !/^learning\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)) || new Set(value).size !== value.length) {
    throw new Error(label + " must contain unique learning work ids");
  }
}

function assertExactKeys(value: JsonObject, allowed: string[], label: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length > 0) throw new Error(label + " has unknown fields: " + unknown.join(", "));
}

function assertUniqueStrings(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string") || new Set(value).size !== value.length) {
    throw new Error(label + " must contain unique strings");
  }
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateLearningChangeStatus(value: JsonObject, change: string, archived: boolean): void {
  assertExactKeys(value, [
    "schema_version", "artifact", "change", "domain", "domain_type", "topic",
    "change_status", "phase", "current_work", "works_run", "created_at", "updated_at",
    "completed_at", "archived_at", "archive_path", "mastery", "blockers",
  ], "Learning change status");
  if (value.schema_version !== 1 || value.artifact !== "learning-change-status" || value.change !== change) {
    throw new Error("Learning change status has an invalid identity or schema");
  }
  if (typeof value.domain !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.domain)) {
    throw new Error("Learning change status has an invalid domain");
  }
  if (!["project", "product", "subject", "language", "skill"].includes(String(value.domain_type)) || typeof value.topic !== "string" || !value.topic.trim()) {
    throw new Error("Learning change status has an invalid domain type or topic");
  }
  const changeStatus = String(value.change_status);
  if (!["active", "blocked", "awaiting_retention", "completed", "archived"].includes(changeStatus)) {
    throw new Error("Learning change status has an invalid lifecycle value");
  }
  if (!["intake", "assessment", "teaching", "practice", "immediate_quiz", "retention", "ready_to_archive", "archived"].includes(String(value.phase))) {
    throw new Error("Learning change status has an invalid phase");
  }
  assertLearningWork(value.current_work, "Learning change current_work");
  assertLearningWorks(value.works_run, "Learning change works_run");
  assertUniqueStrings(value.blockers, "Learning change blockers");
  if (!isDateTime(value.created_at) || !isDateTime(value.updated_at)) {
    throw new Error("Learning change timestamps must be date-times");
  }

  const mastery = object(value.mastery);
  assertExactKeys(mastery, [
    "immediate", "retention", "score", "critical_objectives_passed", "transfer_passed",
    "blocking_misconceptions", "evidence", "next_review_at",
  ], "Learning mastery");
  const results = new Set(["not_attempted", "failed", "passed", "needs_review"]);
  if (!results.has(String(mastery.immediate)) || !results.has(String(mastery.retention))) {
    throw new Error("Learning change mastery is incomplete");
  }
  if (!(mastery.score === null || (typeof mastery.score === "number" && mastery.score >= 0 && mastery.score <= 100))) {
    throw new Error("Learning mastery score must be null or between 0 and 100");
  }
  if (typeof mastery.critical_objectives_passed !== "boolean" || typeof mastery.transfer_passed !== "boolean") {
    throw new Error("Learning mastery objective and transfer projections must be booleans");
  }
  assertUniqueStrings(mastery.blocking_misconceptions, "Learning mastery blocking_misconceptions");
  assertUniqueStrings(mastery.evidence, "Learning mastery evidence");
  if (mastery.evidence.some((item) => !/^<Path>\{roots\.state\}\/learning\/(?:changes\/[^<]+|archive\/[0-9]{4}-[0-9]{2}\/[^<]+)\/quiz\/[^<]+\.md<\/Path>$/.test(item))) {
    throw new Error("Learning mastery evidence contains an invalid path");
  }
  if (!(mastery.next_review_at === null || isDateTime(mastery.next_review_at))) {
    throw new Error("Learning mastery next_review_at must be null or a date-time");
  }
  if (changeStatus === "awaiting_retention" && mastery.immediate !== "passed") {
    throw new Error("Learning awaiting_retention requires an immediate pass");
  }
  if (["completed", "archived"].includes(changeStatus)) {
    if (
      mastery.immediate !== "passed" || mastery.retention !== "passed" ||
      typeof mastery.score !== "number" || mastery.score < 80 ||
      mastery.critical_objectives_passed !== true || mastery.transfer_passed !== true ||
      mastery.blocking_misconceptions.length > 0 || mastery.evidence.length < 2
    ) {
      throw new Error("Learning completed knowledge does not satisfy the mastery gate");
    }
  }
  if (["completed", "archived"].includes(changeStatus)) {
    if (!isDateTime(value.completed_at)) throw new Error("Learning completed knowledge requires completed_at");
  } else if (value.completed_at !== null) {
    throw new Error("Learning incomplete change must keep completed_at null");
  }
  if (archived) {
    const expectedPath = `<Path>{roots.state}/learning/archive/${change.slice(0, 7)}/${change}</Path>`;
    if (value.phase !== "archived" || value.current_work !== null || !isDateTime(value.archived_at) || value.archive_path !== expectedPath) {
      throw new Error("Learning archive fields do not match the indexed location");
    }
  } else if (value.archived_at !== null || value.archive_path !== null) {
    throw new Error("Learning active change must keep archive fields null");
  }
  if (archived !== (changeStatus === "archived")) {
    throw new Error("Learning indexed location and change status disagree");
  }
}

async function validateLearningState(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "learning");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readObject(statusPath, ".speculo/learning/status.json");
  assertExactKeys(status, ["schema_version", "workflow", "active", "archived"], "Learning status");
  if (status.schema_version !== 1 || status.workflow !== "learning" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    throw new Error("Learning status must use schema v1 with active and archived arrays");
  }

  const active = status.active.map((entry) => {
    assertJsonObject(entry, "Learning active status entry");
    assertExactKeys(entry, ["change", "domain", "topic", "current_work", "works_run"], "Learning active status entry");
    if (typeof entry.change !== "string" || !CHANGE_NAME.test(entry.change)) throw new Error("Learning active change name is invalid");
    if (typeof entry.domain !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.domain) || typeof entry.topic !== "string" || !entry.topic.trim()) {
      throw new Error("Learning active entry has an invalid domain or topic");
    }
    assertLearningWork(entry.current_work, "Learning active current_work");
    assertLearningWorks(entry.works_run, "Learning active works_run");
    return entry;
  });
  const archived = status.archived.map((entry) => {
    if (typeof entry !== "string" || !CHANGE_NAME.test(entry)) throw new Error("Learning archived change name is invalid");
    return entry;
  });
  const activeNames = new Set(active.map((entry) => String(entry.change)));
  if (activeNames.size !== active.length || new Set(archived).size !== archived.length || archived.some((name) => activeNames.has(name))) {
    throw new Error("Learning status contains duplicate or overlapping change names");
  }

  for (const entry of active) {
    const change = String(entry.change);
    const path = join(stateRoot, "changes", change, ".status.json");
    if (!(await pathExists(path))) throw new Error("indexed Learning change is missing " + path);
    const value = await readObject(path, path);
    validateLearningChangeStatus(value, change, false);
    if (value.domain !== entry.domain || value.topic !== entry.topic || value.current_work !== entry.current_work || JSON.stringify(value.works_run) !== JSON.stringify(entry.works_run)) {
      throw new Error("Learning global and change status projections disagree for " + change);
    }
  }
  for (const change of archived) {
    const path = join(stateRoot, "archive", change.slice(0, 7), change, ".status.json");
    if (!(await pathExists(path))) throw new Error("indexed Learning archive is missing " + path);
    validateLearningChangeStatus(await readObject(path, path), change, true);
  }
}

const OPS_WORK_IDS = new Set([
  "ops/archive-and-learn", "ops/execute-and-stabilize",
  "ops/intake-and-assess", "ops/plan-and-approve",
]);
const OPS_PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type OpsStatusEntry = {
  scope: "global" | "project";
  projectId: string | null;
  change: string;
};

function assertOpsWork(value: unknown, label: string): void {
  if (!(value === null || (typeof value === "string" && OPS_WORK_IDS.has(value)))) {
    throw new Error(label + " must be null or an Ops work id");
  }
}

function assertOpsWorks(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !OPS_WORK_IDS.has(item)) || new Set(value).size !== value.length) {
    throw new Error(label + " must contain unique Ops work ids");
  }
}

function parseOpsStatusEntry(value: unknown, label: string): OpsStatusEntry {
  assertJsonObject(value, label);
  assertExactKeys(value, ["scope", "project_id", "change"], label);
  if (!["global", "project"].includes(String(value.scope)) || typeof value.change !== "string" || !CHANGE_NAME.test(value.change)) {
    throw new Error(label + " has an invalid scope or change");
  }
  if (value.scope === "global" ? value.project_id !== null : typeof value.project_id !== "string" || !OPS_PROJECT_ID.test(value.project_id)) {
    throw new Error(label + " project_id disagrees with scope");
  }
  return { scope: value.scope as "global" | "project", projectId: value.project_id as string | null, change: value.change };
}

function opsEntryKey(entry: OpsStatusEntry): string {
  return `${entry.scope}:${entry.projectId ?? "-"}:${entry.change}`;
}

function opsChangeStatusPath(stateRoot: string, entry: OpsStatusEntry, archived: boolean): string {
  const prefix = entry.scope === "global" ? [] : ["projects", String(entry.projectId)];
  return archived
    ? join(stateRoot, ...prefix, "archive", entry.change.slice(0, 7), entry.change, ".status.json")
    : join(stateRoot, ...prefix, "changes", entry.change, ".status.json");
}

function opsArchivePath(entry: OpsStatusEntry): string {
  const prefix = entry.scope === "global" ? "" : `projects/${entry.projectId}/`;
  return `<Path>{roots.state}/ops/${prefix}archive/${entry.change.slice(0, 7)}/${entry.change}</Path>`;
}

function validateOpsProject(value: JsonObject, projectId: string): void {
  assertExactKeys(value, [
    "schema_version", "artifact", "project_id", "display_name", "aliases", "identities",
    "source_hints", "created_at", "updated_at",
  ], "Ops project");
  if (value.schema_version !== 1 || value.artifact !== "ops-project" || value.project_id !== projectId || !OPS_PROJECT_ID.test(projectId)) {
    throw new Error("Ops project has an invalid identity or schema");
  }
  if (typeof value.display_name !== "string" || !value.display_name.trim()) throw new Error("Ops project display_name is invalid");
  assertUniqueStrings(value.aliases, "Ops project aliases");
  assertUniqueStrings(value.source_hints, "Ops project source_hints");
  if (!Array.isArray(value.identities) || value.identities.length === 0) throw new Error("Ops project identities must be non-empty");
  for (const identity of value.identities) {
    assertJsonObject(identity, "Ops project identity");
    assertExactKeys(identity, ["kind", "value", "source"], "Ops project identity");
    if (
      typeof identity.kind !== "string" || typeof identity.source !== "string" || !identity.source ||
      typeof identity.value !== "string" || !identity.value || /:\/\/[^/]*@/.test(identity.value) || /(?:token|password|secret)=/i.test(identity.value)
    ) {
      throw new Error("Ops project identity is empty or may contain credentials");
    }
  }
  if (!isDateTime(value.created_at) || !isDateTime(value.updated_at)) throw new Error("Ops project timestamps are invalid");
}

function validateOpsChangeStatus(value: JsonObject, entry: OpsStatusEntry, archived: boolean): void {
  assertExactKeys(value, [
    "schema_version", "artifact", "scope", "project_id", "change", "change_status", "phase", "current_work", "works_run",
    "created_at", "updated_at", "completed_at", "archived_at", "archive_path", "source_revision",
    "target_fingerprint", "plan_path", "plan_digest", "approval_path", "approval_status",
    "approved_batches", "latest_attempt_id", "outcome", "blockers",
  ], "Ops change status");
  if (
    value.schema_version !== 2 || value.artifact !== "ops-change-status" || value.scope !== entry.scope ||
    value.project_id !== entry.projectId || value.change !== entry.change
  ) {
    throw new Error("Ops change status has an invalid identity or schema");
  }
  const changeStatus = String(value.change_status);
  const phase = String(value.phase);
  if (!["active", "blocked", "completed", "archived"].includes(changeStatus)) {
    throw new Error("Ops change status has an invalid lifecycle value");
  }
  if (!["intake", "assessment", "planning", "awaiting_approval", "approved", "executing", "diagnosing", "stabilizing", "ready_to_archive", "archived"].includes(phase)) {
    throw new Error("Ops change status has an invalid phase");
  }
  assertOpsWork(value.current_work, "Ops change current_work");
  assertOpsWorks(value.works_run, "Ops change works_run");
  if (!isDateTime(value.created_at) || !isDateTime(value.updated_at)) {
    throw new Error("Ops change timestamps must be date-times");
  }
  if (!(value.source_revision === null || (typeof value.source_revision === "string" && value.source_revision.length > 0))) {
    throw new Error("Ops change source_revision must be null or a string");
  }
  if (!(value.target_fingerprint === null || (typeof value.target_fingerprint === "string" && /^[a-f0-9]{64}$/.test(value.target_fingerprint)))) {
    throw new Error("Ops change target_fingerprint must be null or SHA-256");
  }
  if (!(value.plan_path === null || (typeof value.plan_path === "string" && /^plan\/plan-[0-9]{3}\.json$/.test(value.plan_path))) ||
      !(value.plan_digest === null || (typeof value.plan_digest === "string" && /^[a-f0-9]{64}$/.test(value.plan_digest))) ||
      ((value.plan_path === null) !== (value.plan_digest === null))) {
    throw new Error("Ops change plan projection is invalid");
  }
  const approvalStatus = String(value.approval_status);
  if (!["not_requested", "pending", "approved", "invalidated"].includes(approvalStatus) ||
      !(value.approval_path === null || (typeof value.approval_path === "string" && /^plan\/approval-[0-9]{3}\.json$/.test(value.approval_path)))) {
    throw new Error("Ops change approval projection is invalid");
  }
  assertUniqueStrings(value.approved_batches, "Ops approved_batches");
  if ((value.approved_batches as string[]).some((item) => !/^B[0-9]{2}$/.test(item))) {
    throw new Error("Ops approved_batches contains an invalid batch id");
  }
  if (["not_requested", "pending"].includes(approvalStatus) && (value.approval_path !== null || (value.approved_batches as string[]).length > 0)) {
    throw new Error("Ops unapproved state cannot point to approval evidence");
  }
  if (approvalStatus === "pending" && value.plan_path === null) {
    throw new Error("Ops pending approval requires a plan");
  }
  if (approvalStatus === "approved" && (value.plan_path === null || value.approval_path === null || (value.approved_batches as string[]).length === 0)) {
    throw new Error("Ops approved state requires plan, approval, and batches");
  }
  if (!(value.latest_attempt_id === null || (typeof value.latest_attempt_id === "string" && /^ATTEMPT-[0-9]{3}$/.test(value.latest_attempt_id)))) {
    throw new Error("Ops latest_attempt_id is invalid");
  }
  if (!["pending", "succeeded", "rolled_back", "abandoned"].includes(String(value.outcome))) {
    throw new Error("Ops outcome is invalid");
  }
  assertUniqueStrings(value.blockers, "Ops blockers");
  if (["completed", "archived"].includes(changeStatus)) {
    const allowedTerminalWork = archived
      ? value.current_work === null
      : value.current_work === null || value.current_work === "ops/archive-and-learn";
    if (!isDateTime(value.completed_at) || value.outcome === "pending" || (value.blockers as string[]).length > 0 || !allowedTerminalWork) {
      throw new Error("Ops terminal change is missing completion evidence");
    }
  } else if (value.completed_at !== null) {
    throw new Error("Ops incomplete change must keep completed_at null");
  }
  if (archived) {
    const expectedPath = opsArchivePath(entry);
    if (changeStatus !== "archived" || phase !== "archived" || value.archive_path !== expectedPath || !isDateTime(value.archived_at)) {
      throw new Error("Ops archive fields do not match the indexed location");
    }
  } else if (changeStatus === "archived" || value.archive_path !== null || value.archived_at !== null) {
    throw new Error("Ops active location cannot contain archived fields");
  }
  if (!archived && changeStatus === "completed" && phase !== "ready_to_archive") {
    throw new Error("Ops completed change must be ready_to_archive");
  }
}

async function validateOpsState(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "ops");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readObject(statusPath, ".speculo/ops/status.json");
  assertExactKeys(status, ["schema_version", "workflow", "active", "archived"], "Ops status");
  if (status.schema_version !== 2 || status.workflow !== "ops" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    throw new Error("Ops status must use schema v2 with active and archived arrays");
  }
  const active = status.active.map((entry) => parseOpsStatusEntry(entry, "Ops active status entry"));
  const archived = status.archived.map((entry) => parseOpsStatusEntry(entry, "Ops archived status entry"));
  const activeKeys = active.map(opsEntryKey);
  const archivedKeys = archived.map(opsEntryKey);
  if (new Set(activeKeys).size !== activeKeys.length || new Set(archivedKeys).size !== archivedKeys.length || archivedKeys.some((key) => activeKeys.includes(key))) {
    throw new Error("Ops status contains duplicate or overlapping scope/project/change tuples");
  }
  const projectIds = new Set([...active, ...archived].filter((entry) => entry.scope === "project").map((entry) => String(entry.projectId)));
  for (const projectId of projectIds) {
    const path = join(stateRoot, "projects", projectId, "project.json");
    if (!(await pathExists(path))) throw new Error("indexed Ops project is missing " + path);
    validateOpsProject(await readObject(path, path), projectId);
  }
  for (const entry of active) {
    const path = opsChangeStatusPath(stateRoot, entry, false);
    if (!(await pathExists(path))) throw new Error("indexed Ops change is missing " + path);
    validateOpsChangeStatus(await readObject(path, path), entry, false);
  }
  for (const entry of archived) {
    const path = opsChangeStatusPath(stateRoot, entry, true);
    if (!(await pathExists(path))) throw new Error("indexed Ops archive is missing " + path);
    validateOpsChangeStatus(await readObject(path, path), entry, true);
  }
}

export async function migrateStructuredRuntime(stagedRoot: string, selectedWorkflowIds: string[]): Promise<StructuredChange[]> {
  const changes: StructuredChange[] = [];
  const handlers: Record<string, () => Promise<void>> = {
    learning: async () => validateLearningState(stagedRoot),
    ops: async () => validateOpsState(stagedRoot),
    person: async () => validatePersonState(stagedRoot),
    specdev: async () => { changes.push(...await migrateSpecdevState(stagedRoot)); },
  };
  for (const workflowId of selectedWorkflowIds) await handlers[workflowId]?.();
  return changes;
}
