import * as clack from "@clack/prompts";
import pc from "picocolors";
import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import { stripVTControlCharacters } from "node:util";
import type { DoctorResult } from "./doctor.js";
import { formatVersionBanner, type VersionInfo } from "./version.js";

export function terminalColors(stream: { isTTY?: boolean } = process.stdout, env = process.env) {
  return pc.createColors(stream.isTTY === true && !("NO_COLOR" in env) && env.FORCE_COLOR !== "0" && env.TERM !== "dumb");
}

export const color = terminalColors();
export const terminalWidth = () => Math.max(8, (process.stdout.columns || 80) - 5);

export function wrapTerminalText(text: string, width: number): string {
  return wrapAnsi(text, Math.max(1, width), { hard: true, trim: false, wordWrap: false });
}

export function promptMessage(message: string): string {
  return wrapTerminalText(message, terminalWidth()).replaceAll("\n", `\n${color.gray("│")}  `);
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export function fitTerminalText(text: string, width: number): string {
  const plain = stripVTControlCharacters(text).replace(/\s+/g, " ");
  if (stringWidth(plain) <= width) return plain;
  if (width < 1) return "";
  let result = "", columns = 0;
  for (const { segment } of graphemes.segment(plain)) {
    const size = stringWidth(segment);
    if (columns + size > width - 1) break;
    result += segment;
    columns += size;
  }
  return result + "…";
}

// Reserve the guide, wrapped message, bottom border and a spare terminal row.
export function visibleChoiceCount(count: number, message: string, rows = process.stdout.rows || 24, width = terminalWidth()): number {
  return Math.max(1, Math.min(count, rows - wrapTerminalText(message, width).split("\n").length - 4));
}

export type TerminalChoice = { value: string; label: string; hint?: string; tone?: "selected" | "action" };
export function fitChoices(choices: TerminalChoice[], width = terminalWidth()): TerminalChoice[] {
  return choices.map(choice => {
    const plainLabel = fitTerminalText(choice.label, width - 2);
    const remaining = width - stringWidth(plainLabel) - 5;
    return {
      ...choice,
      label: choice.tone === "selected" ? color.green(plainLabel) : choice.tone === "action" ? color.cyan(plainLabel) : plainLabel,
      hint: remaining >= 8 && choice.hint ? fitTerminalText(choice.hint, remaining) : undefined,
    };
  });
}

export function note(message: string, title: string): void {
  // Use the same display-width wrapping as other Speculo terminal messages.
  clack.log.step(color.bold(color.cyan(title)));
  clack.log.message(wrapTerminalText(message, terminalWidth()));
}

export function logMessage(kind: "info" | "success" | "warn", message: string): void {
  clack.log[kind](wrapTerminalText(message, terminalWidth()));
}

export function printError(message: string): void {
  if (!process.stderr.isTTY) { console.error(message); return; }
  const c = terminalColors(process.stderr);
  const body = wrapTerminalText(message, Math.max(8, (process.stderr.columns || 80) - 5));
  console.error(`\n${c.red("■")}  ${c.bold("错误")}\n   ${body.replaceAll("\n", "\n   ")}\n`);
}

export function printBlocker(blocker: { code: string; path: string; message: string }): void {
  const c = terminalColors(process.stderr);
  const text = `${c.red(blocker.code)} ${c.dim(blocker.path)}: ${blocker.message}`;
  console.error("  " + wrapTerminalText(text, Math.max(8, (process.stderr.columns || 80) - 3)).replaceAll("\n", "\n  "));
}

export function printVersion(info: VersionInfo): void {
  if (!process.stdout.isTTY) { console.log(formatVersionBanner(info)); return; }
  clack.intro(`${color.bold(color.cyan("Speculo"))} ${color.dim(`v${info.local}`)}`);
  versionStatus(info);
  clack.outro(color.dim("speculo --help 查看命令"));
}

export function versionStatus(info: VersionInfo): void {
  if (info.latest === null) logMessage("info", color.dim("暂时无法检查更新，将使用当前版本继续。"));
  else if (info.isOutdated) logMessage("info", `新版本 ${color.cyan(`v${info.latest}`)}\n升级：${color.cyan(`npm i -g @namewta/speculo@${info.latest}`)}`);
  else logMessage("success", color.dim("已是最新版本"));
}

export function printDoctor(result: DoctorResult): void {
  if (!process.stdout.isTTY) {
    for (const check of result.checks) console.log(`${check.ok ? "ok" : "fail"} ${check.id}: ${check.message}`);
    console.log(`scope: ${result.scope}; not checked: ${result.notChecked.join(", ")}`);
    return;
  }
  clack.intro(`${color.bold(color.cyan("Speculo"))} ${color.dim("· 安装检查")}`);
  logMessage("info", color.dim(result.target));
  for (const check of result.checks) {
    const message = `${color.bold(check.id)}\n${check.message}`;
    if (check.ok) logMessage("success", message);
    else clack.log.error(wrapTerminalText(message, terminalWidth()));
  }
  note(`检查范围：${result.scope}\n未检查：${result.notChecked.join("、") || "无"}`, "检查范围");
  const failed = result.checks.filter(check => !check.ok).length;
  clack.outro(result.healthy ? color.green(`检查通过 · ${result.checks.length} 项`) : color.yellow(`检查未通过 · ${failed} 项异常，请查看上方详情`));
}

export function formatHelp(): string {
  const heading = (text: string) => color.bold(color.cyan(text));
  const lines = [
    `${heading("Speculo")}  ${color.dim("安装与管理你的 Agent 能力")}`,
    "",
    heading("用法"),
    "  speculo [init] [target]",
    "  speculo version",
    "  speculo doctor [target] [--json]",
    "  speculo recover [target] --transaction <id>",
    "  speculo resolve [target] --path <reference>",
    "",
    heading("命令"),
    `  ${color.cyan("init")}      安装或刷新；按分类选择 Skills Hub 与 Workflows`,
    `  ${color.cyan("version")}   查看版本并检查更新`,
    `  ${color.cyan("doctor")}    只读检查安装完整性与恢复证据；--json 输出 JSON`,
    `  ${color.cyan("recover")}   按事务 ID 显式恢复中断安装，或完成已提交事务的清理`,
    `  ${color.cyan("resolve")}   只读解析 Path 引用，输出本地路径`,
    "",
    heading("安装选项"),
    "  --workflows <all|none|id,id>    选择 Workflow",
    "  --core-only                   仅安装核心，与 --workflows 互斥",
    "  --hub-skills <selection>       none | keep | all | category/name,...",
    "  --skill-targets <targets>      agents | claude | agents,claude | none",
    "  --skills <selection>           none | keep | all | business-id,...",
    "",
    heading("交互说明"),
    "  Hub 分类与 Workflow 同层展示；进入分类后多选 Skill。",
    "  所有安装位置共用能力曝光清单：全部、按组、自定义、保留或不曝光。",
    "  受管能力按当前安装包刷新，覆盖本地修改；取消勾选移除受管文件，保留运行时数据和用户附加文件。",
    "  交互启动检查 CLI 更新；SPECULO_NO_UPDATE_CHECK=1 可关闭。",
    "  非交互首次安装默认仅核心；刷新沿用已有受支持 Workflow。",
    "",
    heading("示例"),
    "  speculo init",
    "  speculo init ./project --workflows learning,specdev",
    "  speculo doctor ./project",
  ];
  return wrapTerminalText(lines.join("\n"), process.stdout.columns || 80);
}
