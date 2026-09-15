/** Deterministic server/controller documentation and protected plaintext delivery bundles. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { digest, now, OpsError, targetJoin } from "./core.mjs";

export const STANDARD = `# OPS 部署与持久化规范

APP 和公共服务同级：host_root/project_id。明确启用多实例时使用 project_id/instances/environment/instance。

每个项目的 compose 或 service、env、config、data、logs、backups、releases 和 README 聚合在该项目目录。业务数据必须位于 data/component/purpose；不能回退到临时目录、代码目录、用户默认目录、匿名卷或命名卷。Docker 全局 data-root 另登记在 host_root/_runtime/docker；既有引擎迁移必须单独审批。

README 记录实际版本、来源、主机、时间、路径、依赖、启停和备份恢复。它默认不含密码。OPERATIONS.md 和部署机明文账本按策略保存真实账号密码，权限必须限制；不得进入 Git、镜像构建上下文、Web 静态目录或普通日志。

共享服务拥有物理数据；APP 只拥有获批的逻辑数据库、桶、命名空间和应用账号。复制 APP 目录不是共享依赖完整备份。卸载 APP 不删除公共服务、共享网络、逻辑资源或任何数据。单 APP 回滚不允许恢复整个共享实例。

旧环境默认值恢复和健康验证失败不得清理原环境。缓存隔离不等于释放空间；禁止把 data/env/backups 或数据库持久日志当成垃圾。

计划 → 明确批准 → 执行 → 实际验证 → 双边文档回执完成。远程断线意味着结果未知，不能重跑迁移或重新生成密码。

主机级入口（WireGuard、Nginx、探测单元）登记在 knowledge/host-services.json，不是假的 APP 部署。跨主机公网入口规范登记在 knowledge/public-ingress.json。主机/全域总册 = 服务一览表（含主机级入口）+ 特定服务规范；缺一不算完整主机手册。
`;

export function code(value) {
  const text = String(value ?? "");
  if (!text.includes("`")) return "`" + text + "`";
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return ticks + " " + text + " " + ticks;
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\r", "").replaceAll("\n", " ");
}

export function block(value, language = "json") {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const ticks = "`".repeat(Math.max(3, Math.max(0, ...(text.match(/`+/g) || []).map((x) => x.length)) + 1));
  return ticks + language + "\n" + text + "\n" + ticks + "\n";
}

export function pathFor(status, dep, relativeName) {
  return targetJoin({ ...status.hosts[dep.host_id], root: dep.root }, relativeName);
}

export function credentialRefs(status, dep) {
  const refs = new Set(dep.credential_refs);
  for (const b of Object.values(status.bindings)) {
    if (b.status === "active" && b.consumer_deployment_id === dep.deployment_id) refs.add(b.credential_ref);
  }
  for (const a of Object.values(status.allocations)) {
    if (a.provider_deployment_id === dep.deployment_id && a.status !== "retired") refs.add(a.credential_ref);
  }
  return [...refs].sort();
}

function firstCredential(refs, ledger) {
  for (const ref of refs) {
    const [cid, v] = ref.split("@");
    const item = ledger?.entries?.[cid]?.[v];
    if (!item?.values) continue;
    return {
      ref,
      username: item.values.username || item.values.user || item.values.access_key || "",
      password: item.values.password || item.values.secret || item.values.secret_key || item.values.token || "",
    };
  }
  return null;
}

export function credentialsText(refs, ledger) {
  const out = ["## 明文账号密码\n", "本文件是受限明文交付，不是脱敏报告。只向获授权管理员及对应运行账户开放。\n"];
  if (!refs.length) return [...out, "本部署没有登记密码凭据。密钥认证本身不存在登录密码；未知旧密码不能伪造。\n"].join("\n");
  for (const ref of refs) {
    const [cid, v] = ref.split("@");
    const item = ledger.entries?.[cid]?.[v];
    if (!item) throw new OpsError("document delivery blocked by missing credential: " + ref);
    out.push("### " + ref + "\n", code(item.purpose) + "\n");
    for (const [key, value] of Object.entries(item.values)) out.push("**" + key + "**\n", block(value, "text"));
  }
  return out.join("\n");
}

export function dependencies(status, dep) {
  const lines = ["## 依赖与数据归属\n"];
  const bindings = Object.values(status.bindings).filter((b) => b.consumer_deployment_id === dep.deployment_id && b.status === "active");
  if (!bindings.length) lines.push("未登记共享或外部服务依赖；专用组件的数据仍归本项目目录。\n");
  for (const b of bindings) {
    lines.push("### " + b.component + " / " + b.binding_id + "\n", `模式：${b.mode}；端点：${code(b.endpoint)}；网络：${code(b.network)}。\n`);
    if (b.mode === "shared") {
      const a = status.allocations[b.allocation_id];
      const provider = status.deployments[b.provider_deployment_id];
      lines.push(`提供者：${provider.project_id} / ${provider.deployment_id}，主机 ${provider.host_id}；服务目录 ${code(provider.root)}。\n`);
      lines.push(`逻辑资源：${code(a.resource_name)}（${a.resource_kind}）；数据组 ${a.data_group}；账号版本 ${a.credential_ref}；恢复粒度 ${a.recovery_scope}。\n`);
      for (const storage of provider.storage) lines.push(`提供者物理路径：${code(storage.path)}（${storage.component}/${storage.purpose}）。\n`);
      lines.push("公共服务的物理数据不复制到 APP 目录；单 APP 恢复不得覆盖其他消费者。\n");
    }
  }
  const consumers = Object.values(status.bindings).filter((b) => b.provider_deployment_id === dep.deployment_id && b.status === "active");
  if (consumers.length) {
    lines.push("## 公共服务消费者\n\n| APP 实例 | 所在主机 | 分配 | 凭据版本 |\n|---|---|---|---|\n");
    for (const b of consumers) {
      const consumer = status.deployments[b.consumer_deployment_id];
      lines.push(`| ${consumer.deployment_id} | ${consumer.host_id} | ${b.allocation_id} | ${b.credential_ref} |\n`);
    }
  }
  return lines.join("\n");
}

function deploymentAccess(status, dep) {
  const bindings = Object.values(status.bindings).filter((b) => b.consumer_deployment_id === dep.deployment_id && b.status === "active");
  if (bindings.length) return bindings.map((b) => b.endpoint).filter(Boolean).join("；") || "—";
  const providers = Object.values(status.bindings).filter((b) => b.provider_deployment_id === dep.deployment_id && b.status === "active");
  if (providers.length) return providers.map((b) => b.endpoint).filter(Boolean).join("；") || dep.root;
  return dep.root;
}

function persistenceCell(dep) {
  if (!dep.storage?.length) return "无登记业务持久化";
  return dep.storage.map((p) => `${p.component}/${p.purpose}: ${p.path}`).join("；");
}

function hostServiceAccess(svc) {
  return svc.public_url || (svc.listen && svc.listen.length ? svc.listen.join("；") : "") || svc.tunnel_address || (svc.listen_port ? String(svc.listen_port) : "") || svc.config_path || svc.unit || "—";
}

function hostServicePersistence(svc) {
  return [svc.config_path, svc.unit, svc.tunnel_address].filter(Boolean).join("；") || "主机级控制文件";
}

export function overviewRows(status, hid, { ledger = null, includeCredentials = false } = {}) {
  const rows = [];
  const host = status.hosts[hid];
  for (const svc of host.host_services || []) {
    rows.push({
      host_id: hid,
      service: svc.id + " / " + svc.kind,
      access: hostServiceAccess(svc),
      username: includeCredentials ? (svc.kind === "wireguard" ? "密钥认证" : "无登录口令") : "见控制端总册",
      password: includeCredentials ? "无登录口令" : "不在服务端公开",
      version: svc.unit || svc.kind,
      updated: "主机级服务",
      persistence: hostServicePersistence(svc),
    });
  }
  const deps = Object.values(status.deployments).filter((d) => d.host_id === hid).sort((a, b) => a.deployment_id < b.deployment_id ? -1 : 1);
  for (const d of deps) {
    const cred = includeCredentials ? firstCredential(credentialRefs(status, d), ledger) : null;
    rows.push({
      host_id: hid,
      service: d.project_id + " / " + d.deployment_id,
      access: deploymentAccess(status, d),
      username: includeCredentials ? (cred?.username || "密钥认证/无登录口令") : "见 OPERATIONS",
      password: includeCredentials ? (cred?.password || "无登录口令") : "不在服务端公开",
      version: d.observed_version || d.version || "未验证",
      updated: d.updated_at || "未验证",
      persistence: persistenceCell(d),
    });
  }
  return rows;
}

function renderOverviewTable(rows, { includeCredentials = false } = {}) {
  const header = includeCredentials
    ? "| 主机 | 服务 | 访问地址 | 账号 | 密码 | 版本 | 最近部署 | 持久化目录 |\n|---|---|---|---|---|---|---|---|"
    : "| 主机 | 服务 | 访问地址 | 账号 | 版本 | 最近部署 | 持久化目录 |\n|---|---|---|---|---|---|---|";
  const lines = [header];
  for (const r of rows) {
    if (includeCredentials) {
      lines.push(`| ${cell(r.host_id)} | ${cell(r.service)} | ${cell(r.access)} | ${cell(r.username)} | ${cell(r.password)} | ${cell(r.version)} | ${cell(r.updated)} | ${cell(r.persistence)} |`);
    } else {
      lines.push(`| ${cell(r.host_id)} | ${cell(r.service)} | ${cell(r.access)} | ${cell(r.username)} | ${cell(r.version)} | ${cell(r.updated)} | ${cell(r.persistence)} |`);
    }
  }
  if (!rows.length) {
    lines.push(includeCredentials
      ? "| — | 未登记 APP、公共服务或主机级入口 | — | — | — | — | — | — |"
      : "| — | 未登记 APP、公共服务或主机级入口 | — | — | — | — | — |");
  }
  return lines.join("\n") + "\n";
}

export function ingressSection(status) {
  const ing = status.public_ingress;
  if (!ing) return "";
  const out = [
    "## 公网访问内网\n",
    "入口（用户 → 公网 Nginx → 隧道 → 内网服务）与出口（内网客户端 TUN）不是同一条连接。" + (ing.not_the_same_as ? " " + ing.not_the_same_as : "") + "\n",
    "| 公网 | 四层 | 路径 | 后端 |\n|---|---|---|---|",
  ];
  for (const m of ing.mappings || []) {
    out.push(`| ${cell(m.public)} | ${cell(m.layer4 || "—")} | ${cell((m.via || []).join(" → ") || "—")} | ${cell(m.backend)} |`);
  }
  if (!(ing.mappings || []).length) out.push("| — | — | 未登记映射 | — |");
  out.push("\n### 新开公网 HTTP 服务\n");
  const steps = ing.open_http_checklist?.length
    ? ing.open_http_checklist
    : [
      "在入口主机登记/更新 Nginx 站点与 listen 端口，写入 host_services。",
      "确认 WireGuard 对端与 AllowedIPs，内网后端只绑隧道地址。",
      "更新 knowledge/public-ingress.json 映射行后重新编制文档计划。",
      "不要把数据库、SSH、Redis 管理口直接暴露到公网。",
    ];
  for (const s of steps) out.push("- " + s);
  if (ing.forbidden_ports?.length) {
    out.push("\n### 禁止暴露的端口\n");
    out.push(ing.forbidden_ports.map((p) => "- " + p).join("\n"));
  }
  return out.join("\n") + "\n";
}

function hostNotes(status, hid) {
  const host = status.hosts[hid];
  const out = [`### 主机 ${hid} / ${host.display_name}\n`, `持久化根：${code(host.root)}。通用规范见 docs/standards/DEPLOYMENT-STANDARD.md。\n`];
  for (const svc of host.host_services || []) {
    out.push(`#### ${svc.id}（${svc.kind}）\n`);
    if (svc.notes) out.push(svc.notes + "\n");
    if (svc.unit) out.push("- 单元：" + code(svc.unit) + "\n");
    if (svc.config_path) out.push("- 配置：" + code(svc.config_path) + "\n");
    if (svc.tunnel_address) out.push("- 隧道地址：" + code(svc.tunnel_address) + "\n");
    if (svc.listen_port) out.push("- ListenPort：" + String(svc.listen_port) + "\n");
    if (svc.public_url) out.push("- 公网 URL：" + code(svc.public_url) + "\n");
  }
  const deps = Object.values(status.deployments).filter((d) => d.host_id === hid).sort((a, b) => a.deployment_id < b.deployment_id ? -1 : 1);
  for (const d of deps) {
    out.push(`#### ${d.project_id} / ${d.deployment_id}\n`);
    out.push(`目录 ${code(d.root)}；启停与备份细节见项目 README。备份：${d.backup} 恢复：${d.recovery}\n`);
    if (d.notes?.length) out.push(d.notes.join("\n\n") + "\n");
  }
  if (!(host.host_services || []).length && !deps.length) out.push("本机尚未登记 APP、公共服务或主机级入口。\n");
  return out.join("\n");
}

export function deploymentReadme(status, dep, runId, generatedAt, { ledger = null, includeCredentials = false, controller = false } = {}) {
  const host = status.hosts[dep.host_id];
  const project = status.projects[dep.project_id];
  const out = [
    `# ${project.display_name} — ${dep.deployment_id}\n`,
    `文档代次：${runId}；生成时间（UTC）：${generatedAt}。部署验证与双边交付以部署机对应运行记录和 docs-receipt.json 为准。\n`,
    "## 部署事实\n\n| 项目 | 值 |\n|---|---|",
    `| 主机 / 账户 | ${host.host_id} / ${code(host.connection.username ?? "本机执行账户")} |`,
    `| 连接 | ${code(host.connection.hostname ?? "local")}，SSH 端口 ${host.connection.port ?? "不适用"} |`,
    `| 类型 / 方式 | ${project.kind} / ${dep.method} |`,
    `| 生命周期状态 | ${dep.status} |`,
    `| 环境 / 实例 | ${dep.environment} / ${dep.instance} |`,
    `| 计划版本 | ${code(dep.version)} |`,
    `| 最后运行验证版本 | ${code(dep.observed_version || "尚未验证")} |`,
    `| 首次部署时间（UTC） | ${dep.installed_at || "尚未完成"} |`,
    `| 最近部署验证时间（UTC） | ${dep.updated_at || "尚未验证"} |`,
    `| 项目根目录 | ${code(dep.root)} |`,
    `| 来源 | ${code(dep.source.location)} |`,
    `| 固定来源版本 | ${code(dep.source.revision)} |\n`,
    "## 目录与持久化\n",
    `部署定义：${code(dep.method === "compose" ? pathFor(status, dep, "compose/compose.yaml") : pathFor(status, dep, "service"))}。\n`,
    `环境文件：${code(pathFor(status, dep, "env"))}；配置：${code(pathFor(status, dep, "config"))}。\n`,
    `日志：${code(pathFor(status, dep, "logs"))}；发布历史：${code(pathFor(status, dep, "releases"))}；备份：${code(pathFor(status, dep, "backups"))}。\n`,
    "| 组件 | 用途 | 自有持久化路径 |\n|---|---|---|",
  ];
  for (const p of dep.storage) out.push(`| ${p.component} | ${p.purpose} | ${code(p.path)} |`);
  if (!dep.storage.length) out.push("| — | 无登记的业务持久化内容 | 不应生成匿名数据路径 |");
  out.push("\n" + dependencies(status, dep), "## 日常操作\n");
  for (const [title, key] of [["启动/运行", "start"], ["停止（保留数据）", "stop"], ["查看与验证", "verify"]]) {
    out.push("### " + title + "\n");
    if (!dep.commands[key].length) out.push("不适用或由已批准运行计划执行。\n");
    for (const argv of dep.commands[key]) out.push(block(argv));
  }
  out.push(
    "## 更新步骤\n",
    "先盘点主机与依赖；固定版本；检查备份及恢复能力；生成新计划并确认；分批执行；验证运行与数据；核对服务端和部署机文档回执。不得直接删除 data/env/backups，也不得用旧批准授权新迁移。\n",
    "## 备份\n", dep.backup + "\n", "## 恢复与回滚\n", dep.recovery + "\n",
    "切换旧代码不能自动恢复数据库结构。共享服务整实例恢复需要全部消费者维护审批。\n",
  );
  if (dep.notes.length) out.push("## 限制与备注\n", dep.notes.join("\n\n") + "\n");
  const replicas = Object.values(status.deployments).filter((d) => d.project_id === dep.project_id);
  out.push("## 同项目部署位置\n", replicas.sort((a, b) => a.deployment_id < b.deployment_id ? -1 : 1).map((d) => `- ${d.host_id} / ${d.deployment_id}：${code(d.root)}`).join("\n") + "\n");
  if (controller) out.push("\n本目录是部署机的配置、凭据、运行证据和远端文档记录；不声称自动复制了远端业务数据。数据备份需要独立的备份策略和回执。\n");
  if (includeCredentials) out.push(credentialsText(credentialRefs(status, dep), ledger));
  else out.push("\n## 凭据记录\n\n本 README 默认不写密码。获授权管理员读取本项目 OPERATIONS.md（启用时）或部署机明文手册；密码未知时必须补齐，不能编造。\n");
  return out.join("\n") + "\n";
}

export function hostReadme(status, hid, runId, at, { ledger = null, full = false, controller = false } = {}) {
  const host = status.hosts[hid];
  const includeCredentials = Boolean(full && controller && ledger);
  const rows = overviewRows(status, hid, { ledger, includeCredentials });
  const out = [
    `# 主机 ${host.display_name} / ${hid}\n`,
    `主机持久化根：${code(host.root)}；更新：${at}；运行：${runId}。\n`,
    "APP 与公共服务同级。主机级入口（WireGuard/Nginx/探测）登记为 host_services，不是假的 APP 目录。通用规范见 docs/standards/DEPLOYMENT-STANDARD.md。\n",
    "## 服务一览\n",
    renderOverviewTable(rows, { includeCredentials }),
  ];
  if (status.public_ingress) out.push("\n" + ingressSection(status));
  out.push("\n## 说明\n", hostNotes(status, hid));
  out.push("\n公共服务数据归提供者；其他主机使用的服务通过依赖绑定记录。未写入 host_services / 部署账本的入口不会在下次文档交付中出现。\n");
  return out.join("\n") + "\n";
}

export function fleetDocument(status, hostIds, runId, at, { ledger = null, includeCredentials = false } = {}) {
  const ids = [...hostIds].sort();
  const rows = ids.flatMap((hid) => overviewRows(status, hid, { ledger, includeCredentials }));
  const out = [
    "# 全域部署总册（明文）\n",
    `最近文档代次：${runId}；生成时间：${at}。本地账本和配置副本不等于远端业务数据备份。\n`,
    "## 服务一览\n",
    renderOverviewTable(rows, { includeCredentials }),
  ];
  if (status.public_ingress) out.push("\n" + ingressSection(status));
  out.push("\n## 说明\n");
  for (const hid of ids) out.push(hostNotes(status, hid));
  return out.join("\n") + "\n";
}

export function hostServicesDocument(host) {
  return JSON.stringify({
    schema_version: 1,
    host_id: host.host_id,
    services: host.host_services || [],
  }, null, 2) + "\n";
}

export function publicIngressDocument(status) {
  if (!status.public_ingress) return null;
  return JSON.stringify(status.public_ingress, null, 2) + "\n";
}

export function remotePaths(status, dep) {
  const names = ["README.md", "project.yaml", "run/release-state.json"];
  if (status.policies.server_operations) names.push("OPERATIONS.md");
  if (status.projects[dep.project_id].kind === "shared-service") names.push("consumers.md");
  if (dep.layout === "instances") {
    return names.map((n) => pathFor(status, dep, n)).concat([targetJoin(status.hosts[dep.host_id], dep.project_id + "/README.md")]);
  }
  return names.map((n) => pathFor(status, dep, n));
}

export function planReport(plan) {
  const out = [
    `# OPS 执行计划 ${plan.run_id}\n`,
    `Worker：${plan.worker}；操作：${plan.operation}；风险：${plan.risk}。\n`,
    `计划摘要：\`${digest(plan)}\`\n\n创建：${plan.created_at}；批准有效截止：${plan.expires_at}。\n`,
    "## 目标与理由\n", plan.reason + "\n",
  ];
  for (const [hid, h] of Object.entries(plan.hosts)) out.push(`主机 ${hid}：${h.transport} / ${h.platform} / 根 ${code(h.root)} / 身份 ${h.identity}。\n`);
  out.push("## 受影响消费者\n", plan.affected_consumers.join(", ") || "没有登记的既有消费者受影响。", "\n## 完整动作集合\n");
  for (const op of plan.operations) {
    out.push(`### ${op.step_id} — ${op.host_id} / ${op.deployment_id || "host"} / ${op.kind}\n`);
    const display = Object.fromEntries(Object.entries(op).filter(([k]) => k !== "content_b64"));
    if ("content_b64" in op) display.payload_sha256 = digest(Buffer.from(op.content_b64, "base64"));
    out.push(block(display));
    if (op.secret_argv_acknowledged) out.push("**该 MinIO 管理动作的应用密码会短暂出现在受特权用户可见的 mc 子进程参数中。批准包含此风险。**\n");
  }
  out.push(
    "## 明文文件与双边交付\n",
    "服务器 README 默认不含密码；受限 OPERATIONS.md 和部署机手册按已批准策略写真实明文。env 和本地配置副本按 0600/受限 ACL 写入。目标与部署机文件均回读校验；缺一不可标记 completed。\n",
    block({ document_targets: plan.document_targets, credential_versions: Object.keys(plan.credential_versions), policies: plan.registry_after.policies }),
    "## 数据保护和恢复\n", plan.rollback_note + "\n",
    "没有默认删除数据、逻辑资源、公共服务、卷或备份的动作。失败停止，断线标记 unknown；同一计划不能盲目重跑迁移。\n",
    "## 批准\n", "必须由用户确认上述目标、完整写入集合、凭据版本、影响集合和恢复限制。approve 必须携带本报告对应的完整摘要；编辑计划会使旧批准失效。\n",
  );
  return out.join("\n");
}

const KNOWLEDGE_INDEX = `# 共享知识索引

通用规范见 ../docs/standards/DEPLOYMENT-STANDARD.md。
主机级服务账本：host-services.json。
跨主机公网入口：public-ingress.json。
只收录经用户确认、带来源和最后验证时间的知识，不存密码。
`;

export function deliveryBundle(state, plan, status, ledger, verifiedIds) {
  const at = now();
  const rid = plan.run_id;
  const remote = new Map();
  const local = {};
  const addRemote = (hid, path, text) => {
    const expected = plan.document_preconditions[hid]?.[path];
    if (expected === undefined) throw new OpsError("document write not included in approved preconditions: " + path);
    remote.set(hid + "\0" + path, { host_id: hid, path, content: text, sha256: digest(Buffer.from(text, "utf8")), expected });
  };
  for (const did of [...new Set(verifiedIds)].sort()) {
    const d = status.deployments[did];
    const hid = d.host_id;
    const readme = deploymentReadme(status, d, rid, at, { ledger, includeCredentials: status.policies.server_readme_credentials });
    addRemote(hid, pathFor(status, d, "README.md"), readme);
    const operations = deploymentReadme(status, d, rid, at, { ledger, includeCredentials: true });
    if (status.policies.server_operations) addRemote(hid, pathFor(status, d, "OPERATIONS.md"), operations);
    addRemote(hid, pathFor(status, d, "project.yaml"), JSON.stringify(d, null, 2) + "\n");
    addRemote(hid, pathFor(status, d, "run/release-state.json"), JSON.stringify({
      run_id: rid, version: d.version, observed_version: d.observed_version, verified_at: d.updated_at, document_generation: at,
    }, null, 2) + "\n");
    if (status.projects[d.project_id].kind === "shared-service") addRemote(hid, pathFor(status, d, "consumers.md"), dependencies(status, d));
    if (d.layout === "instances") {
      const projectroot = targetJoin(status.hosts[hid], d.project_id);
      const peers = Object.values(status.deployments).filter((x) => x.host_id === hid && x.project_id === d.project_id);
      const text = "# " + d.project_id + " 实例索引\n\n" + peers.map((x) => `- ${x.environment}/${x.instance}：${code(x.root)}，版本 ${code(x.version)}`).join("\n") + "\n";
      addRemote(hid, targetJoin({ ...status.hosts[hid], root: projectroot }, "README.md"), text);
    }
    const prefix = `hosts/${hid}/deployments/${did}`;
    local[prefix + "/README.md"] = deploymentReadme(status, d, rid, at, { ledger, includeCredentials: true, controller: true });
    local[prefix + "/OPERATIONS.md"] = operations;
    local[prefix + "/deployment.json"] = JSON.stringify(d, null, 2) + "\n";
    local[prefix + "/server/README.md"] = readme;
  }
  const touchedHosts = [...new Set([...verifiedIds.map((d) => status.deployments[d].host_id), ...Object.keys(plan.hosts)])].sort();
  for (const hid of touchedHosts) {
    const h = status.hosts[hid];
    addRemote(hid, targetJoin(h, "README.md"), hostReadme(status, hid, rid, at));
    addRemote(hid, targetJoin(h, "DEPLOYMENTS.md"), hostReadme(status, hid, rid, at, { ledger, full: true }));
    addRemote(hid, targetJoin(h, "docs/standards/DEPLOYMENT-STANDARD.md"), STANDARD);
    addRemote(hid, targetJoin(h, "knowledge/host-services.json"), hostServicesDocument(h));
    const ingressJson = publicIngressDocument(status);
    if (ingressJson) addRemote(hid, targetJoin(h, "knowledge/public-ingress.json"), ingressJson);
    const knowledgePath = targetJoin(h, "knowledge/INDEX.md");
    if ((plan.document_preconditions[hid]?.[knowledgePath] ?? { kind: "file" }).kind === "absent") {
      addRemote(hid, knowledgePath, KNOWLEDGE_INDEX);
    }
    local[`hosts/${hid}/README.md`] = hostReadme(status, hid, rid, at);
    local[`hosts/${hid}/DEPLOYMENTS.md`] = hostReadme(status, hid, rid, at, { ledger, full: true, controller: true });
    local[`hosts/${hid}/knowledge/host-services.json`] = hostServicesDocument(h);
    if (ingressJson) local[`hosts/${hid}/knowledge/public-ingress.json`] = ingressJson;
  }
  local["FLEET-DEPLOYMENTS.md"] = fleetDocument(status, Object.keys(status.hosts), rid, at, { ledger, includeCredentials: true });
  local["README.md"] = "# OPS 控制端\n\n主机记录位于 hosts/<host_id>/；项目关联位于 status.json；项目部署记录位于 hosts/<host_id>/deployments/<deployment_id>/；完整明文总册位于 FLEET-DEPLOYMENTS.md；凭据账本位于 private/credentials.json；执行证据按 host runs / release 保存。主机级入口见 hosts/<id>/knowledge/host-services.json，跨主机公网入口见 knowledge/public-ingress.json。\n\n不得清理此运行态目录来替换静态 workflow。双边文档完成由每次运行 docs-receipt.json 证明。\n";
  local["docs/standards/DEPLOYMENT-STANDARD.md"] = STANDARD;
  if (!existsSync(join(state, "knowledge", "INDEX.md"))) {
    local["knowledge/INDEX.md"] = "# 共享知识索引\n\n只收录经用户批准、带来源与最后验证日期的通用知识。运行时环境和密码不自动提升为共享知识。跨主机入口规范见各主机 knowledge/public-ingress.json。\n";
  }
  if (status.public_ingress) local["knowledge/public-ingress.json"] = publicIngressDocument(status);
  return {
    schema_version: 1, run_id: rid, plan_digest: digest(plan), generated_at: at,
    remote: [...remote.values()],
    local: Object.entries(local).map(([p, text]) => ({ path: p, content: text, sha256: digest(Buffer.from(text, "utf8")) })),
    acks: {},
  };
}
