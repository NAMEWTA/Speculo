/** Digest-bound approval, target receipts, fail-closed resume and dual documentation delivery. */
import { closeSync, existsSync, fsyncSync, openSync, readdirSync, readFileSync, writeSync } from "node:fs";
import { dirname, join, relative as pathRelative } from "node:path";
import { fileURLToPath } from "node:url";
import { posix, win32 } from "node:path";
import {
  atomicWrite, canonical, digest, now, noSymlinks, OpsError, privateDir, readJson,
  relative, resolveSecrets, secure, UnknownResult, withLock, writeJson,
} from "./core.mjs";
import { load, save, ledgerLoad, validate, validateStatus } from "./model.mjs";
import { locatePlan, envFile, sliceDigest } from "./planner.mjs";
import { call as transportCall, hostTransportDigest } from "./transport.mjs";
import { deliveryBundle } from "./docs.mjs";

const COMMON = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function defaultEngineDigest() {
  const opslib = join(COMMON, "tools", "opslib");
  const schemas = join(COMMON, "schemas");
  const files = [
    ...readdirSync(opslib).filter((n) => n.endsWith(".mjs")).map((n) => join(opslib, n)),
    ...readdirSync(schemas).filter((n) => n.endsWith(".json")).map((n) => join(schemas, n)),
  ].sort();
  const map = {};
  for (const p of files) map[pathRelative(COMMON, p)] = digest(readFileSync(p));
  return digest(map);
}

export const executionHooks = { call: transportCall, engineDigest: defaultEngineDigest };
export function engineDigest() { return executionHooks.engineDigest(); }
export function call(...args) { return executionHooks.call(...args); }

export function approval(state, run, expected, by, statement) {
  const path = locatePlan(state, run);
  const plan = readJson(path);
  validate(plan, "plan");
  if (digest(plan) !== expected) throw new OpsError("approval digest mismatch: reread the full plan report");
  if (!by.trim() || statement.trim().length < 8) throw new OpsError("approval needs identified approver and a meaningful explicit confirmation statement");
  if (Date.now() >= Date.parse(plan.expires_at.replace("Z", "+00:00"))) throw new OpsError("plan expired; replan");
  const value = {
    schema_version: 1, artifact: "ops-plan-approval", run_id: plan.run_id, plan_digest: expected,
    approved_by: by, approved_at: now(), decision: "approved", statement,
  };
  validate(value, "approval");
  return withLock(join(state, ".locks", "catalog"), { operation: "approve", run_id: plan.run_id }, () => {
    if (sliceDigest(load(state), plan.registry_scope) !== plan.registry_slice_digest) throw new OpsError("touched catalog slice drifted since plan; replan before approval");
    writeJson(join(dirname(path), "approval.json"), value, { exclusive: true });
    return { run_id: plan.run_id, status: "approved", plan_digest: expected };
  });
}

export function journal(folder, event) {
  const path = join(folder, "journal.jsonl");
  noSymlinks(path);
  privateDir(dirname(path));
  let previous = "0".repeat(64);
  let seq = 1;
  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean)) {
      const old = JSON.parse(line);
      seq = old.sequence + 1;
      previous = old.event_digest;
    }
  }
  const value = { sequence: seq, at: now(), previous_digest: previous, ...event };
  value.event_digest = digest(value);
  const fd = openSync(path, "a", 0o600);
  try {
    writeSync(fd, canonical(value));
    writeSync(fd, "\n");
    fsyncSync(fd);
  } finally { closeSync(fd); }
  secure(path);
}

export function verifyJournal(path) {
  let previous = "0".repeat(64);
  let expected = 1;
  if (!existsSync(path)) return { events: 0 };
  for (const line of readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.length)) {
    const v = JSON.parse(line);
    const claimed = v.event_digest;
    delete v.event_digest;
    if (v.sequence !== expected || v.previous_digest !== previous || digest(v) !== claimed) throw new OpsError("journal integrity mismatch");
    previous = claimed;
    expected += 1;
  }
  return { events: expected - 1, last_digest: previous };
}

