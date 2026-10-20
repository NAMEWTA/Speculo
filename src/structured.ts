import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { assertJsonObject, type JsonObject } from "./config.js";
import { pathExists } from "./utils.js";
import { validateOpsResources } from "./ops-resources.js";
import { validateMediaState } from "./media-state.js";
import { assertMarkdownProtocolSync, discoverChangesSync, readChangeFactsSync, safeWorkPathSync } from "./specdev-artifacts.js";

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

async function validateSpecdevState(stagedRoot: string): Promise<void> {
  const stateRoot = join(stagedRoot, ".speculo", "specdev");
  if (!(await pathExists(stateRoot))) return;
  safeWorkPathSync(join(stagedRoot, ".speculo"), "specdev", { mustExist: true, type: "directory" });
  assertMarkdownProtocolSync(stateRoot);
  for (const location of discoverChangesSync(stateRoot, { includeArchived: true })) readChangeFactsSync(stateRoot, location);
}

const MAO_WORK = "person/mao-zedong-cognitive-os";
const STEELMAN_WORK = "person/steelman-deliberation";
const PERSON_SCALARS = ["problem_type", "primary_framework", "models_applied", "frameworks_applied", "methods_applied", "quotes_cited", "consultation_status"];
const STEELMAN_PHASES = ["intake", "deliberating", "awaiting-answer", "judging", "completed", "blocked", "reframe-required"];
type ConsultationStructureValidator = { validateConsultationStructure(state: JsonObject, options: { change: string }): string[] };

function personNeed(ok: unknown, reason: string): asserts ok {
  if (!ok) throw new Error("unsupported-person-state: " + reason + "; preserve bytes and resolve with the Change owner before refresh");
}
function personDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  return Boolean(parts && Number(parts[2]) >= 1 && Number(parts[2]) <= 12 && Number(parts[3]) >= 1 && Number(parts[3]) <= new Date(Date.UTC(Number(parts[1]), Number(parts[2]), 0)).getUTCDate() && Number(parts[4]) < 24 && Number(parts[5]) < 60 && Number(parts[6]) < 60 && Number.isFinite(Date.parse(value)));
}
let consultationValidator: Promise<ConsultationStructureValidator> | undefined;
function consultationStructureValidator(): Promise<ConsultationStructureValidator> {
  // Use the immutable package code in either source or compiled npm layout.
  // Never import a script from the staged/user installation during refresh.
  const source = "template/workflows/person/person-m-mao-zedong-cognitive-os/scripts/consultation-state.mjs";
  const url = [new URL("../" + source, import.meta.url), new URL("../../" + source, import.meta.url)].find(path => existsSync(path));
  if (!url) throw new Error("Person structural validator is missing from the package");
  return consultationValidator ??= import(url.href) as Promise<ConsultationStructureValidator>;
}
async function validatePersonChange(value: JsonObject, change: string): Promise<void> {
  personNeed(value.schema_version === 1 && value.artifact === "person-work-status" && value.workflow === "person" && value.change === change, "Change identity/schema disagrees with " + change);
  personNeed([MAO_WORK, STEELMAN_WORK].includes(String(value.work_id)), "unknown Change owner for " + change);
  if (value.work_id === MAO_WORK) {
    const errors = (await consultationStructureValidator()).validateConsultationStructure(value, { change });
    personNeed(!errors.length, change + ": " + errors.join("; "));
    return;
  }
  personNeed(typeof value.phase === "string" && STEELMAN_PHASES.includes(value.phase) && ["active", "blocked", "completed"].includes(String(value.status)), "Steelman phase/status for " + change);
  personNeed((value.phase === "completed") === (value.status === "completed"), "Steelman completion identity for " + change);
  personNeed(personDate(value.created_at) && personDate(value.updated_at) && Date.parse(value.created_at) <= Date.parse(value.updated_at), "Steelman timestamps for " + change);
  personNeed(value.completed_at === null || personDate(value.completed_at), "Steelman completed_at for " + change);
  personNeed((value.phase === "completed") === (value.completed_at !== null), "Steelman completion timestamp for " + change);
  if (personDate(value.completed_at)) personNeed(Date.parse(value.completed_at) >= Date.parse(value.created_at) && Date.parse(value.completed_at) <= Date.parse(value.updated_at), "Steelman completion timestamp range for " + change);
  assertUniqueStrings(value.blockers, "Person Steelman blockers");
  personNeed(value.key_question === null || typeof value.key_question === "string", "Steelman key_question type for " + change);
  personNeed(typeof value.key_question_asked === "boolean" && typeof value.answer_received === "boolean" && (value.user_answer === null || typeof value.user_answer === "string"), "Steelman question/answer types for " + change);
  personNeed(value.question_disposition === null || ["asked", "already-answered"].includes(String(value.question_disposition)), "Steelman question_disposition for " + change);
  // Content, the frozen dossier, answer sufficiency and decision qualification
  // belong to the Work's publication validator, not the installer.
}

