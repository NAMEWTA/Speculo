import * as clack from "@clack/prompts";
import type { HubCatalog, HubSummary } from "./hub-skills.js";
import type { Asset, AssetCatalog } from "./assets.js";
import { resolveProjectionIds, normalizeSkillTargets, validateExposureRequest, type SkillRequest, type ProjectionHost, type ExposureSelection } from "./agent-skills.js";
import type { InstallPreview, InstallProgress, SpeculoCommandResult } from "./index.js";
import type { WorkflowCatalog, WorkflowSelection } from "./workflows.js";
import type { VersionInfo } from "./version.js";
import { InstallCancelled } from "./interaction.js";

import { color, fitChoices, logMessage, note, printError, promptMessage, terminalWidth, visibleChoiceCount, wrapTerminalText, type TerminalChoice } from "./terminal-ui.js";
export { wrapTerminalText } from "./terminal-ui.js";

type Choice = TerminalChoice;
export type PromptPort = {
  select(options: { message: string; options: Choice[]; initialValue?: string }): Promise<string | symbol>;
  multiselect(options: { message: string; options: Choice[]; initialValues: string[]; required: false }): Promise<string[] | symbol>;
  confirm(options: { message: string; initialValue: boolean; active: string; inactive: string }): Promise<boolean | symbol>;
  note(message: string, title: string): void;
};
export const prompts: PromptPort = {
  select: options => {
    const message = `${options.message}\n${color.dim("↑↓ 移动 · Enter 选择 · Esc 取消")}`;
    return clack.select({ ...options, message: promptMessage(message), options: fitChoices(options.options), maxItems: visibleChoiceCount(options.options.length, message) });
  },
  multiselect: options => {
    const message = `${options.message}\n${color.dim("空格勾选 · Enter 确定 · Esc 取消")}`;
    return clack.multiselect({ ...options, message: promptMessage(message), options: fitChoices(options.options), maxItems: visibleChoiceCount(options.options.length, message) });
  },
  confirm: options => clack.confirm({ ...options, message: promptMessage(options.message) }),
  note,
};

const HUB_CATEGORY_LABELS: Record<string, string> = {
  automation: "automation · 自动化", coding: "coding · 编程", design: "design · 设计",
  system: "system · 系统", writing: "writing · 写作",
};

export async function promptPackages(options: { workflows: WorkflowCatalog; hub: HubCatalog; workflowIds: string[]; hubIds: string[]; chooseWorkflows: boolean; chooseHub: boolean }, ui: PromptPort = prompts): Promise<{ workflowIds: string[]; hubIds: string[] }> {
  const workflows = new Set(options.workflowIds);
  const skills = new Set(options.hubIds);
  const categories = options.chooseHub ? [...new Set([...options.hub.values()].map(skill => skill.id.split("/")[0]))].sort() : [];
  const availableWorkflows = options.chooseWorkflows ? [...options.workflows.values()].sort((a, b) => a.id.localeCompare(b.id)) : [];
  if (!categories.length && !availableWorkflows.length) return { workflowIds: options.workflowIds, hubIds: options.hubIds };
  ui.note("进入 Hub 分类选择 Skill；选择 Workflow 可切换安装状态。\n取消勾选将卸载未修改的受管包；配置、change、知识与历史数据保留。冲突包整包保留并报告。\nEsc / Ctrl+C 取消安装。", "选择安装内容");
  let cursor: string | undefined;
  for (;;) {
    const selected = answer(await ui.select({
      message: `安装内容 · Skill ${skills.size} · Workflow ${workflows.size}`,
      initialValue: cursor,
      options: [
        ...categories.map(category => {
          const members = [...options.hub.values()].filter(skill => skill.id.startsWith(`${category}/`));
          const count = members.filter(skill => skills.has(skill.id)).length;
          return { value: `category:${category}`, label: `Hub · ${HUB_CATEGORY_LABELS[category] ?? category} (${count}/${members.length})`, hint: "进入选择 Skill", tone: count ? "selected" as const : undefined };
        }),
        ...availableWorkflows.map(workflow => ({
          value: `workflow:${workflow.id}`, label: `${workflows.has(workflow.id) ? "✓ " : ""}${workflowLabel(workflow.id)}`,
          hint: `Workflow · ${workflows.has(workflow.id) ? "已选，Enter 移除" : "Enter 选中"}`, tone: workflows.has(workflow.id) ? "selected" as const : undefined,
        })),
        { value: "done", label: "完成选择 →", hint: "继续配置安装位置", tone: "action" },
      ],
    }));
    if (selected === "done") return {
      workflowIds: options.chooseWorkflows ? [...workflows].sort() : options.workflowIds,
      hubIds: options.chooseHub ? [...skills].sort() : options.hubIds,
    };
    cursor = selected;
    if (selected.startsWith("workflow:")) {
      const id = selected.slice("workflow:".length);
      if (workflows.has(id)) workflows.delete(id); else workflows.add(id);
      continue;
    }
    const category = selected.slice("category:".length);
    const members = [...options.hub.values()].filter(skill => skill.id.startsWith(`${category}/`)).sort((a, b) => a.id.localeCompare(b.id));
    const ids = answer(await ui.multiselect({
      message: `Hub / ${HUB_CATEGORY_LABELS[category] ?? category}\n确定后返回；空选清空本分类`,
      options: members.map(skill => ({ value: skill.id, label: skill.name, hint: skill.description })),
      initialValues: members.filter(skill => skills.has(skill.id)).map(skill => skill.id), required: false,
    }));
    for (const skill of members) skills.delete(skill.id);
    for (const id of ids) skills.add(id);
  }
}

