/** One user-authorized task, frozen specifications, legacy digest-bound plans, no automatic retry. */
import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative as pathRelative, resolve } from "node:path";
import { atomicWrite, digest, exact, identifier, noSymlinks, now, OpsError, redact, withLock, writeJson } from "./core.mjs";
import { fileDigest, ids, readBoundedJson, readRegistry, route, statePath, targetDigest, containedPath } from "./workspace.mjs";

const DESTRUCTIVE_ACK = "I-APPROVE-THIS-EXACT-DESTRUCTIVE-TASK";
const MAX_INPUT_BYTES = 256 * 1024 * 1024;
const fields = new Set(["schema_version", "task_id", "title", "plan", "valid_for_hours", "scope", "input_paths", "steps"]);
const scopeFields = new Set(["scope", "server_ids", "project_ids", "related_project_ids", "allow_policy_changes", "allow_public_ingress", "allow_destructive"]);

async function runtime() {
  const [model, planner, execution] = await Promise.all([import("./model.mjs"), import("./planner.mjs"), import("./execution.mjs")]);
  return { ...model, compilePlan: planner.compilePlan, engineDigest: execution.engineDigest, approval: execution.approval, apply: execution.apply };
}
function taskFolder(state, taskId) { return join(statePath(state), "records", "tasks", identifier(taskId, "task_id")); }
function active(task, at = Date.now()) {
  if (!Number.isFinite(Date.parse(task.expires_at)) || at >= Date.parse(task.expires_at)) throw new OpsError("task authorization expired; form a new bounded task");
}
export { targetDigest } from "./workspace.mjs";
function allowedProjects(scope) { return new Set([...scope.project_ids, ...scope.related_project_ids]); }

export function validateRequest(request, registry) {
  exact(request, fields, fields, "task request");
  if (request.schema_version !== 1) throw new OpsError("task request schema_version must be 1");
  identifier(request.task_id, "task_id");
  if (typeof request.title !== "string" || request.title.trim().length < 3 || request.title.length > 200) throw new OpsError("task needs a meaningful title (3..200 characters)");
  if (typeof request.plan !== "string" || request.plan.trim().length < 40 || request.plan.length > 32000) throw new OpsError("task needs a detailed, already-disclosed Plan Mode description (40..32000 characters)");
  if (!Number.isInteger(request.valid_for_hours) || request.valid_for_hours < 1 || request.valid_for_hours > 24) throw new OpsError("valid_for_hours must be 1..24");
  const s = request.scope;
  exact(s, scopeFields, scopeFields, "task scope");
  if (!["server", "project"].includes(s.scope)) throw new OpsError("task execution covers H/D only; controller initialization and SSH enrollment retain their own entry");
  ids(s.server_ids, "server_ids");
  // A task may sequence several H steps and include explicitly named impact hosts;
  // the standalone H routing command still selects one primary server.
  route(registry, { scope: s.scope, server_ids: s.scope === "server" ? s.server_ids.slice(0, 1) : s.server_ids, project_ids: s.project_ids });
  for (const id of s.server_ids) if (!Object.hasOwn(registry.hosts, id)) throw new OpsError(`unknown task server: ${id}`);
  ids(s.related_project_ids, "related_project_ids");
  for (const id of s.related_project_ids) if (!Object.hasOwn(registry.projects, id) || s.project_ids.includes(id)) throw new OpsError("related projects must be distinct registered impact/dependency IDs");
  for (const key of ["allow_policy_changes", "allow_public_ingress", "allow_destructive"]) if (typeof s[key] !== "boolean") throw new OpsError(`${key} must be explicit boolean`);
  if (!Array.isArray(request.input_paths) || new Set(request.input_paths).size !== request.input_paths.length) throw new OpsError("input_paths must be distinct absolute files/directories");
  if (!Array.isArray(request.steps) || request.steps.length < 1 || request.steps.length > 20) throw new OpsError("task must contain 1..20 ordered steps");
  const seen = new Set();
  for (const step of request.steps) {
    exact(step, new Set(["id", "title", "spec"]), new Set(["id", "title", "spec"]), "task step");
    identifier(step.id, "step.id");
    if (seen.has(step.id)) throw new OpsError("duplicate task step ID");
    seen.add(step.id);
    if (typeof step.title !== "string" || !step.title.trim() || step.title.length > 200) throw new OpsError("step title must be 1..200 characters");
    assertSpecScope(step.spec, s, registry);
  }
  return request;
}

