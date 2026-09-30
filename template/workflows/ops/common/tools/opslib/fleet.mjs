/** Allowlisted offline inventory. Never reads credentials, env, outboxes or raw task specifications. */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWrite, digest, identifier, noSymlinks, OpsError, redact, withLock, writeJson } from "./core.mjs";
import { catalogUnlocked, ids, readBoundedJson, readRegistry, statePath, targetDigest } from "./workspace.mjs";
import { latestCheck, readiness } from "./server_checks.mjs";

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "../../templates/FLEET.html");
const text = (v) => typeof v === "string" ? redact(v.replace(/[\u0000-\u001f\u007f]/g, " "), []).slice(0, 500) : "";
const time = (v) => typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
const sorted = (map) => Object.keys(map).sort().map((id) => map[id]);
const knownStatus = new Set(["planned", "running", "configured", "docs_pending", "completed", "failed", "unknown", "retired", "blocked", "partial", "prepared", "authorized", "interrupted", "incomplete", "needs-inspection", "executing", "planned-not-authorized"]);
const status = (v) => knownStatus.has(v) ? v : "unknown";
const md = (v) => text(String(v ?? "—")).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("|", "&#124;").replaceAll("`", "&#96;").replaceAll("[", "&#91;").replaceAll("]", "&#93;");

function taskSummaries(state) {
  const root = join(state, "records", "tasks");
  noSymlinks(root);
  if (!existsSync(root)) return [];
  const entries = readdirSync(root, { withFileTypes: true });
  if (entries.length > 10000) throw new OpsError("task index exceeds 10000 entries");
  return entries.sort((a, b) => a.name.localeCompare(b.name)).map((ent) => {
    identifier(ent.name, "task_id");
    if (!ent.isDirectory() || ent.isSymbolicLink()) throw new OpsError("invalid task index entry");
    const folder = join(root, ent.name), summary = join(folder, "summary.json");
    // Incomplete preparation stays visible without reading possibly secret-bearing task.json.
    if (!existsSync(summary)) return { task_id: ent.name, scope: "unknown", server_ids: [], project_ids: [], status: "incomplete", updated_at: null, run_ids: [] };
    const s = readBoundedJson(summary);
    if (s.schema_version !== 1 || s.artifact !== "ops-task-summary" || s.task_id !== ent.name || !["server", "project"].includes(s.scope)) throw new OpsError("invalid task summary");
    ids(s.server_ids, "server_ids"); ids(s.project_ids, "project_ids");
    const result = ["result.json", "progress.json"].map((f) => join(folder, f)).find((p) => { noSymlinks(p); return existsSync(p); });
    const r = result ? readBoundedJson(result) : null;
    if (r && (r.artifact !== "ops-task-result" || r.task_id !== ent.name || !Array.isArray(r.steps))) throw new OpsError("invalid task result");
    for (const f of ["started.json", "authorization.json", "task.json"]) noSymlinks(join(folder, f));
    let st = r ? status(r.status) : existsSync(join(folder, "started.json")) ? "needs-inspection"
      : existsSync(join(folder, "authorization.json")) ? "authorized" : existsSync(join(folder, "task.json")) ? "prepared" : "incomplete";
    // A running record is not proof that a live process still owns the task.
    if (st === "running") st = "needs-inspection";
    const runIds = (r?.steps || []).map((step) => identifier(step.run_id, "run_id"));
    return { task_id: s.task_id, scope: s.scope, server_ids: s.server_ids, project_ids: s.project_ids,
      status: st, updated_at: time(r?.updated_at ?? s.created_at), run_ids: [...new Set(runIds)] };
  });
}