function answer<T>(value: T | symbol): T {
  if (typeof value === "symbol") throw new InstallCancelled();
  return value as T;
}

const WORKFLOW_LABELS: Record<string, string> = {
  learning: "Learning · 学习", media: "Media · 内容创作", ops: "Ops · 运维",
  person: "Person · 认知与决策", specdev: "SpecDev · 工程开发",
};
const workflowLabel = (id: string) => WORKFLOW_LABELS[id] ?? id;

export async function promptWorkflows(
  catalog: WorkflowCatalog, installed: Set<string>, ui: PromptPort = prompts,
): Promise<WorkflowSelection> {
  ui.note("取消勾选会卸载未修改的受管 workflow；运行时数据保留。\nCtrl+C / Esc 取消安装。", "选择安装内容");
  return { workflowIds: answer(await ui.multiselect({
    message: "选择本次安装或刷新的 workflow",
    options: [...catalog.values()].sort((a, b) => a.id.localeCompare(b.id)).map(w => ({
      value: w.id, label: workflowLabel(w.id) + (installed.has(w.id) ? "（已安装）" : ""),
      hint: w.description,
    })),
    initialValues: [...installed].filter(id => catalog.has(id)), required: false,
  })).sort() };
}

export type ExposureGroup = { id: string; label: string; assets: Asset[] };
export function exposureGroups(catalog: AssetCatalog): ExposureGroup[] {
  const domains = [...new Set(catalog.assets.filter(a => a.kind !== "command").map(a => a.domain!))].sort();
  const groups = domains.map(id => ({
    id, label: workflowLabel(id),
    assets: catalog.assets.filter(a => a.domain === id).sort((a, b) =>
      Number(b.kind === "domain-skill") - Number(a.kind === "domain-skill") || a.id.localeCompare(b.id)),
  }));
  const commands = catalog.assets.filter(a => a.kind === "command");
  if (commands.length) groups.push({ id: "commands", label: "Commands", assets: commands });
  return groups;
}

function groupDescription(group: ExposureGroup): string {
  if (group.id === "commands") return `${group.assets.length} 个 Command`;
  return `${group.assets.filter(a => a.kind === "domain-skill").length} 个总入口 + ${group.assets.filter(a => a.kind === "work-skill").length} 个 Work`;
}