function inScopeDeployment(dep, scope, label) {
  if (!dep || !scope.server_ids.includes(dep.host_id) || !allowedProjects(scope).has(dep.project_id)) throw new OpsError(`deployment/consumer outside task scope: ${label}`);
}
export function assertSpecScope(spec, scope, registry) {
  if (!spec || typeof spec !== "object" || !["H", "D"].includes(spec.worker)) throw new OpsError("task step must use the existing H or D spec contract");
  if (spec.worker === "H" && (["deployments", "allocations", "bindings", "provision", "retire_deployments", "retire_bindings"].some((k) => (spec[k] || []).length) || (spec.resource_updates?.projects || []).length)) throw new OpsError("H cannot create or retire project resources; use a separate D step");
  if (spec.worker === "D" && ((spec.host_actions || []).length || (spec.resource_updates?.hosts || []).length || spec.public_ingress !== undefined)) throw new OpsError("D cannot configure server-level resources; use a separate H prerequisite step");
  if (scope.scope === "server" && spec.worker !== "H") throw new OpsError("server task cannot silently become project deployment; select D explicitly");
  if ((["migrate", "uninstall"].includes(spec.operation) || (spec.retire_deployments || []).length || (spec.host_actions || []).some((a) => a.kind === "purge-quarantine")) && !scope.allow_destructive) {
    throw new OpsError("destructive/migration scope not authorized");
  }
  if (spec.plaintext_documentation !== undefined && spec.plaintext_documentation !== registry.policies.plaintext_documentation && !scope.allow_policy_changes) throw new OpsError("policy change outside task scope");
  if (spec.public_ingress !== undefined && digest(spec.public_ingress) !== digest(registry.public_ingress ?? null) && !scope.allow_public_ingress) throw new OpsError("public ingress change outside task scope");
  const projects = allowedProjects(scope);
  const deployments = { ...registry.deployments, ...Object.fromEntries((spec.deployments || []).map((d) => [d.deployment_id, d])) };
  const checkHost = (id) => { if (!scope.server_ids.includes(id)) throw new OpsError(`server outside task scope: ${id}`); };
  for (const id of spec.hosts || []) checkHost(id);
  for (const h of spec.resource_updates?.hosts || []) {
    checkHost(h.host_id);
    if (targetDigest(h) !== targetDigest(registry.hosts[h.host_id])) throw new OpsError("connection/identity/root changes belong to a new S task, not delegated H/D approval");
  }
  for (const action of spec.host_actions || []) checkHost(action.host_id);
  for (const d of spec.deployments || []) inScopeDeployment(d, scope, d.deployment_id);
  for (const p of spec.resource_updates?.projects || []) if (!projects.has(p.project_id)) throw new OpsError(`project outside task scope: ${p.project_id}`);
  for (const id of [...(spec.retire_deployments || []), ...(spec.acknowledged_consumers || [])]) inScopeDeployment(deployments[id], scope, id);
  // Inspect resource references, not arbitrary project JSON/env keys named host_id.
  const ingressHosts = (v) => {
    if (Array.isArray(v)) for (const x of v) ingressHosts(x);
    else if (v && typeof v === "object") for (const [key, x] of Object.entries(v)) {
      if ((key === "host_id" || key.endsWith("_host_id")) && typeof x === "string") checkHost(x);
      else ingressHosts(x);
    }
  };
  ingressHosts(spec.public_ingress);
  const allocations = { ...registry.allocations, ...Object.fromEntries((spec.allocations || []).map((a) => [a.allocation_id, a])) };
  const bindings = { ...registry.bindings, ...Object.fromEntries((spec.bindings || []).map((b) => [b.binding_id, b])) };
  const allocation = (id) => {
    const a = allocations[id];
    if (!a || !projects.has(a.owner_project_id) || (a.shared_owners || []).some((p) => !projects.has(p))) throw new OpsError(`allocation owner outside task scope: ${id}`);
    inScopeDeployment(deployments[a.provider_deployment_id], scope, a.provider_deployment_id);
  };
  const binding = (id) => {
    const b = bindings[id];
    if (!b) throw new OpsError(`unknown binding: ${id}`);
    inScopeDeployment(deployments[b.consumer_deployment_id], scope, b.consumer_deployment_id);
    if (b.provider_deployment_id) inScopeDeployment(deployments[b.provider_deployment_id], scope, b.provider_deployment_id);
    if (b.allocation_id) allocation(b.allocation_id);
  };
  for (const a of spec.allocations || []) allocation(a.allocation_id);
  for (const p of spec.provision || []) allocation(p.allocation_id);
  for (const b of spec.bindings || []) binding(b.binding_id);
  for (const id of spec.retire_bindings || []) binding(id);
  // Include known dependency/impact closure before the planner performs remote reads.
  const touched = new Set([...(spec.deployments || []).map((d) => d.deployment_id), ...(spec.retire_deployments || [])]);
  const hostActions = new Set((spec.host_actions || []).map((a) => a.host_id));
  for (const d of Object.values(registry.deployments)) if (hostActions.has(d.host_id) && d.status !== "retired") touched.add(d.deployment_id);
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of Object.values({ ...registry.bindings, ...Object.fromEntries((spec.bindings || []).map((b) => [b.binding_id, b])) })) {
      if (b.status === "retired" || (!touched.has(b.consumer_deployment_id) && !touched.has(b.provider_deployment_id))) continue;
      for (const id of [b.consumer_deployment_id, b.provider_deployment_id].filter(Boolean)) if (!touched.has(id)) { touched.add(id); changed = true; }
    }
  }
  for (const id of touched) inScopeDeployment(deployments[id], scope, id);
}

