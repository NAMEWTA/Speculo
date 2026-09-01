import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { RefreshBlockedError } from "../src/refresh.js";

const packageRoot = process.cwd();
const workflowRoot = join(packageRoot, "template", "workflows", "ops");
const validator = join(workflowRoot, "common", "tools", "validate-ops.mjs");
const closer = join(workflowRoot, "common", "tools", "close-change.mjs");
const projectId = "demo-api";
const change = "2026-09-01-deploy-production";
const sourceRevision = "abc123";
const targetFingerprint = "b".repeat(64);
const artifactDigest = "c".repeat(64);
const backupDigest = "d".repeat(64);
const EXPECTED_WORK_NAMES = ["A-archive-and-learn", "E-execute-and-stabilize", "I-intake-and-assess", "P-plan-and-approve"];

type ScopeEntry = { scope: "global" | "project"; project_id: string | null; change: string };

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]));
  }
  return value;
}

function digestJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function digestText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function projectEntry(id = projectId, name = change): ScopeEntry {
  return { scope: "project", project_id: id, change: name };
}

function projectValue(id = projectId): Record<string, unknown> {
  return {
    schema_version: 1,
    artifact: "ops-project",
    project_id: id,
    display_name: id === projectId ? "Demo API" : "Billing API",
    aliases: [id],
    identities: [{ kind: "vcs", value: `github.com/example/${id}`, source: "git remote" }],
    source_hints: [`/srv/src/${id}`],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };
}

function changeStatus(entry: ScopeEntry, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 2,
    artifact: "ops-change-status",
    scope: entry.scope,
    project_id: entry.project_id,
    change: entry.change,
    change_status: "active",
    phase: "intake",
    current_work: null,
    works_run: [],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    completed_at: null,
    archived_at: null,
    archive_path: null,
    source_revision: null,
    target_fingerprint: null,
    plan_path: null,
    plan_digest: null,
    approval_path: null,
    approval_status: "not_requested",
    approved_batches: [],
    latest_attempt_id: null,
    outcome: "pending",
    blockers: [],
    ...overrides,
  };
}

function changeRoot(stateRoot: string, entry: ScopeEntry): string {
  return entry.scope === "global"
    ? join(stateRoot, "changes", entry.change)
    : join(stateRoot, "projects", String(entry.project_id), "changes", entry.change);
}

function snapshotValue(entry: ScopeEntry): Record<string, unknown> {
  return {
    schema_version: 2,
    artifact: "ops-inventory-snapshot",
    scope: entry.scope,
    project_id: entry.project_id,
    snapshot_id: "20260901T000000Z",
    change: entry.change,
    captured_at: "2026-09-01T00:00:00.000Z",
    scope_definition: { levels: ["L0", "L1"], targets: ["local"], approved_deep_roots: [] },
    target_fingerprint: targetFingerprint,
    collectors: [{ id: "host-facts", category: "host", tool: "uname", target: "local", status: "observed", facts: { os: "test" }, evidence: ["uname exited 0"], error: null }],
    gaps: [],
    redactions: [],
  };
}

function modelValue(entry: ScopeEntry, sourceRoot: string): Record<string, unknown> {
  return {
    schema_version: 2,
    artifact: "ops-deployment-model",
    scope: entry.scope,
    project_id: entry.project_id,
    change: entry.change,
    generated_at: "2026-09-01T00:05:00.000Z",
    project: { source_root: sourceRoot, source_revision: sourceRevision, languages: ["node"], build: ["pnpm build"], start: ["node dist/server.js"] },
    components: [{ id: "api", kind: "service", source: "package.json" }],
    dependencies: [],
    configuration: [{ key: "JAVA_HOME", scope: "global", required: true, secret: false, source_ref: "operator policy" }],
    data: [],
    deployment_options: [{ id: "systemd", method: "systemd", evidence: ["existing unit policy"], tradeoffs: ["host-global control plane"] }],
    selected_method: "systemd",
    health_checks: [{ id: "http", kind: "http", target: "http://127.0.0.1:3000/health", success: "HTTP 200" }],
    unknowns: [],
    readiness: "ready",
  };
}

function targetProfileValue(
  entry: ScopeEntry,
  stateRoot: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const deploymentRoot = join(stateRoot, "deploy");
  return {
    schema_version: 1,
    artifact: "ops-target-profile",
    scope: entry.scope,
    project_id: entry.project_id,
    change: entry.change,
    created_at: "2026-09-01T00:07:00.000Z",
    operation_mode: entry.scope === "global" ? "audit" : "upgrade",
    environment_class: entry.scope === "global" ? "local" : "production",
    deployment_root: deploymentRoot,
    existing_state: "present",
    identity_confirmed: true,
    identity_confirmation_evidence: "inventory/snapshots/20260901T000000Z.json#control-plane",
    identity_assertions: [
      { id: "ID001", provider: "docker-compose", key: "project", comparison: "exact", expected: entry.scope === "global" ? "local-system" : "demo-api", evidence: ["docker compose ls"] },
      { id: "ID002", provider: "docker-compose", key: "files", comparison: "ordered-list", expected: [join(deploymentRoot, "compose/base.yml"), join(deploymentRoot, "compose/prod.yml")], evidence: ["container compose labels"] },
    ],
    ownership: { owned_targets: [entry.scope === "global" ? "host:local" : "compose:demo-api"], protected_targets: ["compose:cde"], unknown_targets: [] },
    differences: [{ id: "DF001", target: "demo-api", classification: "requires-backup", evidence: ["release revision differs"] }],
    secret_requirements: [{ key: "DATABASE_URL", source_ref: "vault://ops/demo-api/database", presence_required: true, version_ref: "v7" }],
    readiness: "ready",
    blockers: [],
    ...overrides,
  };
}