export function requestBase(plan, hid, ledger) {
  const values = [];
  for (const ref of Object.keys(plan.credential_versions)) {
    const [cid, v] = ref.split("@");
    values.push(...Object.values(ledger.entries[cid][v].values));
  }
  return {
    host_id: hid, root: plan.hosts[hid].root, controller_id: plan.controller_id, run_id: plan.run_id,
    plan_digest: digest(plan), adopt_root: (plan.allow_adopt_roots || []).includes(hid),
    external_files: plan.external_files[hid] || [],
    strict_docker_root: plan.registry_after.policies.strict_docker_root, secrets: values,
  };
}

export function resolvedOp(operation, ledger) {
  const op = resolveSecrets(structuredClone(operation), ledger);
  if (op.kind === "write") {
    if ("json_values" in operation) op.content = JSON.stringify(resolveSecrets(operation.json_values, ledger), null, 2) + "\n";
    delete op.json_values;
    if ("env_values" in operation) {
      op.content = envFile(resolveSecrets(operation.env_values, ledger), { systemd: operation.env_format === "systemd" });
    }
    if ("content" in op) {
      op.content_b64 = Buffer.from(op.content).toString("base64");
      delete op.content;
    }
    delete op.env_values;
    delete op.env_format;
  }
  return op;
}

export function commitObservations(state, current, plan, execution) {
  const result = structuredClone(current);
  const desired = plan.registry_after;
  const records = execution.steps;
  const scope = plan.registry_scope || {};
  if (scope.policies) result.policies = structuredClone(desired.policies);
  for (const hid of scope.hosts || []) {
    if (desired.hosts?.[hid]) result.hosts[hid] = structuredClone(desired.hosts[hid]);
    else delete result.hosts[hid];
  }
  for (const pid of scope.projects || []) {
    if (desired.projects?.[pid]) result.projects[pid] = structuredClone(desired.projects[pid]);
    else delete result.projects[pid];
  }
  if (scope.public_ingress) result.public_ingress = structuredClone(desired.public_ingress ?? null);
  const deploymentIds = new Set([...(scope.deployments || []), ...plan.document_targets]);
  for (const did of deploymentIds) {
    let proposed = desired.deployments?.[did] ? structuredClone(desired.deployments[did]) : null;
    const old = current.deployments[did];
    const ops = plan.operations.filter((o) => o.deployment_id === did);
    const statuses = ops.map((o) => records[o.step_id]?.status ?? "not-started");
    const changing = ops.length > 0;
    if (!proposed && !old) continue;
    if (changing && statuses.every((x) => x === "succeeded")) {
      proposed.status = proposed.status === "retired" ? "retired" : "docs_pending";
      proposed.observed_version = proposed.version;
      proposed.installed_at = proposed.installed_at || now();
      proposed.updated_at = now();
    } else if (changing) {
      proposed.status = statuses.includes("unknown") ? "unknown" : (statuses.includes("failed") ? "failed" : "planned");
      proposed.observed_version = old ? old.observed_version : null;
      proposed.notes.push("本次发布未完成；配置/数据可能部分变更。计划版本不是已验证运行版本。不得盲目重跑。");
    } else if (old) proposed = structuredClone(old);
    else { proposed.status = "planned"; proposed.observed_version = null; }
    result.deployments[did] = proposed;
  }
  for (const aid of scope.allocations || []) {
    const a = desired.allocations?.[aid];
    if (!a) continue;
    if (aid in current.allocations && current.allocations[aid].status !== "planned") {
      result.allocations[aid] = structuredClone(current.allocations[aid]);
      continue;
    }
    const item = structuredClone(a);
    const provisioning = plan.operations.filter((o) => o.allocation_id === aid);
    item.status = provisioning.length && provisioning.every((o) => records[o.step_id]?.status === "succeeded") ? "active" : "planned";
    result.allocations[aid] = item;
  }
  for (const bid of scope.bindings || []) {
    const b = desired.bindings?.[bid];
    if (!b) continue;
    const item = structuredClone(b);
    const consumer = result.deployments[b.consumer_deployment_id];
    if (item.status === "active" && (!consumer || ["planned", "failed", "unknown"].includes(consumer.status))) item.status = "planned";
    if (item.mode === "shared" && result.allocations[item.allocation_id]?.status !== "active" && item.status === "active") item.status = "planned";
    result.bindings[bid] = item;
  }
  result.releases[plan.run_id] = {
    run_id: plan.run_id, worker: plan.worker, status: execution.status,
    plan_path: pathRelative(state, execution.plan_path),
    host_ids: Object.keys(plan.hosts).sort(), deployment_ids: plan.document_targets, updated_at: now(),
    results: Object.fromEntries(Object.entries(records).map(([sid, v]) => [sid, { status: v.status, at: v.at }])),
  };
  save(state, result);
  execution.committed_registry_digest = digest(result);
  execution.committed_slice_digest = sliceDigest(result, plan.registry_scope);
  return result;
}