export function pinInputs(paths) {
  const files = {};
  let bytes = 0;
  const walk = (p) => {
    noSymlinks(p, { allowMissing: false });
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p).sort()) walk(join(p, name));
    } else if (st.isFile()) {
      if (Object.hasOwn(files, p)) return;
      bytes += st.size;
      if (Object.keys(files).length >= 10000 || bytes > MAX_INPUT_BYTES) throw new OpsError("task inputs exceed 10000 files/256 MiB; use a reviewed bounded artifact tree");
      files[p] = fileDigest(p);
    } else throw new OpsError("task input must be a regular file or directory");
  };
  for (const p of paths) {
    if (typeof p !== "string" || !isAbsolute(p) || p.split(/[\\/]/).includes("..")) throw new OpsError("task input paths must be absolute without traversal");
    walk(resolve(p));
  }
  return files;
}

function markdown(task) {
  return `# ${redact(task.request.title, [])}\n\n` +
    `任务：\`${task.request.task_id}\`；控制端：\`${task.controller_id}\`；有效期：${task.expires_at}。\n\n` +
    `范围：${task.request.scope.scope}；服务器：${task.request.scope.server_ids.join(", ")}；项目：${task.request.scope.project_ids.join(", ") || "无"}；影响/依赖项目：${task.request.scope.related_project_ids.join(", ") || "无"}。\n\n` +
    `## Plan Mode\n\n${redact(task.request.plan, [])}\n\n` +
    `## 固定顺序与精确规格\n\n` + task.request.steps.map((s, i) =>
      `${i + 1}. ${redact(s.title, [])} — worker=${s.spec.worker}，operation=${s.spec.operation}，spec SHA256=${digest(s.spec)}；[受限规格](specs/${s.id}.json)。`
    ).join("\n") + `\n\n## 授权边界\n\n此文件不是授权。明确实施请求且已展示上述计划后，入口可记录一次原始任务确认，不逐步骤再问。运行器只为这些冻结规格产生的范围内计划写入关联任务的机械批准；不声称用户逐一确认了未来的计划摘要。\n\n` +
    `策略变更：${task.request.scope.allow_policy_changes}；公网映射：${task.request.scope.allow_public_ingress}；破坏性/迁移：${task.request.scope.allow_destructive}。\n\n` +
    `输入文件：${Object.keys(task.input_digests).length}；执行器 SHA256：${task.engine_digest}。连接、凭据账本、输入文件、执行器漂移或过期即停止。\n\n` +
    `失败/unknown/docs_pending 不自动重试、不自动迁移回滚。原 plan/approval/journal/双边回执仍是执行事实源。\n`;
}