function planValue(
  entry: ScopeEntry,
  stateRoot: string,
  snapshot: unknown,
  model: unknown,
  profile: unknown,
  number = 1,
  lineage: { supersedes: string | null; attempt: string | null } = { supersedes: null, attempt: null },
): Record<string, unknown> {
  const sourceRoot = join(stateRoot, "source");
  const deploymentRoot = join(stateRoot, "deploy");
  return {
    schema_version: 3,
    artifact: "ops-implementation-plan",
    scope: entry.scope,
    project_id: entry.project_id,
    plan_id: `PLAN-${String(number).padStart(3, "0")}`,
    change: entry.change,
    created_at: `2026-09-01T00:${String(9 + number).padStart(2, "0")}:00.000Z`,
    supersedes_plan_path: lineage.supersedes,
    triggered_by_attempt: lineage.attempt,
    depth: "deep",
    status: "ready",
    input_bindings: {
      request_path: "request.md",
      snapshot_path: "inventory/snapshots/20260901T000000Z.json",
      snapshot_digest: digestJson(snapshot),
      deployment_model_path: "deployment/deployment-model.json",
      deployment_model_digest: digestJson(model),
      target_profile_path: "deployment/target-profile.json",
      target_profile_digest: digestJson(profile),
      source_revision: sourceRevision,
      target_fingerprint: targetFingerprint,
    },
    scope_definition: { source_root: sourceRoot, deployment_root: deploymentRoot, read_roots: [sourceRoot], write_roots: [deploymentRoot], forbidden_roots: [] },
    batches: [
      { id: "B01", title: "Stage immutable release", risk: "low", requires_confirmation: true, depends_on: [], operation_ids: ["OP001"], gate_ids: [] },
      { id: "B02", title: "Migrate and activate", risk: "high", requires_confirmation: true, depends_on: ["B01"], operation_ids: ["OP002"], gate_ids: ["G01"] },
    ],
    external_mutations: [{ id: "EM001", provider: "systemd", target: "demo.service", current_state: "absent", desired_state: "running", privilege: "sudo", blast_radius: "single service", preview: "systemd-analyze verify", rollback: "disable and remove unit", batch_id: "B02" }],
    global_environment_changes: [{ key: "JAVA_HOME", target_scope: "demo.service", value_source_ref: "operator policy", impact: "service runtime", rollback: "remove Environment entry", batch_id: "B02" }],
    operations: [
      { id: "OP001", batch_id: "B01", kind: "filesystem", target: join(deploymentRoot, "releases/candidate.tar"), working_directory: deploymentRoot, preconditions: ["deployment root parent exists"], write_set: [join(deploymentRoot, "releases/candidate.tar")], external_mutation_id: null, preview: { supported: true, command: "test -e releases/candidate.tar", limitations: ["does not activate release"] }, apply: { shell: "sh", command: "install -m 640 candidate.tar releases/candidate.tar" }, postconditions: ["target-side digest matches manifest"], rollback: { mode: "manual", trigger: "later batch fails", command: "retain failed candidate" }, risk: "low", required_privilege: "deployment-root owner", evidence_path: "execution/attempts/{attempt-id}/journal.jsonl" },
      { id: "OP002", batch_id: "B02", kind: "database", target: "demo-production", working_directory: deploymentRoot, preconditions: ["G01 passed", "backup verified"], write_set: [], external_mutation_id: "EM001", preview: { supported: true, command: "migration-tool plan", limitations: ["does not write data"] }, apply: { shell: "sh", command: "migration-tool apply --transactional" }, postconditions: ["schema revision matches release"], rollback: { mode: "manual", trigger: "migration or health gate fails", command: "restore from verified backup" }, risk: "high", required_privilege: "database migrator", evidence_path: "execution/attempts/{attempt-id}/journal.jsonl" },
    ],
    artifact_requirements: [{ id: "AR001", kind: "archive", source_ref: "dist/demo-api.tar", immutable_digest: artifactDigest, staging_ref: join(deploymentRoot, "releases/candidate.tar"), activation_target: join(deploymentRoot, "release-current"), previous_ref: join(deploymentRoot, "release-previous"), required: true }],
    gates: [
      { id: "G01", title: "Candidate verified", depends_on: [], after_batches: ["B01"], verification_ids: ["VR001"], required: true },
      { id: "G02", title: "Deployment stable", depends_on: ["G01"], after_batches: ["B02"], verification_ids: ["VR002"], required: true },
    ],
    data_protection: [{ id: "DP001", resource: "demo-production", operation_ids: ["OP002"], strategy: "verified-backup", backup: { evidence_path: "execution/backups/demo-production.json", digest: backupDigest, readability_verified: true, restore_ref: "backup://demo-production/previous", restore_verified: true }, waiver: null }],
    retention_policy: { retain_failed_candidates: true, retain_previous_release: true, cleanup_requires_separate_approval: true },
    verification: [
      { id: "VR001", kind: "artifact", target: join(deploymentRoot, "releases/candidate.tar"), required: true, expected: { description: "target digest equals manifest", http_statuses: [], business_codes: [], authenticated: null }, stability: null, convergence_group: null },
      { id: "VR002", kind: "http", target: "http://127.0.0.1:3000/health", required: true, expected: { description: "authenticated service health", http_statuses: [200], business_codes: ["OK"], authenticated: false }, stability: { interval_seconds: 2, timeout_seconds: 30, required_consecutive_successes: 3 }, convergence_group: null },
    ],
    rollback_strategy: "Disable the service and restore the prior deployment root snapshot.",
    blockers: [],
  };
}

function approvalValue(entry: ScopeEntry, plan: Record<string, unknown>, number: number): Record<string, unknown> {
  const planNumber = String(number).padStart(3, "0");
  return {
    schema_version: 2,
    artifact: "ops-plan-approval",
    scope: entry.scope,
    project_id: entry.project_id,
    approval_id: `APPROVAL-${planNumber}`,
    change: entry.change,
    plan_path: `plan/plan-${planNumber}.json`,
    plan_digest: digestJson(plan),
    source_revision: sourceRevision,
    target_fingerprint: targetFingerprint,
    approved_batches: ["B01", "B02"],
    excluded_batches: [],
    confirmed_global_environment_keys: ["JAVA_HOME"],
    conditions: ["execute before expiry"],
    decision: "approved",
    decision_summary: "Approved B01 and B02 including JAVA_HOME service scope.",
    decided_at: `2026-09-01T00:${String(14 + number).padStart(2, "0")}:00.000Z`,
    expires_at: "2099-09-01T01:00:00.000Z",
  };
}

async function writeProjectBase(stateRoot: string, entry: ScopeEntry, profileOverrides: Record<string, unknown> = {}): Promise<{ root: string; snapshot: Record<string, unknown>; model: Record<string, unknown>; profile: Record<string, unknown> }> {
  const root = changeRoot(stateRoot, entry);
  await writeJson(join(stateRoot, "projects", String(entry.project_id), "project.json"), projectValue(String(entry.project_id)));
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "request.md"), "# Request\n", "utf8");
  const snapshot = snapshotValue(entry);
  const model = modelValue(entry, join(stateRoot, "source"));
  const profile = targetProfileValue(entry, stateRoot, profileOverrides);
  await writeJson(join(root, "inventory", "snapshots", "20260901T000000Z.json"), snapshot);
  await writeFile(join(root, "inventory", "system-report.md"), "# System Survey\n", "utf8");
  await writeJson(join(root, "deployment", "deployment-model.json"), model);
  await writeFile(join(root, "deployment", "deployment-dossier.md"), "# Deployment Dossier\n", "utf8");
  await writeJson(join(root, "deployment", "target-profile.json"), profile);
  return { root, snapshot, model, profile };
}