export async function promptExposureConfiguration(
  options: { catalog: AssetCatalog; existing: ExposureSelection; hasHistory: boolean; targets?: ProjectionHost[]; request?: SkillRequest; hubSelected?: boolean },
  ui: PromptPort = prompts,
): Promise<ExposureSelection> {
  validateExposureRequest(options.targets, options.request);
  let targets = options.targets;
  if (targets === undefined) {
    ui.note("Skills Hub 与曝光入口共用以下安装位置。\n空选关闭全部曝光；取消勾选的位置会清理未被人工修改的旧入口。\n所有位置共用一份能力清单，只需选择一次。", "选择安装位置");
    do {
    targets = answer(await ui.multiselect({
      message: "选择 Skill 安装位置",
      options: [
        { value: "agents", label: ".agents/skills", hint: "通用 Skill 发现目录" },
        { value: "claude", label: ".claude/skills", hint: "Claude Skill 发现目录" },
      ],
      initialValues: options.existing.targets, required: false,
    })) as ProjectionHost[];
    if (options.hubSelected && !targets.length) ui.note("已选择 Skills Hub 包，请至少勾选一个安装位置。", "需要安装位置");
    } while (options.hubSelected && !targets.length);
  }
  targets = normalizeSkillTargets(targets);
  if (options.hubSelected && !targets.length) throw new Error("--hub-skills requires at least one --skill-targets destination");
  if (!targets.length) {
    validateExposureRequest(targets, options.request);
    return { targets, assetIds: [] };
  }
  const request = options.request ?? await promptExposure({
    targets, catalog: options.catalog, existing: options.existing.assetIds, hasHistory: options.hasHistory,
  }, ui);
  return { targets, assetIds: resolveProjectionIds(request, options.catalog, options.existing.assetIds) };
}

export async function promptExposure(
  options: { targets: ProjectionHost[]; catalog: AssetCatalog; existing: string[]; hasHistory: boolean },
  ui: PromptPort = prompts,
): Promise<SkillRequest> {
  const { targets, catalog, existing, hasHistory } = options;
  const groups = exposureGroups(catalog);
  const draft = new Set(existing);
  const available = new Set(catalog.assets.map(a => a.id));
  ui.note(
    `当前已选择 ${existing.length} 个入口。完整内容保存在 .agents/speculo/。\n曝光位置：${targets.map(host => `.${host}/skills/`).join("、")}。\n所有选中位置共用下面这份能力清单，不会卸载 workflow。\n所选范围将替换当前清单；人工修改和同名第三方文件会保留并报告冲突。`,
    "配置统一的能力曝光",
  );
  for (;;) {
    const mode = answer(await ui.select({
      message: "选择曝光方式",
      initialValue: hasHistory ? "keep" : "none",
      options: [
        { value: "all", label: `全部曝光（${catalog.assets.length} 个入口）`, hint: "全部已安装 workflow 总入口、Work 和 Command" },
        { value: "groups", label: "按组曝光", hint: "多选整个 workflow 或全部 Commands" },
        { value: "custom", label: "自定义曝光", hint: "逐项选择总入口、Work 和 Command，可跨组混选" },
        { value: "keep", label: `保留已有选择（${existing.length} 个入口）`, hint: hasHistory ? "默认；保留具体清单，不自动加入升级新增的能力" : "暂无已有选择，等同不曝光" },
        { value: "none", label: "全部不曝光", hint: hasHistory ? "移除校验通过的受管入口；完整能力仍保留" : "首次默认；不添加宿主入口" },
      ],
    }));
    if (mode === "all" || mode === "keep" || mode === "none") return { mode };
    if (mode === "groups") {
      if (!groups.length) return { mode: "set", assetIds: [] };
      const selected = answer(await ui.multiselect({
        message: "选择整组能力 · 空选为不曝光",
        options: groups.map(group => {
          const count = group.assets.filter(a => draft.has(a.id)).length;
          return { value: group.id, label: `${group.label}（${group.assets.length} 个入口）`,
            hint: `${groupDescription(group)}；当前已选 ${count}/${group.assets.length}，勾选后曝光整组` };
        }),
        initialValues: groups.filter(group => group.assets.every(a => draft.has(a.id))).map(g => g.id),
        required: false,
      }));
      return { mode: "set", assetIds: groups.filter(g => selected.includes(g.id)).flatMap(g => g.assets.map(a => a.id)).sort() };
    }
    // Each group edits only its own part of the draft. Unknown historical IDs are
    // kept visible until the user explicitly removes them, never silently dropped.
    for (;;) {
      const missing = [...draft].filter(id => !available.has(id));
      const groupId = answer(await ui.select({
        message: `自定义曝光：已选 ${draft.size} 个入口`,
        options: [
          ...groups.map(group => ({ value: group.id, label: `${group.label}（已选 ${group.assets.filter(a => draft.has(a.id)).length}/${group.assets.length}）`, hint: groupDescription(group) })),
          ...(missing.length ? [{ value: "missing", label: `清除不可用的历史选择（${missing.length} 个）`, hint: missing.join(", ") }] : []),
          { value: "done", label: `完成选择（${draft.size} 个入口）` },
          { value: "back", label: "返回曝光方式", hint: "保留本次自定义草稿" },
        ],
      }));
      if (groupId === "back") break;
      if (groupId === "done") return { mode: "set", assetIds: [...draft].sort() };
      if (groupId === "missing") {
        ui.note(missing.join("\n"), "将从本次选择中清除的不可用入口");
        for (const id of missing) draft.delete(id);
        continue;
      }
      const group = groups.find(g => g.id === groupId)!;
      const ids = answer(await ui.multiselect({
        message: `${group.label} · 选择入口\n确定后返回分组页`,
        options: group.assets.map(a => ({
          value: a.id, label: a.kind === "domain-skill" ? `领域总入口 · ${a.id}` : a.id,
          hint: a.description,
        })),
        initialValues: group.assets.filter(a => draft.has(a.id)).map(a => a.id), required: false,
      }));
      for (const a of group.assets) draft.delete(a.id);
      for (const id of ids) draft.add(id);
    }
  }
}