function mirrorConfiguration(state, plan, execution, ledger) {
  for (const original of plan.operations) {
    if (original.kind !== "write" || !original.deployment_id || execution.steps[original.step_id]?.status !== "succeeded") continue;
    const dep = plan.registry_after.deployments[original.deployment_id];
    const h = plan.hosts[dep.host_id];
    const adapter = h.platform === "windows" ? win32 : posix;
    let rel;
    try {
      rel = adapter.relative(dep.root, original.path).replaceAll("\\", "/");
      if (!rel || rel.startsWith("..") || adapter.isAbsolute(rel)) continue;
    } catch { continue; }
    if (!["env", "compose", "config", "service", "scripts"].includes(rel.split("/")[0])) continue;
    const op = resolvedOp(original, ledger);
    const dest = join(state, "hosts", dep.host_id, "deployments", dep.deployment_id, "server-files", relative(rel));
    const bytes = Buffer.from(op.content_b64, "base64");
    atomicWrite(dest, bytes);
    if (digest(readFileSync(dest)) !== digest(bytes)) throw new OpsError("local configuration mirror readback mismatch");
  }
}

function deliver(state, folder, plan, status, execution, ledger) {
  const outbox = join(folder, "outbox.json");
  const eligible = plan.document_targets.filter((did) => !["planned", "failed", "unknown"].includes(status.deployments[did].status));
  if (!existsSync(outbox)) {
    const documentStatus = structuredClone(status);
    for (const did of eligible) {
      if (documentStatus.deployments[did].status === "docs_pending") documentStatus.deployments[did].status = "completed";
    }
    writeJson(outbox, deliveryBundle(state, plan, documentStatus, ledger, eligible), { exclusive: true });
  }
  const bundle = readJson(outbox);
  if (bundle.plan_digest !== digest(plan)) throw new OpsError("outbox does not belong to approved plan");
  for (const item of bundle.local) {
    const path = join(state, relative(item.path));
    if (item.path === "knowledge/INDEX.md" && existsSync(path)) continue;
    atomicWrite(path, item.content);
    if (digest(readFileSync(path)) !== item.sha256) throw new OpsError("local document readback mismatch");
    bundle.acks["local:" + item.path] = { sha256: item.sha256, verified_at: now() };
  }
  writeJson(outbox, bundle);
  mirrorConfiguration(state, plan, execution, ledger);
  for (const item of bundle.remote) {
    const hid = item.host_id;
    const base = requestBase(plan, hid, ledger);
    const step = "docs-" + digest(Buffer.from(hid + ":" + item.path)).slice(0, 24);
    const op = { step_id: step, kind: "write", path: item.path, content_b64: Buffer.from(item.content).toString("base64"), mode: 0o600, expected: item.expected };
    const result = call(plan.hosts[hid], { ...base, action: "step", operation: op, operation_digest: digest(op) });
    if (result.status !== "succeeded") throw new OpsError("target document write did not complete: " + item.path + " / " + result.status);
    const observed = call(plan.hosts[hid], { action: "snapshot", paths: [item.path] }).paths[item.path];
    if (observed.sha256 !== item.sha256) throw new OpsError("target document readback mismatch: " + item.path);
    if (plan.hosts[hid].platform !== "windows" && (observed.mode & 0o077)) throw new OpsError("target plaintext documentation mode is too broad");
    bundle.acks["remote:" + hid + ":" + item.path] = { sha256: item.sha256, verified_at: now() };
    writeJson(outbox, bundle);
  }
  const receipt = { schema_version: 1, run_id: plan.run_id, plan_digest: digest(plan), completed_at: now(), documents: bundle.acks, status: "both-sides-verified" };
  writeJson(join(folder, "docs-receipt.json"), receipt);
  for (const did of eligible) {
    const dep = status.deployments[did];
    writeJson(join(state, "hosts", dep.host_id, "deployments", did, "docs-receipt.json"), receipt);
  }
  return receipt;
}