function journalEvent(sequence: number, event: string, values: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 1,
    artifact: "ops-journal-event",
    sequence,
    at: `2026-09-01T00:${String(20 + sequence).padStart(2, "0")}:00.000Z`,
    event,
    batch_id: null,
    gate_id: null,
    operation_id: null,
    result: "pending",
    summary: event,
    output_digest: null,
    evidence: [],
    ...values,
  };
}

function verificationStateValue(
  entry: ScopeEntry,
  attemptId: string,
  profile: Record<string, unknown>,
  plan: Record<string, unknown> | null,
  verdict: "passed" | "failed" | "blocked",
): Record<string, unknown> {
  const assertions = profile.identity_assertions as Array<Record<string, unknown>>;
  const requirements = (plan?.verification ?? []) as Array<Record<string, unknown>>;
  const planGates = (plan?.gates ?? []) as Array<Record<string, unknown>>;
  const protection = (plan?.data_protection ?? []) as Array<Record<string, unknown>>;
  const failed = verdict !== "passed";
  return {
    schema_version: 1,
    artifact: "ops-verification-state",
    scope: entry.scope,
    project_id: entry.project_id,
    change: entry.change,
    attempt_id: attemptId,
    captured_at: "2026-09-01T00:29:00.000Z",
    target_profile_path: "deployment/target-profile.json",
    target_profile_digest: digestJson(profile),
    identity_results: assertions.map((assertion) => ({ assertion_id: assertion.id, comparison: assertion.comparison, actual: assertion.expected, matched: true, evidence: [`${assertion.id} re-read`] })),
    gates: planGates.map((gate, index) => ({ id: gate.id, sequence: index + 1, status: failed && index === planGates.length - 1 ? "failed" : "passed", started_at: `2026-09-01T00:${String(23 + index).padStart(2, "0")}:00.000Z`, ended_at: `2026-09-01T00:${String(24 + index).padStart(2, "0")}:00.000Z`, evidence: [`${gate.id} evidence`] })),
    artifacts: plan ? [{ requirement_id: "AR001", immutable_digest: artifactDigest, target_ref: join(String(profile.deployment_root), "releases/candidate.tar"), server_verified: true, matched: true, evidence: ["target-side sha256"] }] : [],
    services: plan ? [{ id: "demo-api", status: failed ? "degraded" : "healthy", immutable_ref: `sha256:${artifactDigest}`, restart_count: 0, runtime_digest: "runtime-v1", evidence: ["service status re-read"] }] : [],
    probes: requirements.map((requirement) => {
      const isHttp = requirement.kind === "http";
      return {
        verification_id: requirement.id,
        ok: !(failed && requirement.id === "VR002"),
        http_status: isHttp ? 200 : null,
        business_code: isHttp ? (failed ? "ERROR" : "OK") : null,
        authenticated: isHttp ? false : null,
        consecutive_successes: isHttp ? (failed ? 1 : 3) : 1,
        elapsed_seconds: isHttp ? 6 : 1,
        transient_failures: failed && isHttp ? ["business code ERROR"] : [],
        evidence: [`${requirement.id} probe evidence`],
      };
    }),
    convergence: [],
    data_protection: protection.map((item) => ({ protection_id: item.id, status: item.strategy === "verified-backup" ? "verified" : item.strategy, evidence_path: "execution/backups/demo-production.json", evidence_digest: backupDigest, readability_verified: item.strategy === "verified-backup", restore_verified: item.strategy === "verified-backup" })),
    recovery: plan
      ? { strategy: "restore-previous", previous_release_ref: join(String(profile.deployment_root), "release-previous"), rollback_operation_refs: ["OP001", "OP002"], material_refs: ["backup://demo-production/previous"], compatibility_verified: true, data_restore_authorized: false, evidence: ["rollback preflight passed"] }
      : { strategy: "not-applicable", previous_release_ref: null, rollback_operation_refs: [], material_refs: [], compatibility_verified: true, data_restore_authorized: null, evidence: ["read-only inventory"] },
    retained_artifacts: plan ? [{ id: "previous-release", kind: "release", locator: join(String(profile.deployment_root), "release-previous"), reason: "rollback target" }] : [],
    risks: failed ? ["deployment did not stabilize"] : [],
    verdict,
  };
}

function handoffText(entry: ScopeEntry, attemptId: string): string {
  return `# Ops Deployment Handoff

- Scope: ${entry.scope}
- Project: ${entry.project_id ?? "none"}
- Change: ${entry.change}
- Attempt: ${attemptId}

## Target and Control-plane Identity
All assertions matched the target profile.
## Source and Immutable Artifacts
The target-side digest matched the immutable manifest.
## Gate Results
All required gates passed in dependency order.
## Services and Runtime Convergence
The service was healthy with no unexpected restart.
## Semantic Probes and Stability Windows
HTTP and business semantics passed for three consecutive probes.
## Data Protection
Backup readability and restore evidence were verified.
## Recovery and Previous Release
The previous release remains available as a compatible rollback target.
## Retained Candidates and Rollback Assets
The previous release and rollback material remain retained.
## Credential References
DATABASE_URL is present via vault://ops/demo-api/database at version v7.
## Remaining Risks and Operator Follow-up
No unresolved risk.
`;
}