const sectionTitle = (title: string) => color.bold(color.cyan(title));
const listLine = (label: string, ids: string[]) => `${label}（${ids.length}）：${ids.join("、")}`;

export function formatInstallPreview(preview: InstallPreview): string {
  const lines = [
    `${preview.mode === "init" ? "首次安装" : "刷新安装"} · ${preview.target}`,
    "", sectionTitle("安装内容"),
    `核心能力 + ${preview.workflowIds.length} 个 Workflow`,
    ...(preview.workflowIds.length ? [preview.workflowIds.map(workflowLabel).join("、")] : []),
  ];
  if (preview.retainedWorkflowIds.length) lines.push(color.yellow(listLine("冲突保留的 Workflow", preview.retainedWorkflowIds)));
  if (preview.removedWorkflowIds?.length) lines.push(color.yellow(listLine("卸载 Workflow", preview.removedWorkflowIds)), "配置、change、知识和历史数据保留。");
  if (preview.hub) lines.push("", ...formatHubSummary(preview.hub));
  const exposure = preview.exposure;
  lines.push("", sectionTitle("安装位置与能力曝光"),
    `曝光位置：${exposure.targets.map(host => `.${host}/skills`).join("、") || "无（关闭全部曝光）"}`,
    `统一能力清单：${exposure.assetIds.length} 个入口`);
  for (const [label, ids] of [["新增选择", exposure.added], ["保留选择（入口内容可刷新）", exposure.retained], ["移除选择", exposure.removed]] as const) {
    if (ids.length) lines.push(label === "移除选择" ? color.yellow(listLine(label, ids)) : listLine(label, ids));
  }
  for (const host of ["agents", "claude"] as const) {
    const p = preview.projections[host];
    if (!p.affected) continue;
    lines.push("", `${color.bold(`.${host}/skills`)} · ${p.enabled ? "启用" : "关闭"}`,
      `预计新增 ${p.created} · 更新 ${p.updated} · 移除 ${p.deleted} · 可用 ${p.ready}`);
    if (p.conflicts.length) lines.push(color.yellow(listLine("冲突保留", p.conflicts)));
  }
  if (preview.warnings.length) lines.push("", color.yellow(color.bold("警告")), ...preview.warnings);
  return lines.join("\n");
}