export async function prepareTask(state, request, adapter = null) {
  statePath(state);
  adapter ??= await runtime();
  const registry = adapter.load(state);
  readRegistry(state);
  validateRequest(request, registry);
  for (const step of request.steps) adapter.validate(step.spec, "spec");
  const task = {
    schema_version: 1, artifact: "ops-task", controller_id: registry.controller.controller_id,
    created_at: now(), expires_at: new Date(Date.now() + request.valid_for_hours * 3600000).toISOString(),
    registry_revision: registry.revision, request: structuredClone(request),
    engine_digest: adapter.engineDigest(), ledger_digest: digest(adapter.ledgerLoad(state)),
    targets: Object.fromEntries(request.scope.server_ids.map((id) => [id, targetDigest(registry.hosts[id])])),
    input_digests: pinInputs(request.input_paths),
  };
  const folder = taskFolder(state, request.task_id);
  return withLock(join(state, "records", ".locks", "task-" + request.task_id), { operation: "task-plan" }, () => {
    if (existsSync(folder)) throw new OpsError("task ID already exists; never overwrite task evidence");
    for (const step of request.steps) writeJson(join(folder, "specs", step.id + ".json"), step.spec, { exclusive: true });
    atomicWrite(join(folder, "PLAN.md"), markdown(task), 0o600, { exclusive: true });
    writeJson(join(folder, "summary.json"), { schema_version: 1, artifact: "ops-task-summary", task_id: request.task_id,
      scope: request.scope.scope, server_ids: request.scope.server_ids, project_ids: request.scope.project_ids,
      related_project_ids: request.scope.related_project_ids, step_ids: request.steps.map((s) => s.id), created_at: task.created_at }, { exclusive: true });
    // Commit marker written last. A crashed preparation is preserved, never auto-repaired.
    writeJson(join(folder, "task.json"), task, { exclusive: true });
    return { status: "prepared-not-authorized", task_id: request.task_id, task_digest: digest(task), plan: join(folder, "PLAN.md"), steps: request.steps.length };
  });
}

export function authorizeTask(state, taskId, expected, by, statement, ackDestructive = null) {
  const folder = taskFolder(state, taskId);
  const task = readBoundedJson(join(folder, "task.json"));
  if (digest(task) !== expected) throw new OpsError("task digest mismatch; reread the disclosed task plan");
  active(task);
  validateRequest(task.request, readRegistry(state));
  if (typeof by !== "string" || !by.trim() || typeof statement !== "string" || statement.trim().length < 8) throw new OpsError("identified approver and explicit original task confirmation are required");
  if (task.request.scope.allow_destructive && ackDestructive !== DESTRUCTIVE_ACK) throw new OpsError("destructive task requires an independently explicit exact-task acknowledgement");
  const value = { schema_version: 1, artifact: "ops-task-authorization", task_id: taskId, task_digest: expected,
    approved_by: by, statement, approved_at: now(), decision: "approved", destructive_ack: ackDestructive };
  return withLock(join(state, "records", ".locks", "task-" + taskId), { operation: "task-authorize" }, () => {
    writeJson(join(folder, "authorization.json"), value, { exclusive: true });
    return { status: "authorized", task_id: taskId, task_digest: expected, note: "No per-step conversational re-confirmation inside this frozen task" };
  });
}