async function writeAttempt(root: string, entry: ScopeEntry, input: { id: string; kind: string; result: string; plan: number; triggeredBy: string | null; diagnosis?: boolean }): Promise<void> {
  const attemptRoot = join(root, "execution", "attempts", input.id);
  const planPath = input.kind === "verification-only" ? null : `plan/plan-${String(input.plan).padStart(3, "0")}.json`;
  const plan = planPath ? JSON.parse(await readFile(join(root, planPath), "utf8")) as Record<string, unknown> : null;
  const profile = JSON.parse(await readFile(join(root, "deployment", "target-profile.json"), "utf8")) as Record<string, unknown>;
  const terminal = input.result !== "running";
  const diagnosisPath = input.diagnosis ? `execution/attempts/${input.id}/diagnosis.md` : null;
  const verificationPath = terminal ? `execution/attempts/${input.id}/verification.md` : null;
  const verificationStatePath = terminal ? `execution/attempts/${input.id}/verification-state.json` : null;
  const verificationState = terminal ? verificationStateValue(entry, input.id, profile, plan, input.result === "failed" ? "failed" : "passed") : null;
  const handoffPath = terminal && ["succeeded", "rolled_back", "abandoned"].includes(input.result) ? `execution/attempts/${input.id}/HANDOFF.md` : null;
  const journal = input.kind === "verification-only"
    ? [
        journalEvent(1, "attempt-start", { result: "pending", summary: "verification-only attempt started" }),
        journalEvent(2, "attempt-end", { result: input.result === "succeeded" ? "passed" : "failed", summary: "verification-only attempt ended" }),
      ]
    : input.result === "failed"
      ? [
          journalEvent(1, "attempt-start", { summary: "deployment attempt started" }),
          journalEvent(2, "operation-intent", { batch_id: "B01", operation_id: "OP001", summary: "stage candidate" }),
          journalEvent(3, "operation-result", { batch_id: "B01", operation_id: "OP001", result: "passed", summary: "candidate staged", output_digest: artifactDigest }),
          journalEvent(4, "postcondition-result", { batch_id: "B01", operation_id: "OP001", result: "passed", summary: "target digest matched" }),
          journalEvent(5, "gate-result", { gate_id: "G01", result: "passed", summary: "candidate gate passed" }),
          journalEvent(6, "operation-intent", { batch_id: "B02", operation_id: "OP002", summary: "apply migration" }),
          journalEvent(7, "operation-result", { batch_id: "B02", operation_id: "OP002", result: "passed", summary: "migration applied" }),
          journalEvent(8, "postcondition-result", { batch_id: "B02", operation_id: "OP002", result: "passed", summary: "schema revision matched" }),
          journalEvent(9, "gate-result", { gate_id: "G02", result: "failed", summary: "stability gate failed" }),
          journalEvent(10, "attempt-end", { result: "failed", summary: "deployment attempt failed" }),
        ]
      : [
          journalEvent(1, "attempt-start", { summary: "deployment attempt started" }),
          journalEvent(2, "operation-intent", { batch_id: "B01", operation_id: "OP001", summary: "stage candidate" }),
          journalEvent(3, "operation-result", { batch_id: "B01", operation_id: "OP001", result: "passed", summary: "candidate staged", output_digest: artifactDigest }),
          journalEvent(4, "postcondition-result", { batch_id: "B01", operation_id: "OP001", result: "passed", summary: "target digest matched" }),
          journalEvent(5, "gate-result", { gate_id: "G01", result: "passed", summary: "candidate gate passed" }),
          journalEvent(6, "operation-intent", { batch_id: "B02", operation_id: "OP002", summary: "apply migration" }),
          journalEvent(7, "operation-result", { batch_id: "B02", operation_id: "OP002", result: "passed", summary: "migration applied" }),
          journalEvent(8, "postcondition-result", { batch_id: "B02", operation_id: "OP002", result: "passed", summary: "schema revision matched" }),
          journalEvent(9, "gate-result", { gate_id: "G02", result: "passed", summary: "stability gate passed" }),
          journalEvent(10, "attempt-end", { result: "passed", summary: "deployment attempt succeeded" }),
        ];
  journal[0].at = "2026-09-01T00:20:00.000Z";
  if (terminal) journal[journal.length - 1].at = "2026-09-01T00:40:00.000Z";
  await writeJson(join(attemptRoot, "attempt.json"), {
    schema_version: 2,
    artifact: "ops-execution-attempt",
    scope: entry.scope,
    project_id: entry.project_id,
    change: entry.change,
    attempt_id: input.id,
    kind: input.kind,
    triggered_by_attempt: input.triggeredBy,
    plan_path: planPath,
    plan_digest: plan ? digestJson(plan) : null,
    approval_path: plan ? `plan/approval-${String(input.plan).padStart(3, "0")}.json` : null,
    target_profile_path: "deployment/target-profile.json",
    target_profile_digest: digestJson(profile),
    started_at: "2026-09-01T00:20:00.000Z",
    ended_at: terminal ? "2026-09-01T00:40:00.000Z" : null,
    result: input.result,
    executed_batches: plan ? ["B01", "B02"] : [],
    failed_operation: null,
    mutation_performed: input.kind !== "verification-only",
    journal_path: `execution/attempts/${input.id}/journal.jsonl`,
    diagnosis_path: diagnosisPath,
    verification_path: verificationPath,
    verification_state_path: verificationStatePath,
    verification_state_digest: verificationState ? digestJson(verificationState) : null,
    handoff_path: handoffPath,
    retained_artifacts: plan ? [{ id: "previous-release", kind: "release", locator: join(String(profile.deployment_root), "release-previous"), reason: "rollback target" }] : [],
    blockers: input.result === "blocked" ? ["blocked"] : [],
  });
  await writeFile(join(attemptRoot, "journal.jsonl"), journal.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
  await writeFile(join(attemptRoot, "summary.md"), "# Attempt Summary\n", "utf8");
  if (input.diagnosis) await writeFile(join(attemptRoot, "diagnosis.md"), "# Attempt Diagnosis\n", "utf8");
  if (verificationState) {
    await writeJson(join(attemptRoot, "verification-state.json"), verificationState);
    await writeFile(join(attemptRoot, "verification.md"), "# Attempt Verification\n", "utf8");
  }
  if (handoffPath) await writeFile(join(attemptRoot, "HANDOFF.md"), handoffText(entry, input.id), "utf8");
}

async function createApprovedState(stateRoot: string, profileOverrides: Record<string, unknown> = {}): Promise<{ entry: ScopeEntry; root: string; approvalPath: string }> {
  const entry = projectEntry();
  await writeJson(join(stateRoot, "status.json"), { schema_version: 2, workflow: "ops", active: [entry], archived: [] });
  const { root, snapshot, model, profile } = await writeProjectBase(stateRoot, entry, profileOverrides);
  const plan = planValue(entry, stateRoot, snapshot, model, profile);
  const approval = approvalValue(entry, plan, 1);
  await writeJson(join(root, "plan", "plan-001.json"), plan);
  await writeFile(join(root, "plan", "plan-001.md"), "# Plan 001\n", "utf8");
  const approvalPath = join(root, "plan", "approval-001.json");
  await writeJson(approvalPath, approval);
  await writeJson(join(root, ".status.json"), changeStatus(entry, {
    phase: "approved",
    source_revision: sourceRevision,
    target_fingerprint: targetFingerprint,
    plan_path: "plan/plan-001.json",
    plan_digest: digestJson(plan),
    approval_path: "plan/approval-001.json",
    approval_status: "approved",
    approved_batches: ["B01", "B02"],
    works_run: ["ops/intake-and-assess", "ops/plan-and-approve"],
  }));
  return { entry, root, approvalPath };
}

async function createCompletedIterativeState(stateRoot: string): Promise<{ entry: ScopeEntry; root: string }> {
  const { entry, root } = await createApprovedState(stateRoot);
  await writeAttempt(root, entry, { id: "ATTEMPT-001", kind: "deploy", result: "failed", plan: 1, triggeredBy: null, diagnosis: true });
  const snapshot = JSON.parse(await readFile(join(root, "inventory", "snapshots", "20260901T000000Z.json"), "utf8"));
  const model = JSON.parse(await readFile(join(root, "deployment", "deployment-model.json"), "utf8"));
  const profile = JSON.parse(await readFile(join(root, "deployment", "target-profile.json"), "utf8"));
  const plan = planValue(entry, stateRoot, snapshot, model, profile, 2, { supersedes: "plan/plan-001.json", attempt: "ATTEMPT-001" });
  const approval = approvalValue(entry, plan, 2);
  await writeJson(join(root, "plan", "plan-002.json"), plan);
  await writeFile(join(root, "plan", "plan-002.md"), "# Plan 002\n", "utf8");
  await writeJson(join(root, "plan", "approval-002.json"), approval);
  await writeAttempt(root, entry, { id: "ATTEMPT-002", kind: "remediation", result: "succeeded", plan: 2, triggeredBy: "ATTEMPT-001" });
  await writeJson(join(root, ".status.json"), changeStatus(entry, {
    change_status: "completed",
    phase: "ready_to_archive",
    works_run: ["ops/intake-and-assess", "ops/plan-and-approve", "ops/execute-and-stabilize"],
    completed_at: "2026-09-01T00:30:00.000Z",
    source_revision: sourceRevision,
    target_fingerprint: targetFingerprint,
    plan_path: "plan/plan-002.json",
    plan_digest: digestJson(plan),
    approval_path: "plan/approval-002.json",
    approval_status: "approved",
    approved_batches: ["B01", "B02"],
    latest_attempt_id: "ATTEMPT-002",
    outcome: "succeeded",
  }));
  return { entry, root };
}

function legacyPlanV2(plan: Record<string, unknown>): Record<string, unknown> {
  const legacy = structuredClone(plan);
  legacy.schema_version = 2;
  const bindings = legacy.input_bindings as Record<string, unknown>;
  delete bindings.target_profile_path;
  delete bindings.target_profile_digest;
  for (const batch of legacy.batches as Array<Record<string, unknown>>) delete batch.gate_ids;
  legacy.verification = (legacy.verification as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id).toLowerCase(),
    kind: item.kind,
    target: item.target,
    success: (item.expected as Record<string, unknown>).description,
    required: item.required,
  }));
  delete legacy.artifact_requirements;
  delete legacy.gates;
  delete legacy.data_protection;
  delete legacy.retention_policy;
  return legacy;
}

