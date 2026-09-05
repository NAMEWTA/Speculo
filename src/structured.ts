import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

export function readSpecdevConfig(local: JsonObject): { value: JsonObject; migrated: boolean } {
  const version = Number(local.schema_version);
  if (version === 5) return { value: local, migrated: false };
  throw new Error("SpecDev config schema v5 is required; 1.0 does not migrate older config schemas");
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

function normalizeChangeStatus(previous: JsonObject, globalEntry: JsonObject | null): JsonObject {
  const version = Number(previous.schema_version);
  void globalEntry;
  if (version !== 6) throw new Error("SpecDev change status schema v6 is required; 1.0 does not migrate older state");
  if (previous.artifact !== "change-status" || typeof previous.change !== "string" || !CHANGE_NAME.test(previous.change)) {
    throw new Error("change status has an invalid artifact or change name");
  }
  return previous;

}

async function validateSpecdevState(stagedRoot: string): Promise<StructuredChange[]> {
  const changes: StructuredChange[] = [];
  const stateRoot = join(stagedRoot, ".speculo", "specdev");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return changes;
  const status = await readObject(statusPath, ".speculo/specdev/status.json");
  if (status.schema_version !== 5 || status.workflow !== "specdev" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    throw new Error("SpecDev status schema v5 is required; 1.0 does not migrate older state");
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

  const indexed: Array<{ path: string; entry: JsonObject | null }> = [
    ...legacyActive.map((entry) => ({ path: join(stateRoot, "changes", String(entry.change), ".status.json"), entry })),
    ...archived.map((name) => ({ path: join(stateRoot, "archive", name.slice(0, 7), name, ".status.json"), entry: null })),
  ];
  for (const item of indexed) {
    if (!(await pathExists(item.path))) throw new Error("indexed SpecDev change is missing " + item.path);
    const previous = await readObject(item.path, item.path);
    const normalized = normalizeChangeStatus(previous, item.entry);
    void normalized;
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

function assertLearningLocator(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^(?:changes\/.+|archive\/[0-9]{4}-[0-9]{2}\/.+)$/.test(value) || value.split("/").includes("..")) {
    throw new Error(label + " must be a safe current changes/archive locator");
  }
}

function validateLearningChangeStatus(value: JsonObject, change: string, locator: string): void {
  assertExactKeys(value, [
    "schema_version", "artifact", "change_id", "kind", "domain", "domain_type", "topic_id",
    "parent_change", "root_change", "locator", "lifecycle", "phase", "current_work", "works_run",
    "created_at", "updated_at", "closed_at", "archived_at", "closure_reason", "archive_path",
    "homework", "mastery", "children", "blockers",
  ], "Learning change status");
  if (value.schema_version === 1) throw new Error("learning-reset-required: Learning v1 state cannot be migrated automatically");
  if (value.schema_version !== 2 || value.artifact !== "learning-change-status" || value.change_id !== change) {
    throw new Error("Learning change status has an invalid identity or schema");
  }
  if (typeof value.domain !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.domain) || typeof value.topic_id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.topic_id)) {
    throw new Error("Learning change status has an invalid domain or topic_id");
  }
  if (!["project", "product", "subject", "language", "skill"].includes(String(value.domain_type)) || !["learning", "consolidation"].includes(String(value.kind))) {
    throw new Error("Learning change status has an invalid kind or domain type");
  }
  assertLearningLocator(value.locator, "Learning change locator");
  if (value.locator !== locator) throw new Error("Learning change locator disagrees with global status");
  if (!(value.parent_change === null || (typeof value.parent_change === "string" && CHANGE_NAME.test(value.parent_change)))) throw new Error("Learning parent_change is invalid");
  if (typeof value.root_change !== "string" || !CHANGE_NAME.test(value.root_change)) throw new Error("Learning root_change is invalid");
  if (!["active", "blocked", "closed", "archived"].includes(String(value.lifecycle)) || !["planning", "teaching", "homework", "review", "consolidating", "closed", "archived"].includes(String(value.phase))) {
    throw new Error("Learning change lifecycle or phase is invalid");
  }
  assertLearningWork(value.current_work, "Learning change current_work");
  assertLearningWorks(value.works_run, "Learning change works_run");
  assertUniqueStrings(value.blockers, "Learning change blockers");
  if (!isDateTime(value.created_at) || !isDateTime(value.updated_at)) throw new Error("Learning change timestamps must be date-times");
  if (!(value.closed_at === null || isDateTime(value.closed_at)) || !(value.archived_at === null || isDateTime(value.archived_at))) throw new Error("Learning close/archive timestamps are invalid");
  if (value.lifecycle === "archived" && (!value.locator.startsWith("archive/") || value.phase !== "archived" || value.current_work !== null || !isDateTime(value.archived_at))) throw new Error("Learning archived status does not match locator");
  if (value.lifecycle !== "archived" && (value.locator.startsWith("archive/") || value.archived_at !== null || value.archive_path !== null)) throw new Error("Learning active status contains archive fields");

  const homework = object(value.homework);
  assertExactKeys(homework, ["status", "latest_id", "submitted_at"], "Learning homework projection");
  if (!["none", "pending", "reviewed", "needs_revision"].includes(String(homework.status)) || !(homework.latest_id === null || typeof homework.latest_id === "string") || !(homework.submitted_at === null || isDateTime(homework.submitted_at))) throw new Error("Learning homework projection is invalid");
  const mastery = object(value.mastery);
  assertExactKeys(mastery, ["overall", "immediate", "retention", "critical_objectives", "transfer", "blocking_misconceptions", "evidence", "next_review_at"], "Learning mastery");
  if (!["unverified", "immediate", "retention_verified"].includes(String(mastery.overall)) || !["not_attempted", "passed", "needs_review"].includes(String(mastery.immediate)) || !["not_scheduled", "due", "passed", "needs_review"].includes(String(mastery.retention)) || !["not_attempted", "passed", "needs_review"].includes(String(mastery.critical_objectives)) || !["not_attempted", "passed", "needs_review"].includes(String(mastery.transfer))) throw new Error("Learning mastery is incomplete");
  if (mastery.overall === "retention_verified" && mastery.retention !== "passed") throw new Error("retention_verified requires retention passed");
  assertUniqueStrings(mastery.blocking_misconceptions, "Learning mastery blocking_misconceptions");
  assertUniqueStrings(mastery.evidence, "Learning mastery evidence");
  if (!(mastery.next_review_at === null || isDateTime(mastery.next_review_at))) throw new Error("Learning mastery next_review_at is invalid");
  if (!Array.isArray(value.children)) throw new Error("Learning children must be an array");
}

function learningEntry(value: unknown, label: string): JsonObject {
  assertJsonObject(value, label);
  assertExactKeys(value, ["change_id", "kind", "domain", "topic_id", "locator", "parent_change", "root_change", "current_work", "works_run", "updated_at"], label);
  if (typeof value.change_id !== "string" || !CHANGE_NAME.test(value.change_id) || !["learning", "consolidation"].includes(String(value.kind)) || typeof value.domain !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.domain) || typeof value.topic_id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.topic_id)) throw new Error(label + " has invalid identity");
  assertLearningLocator(value.locator, label + " locator");
  if (!(value.parent_change === null || (typeof value.parent_change === "string" && CHANGE_NAME.test(value.parent_change))) || typeof value.root_change !== "string" || !CHANGE_NAME.test(value.root_change)) throw new Error(label + " has invalid parent/root");
  assertLearningWork(value.current_work, label + " current_work");
  assertLearningWorks(value.works_run, label + " works_run");
  if (!(value.updated_at === undefined || isDateTime(value.updated_at))) throw new Error(label + " updated_at is invalid");
  return value;
}