export function assertPlanScope(plan, task, registry) {
  const s = task.request.scope, projects = allowedProjects(s);
  if (plan.controller_id !== task.controller_id || plan.engine_digest !== task.engine_digest) throw new OpsError("compiled plan controller/engine differs from authorized task");
  for (const [id, h] of Object.entries(plan.hosts || {})) if (!s.server_ids.includes(id) || targetDigest(h) !== task.targets[id]) throw new OpsError(`compiled plan target outside authorization: ${id}`);
  const scope = plan.registry_scope;
  if (!scope) throw new OpsError("compiled plan has no registry scope");
  for (const id of scope.hosts || []) if (!s.server_ids.includes(id)) throw new OpsError(`catalog server outside task: ${id}`);
  for (const id of scope.projects || []) if (!projects.has(id)) throw new OpsError(`catalog project outside task: ${id}`);
  for (const id of [...(scope.deployments || []), ...(plan.document_targets || []), ...(plan.affected_consumers || [])]) {
    inScopeDeployment(plan.registry_after.deployments[id] || registry.deployments[id], s, id);
  }
  for (const id of scope.allocations || []) {
    const a = plan.registry_after.allocations?.[id] || registry.allocations[id];
    if (!a || !projects.has(a.owner_project_id) || (a.shared_owners || []).some((p) => !projects.has(p))) throw new OpsError("compiled allocation owner outside task");
    inScopeDeployment(plan.registry_after.deployments[a.provider_deployment_id] || registry.deployments[a.provider_deployment_id], s, a.provider_deployment_id);
  }
  for (const id of scope.bindings || []) {
    const b = plan.registry_after.bindings?.[id] || registry.bindings[id];
    if (!b) throw new OpsError("compiled binding not found");
    for (const did of [b.consumer_deployment_id, b.provider_deployment_id].filter(Boolean)) inScopeDeployment(plan.registry_after.deployments[did] || registry.deployments[did], s, did);
  }
  // A compiler omission must not hide an unrelated catalog mutation.
  for (const group of ["hosts", "projects", "deployments", "allocations", "bindings"]) {
    for (const id of new Set([...Object.keys(registry[group]), ...Object.keys(plan.registry_after[group] || {})])) {
      if (digest(registry[group][id] ?? null) !== digest(plan.registry_after[group]?.[id] ?? null) && !(scope[group] || []).includes(id)) throw new OpsError(`unscoped compiled catalog change: ${group}/${id}`);
    }
  }
  if ((scope.policies || digest(registry.policies) !== digest(plan.registry_after.policies)) && !s.allow_policy_changes) throw new OpsError("compiled plan changes unauthorized policies");
  if ((scope.public_ingress || digest(registry.public_ingress ?? null) !== digest(plan.registry_after.public_ingress ?? null)) && !s.allow_public_ingress) throw new OpsError("compiled plan changes unauthorized public ingress");
  for (const op of plan.operations || []) {
    if (!s.server_ids.includes(op.host_id)) throw new OpsError("operation target outside task");
    if (op.deployment_id) inScopeDeployment(plan.registry_after.deployments[op.deployment_id], s, op.deployment_id);
    if (op.kind === "purge-quarantine" && !s.allow_destructive) throw new OpsError("unauthorized purge operation");
  }
  for (const [p, d] of Object.entries(plan.source_digests || {})) if (task.input_digests[resolve(p)] !== d) throw new OpsError(`unreviewed or changed local source input: ${p}; pin it in input_paths before authorization`);
}

function preflight(state, task, adapter, first = false) {
  active(task);
  const registry = adapter.load(state);
  if (registry.controller.controller_id !== task.controller_id) throw new OpsError("task controller mismatch");
  if (first && registry.revision !== task.registry_revision) throw new OpsError("catalog changed after task preparation; form a new disclosed task");
  if (adapter.engineDigest() !== task.engine_digest) throw new OpsError("task executor drifted");
  if (digest(adapter.ledgerLoad(state)) !== task.ledger_digest) throw new OpsError("credential ledger drifted after task authorization");
  for (const [id, expected] of Object.entries(task.targets)) if (!registry.hosts[id] || targetDigest(registry.hosts[id]) !== expected) throw new OpsError(`task connection/identity drift: ${id}`);
  if (digest(pinInputs(task.request.input_paths)) !== digest(task.input_digests)) throw new OpsError("task input files changed, disappeared or were added");
  return registry;
}