export function projectFleet(registry, checks = {}, tasks = [], { at = new Date(), staleHours = 24 } = {}) {
  if (!Number.isFinite(at.getTime()) || !Number.isFinite(staleHours) || staleHours <= 0 || staleHours > 8760) throw new OpsError("invalid inventory time/staleness policy");
  const deployments = sorted(registry.deployments).map((d) => ({
    deployment_id: d.deployment_id, project_id: d.project_id, server_id: d.host_id,
    environment: text(d.environment), instance: text(d.instance), method: text(d.method), root: text(d.root),
    status: status(d.status), desired_version: text(d.version), observed_version: d.observed_version == null ? null : text(d.observed_version),
    updated_at: time(d.updated_at), run_id: d.run_id ? identifier(d.run_id, "run_id") : null,
  }));
  const byServer = new Map(), byProject = new Map();
  for (const d of deployments) {
    if (!byServer.has(d.server_id)) byServer.set(d.server_id, []);
    if (!byProject.has(d.project_id)) byProject.set(d.project_id, []);
    byServer.get(d.server_id).push(d); byProject.get(d.project_id).push(d);
  }
  const servers = sorted(registry.hosts).map((h) => {
    const c = checks[h.host_id];
    let checkStatus = "unknown";
    if (c) {
      try { if (targetDigest(h) === c.host_digest) checkStatus = readiness(c.checks, c.checked_at, { at, staleHours }); }
      catch { /* A changed/missing pinned host key is not evidence of readiness. */ }
    }
    const own = byServer.get(h.host_id) || [];
    return { server_id: h.host_id, name: text(h.display_name), platform: text(h.platform), transport: h.transport,
      address: h.transport === "ssh" ? text(h.connection.hostname) : "local (explicit)", port: h.transport === "ssh" ? h.connection.port ?? 22 : null,
      root: text(h.root), readiness: checkStatus, profile: c?.profile ?? null, checked_at: time(c?.checked_at),
      checks: (c?.checks || []).map((v) => ({ id: v.id, status: v.status, required: v.required })),
      project_ids: [...new Set(own.filter((d) => d.status !== "retired").map((d) => d.project_id))].sort(),
      deployment_ids: own.map((d) => d.deployment_id),
      host_services: (h.host_services || []).map((s) => ({ service_id: identifier(s.id, "host service"), kind: text(s.kind), unit: text(s.unit), port: Number.isInteger(s.listen_port) ? s.listen_port : null })),
    };
  });
  const projects = sorted(registry.projects).map((p) => {
    const own = byProject.get(p.project_id) || [];
    return { project_id: p.project_id, name: text(p.display_name ?? p.project_id), kind: text(p.kind), service_type: text(p.service_type),
      server_ids: [...new Set(own.filter((d) => d.status !== "retired").map((d) => d.server_id))].sort(), deployment_ids: own.map((d) => d.deployment_id) };
  });
  const bindings = sorted(registry.bindings).map((b) => {
    if (!registry.deployments[b.consumer_deployment_id] || (b.provider_deployment_id && !registry.deployments[b.provider_deployment_id])) throw new OpsError("orphan binding cannot be projected");
    return { binding_id: b.binding_id, consumer_deployment_id: b.consumer_deployment_id,
      provider_deployment_id: b.provider_deployment_id ?? null, mode: text(b.mode), status: text(b.status) };
  });
  const releases = sorted(registry.releases).map((r) => ({ run_id: identifier(r.run_id, "run_id"), worker: text(r.worker), status: status(r.status),
    server_ids: ids(r.host_ids || [], "release hosts"), deployment_ids: ids(r.deployment_ids || [], "release deployments"), updated_at: time(r.updated_at) }));
  return { schema_version: 1, artifact: "ops-fleet-view", generated_at: at.toISOString(), controller_id: registry.controller.controller_id,
    source_revision: registry.revision, source_digest: digest(registry), stale_hours: staleHours,
    notice: "ready 只表示指定 profile 的必需检查项通过；completed 是历史执行结果。未测、过期或身份变化不能视为生产验收通过。",
    servers, projects, deployments, bindings, releases, tasks };
}

export function renderMarkdown(data, html = "index.html", json = "inventory.json") {
  const table = (headers, rows) => `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n` + (rows.length ? rows.map((r) => `| ${r.map(md).join(" | ")} |`).join("\n") : `| ${headers.map((_, i) => i ? "—" : "暂无记录").join(" | ")} |`) + "\n";
  return `# OPS 服务器与部署清单\n\n[打开离线看板](${html}) · [结构化快照](${json})\n\n生成：${data.generated_at}；资源修订：${data.source_revision}；控制端：${data.controller_id}。\n\n这是离线记录，不是实时监控。ready 仅代表指定检查 profile 的必需项通过；completed 是历史执行结果。未测、过期、身份变化不视为正常。\n\n## 服务器 → 项目\n\n` +
    table(["服务器", "名称 / 地址", "系统", "检查 / profile", "检查时间", "项目", "主机级服务"], data.servers.map((s) => [s.server_id, `${s.name} / ${s.address}`, s.platform, `${s.readiness} / ${s.profile ?? "未检查"}`, s.checked_at, s.project_ids.join(", "), s.host_services.map((v) => v.service_id).join(", ")])) +
    `\n## 项目 → 服务器\n\n` + table(["项目", "名称", "类别", "服务器", "部署实例"], data.projects.map((p) => [p.project_id, p.name, p.kind, p.server_ids.join(", "), p.deployment_ids.join(", ")])) +
    `\n## 部署实例\n\n` + table(["部署", "项目", "服务器", "环境", "记录状态", "计划版本", "验证版本", "根目录"], data.deployments.map((d) => [d.deployment_id, d.project_id, d.server_id, d.environment, d.status, d.desired_version, d.observed_version, d.root])) +
    `\n## 任务记录\n\n` + table(["任务", "范围", "状态", "服务器", "Run"], data.tasks.map((t) => [t.task_id, t.scope, t.status, t.server_ids.join(", "), t.run_ids.join(", ")])) +
    `\n## 原始 Run / Release 索引\n\n` + table(["Run", "Work", "记录状态", "服务器", "更新时间"], data.releases.map((r) => [r.run_id, r.worker, r.status, r.server_ids.join(", "), r.updated_at])) +
    `\n原始不可覆盖证据仍位于 hosts/<host_id>/runs/<run_id>/ 或 releases/<run_id>/；通过 ops.mjs inspect-run 核对。此视图不移动、不替代执行回执，不导出 env、凭据账本或配置镜像。\n`;
}