export function apply(state, run, { resume = false, docsOnly = false } = {}) {
  const path = locatePlan(state, run);
  const folder = dirname(path);
  const plan = readJson(path);
  validate(plan, "plan");
  const approved = readJson(join(folder, "approval.json"));
  validate(approved, "approval");
  if (approved.plan_digest !== digest(plan) || approved.run_id !== plan.run_id) throw new OpsError("plan differs from approval");
  if (plan.engine_digest !== engineDigest()) throw new OpsError("executor/schema code changed after planning; replan with this implementation");
  const execPath = join(folder, "execution.json");
  if (existsSync(execPath) && !(resume || docsOnly)) throw new OpsError("run already started; use resume or docs-sync, never a blind second apply");
  if (!existsSync(execPath) && Date.now() >= Date.parse(plan.expires_at.replace("Z", "+00:00"))) {
    throw new OpsError("approved plan expired before first execution");
  }
  return withLock(join(state, ".locks", "catalog"), { operation: "apply", run_id: plan.run_id }, () => {
    let current = load(state);
    const ledger = ledgerLoad(state);
    const execution = existsSync(execPath)
      ? readJson(execPath)
      : { schema_version: 1, run_id: plan.run_id, plan_path: path, status: "executing", started_at: now(), steps: {}, errors: [], committed_registry_digest: null, committed_slice_digest: null };
    const expectedSlice = execution.committed_slice_digest || plan.registry_slice_digest;
    if (!plan.registry_scope || !plan.registry_slice_digest) throw new OpsError("plan missing registry_scope; compile a new plan");
    if (sliceDigest(current, plan.registry_scope) !== expectedSlice) throw new OpsError("controller registry changed since this approved run; compile a new plan");
    if (execution.status === "completed") return { run_id: plan.run_id, status: "completed", unchanged: true, report: join(folder, "RESULT.md") };
    verifyJournal(join(folder, "journal.jsonl"));
    for (const [hid, h] of Object.entries(plan.hosts)) {
      if (hostTransportDigest(h) !== plan.transport_digests[hid]) throw new OpsError("SSH connection/known_hosts changed since approval");
    }
    for (const [ref, wanted] of Object.entries(plan.credential_versions)) {
      const [cid, v] = ref.split("@");
      if (digest(ledger.entries?.[cid]?.[v]) !== wanted) throw new OpsError("credential version changed/missing since approval: " + ref);
    }
    const locked = [];
    let unknown = false;
    let operationFailed = false;
    let docError = null;
    let original = null;
    writeJson(execPath, execution);
    journal(folder, { kind: "attempt-start", run_id: plan.run_id, resume, docs_only: docsOnly });
    try {
      for (const [hid, h] of Object.entries(plan.hosts)) {
        call(h, { ...requestBase(plan, hid, ledger), action: "lock" });
        locked.push(hid);
      }
      if (!docsOnly) {
        for (original of plan.operations) {
          const sid = original.step_id;
          const previous = execution.steps[sid];
          if (previous && previous.status === "succeeded") continue;
          if (previous && previous.status === "failed") throw new OpsError("a terminal failed action needs a new recovery plan; failed actions are not replayed");
          const hid = original.host_id;
          const op = resolvedOp(original, ledger);
          journal(folder, { kind: "step-dispatch", step_id: sid, host_id: hid, operation_digest: digest(original) });
          const result = call(plan.hosts[hid], { ...requestBase(plan, hid, ledger), action: "step", operation: op, operation_digest: digest(original) }, { timeout: Math.max(1800, (op.timeout ?? 300) + 120) });
          execution.steps[sid] = result;
          writeJson(execPath, execution);
          journal(folder, { kind: "step-result", step_id: sid, status: result.status, receipt_digest: digest(result) });
          if (result.status !== "succeeded") {
            unknown = result.status === "unknown";
            operationFailed = true;
            break;
          }
        }
      } else if (plan.operations.some((o) => execution.steps[o.step_id]?.status !== "succeeded")) {
        throw new OpsError("docs-sync only retries documentation after all operation receipts succeeded");
      }
      const completeOps = plan.operations.every((o) => execution.steps[o.step_id]?.status === "succeeded");
      execution.status = unknown ? "unknown" : (completeOps ? "docs_pending" : "partial");
      if (!docsOnly || !execution.committed_registry_digest) {
        current = commitObservations(state, current, plan, execution);
        writeJson(execPath, execution);
      }
      if (completeOps) {
        try {
          deliver(state, folder, plan, current, execution, ledger);
          for (const did of plan.document_targets) {
            if (current.deployments[did].status === "docs_pending") current.deployments[did].status = "completed";
          }
          execution.status = "completed";
          current.releases[plan.run_id].status = "completed";
          current.releases[plan.run_id].updated_at = now();
          save(state, current);
          execution.committed_registry_digest = digest(current);
          execution.committed_slice_digest = sliceDigest(current, plan.registry_scope);
        } catch (e) {
          if (!(e instanceof OpsError || e.code)) throw e;
          execution.status = "docs_pending";
          docError = e.message || String(e);
          execution.errors.push({ phase: "documentation", at: now(), error: String(e.message || e) });
        }
      } else {
        for (const did of plan.document_targets) {
          const dep = current.deployments[did];
          writeJson(join(state, "hosts", dep.host_id, "deployments", did, "deployment.json"), dep);
        }
      }
    } catch (e) {
      if (e instanceof UnknownResult) {
        unknown = true;
        execution.status = "unknown";
        execution.errors.push({ phase: "transport", error: e.message, at: now() });
        if (!execution.committed_registry_digest) {
          if (original && !(original.step_id in execution.steps)) {
            execution.steps[original.step_id] = { status: "unknown", at: now(), reason: "transport interrupted" };
          }
          current = commitObservations(state, current, plan, execution);
        }
      } else if (e instanceof OpsError || e.code || e instanceof TypeError) {
        execution.status = "failed";
        execution.errors.push({ phase: "execution", error: e.message || String(e), at: now() });
        if (!execution.committed_registry_digest) current = commitObservations(state, current, plan, execution);
      } else throw e;
    } finally {
      if (!unknown) {
        for (const hid of [...locked].reverse()) {
          try { call(plan.hosts[hid], { ...requestBase(plan, hid, ledger), action: "unlock" }); }
          catch (e) {
            if (e instanceof OpsError || e instanceof UnknownResult) {
              execution.errors.push({ phase: "unlock", host_id: hid, error: e.message, at: now() });
              if (execution.status === "completed") execution.status = "unknown";
            } else throw e;
          }
        }
      }
      execution.updated_at = now();
      if (plan.run_id in current.releases && current.releases[plan.run_id].status !== execution.status) {
        current.releases[plan.run_id].status = execution.status;
        save(state, current);
        execution.committed_registry_digest = digest(current);
        execution.committed_slice_digest = sliceDigest(current, plan.registry_scope);
      }
      writeJson(execPath, execution);
      journal(folder, { kind: "attempt-end", status: execution.status, errors: execution.errors.length });
      const resultMd = "# 执行结果 " + plan.run_id + "\n\n状态：" + execution.status + "\n\n"
        + Object.entries(execution.steps).map(([sid, v]) => `- ${sid}: ${v.status}`).join("\n")
        + "\n\n错误/未完成项：\n" + JSON.stringify(execution.errors, null, 2)
        + "\n\n双边文档验证仅在 docs-receipt.json 存在且内容为 both-sides-verified 时完成。业务数据不自动镜像到部署机。\n";
      atomicWrite(join(folder, "RESULT.md"), resultMd);
    }
    return { run_id: plan.run_id, status: execution.status, report: join(folder, "RESULT.md"), documentation_error: docError, errors: execution.errors };
  });
}