function formatHubSummary(hub: HubSummary): string[] {
  const lines = [sectionTitle("Skills Hub"), `所选包：${hub.selected.join("、") || "无"}`];
  for (const [label, ids] of [["实际受管包", hub.installed], ["新增", hub.created], ["更新", hub.updated], ["卸载", hub.removed], ["冲突保留", hub.conflicts]] as const) {
    if (ids.length) lines.push(label === "卸载" || label === "冲突保留" ? color.yellow(listLine(label, ids)) : listLine(label, ids));
  }
  return lines;
}

export async function confirmInstallPreview(preview: InstallPreview, ui: PromptPort = prompts): Promise<boolean> {
  ui.note(formatInstallPreview(preview), "确认安装摘要");
  return answer(await ui.confirm({ message: "确认应用以上安装与曝光选择？", initialValue: true, active: "确认并执行", inactive: "取消" }));
}

export function createInstallUI() {
  let active: ReturnType<typeof clack.spinner> | undefined;
  const stop = (message: string, code = 0) => { active?.stop(message, code); active = undefined; };
  return {
    start(info: VersionInfo, target: string, existed: boolean) {
      clack.intro(`${color.bold(color.cyan("Speculo"))} ${color.dim(`v${info.local}`)} · ${existed ? "刷新安装" : "首次安装"}`);
      logMessage("info", `${color.dim("目标目录")} ${target}`);
    },
    progress(phase: InstallProgress) {
      if (phase === "staging" || phase === "committing") {
        active = clack.spinner();
        active.start(phase === "staging" ? "准备并验证安装内容" : "应用安装与曝光选择");
      } else stop(phase === "staged" ? "安装内容已准备并验证" : "安装事务已完成");
    },
    confirm: confirmInstallPreview,
    finish(result: SpeculoCommandResult) {
      const r = result.refresh;
      logMessage("success", `${color.green(color.bold(result.mode === "init" ? "安装成功" : "刷新成功"))} · ${result.target}`);
      note([
        `受管文件更新 ${r.managedFiles} · 运行时文件保留 ${r.preservedFiles}`,
        `配置新增 ${r.config.added} · 更新 ${r.config.updated} · 保留 ${r.config.preserved} · 移除 ${r.config.removed}`,
        `能力入口 ${result.exposure.assetIds.length} · 安装位置 ${result.exposure.targets.map(host => `.${host}/skills`).join("、") || "无"}`,
        ...(result.removedWorkflowIds.length ? [color.yellow(listLine("已卸载 Workflow", result.removedWorkflowIds)), "配置、change、知识和历史数据保留。"] : []),
      ].join("\n"), "变更概览");
      if (result.hub.selected.length || result.hub.installed.length || result.hub.removed.length || result.hub.conflicts.length) {
        clack.log.message(wrapTerminalText(formatHubSummary(result.hub).join("\n"), terminalWidth()));
      }
      for (const host of ["agents", "claude"] as const) {
        const p = result.projections[host];
        if (!p.affected) continue;
        logMessage("info", `${color.bold(`.${host}/skills`)} · ${p.enabled ? "启用" : "关闭"}\n新增 ${p.created} · 更新 ${p.updated} · 移除 ${p.deleted} · 可用 ${p.ready}`);
        if (p.conflicts.length) logMessage("warn", listLine("冲突保留", p.conflicts));
      }
      for (const warning of result.warnings) logMessage("warn", warning);
      if (r.backupPath) logMessage("info", `保留定向备份：${r.backupPath}`);
      const updated = result.assets.filter(a => /^(AGENTS|CLAUDE|\.gitignore)/.test(a)).map(a => a.replace(/ \(managed discovery\/runtime references\)$/, ""));
      if (updated.length) logMessage("info", `已更新：${updated.join("、")}`);
      clack.outro(wrapTerminalText(result.warnings.length
        ? color.yellow("完成，存在警告；请检查上述冲突。")
        : `下一步：${color.cyan("speculo doctor")} 检查安装`, terminalWidth()));
    },
    fail(error: unknown) {
      stop("安装未完成", 1);
      if (error instanceof InstallCancelled) clack.cancel(wrapTerminalText(error.message, terminalWidth()));
      else printError(error instanceof Error ? error.message : String(error));
    },
  };
}
