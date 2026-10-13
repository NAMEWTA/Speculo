import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertJsonObject, type JsonObject } from "./config.js";
import { pathExists } from "./utils.js";
import { validateOpsResources } from "./ops-resources.js";
import { validateMediaState } from "./media-state.js";

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

export function readSpecdevConfig(local: JsonObject): { value: JsonObject } {
  validateSpecdevConfig(local);
  return { value: local };
}

export function validateSpecdevConfig(config: JsonObject): void {
  if (config.schema_version !== 7) throw new Error("SpecDev config schema_version must be 7");
  if (typeof config.interaction_language !== "string" || typeof config.artifact_language !== "string") {
    throw new Error("SpecDev config language values must be strings");
  }
  const github = object(config.github);
  if (typeof github.include_external_prs !== "boolean" || !github.labels || typeof github.labels !== "object" || Array.isArray(github.labels) || Object.values(github.labels).some(v => typeof v !== "string" || !v.trim())) throw new Error("SpecDev config github requires include_external_prs and string label mappings");
  assertExactKeys(github, ["include_external_prs", "labels"], "SpecDev config github");
  const git = object(config.git);
  if (!(git.default_branch === null || typeof git.default_branch === "string")) {
    throw new Error("SpecDev config git.default_branch must be a string or null");
  }
  const execution = object(config.execution);
  for (const key of ["max_concurrent_implementations", "max_integration_attempts"]) {
    if (!Number.isInteger(execution[key]) || Number(execution[key]) < 1) {
      throw new Error("SpecDev config execution." + key + " must be a positive integer");
    }
  }
  if (typeof execution.deep_ticket_human_approval !== "boolean" || typeof execution.shared_path_owner !== "string") {
    throw new Error("SpecDev config execution settings are incomplete");
  }
}

function validateChangeStatus(previous: JsonObject): void {
  const version = previous.schema_version;
  if (version !== 6) throw new Error("SpecDev change status schema v6 is required; unsupported versions are not migrated");
  if (previous.artifact !== "change-status" || typeof previous.change !== "string" || !CHANGE_NAME.test(previous.change)) {
    throw new Error("change status has an invalid artifact or change name");
  }
}

async function validateSpecdevState(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "specdev");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readObject(statusPath, ".speculo/specdev/status.json");
  if (status.schema_version !== 5 || status.workflow !== "specdev" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    throw new Error("SpecDev status schema v5 is required; unsupported versions are not migrated");
  }
  assertExactKeys(status, ["schema_version", "workflow", "active", "archived"], "SpecDev status");
  const activeEntries = status.active.map((entry) => {
    assertJsonObject(entry, "SpecDev active status entry");
    assertExactKeys(entry, ["change"], "SpecDev active status entry");
    if (typeof entry.change !== "string" || !CHANGE_NAME.test(entry.change)) throw new Error("SpecDev active change name is invalid");
    return entry;
  });
  const active = activeEntries.map((entry) => ({ change: entry.change }));
  const archived = status.archived.map((entry) => {
    if (typeof entry !== "string" || !CHANGE_NAME.test(entry)) throw new Error("SpecDev archived change name is invalid");
    return entry;
  });
  const activeNames = new Set(active.map((entry) => String(entry.change)));
  if (activeNames.size !== active.length || new Set(archived).size !== archived.length || archived.some((name) => activeNames.has(name))) {
    throw new Error("SpecDev status contains duplicate or overlapping change names");
  }

  const indexed = [
    ...activeEntries.map((entry) => join(stateRoot, "changes", String(entry.change), ".status.json")),
    ...archived.map((name) => join(stateRoot, "archive", name.slice(0, 7), name, ".status.json")),
  ];
  for (const path of indexed) {
    if (!(await pathExists(path))) throw new Error("indexed SpecDev change is missing " + path);
    const previous = await readObject(path, path);
    validateChangeStatus(previous);
  }
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

async function validateOpsState(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "ops");
  const statusPath = join(stateRoot, "status.json");
  if (!(await pathExists(statusPath))) return;
  const status = await readObject(statusPath, ".speculo/ops/status.json");
  if (status.schema_version === 3) {
    const schema = await readObject(join(stagedRoot, "workflows", "ops", "common", "schemas", "status.schema.json"), "Ops v3 schema");
    validateOpsResources(status, schema);
    return;
  }
  throw new Error("Ops status must use the current resource schema v3");
}

export async function validateStructuredRuntime(stagedRoot: string, selectedWorkflowIds: string[]): Promise<void> {
  const handlers: Record<string, () => Promise<void>> = {
    learning: async () => validateLearningState(stagedRoot),
    ops: async () => validateOpsState(stagedRoot),
    person: async () => validatePersonState(stagedRoot),
    media: async () => validateMediaState(stagedRoot),
    specdev: async () => validateSpecdevState(stagedRoot),
  };
  for (const workflowId of selectedWorkflowIds) await handlers[workflowId]?.();
}