async function validateLearningState(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "learning");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readObject(statusPath, ".speculo/learning/status.json");
  if (status.schema_version === 1) throw new Error("learning-reset-required: existing Learning v1 state must be backed up and reinitialized");
  assertExactKeys(status, ["schema_version", "workflow", "active", "archived"], "Learning status");
  if (status.schema_version !== 2 || status.workflow !== "learning" || !Array.isArray(status.active) || !Array.isArray(status.archived)) throw new Error("Learning status must use schema v2 with active and archived entries");
  const active = status.active.map((entry) => learningEntry(entry, "Learning active status entry"));
  const archived = status.archived.map((entry) => learningEntry(entry, "Learning archived status entry"));
  const all = [...active, ...archived];
  const ids = all.map((entry) => String(entry.change_id));
  if (new Set(ids).size !== ids.length || active.some((entry) => archived.some((other) => other.change_id === entry.change_id))) throw new Error("Learning status contains duplicate or overlapping change ids");
  const locationsPath = join(stateRoot, "locations.json");
  if (await pathExists(locationsPath)) {
    const locations = await readObject(locationsPath, ".speculo/learning/locations.json");
    if (locations.schema_version !== 2 || locations.workflow !== "learning" || !Array.isArray(locations.entries)) throw new Error("Learning locations.json must use schema v2");
    const locationIds = locations.entries.map((entry) => String(entry.change_id));
    if (new Set(locationIds).size !== locationIds.length) throw new Error("Learning locations contain duplicate change ids");
  } else if (all.length > 0) throw new Error("Learning locations.json is required when changes exist");
  const byId = new Map(all.map((entry) => [String(entry.change_id), entry]));
  for (const entry of all) {
    const locator = String(entry.locator);
    const path = join(stateRoot, ...locator.split("/"), ".status.json");
    if (!(await pathExists(path))) throw new Error("indexed Learning change is missing " + path);
    const value = await readObject(path, path);
    validateLearningChangeStatus(value, String(entry.change_id), locator);
    if (value.domain !== entry.domain || value.topic_id !== entry.topic_id || value.parent_change !== entry.parent_change || value.current_work !== entry.current_work || JSON.stringify(value.works_run) !== JSON.stringify(entry.works_run)) throw new Error("Learning global and change status projections disagree for " + entry.change_id);
    const seen = new Set<string>();
    let parent = value.parent_change;
    while (parent !== null) {
      if (seen.has(String(parent))) throw new Error("Learning parent cycle detected at " + entry.change_id);
      seen.add(String(parent));
      const parentEntry = byId.get(String(parent));
      if (!parentEntry) throw new Error("Learning parent_change is not indexed: " + parent);
      parent = parentEntry.parent_change;
    }
    if (locator.startsWith("archive/") !== (archived.some((candidate) => candidate.change_id === entry.change_id))) throw new Error("Learning indexed location and lifecycle disagree for " + entry.change_id);
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

export async function validateStructuredRuntime(stagedRoot: string, selectedWorkflowIds: string[]): Promise<StructuredChange[]> {
  const changes: StructuredChange[] = [];
  const handlers: Record<string, () => Promise<void>> = {
    learning: async () => validateLearningState(stagedRoot),
    ops: async () => validateOpsState(stagedRoot),
    person: async () => validatePersonState(stagedRoot),
    specdev: async () => { changes.push(...await validateSpecdevState(stagedRoot)); },
  };
  for (const workflowId of selectedWorkflowIds) await handlers[workflowId]?.();
  return changes;
}