/** Installation integrity only: read formal per-Change state and its index.
 * Candidates, dossiers, book sources and publish/recovery tools are not run. */
async function validatePersonState(stagedRoot: string): Promise<void> {
  const stateRoot = safeWorkPathSync(stagedRoot, ".speculo/person", { type: "directory" });
  if (!(await pathExists(stateRoot))) return;
  const statusPath = safeWorkPathSync(stateRoot, "status.json", { mustExist: true, type: "file" });
  const status = await readObject(statusPath, ".speculo/person/status.json");
  personNeed(status.schema_version === 1 && status.workflow === "person" && Array.isArray(status.active), "global schema v1 and active array required");
  personNeed(!PERSON_SCALARS.some(key => key in status), "consultation fields belong to a Change, not the global index");
  const entries = new Map<string, JsonObject>();
  for (const candidate of status.active) {
    assertJsonObject(candidate, "Person active entry");
    personNeed(typeof candidate.change === "string" && CHANGE_NAME.test(candidate.change) && !entries.has(candidate.change), "invalid/duplicate active Change ID");
    personNeed([MAO_WORK, STEELMAN_WORK].includes(String(candidate.work_id)) && typeof candidate.phase === "string" && personDate(candidate.updated_at), "active owner/phase/timestamp for " + candidate.change);
    personNeed(!PERSON_SCALARS.some(key => key in candidate), "consultation fields belong to the formal Change state");
    entries.set(candidate.change, candidate);
  }
  const changesRoot = safeWorkPathSync(stateRoot, "changes", { type: "directory" });
  const seen = new Set<string>();
  if (await pathExists(changesRoot)) for (const entry of await readdir(changesRoot, { withFileTypes: true })) {
    // Unknown material is retained; only direct Change state is authoritative.
    // Nested .steelman-stage/.status.json is deliberately outside this scan.
    if (!CHANGE_NAME.test(entry.name)) continue;
    const changeRoot = safeWorkPathSync(changesRoot, entry.name, { mustExist: true, type: "directory" });
    const path = safeWorkPathSync(changeRoot, ".status.json", { type: "file" });
    if (!(await pathExists(path))) continue;
    const state = await readObject(path, "Person Change " + entry.name);
    await validatePersonChange(state, entry.name);
    seen.add(entry.name);
    const indexed = entries.get(entry.name);
    if (indexed) personNeed(state.status !== "completed" && state.work_id === indexed.work_id && state.phase === indexed.phase && state.updated_at === indexed.updated_at, "global/Change projections disagree for " + entry.name);
    // Steelman's already-answered branch goes directly to judging and never
    // creates a waiting item. Mao indexes each published active consultation.
    if ((state.work_id === MAO_WORK && state.status === "active") || state.phase === "awaiting-answer") personNeed(indexed, "missing active projection for " + entry.name);
  }
  for (const change of entries.keys()) personNeed(seen.has(change), "indexed Change has no formal state: " + change);
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