export function renderHtml(data, template = readFileSync(TEMPLATE, "utf8")) {
  template = template.replace(/\r\n?/g, "\n");
  for (const marker of ["{{FLEET_DATA}}", "{{SCRIPT_CSP}}", "{{STYLE_CSP}}"]) if (template.split(marker).length !== 2) throw new OpsError(`HTML template must contain one ${marker}`);
  const payload = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  let html = template.replace("{{FLEET_DATA}}", () => payload);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter((m) => !m[0].startsWith('<script type="application/json"'));
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  if (scripts.length !== 1 || styles.length !== 1) throw new OpsError("offline template requires one audited inline script and style");
  const csp = (s) => "sha256-" + createHash("sha256").update(s).digest("base64");
  html = html.replace("{{SCRIPT_CSP}}", csp(scripts[0][1])).replace("{{STYLE_CSP}}", csp(styles[0][1]));
  return html;
}

export function generateFleet(state, { at = new Date(), staleHours = 24 } = {}) {
  statePath(state);
  return withLock(join(state, "records", ".locks", "views"), { operation: "fleet" }, () => {
    catalogUnlocked(state);
    const registry = readRegistry(state);
    const checks = Object.fromEntries(sorted(registry.hosts).map((h) => [h.host_id, latestCheck(state, h)]));
    const data = projectFleet(registry, checks, taskSummaries(state), { at, staleHours });
    const html = renderHtml(data), markdown = renderMarkdown(data);
    // Snapshot identity includes renderer bytes, so a template update cannot collide with an older view.
    const viewId = "view-" + digest({ data, html, markdown }).slice(0, 32);
    const folder = join(state, "records", "views", viewId);
    const files = { "inventory.json": JSON.stringify(data, null, 2) + "\n", "index.html": html, "FLEET.md": markdown };
    const receipt = { schema_version: 1, artifact: "ops-fleet-receipt", view_id: viewId, source_digest: data.source_digest,
      files: Object.fromEntries(Object.entries(files).map(([name, body]) => [name, digest(Buffer.from(body))])) };
    noSymlinks(folder);
    if (existsSync(folder)) {
      const old = readBoundedJson(join(folder, "manifest.json"));
      if (digest(old) !== digest(receipt)) throw new OpsError("existing view receipt differs; preserve evidence");
    } else {
      for (const [name, body] of Object.entries(files)) atomicWrite(join(folder, name), body, 0o600, { exclusive: true });
      writeJson(join(folder, "manifest.json"), receipt, { exclusive: true });
    }
    for (const [name, expected] of Object.entries(receipt.files)) {
      const path = join(folder, name); noSymlinks(path, { allowMissing: false });
      if (digest(readFileSync(path)) !== expected) throw new OpsError("view readback mismatch; previous landing page preserved");
    }
    catalogUnlocked(state);
    if (digest(readRegistry(state)) !== data.source_digest) throw new OpsError("catalog drift during rendering; previous landing page preserved");
    const prefix = `records/views/${viewId}/`;
    // Publish one landing page last; JSON + HTML always belong to the same immutable generation.
    atomicWrite(join(state, "FLEET.md"), renderMarkdown(data, prefix + "index.html", prefix + "inventory.json"));
    return { status: "generated", view_id: viewId, markdown: join(state, "FLEET.md"), html: join(folder, "index.html"),
      json: join(folder, "inventory.json"), source_revision: data.source_revision, servers: data.servers.length, projects: data.projects.length,
      note: "Local restricted snapshot only; no server connection, no live health claim, no credential export" };
  });
}
