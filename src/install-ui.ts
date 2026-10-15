import * as clack from "@clack/prompts";
import type { Asset, AssetCatalog } from "./assets.js";
import { resolveProjectionIds, normalizeSkillTargets, validateExposureRequest, type SkillRequest, type ProjectionHost, type ExposureSelection } from "./agent-skills.js";
import type { InstallPreview, InstallProgress, SpeculoCommandResult } from "./index.js";
import type { WorkflowCatalog, WorkflowSelection } from "./workflows.js";
import type { VersionInfo } from "./version.js";
import { InstallCancelled } from "./interaction.js";

type Choice = { value: string; label: string; hint?: string };
function cellWidth(char: string): number {
  if (/\p{Mark}/u.test(char)) return 0;
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Emoji_Presentation}\u3000-\u303f\uff01-\uff60]/u.test(char) ? 2 : 1;
}
export function wrapTerminalText(text: string, width: number): string {
  return text.split("\n").map(line => {
    let columns = 0, output = "";
    for (const char of line) {
      const size = cellWidth(char);
      if (columns + size > width) { output += "\n"; columns = 0; }
      output += char; columns += size;
    }
    return output;
  }).join("\n");
}
const terminalWidth = () => Math.max(16, (process.stdout.columns || 80) - 5);
function fitText(text: string, width: number): string {
  const singleLine = text.replace(/\s+/g, " ");
  if ([...singleLine].reduce((n, char) => n + cellWidth(char), 0) <= width) return singleLine;
  let result = "", columns = 0;
  for (const char of singleLine) {
    if (columns + cellWidth(char) > width - 1) break;
    result += char; columns += cellWidth(char);
  }
  return result + "…";
}
function fitChoices(choices: Choice[]): Choice[] {
  return choices.map(choice => {
    const label = fitText(choice.label, terminalWidth() - 3);
    const remaining = terminalWidth() - [...label].reduce((n, char) => n + cellWidth(char), 0) - 6;
    return { ...choice, label, hint: remaining >= 8 && choice.hint ? fitText(choice.hint, remaining) : undefined };
  });
}
export type PromptPort = {
  select(options: { message: string; options: Choice[]; initialValue?: string }): Promise<string | symbol>;
  multiselect(options: { message: string; options: Choice[]; initialValues: string[]; required: false }): Promise<string[] | symbol>;
  confirm(options: { message: string; initialValue: boolean; active: string; inactive: string }): Promise<boolean | symbol>;
  note(message: string, title: string): void;
};
const prompts: PromptPort = {
  select: options => clack.select({ ...options, message: wrapTerminalText(options.message, terminalWidth()), options: fitChoices(options.options), maxItems: 12 }),
  multiselect: options => clack.multiselect({ ...options, message: wrapTerminalText(options.message, terminalWidth()), options: fitChoices(options.options), maxItems: 12 }),
  confirm: options => clack.confirm({ ...options, message: wrapTerminalText(options.message, terminalWidth()) }),
  note(message, title) {
    // Clack 0.9's boxed notes measure JS string length, not Chinese display cells.
    clack.log.step(title);
    clack.log.message(wrapTerminalText(message, terminalWidth()));
  },
};

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
  ui.note("空选只安装或刷新核心能力。已安装但本次未勾选的 workflow 仍保留，不会卸载。\n空格勾选，Enter 继续；Ctrl+C / Esc 取消安装。", "选择安装内容");
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
  options: { catalog: AssetCatalog; existing: ExposureSelection; hasHistory: boolean; targets?: ProjectionHost[]; request?: SkillRequest },
  ui: PromptPort = prompts,
): Promise<ExposureSelection> {
  validateExposureRequest(options.targets, options.request);
  let targets = options.targets;
  if (targets === undefined) {
    ui.note("所有勾选位置共用一份能力清单，只需选择一次能力。\n空选关闭全部曝光；取消勾选的位置会清理未被人工修改的旧入口。\n空格勾选，Enter 继续；Ctrl+C / Esc 取消安装。", "选择曝光位置");
    targets = answer(await ui.multiselect({
      message: "选择能力曝光到哪些位置（可多选）",
      options: [
        { value: "agents", label: ".agents/skills", hint: "通用 Skill 发现目录" },
        { value: "claude", label: ".claude/skills", hint: "Claude Skill 发现目录" },
      ],
      initialValues: options.existing.targets, required: false,
    })) as ProjectionHost[];
  }
  targets = normalizeSkillTargets(targets);
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
      message: "选择曝光方式（应用到所有选中位置）",
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
        message: "选择需要整组曝光的能力（空选为全部不曝光）",
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
        message: `${group.label}：选择入口（空格勾选，Enter 返回分组页）`,
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

export function formatInstallPreview(preview: InstallPreview): string {
  const lines = [
    `目标：${preview.target}`,
    `操作：${preview.mode === "init" ? "首次安装" : "刷新"}（包含核心能力）`,
    `安装或刷新 workflow：${preview.workflowIds.join(", ") || "无，仅核心"}`,
    `保留未刷新的 workflow：${preview.retainedWorkflowIds.join(", ") || "无"}`,
  ];
  const exposure = preview.exposure;
  lines.push("", `曝光位置：${exposure.targets.map(host => `.${host}/skills`).join("、") || "无（关闭全部曝光）"}`,
    `统一能力清单：${exposure.assetIds.length} 个入口`);
  for (const [label, ids] of [["新增选择", exposure.added], ["保留选择（入口内容可刷新）", exposure.retained], ["移除选择", exposure.removed]] as const) {
    lines.push(`${label}（${ids.length}）：${ids.length ? "\n  " + ids.join("\n  ") : "无"}`);
  }
  for (const host of ["agents", "claude"] as const) {
    const p = preview.projections[host];
    if (!p.affected) continue;
    lines.push("", `.${host}/skills：${p.enabled ? "启用" : "关闭"}；预计新增 ${p.created}，更新 ${p.updated}，移除 ${p.deleted}，可用 ${p.ready}，冲突 ${p.conflicts.length}`);
    if (p.conflicts.length) lines.push(`冲突保留：\n  ${p.conflicts.join("\n  ")}`);
  }
  if (preview.warnings.length) lines.push("", "警告：", ...preview.warnings);
  return lines.join("\n");
}

export async function confirmInstallPreview(preview: InstallPreview, ui: PromptPort = prompts): Promise<boolean> {
  ui.note(formatInstallPreview(preview), "安装摘要");
  return answer(await ui.confirm({ message: "确认应用以上安装与曝光选择？", initialValue: true, active: "确认并执行", inactive: "取消" }));
}

export function createInstallUI() {
  let active: ReturnType<typeof clack.spinner> | undefined;
  const stop = (message: string, code = 0) => { active?.stop(message, code); active = undefined; };
  return {
    start(info: VersionInfo, target: string, existed: boolean) {
      clack.intro(`Speculo v${info.local} · ${existed ? "刷新安装" : "首次安装"}`);
      clack.log.info(`目标目录：${target}`);
      if (info.latest === null) clack.log.info("暂时无法检查更新，将使用当前版本继续。");
      else if (info.isOutdated) clack.log.info(`新版本 v${info.latest}；升级命令：npm i -g @namewta/speculo@${info.latest}`);
      else clack.log.success("已是最新版本");
    },
    progress(phase: InstallProgress) {
      if (phase === "staging" || phase === "committing") {
        active = clack.spinner();
        active.start(phase === "staging" ? "准备并验证安装内容…" : "应用安装与曝光选择…");
      } else stop(phase === "staged" ? "安装内容已准备并验证" : "安装事务已完成");
    },
    confirm: confirmInstallPreview,
    finish(result: SpeculoCommandResult) {
      const r = result.refresh;
      clack.log.success(`${result.mode === "init" ? "已安装" : "已刷新"}：${result.target}`);
      clack.log.info(`更新受管文件 ${r.managedFiles} 个；保留运行时文件 ${r.preservedFiles} 个。\n配置：新增 ${r.config.added}，更新 ${r.config.updated}，保留 ${r.config.preserved}，移除 ${r.config.removed}。`);
      clack.log.info(`统一选择 ${result.exposure.assetIds.length} 个入口；曝光位置：${result.exposure.targets.map(host => `.${host}/skills`).join("、") || "无"}。`);
      for (const host of ["agents", "claude"] as const) {
        const p = result.projections[host];
        if (p.affected) clack.log.info(`.${host}/skills：${p.enabled ? "启用" : "关闭"}；新增 ${p.created}，更新 ${p.updated}，移除 ${p.deleted}，可用 ${p.ready}，冲突 ${p.conflicts.length}。`);
      }
      for (const warning of result.warnings) clack.log.warn(warning);
      if (r.backupPath) clack.log.info(`保留定向备份：${r.backupPath}`);
      for (const asset of result.assets.filter(a => /^(AGENTS|CLAUDE|\.gitignore)/.test(a))) clack.log.info(`已更新：${asset}`);
      clack.outro(result.warnings.length ? "完成，存在警告；请检查上述冲突。" : "安装完成。可运行 speculo doctor 检查安装。");
    },
    fail(error: unknown) {
      stop("安装未完成", 1);
      if (error instanceof InstallCancelled) clack.cancel(error.message);
      else clack.log.error(error instanceof Error ? error.message : String(error));
    },
  };
}