export async function runTask(state, taskId, adapter = null) {
  const folder = taskFolder(state, taskId);
  adapter ??= await runtime();
  const task = readBoundedJson(join(folder, "task.json"));
  const auth = readBoundedJson(join(folder, "authorization.json"));
  if (auth.artifact !== "ops-task-authorization" || auth.decision !== "approved" || auth.task_id !== taskId || auth.task_digest !== digest(task)) throw new OpsError("missing or mismatched task authorization");
  if (task.request.task_id !== taskId) throw new OpsError("task path/identity mismatch");
  return withLock(join(state, "records", ".locks", "task-" + taskId), { operation: "task-run", task_id: taskId }, () => {
    if (existsSync(join(folder, "started.json"))) throw new OpsError("task already started; inspect its progress and original run receipts, never automatically replay it");
    const initial = preflight(state, task, adapter, true);
    validateRequest(task.request, initial);
    writeJson(join(folder, "started.json"), { task_digest: digest(task), at: now() }, { exclusive: true });
    const progress = { schema_version: 1, artifact: "ops-task-result", task_id: taskId, status: "running", steps: [], started_at: now(), updated_at: now() };
    let phase = "planning";
    try {
      for (const step of task.request.steps) {
        phase = "planning";
        const registry = preflight(state, task, adapter);
        assertSpecScope(step.spec, task.request.scope, registry);
        const path = join(folder, "specs", step.id + ".json");
        if (digest(readBoundedJson(path)) !== digest(step.spec)) throw new OpsError("frozen step specification drifted");
        const compiled = adapter.compilePlan(state, path);
        containedPath(state, compiled.plan_path);
        const plan = readBoundedJson(compiled.plan_path);
        identifier(compiled.run_id, "run_id");
        if (compiled.run_id !== plan.run_id || plan.worker !== step.spec.worker || plan.operation !== step.spec.operation) throw new OpsError("compiled run identity/worker/operation mismatch");
        if (digest(plan) !== compiled.plan_digest) throw new OpsError("compiled plan digest mismatch");
        const row = { step_id: step.id, run_id: compiled.run_id, plan_digest: compiled.plan_digest,
          plan_path: pathRelative(state, compiled.plan_path).replaceAll("\\", "/"), status: "planned-not-authorized" };
        progress.steps.push(row);
        progress.updated_at = now();
        writeJson(join(folder, "progress.json"), progress);
        assertPlanScope(plan, task, registry);
        // Check inputs again after compilation and before delegating any approval.
        preflight(state, task, adapter);
        adapter.approval(state, compiled.run_id, compiled.plan_digest, "task:" + taskId,
          `Delegated exact-spec authorization from task ${taskId}, digest ${auth.task_digest}; original approver ${auth.approved_by}.`);
        row.status = "executing";
        writeJson(join(folder, "progress.json"), progress);
        preflight(state, task, adapter);
        phase = "applying";
        const result = adapter.apply(state, compiled.run_id);
        row.status = result.status;
        progress.updated_at = now();
        writeJson(join(folder, "progress.json"), progress);
        phase = "between-steps";
        if (result.status !== "completed") {
          progress.status = ["failed", "unknown", "docs_pending", "partial", "blocked"].includes(result.status) ? result.status : "blocked";
          break;
        }
      }
      if (progress.status === "running") progress.status = "completed";
    } catch (error) {
      progress.status = phase === "applying" ? "unknown" : "blocked";
      progress.error = redact(error.message || String(error), []).slice(0, 2000);
    }
    progress.updated_at = now();
    progress.recovery = progress.status === "completed" ? "none" : "Inspect progress and the original run with inspect-run; no automatic resume, docs-sync or migration retry. New actions need a new bounded task.";
    writeJson(join(folder, "progress.json"), progress);
    writeJson(join(folder, "result.json"), progress, { exclusive: true });
    return { ...progress, record: folder };
  });
}