async function bindPlan(root: string, entry: ScopeEntry, plan: Record<string, unknown>, number: number): Promise<void> {
  const suffix = String(number).padStart(3, "0");
  const approval = approvalValue(entry, plan, number);
  await writeJson(join(root, "plan", `plan-${suffix}.json`), plan);
  await writeJson(join(root, "plan", `approval-${suffix}.json`), approval);
  const status = JSON.parse(await readFile(join(root, ".status.json"), "utf8")) as Record<string, unknown>;
  status.plan_path = `plan/plan-${suffix}.json`;
  status.plan_digest = digestJson(plan);
  status.approval_path = `plan/approval-${suffix}.json`;
  status.approval_status = "approved";
  status.approved_batches = ["B01", "B02"];
  await writeJson(join(root, ".status.json"), status);
}

async function updateVerificationDigest(root: string, attemptId: string, state: Record<string, unknown>): Promise<void> {
  const attemptRoot = join(root, "execution", "attempts", attemptId);
  await writeJson(join(attemptRoot, "verification-state.json"), state);
  const attempt = JSON.parse(await readFile(join(attemptRoot, "attempt.json"), "utf8")) as Record<string, unknown>;
  attempt.verification_state_digest = digestJson(state);
  await writeJson(join(attemptRoot, "attempt.json"), attempt);
}

async function writeLegacyAttempt(root: string, entry: ScopeEntry, plan: Record<string, unknown>): Promise<void> {
  const attemptRoot = join(root, "execution", "attempts", "ATTEMPT-001");
  await writeJson(join(attemptRoot, "attempt.json"), {
    schema_version: 1,
    artifact: "ops-execution-attempt",
    scope: entry.scope,
    project_id: entry.project_id,
    change: entry.change,
    attempt_id: "ATTEMPT-001",
    kind: "deploy",
    triggered_by_attempt: null,
    plan_path: "plan/plan-001.json",
    plan_digest: digestJson(plan),
    approval_path: "plan/approval-001.json",
    started_at: "2026-08-31T23:00:00.000Z",
    ended_at: "2026-08-31T23:10:00.000Z",
    result: "succeeded",
    executed_batches: ["B01", "B02"],
    failed_operation: null,
    mutation_performed: true,
    journal_path: "execution/attempts/ATTEMPT-001/journal.jsonl",
    diagnosis_path: null,
    verification_path: "execution/attempts/ATTEMPT-001/verification.md",
    blockers: [],
  });
  await writeFile(join(attemptRoot, "journal.jsonl"), '{"event":"legacy-attempt"}\n', "utf8");
  await writeFile(join(attemptRoot, "summary.md"), "# Legacy Attempt Summary\n", "utf8");
  await writeFile(join(attemptRoot, "verification.md"), "# Legacy Attempt Verification\n", "utf8");
}

function retrospective(): string {
  return `# Ops Change Retrospective

## Attempt Timeline
ATTEMPT-001 failed; ATTEMPT-002 succeeded.
## Errors and Failure Signatures
Service failed its first health check.
## Confirmed Root Causes
The unit needed the corrected environment scope.
## Rejected Hypotheses and Why
Port conflict was disproved by listener evidence.
## Plan Deviations and Rework
PLAN-002 superseded PLAN-001.
## Final Effective Deployment or Recovery Sequence
Apply the corrected unit and verify health.
## Verification and Stability Evidence
ATTEMPT-002 verification passed.
## Lessons and Cautions
Validate service-scoped environment before start.
## SOP and Troubleshooting Candidates
Promote the verified sequence and failure signature.
## Project Knowledge Candidates
Project runbook.
## Global Knowledge Candidates
Docker runtime context.
## Archive-only Evidence
Raw attempt journals.
## Remaining Risks and Unknowns
None.
`;
}

describe("Ops workflow", () => {
  it("indexes exactly four works and passes package self-check", () => {
    const result = spawnSync(process.execPath, [validator, "--self-check"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const index = readFileSync(join(workflowRoot, "INDEX.md"), "utf8");
    const readme = readFileSync(join(workflowRoot, "README.md"), "utf8");
    const statusCommand = readFileSync(join(packageRoot, "template", "commands", "status.md"), "utf8");
    const archiveCommand = readFileSync(join(packageRoot, "template", "commands", "archive-and-consolidate.md"), "utf8");
    assert.doesNotMatch(index, /AUTO-INDEX|## 状态字段|ops\/changes\/\{change\}\/\.status/);
    for (const work of EXPECTED_WORK_NAMES) assert.match(readme, new RegExp(`\\*\\*${work}\\*\\*`));
    assert.doesNotMatch(readme, /C-change-control|R-rollback-deployment|V-verify-and-stabilize/);
    assert.match(statusCommand, /projects\/\{project_id\}\/changes\/\{change\}/);
    assert.match(archiveCommand, /A-archive-and-learn/);
  });

  it("keeps global inventory changes in the root scope and completes through a verification-only attempt", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-global-"));
    const entry: ScopeEntry = { scope: "global", project_id: null, change: "2026-09-01-system-baseline" };
    const root = changeRoot(stateRoot, entry);
    try {
      await writeJson(join(stateRoot, "status.json"), { schema_version: 2, workflow: "ops", active: [entry], archived: [] });
      await mkdir(root, { recursive: true });
      await writeFile(join(root, "request.md"), "# Global inventory request\n", "utf8");
      await writeJson(join(root, "inventory", "snapshots", "20260901T000000Z.json"), snapshotValue(entry));
      await writeFile(join(root, "inventory", "system-report.md"), "# System Survey\n", "utf8");
      await writeJson(join(root, "deployment", "target-profile.json"), targetProfileValue(entry, stateRoot));
      await writeAttempt(root, entry, { id: "ATTEMPT-001", kind: "verification-only", result: "succeeded", plan: 0, triggeredBy: null });
      await writeJson(join(root, ".status.json"), changeStatus(entry, {
        change_status: "completed",
        phase: "ready_to_archive",
        works_run: ["ops/intake-and-assess", "ops/execute-and-stabilize"],
        completed_at: "2026-09-01T00:30:00.000Z",
        target_fingerprint: targetFingerprint,
        latest_attempt_id: "ATTEMPT-001",
        outcome: "succeeded",
      }));
      const result = spawnSync(process.execPath, [validator, "--state-root", stateRoot, "--stage", "pre-close", "--scope", "global", "--change", entry.change], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("isolates identical change names under different projects", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-projects-"));
    const first = projectEntry("demo-api");
    const second = projectEntry("billing-api");
    try {
      await writeJson(join(stateRoot, "status.json"), { schema_version: 2, workflow: "ops", active: [first, second], archived: [] });
      for (const entry of [first, second]) {
        await writeJson(join(stateRoot, "projects", String(entry.project_id), "project.json"), projectValue(String(entry.project_id)));
        await writeJson(join(changeRoot(stateRoot, entry), ".status.json"), changeStatus(entry));
      }
      const valid = spawnSync(process.execPath, [validator, "--state-root", stateRoot], { encoding: "utf8" });
      assert.equal(valid.status, 0, valid.stdout + valid.stderr);
      await writeJson(join(changeRoot(stateRoot, second), ".status.json"), changeStatus({ ...second, project_id: "demo-api" }));
      const invalid = spawnSync(process.execPath, [validator, "--state-root", stateRoot], { encoding: "utf8" });
      assert.equal(invalid.status, 1);
      assert.match(invalid.stdout + invalid.stderr, /identity\/location mismatch/);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("accepts digest-bound batch approval and rejects missing global environment confirmation", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-approval-"));
    try {
      const { entry, approvalPath } = await createApprovedState(stateRoot);
      const args = [validator, "--state-root", stateRoot, "--stage", "pre-execute", "--scope", "project", "--project", String(entry.project_id), "--change", entry.change];
      const valid = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(valid.status, 0, valid.stdout + valid.stderr);
      const approval = JSON.parse(await readFile(approvalPath, "utf8"));
      approval.confirmed_global_environment_keys = [];
      await writeJson(approvalPath, approval);
      const invalid = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(invalid.status, 1);
      assert.match(invalid.stdout + invalid.stderr, /global environment keys mismatch/);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("blocks fresh mode when existing target state is present or unknown", async () => {
    for (const existingState of ["present", "unknown"]) {
      const stateRoot = await mkdtemp(join(tmpdir(), `speculo-ops-fresh-${existingState}-`));
      try {
        const { entry } = await createApprovedState(stateRoot, { operation_mode: "fresh", existing_state: existingState });
        const result = spawnSync(process.execPath, [validator, "--state-root", stateRoot, "--stage", "pre-execute", "--scope", "project", "--project", String(entry.project_id), "--change", entry.change], { encoding: "utf8" });
        assert.equal(result.status, 1);
        assert.match(result.stdout + result.stderr, /fresh/i);
      } finally {
        await rm(stateRoot, { recursive: true, force: true });
      }
    }
  });

  it("rejects target-profile digest drift and ordered identity mismatch", async () => {
    const driftRoot = await mkdtemp(join(tmpdir(), "speculo-ops-profile-drift-"));
    try {
      const { entry, root } = await createApprovedState(driftRoot);
      const profilePath = join(root, "deployment", "target-profile.json");
      const profile = JSON.parse(await readFile(profilePath, "utf8")) as Record<string, unknown>;
      (profile.differences as unknown[]).push({ id: "DF002", target: "compose files", classification: "unknown", evidence: ["late observation"] });
      await writeJson(profilePath, profile);
      const result = spawnSync(process.execPath, [validator, "--state-root", driftRoot, "--stage", "pre-execute", "--scope", "project", "--project", projectId, "--change", entry.change], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /target[_ ]profile.*(?:stale|digest)|digest.*target[_ ]profile/i);
    } finally {
      await rm(driftRoot, { recursive: true, force: true });
    }

    const identityRoot = await mkdtemp(join(tmpdir(), "speculo-ops-identity-order-"));
    try {
      const { root } = await createCompletedIterativeState(identityRoot);
      const statePath = join(root, "execution", "attempts", "ATTEMPT-002", "verification-state.json");
      const state = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;
      const identity = (state.identity_results as Array<Record<string, unknown>>).find((item) => item.assertion_id === "ID002");
      assert.ok(identity);
      identity.actual = [...identity.actual as string[]].reverse();
      await updateVerificationDigest(root, "ATTEMPT-002", state);
      const result = spawnSync(process.execPath, [validator, "--state-root", identityRoot, "--stage", "pre-close", "--scope", "project", "--project", projectId, "--change", change], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /identity|ordered-list/i);
    } finally {
      await rm(identityRoot, { recursive: true, force: true });
    }
  });

  it("rejects production data mutation with a waiver or without a verified backup", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-production-data-"));
    try {
      const { entry, root } = await createApprovedState(stateRoot);
      const planPath = join(root, "plan", "plan-001.json");
      const plan = JSON.parse(await readFile(planPath, "utf8")) as Record<string, unknown>;
      const protection = (plan.data_protection as Array<Record<string, unknown>>)[0];
      protection.strategy = "waiver";
      protection.backup = null;
      protection.waiver = { decision_ref: "decision://operator/production-waiver", exact_scope: "demo-production", object_identity_verified: true, conflicts_absent: true, recovery_mode: "forward-only" };
      await bindPlan(root, entry, plan, 1);
      const args = [validator, "--state-root", stateRoot, "--stage", "pre-execute", "--scope", "project", "--project", projectId, "--change", change];
      const waived = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(waived.status, 1);
      assert.match(waived.stdout + waived.stderr, /production.*waiver|waiver.*production/i);

      protection.strategy = "verified-backup";
      protection.waiver = null;
      await bindPlan(root, entry, plan, 1);
      const missing = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(missing.status, 1);
      assert.match(missing.stdout + missing.stderr, /backup/i);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("rejects out-of-order gates and new operations after a failed gate", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-journal-order-"));
    try {
      const { root } = await createCompletedIterativeState(stateRoot);
      const successJournal = join(root, "execution", "attempts", "ATTEMPT-002", "journal.jsonl");
      const originalSuccess = await readFile(successJournal, "utf8");
      const events = originalSuccess.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
      const firstGate = events.findIndex((event) => event.gate_id === "G01");
      const secondGate = events.findIndex((event) => event.gate_id === "G02");
      [events[firstGate], events[secondGate]] = [events[secondGate], events[firstGate]];
      events.forEach((event, index) => { event.sequence = index + 1; });
      await writeFile(successJournal, events.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
      let result = spawnSync(process.execPath, [validator, "--state-root", stateRoot], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /gate|journal.*order/i);
      await writeFile(successJournal, originalSuccess, "utf8");

      const failedJournal = join(root, "execution", "attempts", "ATTEMPT-001", "journal.jsonl");
      const failedEvents = (await readFile(failedJournal, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
      failedEvents.splice(failedEvents.length - 1, 0, journalEvent(1, "operation-intent", { batch_id: "B02", operation_id: "OP002", summary: "illegal retry after failed gate" }));
      failedEvents.forEach((event, index) => { event.sequence = index + 1; });
      await writeFile(failedJournal, failedEvents.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
      result = spawnSync(process.execPath, [validator, "--state-root", stateRoot], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /after.*(?:failed|terminal)|failed.*operation|journal/i);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("rejects wrong business semantics, insufficient stability, and secret-bearing handoff", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-verification-"));
    try {
      const { root } = await createCompletedIterativeState(stateRoot);
      const statePath = join(root, "execution", "attempts", "ATTEMPT-002", "verification-state.json");
      const state = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;
      const health = (state.probes as Array<Record<string, unknown>>).find((probe) => probe.verification_id === "VR002");
      assert.ok(health);
      health.business_code = "ERROR";
      health.consecutive_successes = 1;
      await updateVerificationDigest(root, "ATTEMPT-002", state);
      const args = [validator, "--state-root", stateRoot, "--stage", "pre-close", "--scope", "project", "--project", projectId, "--change", change];
      let result = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /business|consecutive|stability/i);

      const cleanState = verificationStateValue(projectEntry(), "ATTEMPT-002", JSON.parse(await readFile(join(root, "deployment", "target-profile.json"), "utf8")), JSON.parse(await readFile(join(root, "plan", "plan-002.json"), "utf8")), "passed");
      await updateVerificationDigest(root, "ATTEMPT-002", cleanState);
      await writeFile(join(root, "execution", "attempts", "ATTEMPT-002", "HANDOFF.md"), handoffText(projectEntry(), "ATTEMPT-002") + "\nDATABASE_PASSWORD=super-secret-value\n", "utf8");
      result = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /HANDOFF|secret|sensitive/i);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("blocks legacy plan v2 at pre-execute while preserving legacy archived evidence", async () => {
    const activeRoot = await mkdtemp(join(tmpdir(), "speculo-ops-legacy-active-"));
    try {
      const { entry, root } = await createApprovedState(activeRoot);
      const current = JSON.parse(await readFile(join(root, "plan", "plan-001.json"), "utf8")) as Record<string, unknown>;
      await bindPlan(root, entry, legacyPlanV2(current), 1);
      const result = spawnSync(process.execPath, [validator, "--state-root", activeRoot, "--stage", "pre-execute", "--scope", "project", "--project", projectId, "--change", change], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /legacy|plan v3|schema.*3/i);
    } finally {
      await rm(activeRoot, { recursive: true, force: true });
    }

    const archivedState = await mkdtemp(join(tmpdir(), "speculo-ops-legacy-archive-"));
    try {
      const { entry, root } = await createApprovedState(archivedState);
      const current = JSON.parse(await readFile(join(root, "plan", "plan-001.json"), "utf8")) as Record<string, unknown>;
      const legacy = legacyPlanV2(current);
      await bindPlan(root, entry, legacy, 1);
      await writeLegacyAttempt(root, entry, legacy);
      await writeJson(join(root, ".status.json"), changeStatus(entry, {
        change_status: "archived",
        phase: "archived",
        works_run: ["ops/intake-and-assess", "ops/plan-and-approve", "ops/execute-and-stabilize", "ops/archive-and-learn"],
        completed_at: "2026-08-31T23:10:00.000Z",
        archived_at: "2026-09-01T00:00:00.000Z",
        archive_path: `<Path>{roots.state}/ops/projects/${projectId}/archive/2026-09/${change}</Path>`,
        source_revision: sourceRevision,
        target_fingerprint: targetFingerprint,
        plan_path: "plan/plan-001.json",
        plan_digest: digestJson(legacy),
        approval_path: "plan/approval-001.json",
        approval_status: "approved",
        approved_batches: ["B01", "B02"],
        latest_attempt_id: "ATTEMPT-001",
        outcome: "succeeded",
      }));
      const destination = join(archivedState, "projects", projectId, "archive", "2026-09", change);
      await mkdir(dirname(destination), { recursive: true });
      await rename(root, destination);
      await writeJson(join(archivedState, "status.json"), { schema_version: 2, workflow: "ops", active: [], archived: [entry] });
      const result = spawnSync(process.execPath, [validator, "--state-root", archivedState], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(archivedState, { recursive: true, force: true });
    }
  });

  it("preserves failed attempts, validates a remediation plan, and closes into project/global knowledge", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "speculo-ops-close-"));
    try {
      const { entry, root } = await createCompletedIterativeState(stateRoot);
      const preClose = spawnSync(process.execPath, [validator, "--state-root", stateRoot, "--stage", "pre-close", "--scope", "project", "--project", projectId, "--change", change], { encoding: "utf8" });
      assert.equal(preClose.status, 0, preClose.stdout + preClose.stderr);

      await writeFile(join(root, "RETROSPECTIVE.md"), retrospective(), "utf8");
      const projectRunbook = "# Demo API deployment\n\nLast verified: 2026-09-01\n";
      const globalContext = "# Docker runtime\n\nUse the verified local Docker context.\n";
      await mkdir(join(root, "promotion", "staging"), { recursive: true });
      await writeFile(join(root, "promotion", "plan.md"), "# Promotion Plan\n", "utf8");
      await writeFile(join(root, "promotion", "staging", "project-runbook.md"), projectRunbook, "utf8");
      await writeFile(join(root, "promotion", "staging", "global-docker.md"), globalContext, "utf8");
      const manifest = {
        schema_version: 1,
        artifact: "ops-promotion-manifest",
        scope: "project",
        project_id: projectId,
        change,
        created_at: "2026-09-01T00:35:00.000Z",
        source_path: `projects/${projectId}/changes/${change}`,
        archive_path: `projects/${projectId}/archive/2026-09/${change}`,
        retrospective_path: "RETROSPECTIVE.md",
        writes: [
          { stable_key: "demo-api:production:systemd:api", knowledge_scope: "project-runbook", action: "create", staging_path: "promotion/staging/project-runbook.md", target_path: `projects/${projectId}/runbooks/deployment.md`, content_digest: digestText(projectRunbook), expected_target_digest: null, evidence: ["execution/attempts/ATTEMPT-002/verification.md"] },
          { stable_key: "docker:local-context", knowledge_scope: "global-context", action: "create", staging_path: "promotion/staging/global-docker.md", target_path: "context/docker-runtime.md", content_digest: digestText(globalContext), expected_target_digest: null, evidence: ["inventory/snapshots/20260901T000000Z.json"] },
        ],
        archive_only: ["execution/attempts/ATTEMPT-001/journal.jsonl"],
        summary: "Promote the verified project SOP and reusable Docker context.",
      };
      await writeJson(join(root, "promotion", "manifest.json"), manifest);
      const preArchive = spawnSync(process.execPath, [validator, "--state-root", stateRoot, "--stage", "pre-archive", "--scope", "project", "--project", projectId, "--change", change], { encoding: "utf8" });
      assert.equal(preArchive.status, 0, preArchive.stdout + preArchive.stderr);

      const dryRun = spawnSync(process.execPath, [closer, "--state-root", stateRoot, "--scope", "project", "--project", projectId, "--change", change], { encoding: "utf8" });
      assert.equal(dryRun.status, 0, dryRun.stdout + dryRun.stderr);
      assert.equal(await readFile(join(root, ".status.json"), "utf8").then((text) => JSON.parse(text).change_status), "completed");
      const manifestDigest = digestJson(manifest);
      await writeJson(join(root, "promotion", "approval.json"), { schema_version: 1, artifact: "ops-promotion-approval", scope: "project", project_id: projectId, change, manifest_path: "promotion/manifest.json", manifest_digest: manifestDigest, decision: "approved", decision_summary: "Approved both knowledge writes and project archive.", decided_at: "2026-09-01T00:40:00.000Z" });
      await writeFile(join(root, "promotion", "staging", "project-runbook.md"), projectRunbook + "drift\n", "utf8");
      const drifted = spawnSync(process.execPath, [closer, "--state-root", stateRoot, "--scope", "project", "--project", projectId, "--change", change, "--apply", "--expected-digest", manifestDigest], { encoding: "utf8" });
      assert.equal(drifted.status, 1);
      assert.match(drifted.stdout + drifted.stderr, /staging digest mismatch/);
      assert.equal(JSON.parse(await readFile(join(root, ".status.json"), "utf8")).change_status, "completed");
      await writeFile(join(root, "promotion", "staging", "project-runbook.md"), projectRunbook, "utf8");
      const applied = spawnSync(process.execPath, [closer, "--state-root", stateRoot, "--scope", "project", "--project", projectId, "--change", change, "--apply", "--expected-digest", manifestDigest], { encoding: "utf8" });
      assert.equal(applied.status, 0, applied.stdout + applied.stderr);
      assert.equal(await readFile(join(stateRoot, "projects", projectId, "runbooks", "deployment.md"), "utf8"), projectRunbook);
      assert.equal(await readFile(join(stateRoot, "context", "docker-runtime.md"), "utf8"), globalContext);
      const complete = spawnSync(process.execPath, [validator, "--state-root", stateRoot, "--stage", "complete", "--scope", "project", "--project", projectId, "--change", change], { encoding: "utf8" });
      assert.equal(complete.status, 0, complete.stdout + complete.stderr);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("preserves nested project state on refresh and blocks corrupt v2 state before replacement", async () => {
    const target = await mkdtemp(join(tmpdir(), "speculo-ops-refresh-"));
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["ops"] } });
      const stateRoot = join(target, "speculo", ".speculo", "ops");
      const entry = projectEntry();
      const root = changeRoot(stateRoot, entry);
      await writeJson(join(stateRoot, "status.json"), { schema_version: 2, workflow: "ops", active: [entry], archived: [] });
      await writeJson(join(stateRoot, "projects", projectId, "project.json"), projectValue());
      await writeJson(join(root, ".status.json"), changeStatus(entry));
      await writeFile(join(root, "request.md"), "preserve exactly\n", "utf8");
      await mkdir(join(stateRoot, "projects", projectId, "context"), { recursive: true });
      await writeFile(join(stateRoot, "projects", projectId, "context", "known.md"), "opaque project knowledge\n", "utf8");

      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["ops"] } });
      assert.equal(await readFile(join(root, "request.md"), "utf8"), "preserve exactly\n");
      assert.equal(await readFile(join(stateRoot, "projects", projectId, "context", "known.md"), "utf8"), "opaque project knowledge\n");

      await writeJson(join(root, ".status.json"), changeStatus(entry, { schema_version: 99 }));
      await assert.rejects(
        initSpeculo(target, { packageRoot, selection: { workflowIds: ["ops"] } }),
        (error: unknown) => error instanceof RefreshBlockedError && error.blockers.some((blocker) => blocker.code === "structured-state-conflict"),
      );
      assert.equal((JSON.parse(await readFile(join(root, ".status.json"), "utf8")) as { schema_version: number }).schema_version, 99);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
