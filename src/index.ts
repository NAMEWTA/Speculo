import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathExists } from "./utils.js";
import {
  discoverWorkflowCatalog,
  isInteractive,
  promptWorkflowSelection,
  scanInstalledWorkflows,
  selectAllFromCatalog,
  type WorkflowCatalog,
  type WorkflowSelection,
} from "./workflows.js";

export type SpeculoCommandResult = {
  target: string;
  mode: "init" | "refresh";
  assets: string[];
};

export type SpeculoOptions = {
  packageRoot?: string;
  selection?: WorkflowSelection;
};

const CORE_ASSETS = [".speculo", "commands", "skills", "config.json"] as const;
const INSTALL_SUBDIR = "speculo";
const WORKFLOW_ENTRY = "INDEX.md";
const STATE_TEMPLATE_DIR = "_state";
const SPECULO_TAG_RE = /<SPECULO>[\s\S]*?<\/SPECULO>/;
const SPECDEV_WORKTREE_IGNORE = "specdev-worktree/";

function assetRoot(packageRoot: string): string {
  return join(packageRoot, "template");
}

function installRoot(target: string): string {
  return join(target, INSTALL_SUBDIR);
}

async function ensureAssetSource(packageRoot: string, asset: string): Promise<string> {
  const source = join(assetRoot(packageRoot), asset);
  if (!(await pathExists(source))) {
    throw new Error("Missing packaged Speculo asset: template/" + asset);
  }
  return source;
}

async function copyDirectoryContents(source: string, destination: string): Promise<void> {
  if (!(await pathExists(source))) return;
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    await cp(join(source, entry.name), join(destination, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
}

async function copyCoreAssets(packageRoot: string, stagedRoot: string): Promise<void> {
  for (const asset of CORE_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    await cp(source, join(stagedRoot, asset), {
      recursive: asset !== "config.json",
      force: true,
    });
  }
}

async function copyCommandReports(source: string, destination: string): Promise<void> {
  if (!(await pathExists(source))) return;
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourceEntry = join(source, entry.name);
    const destinationEntry = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyCommandReports(sourceEntry, destinationEntry);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      await mkdir(dirname(destinationEntry), { recursive: true });
      await cp(sourceEntry, destinationEntry, { force: true });
    }
  }
}

function hasSpecdevWorktreeIgnore(content: string): boolean {
  return content.split(/\r?\n/).some((line) => {
    const pattern = line.trim();
    if (!pattern || pattern.startsWith("#") || pattern.startsWith("!")) return false;
    return pattern.replace(/^\//, "").replace(/\/$/, "") === "specdev-worktree";
  });
}

async function ensureSpecdevWorktreeIgnore(target: string, root: string): Promise<string | undefined> {
  if (!(await pathExists(join(root, "workflows", "specdev", WORKFLOW_ENTRY)))) return undefined;
  const ignorePath = join(target, ".gitignore");
  if (!(await pathExists(ignorePath))) {
    await writeFile(ignorePath, SPECDEV_WORKTREE_IGNORE + "\n", "utf8");
    return ".gitignore (created specdev-worktree/)";
  }
  const content = await readFile(ignorePath, "utf8");
  if (hasSpecdevWorktreeIgnore(content)) return ".gitignore (preserved specdev-worktree/)";
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const separator = content.length === 0 || content.endsWith("\n") ? "" : newline;
  await writeFile(ignorePath, content + separator + SPECDEV_WORKTREE_IGNORE + newline, "utf8");
  return ".gitignore (updated specdev-worktree/)";
}

function generateSpeculoContent(selection: WorkflowSelection): string {
  const lines = [
    "## Speculo 运行时配置",
    "",
    "### 初始化状态检查",
    "",
    "运行时必须读取以下文件以确认 Speculo 初始化状态：",
    "",
    "- ./speculo/.speculo/workspace.json — 工作区根别名配置",
    "- ./speculo/config.json — 项目配置文件",
    "",
    "若上述文件不存在或内容为空，说明项目尚未完成 Speculo 初始化。",
    "此时必须提示用户：请先运行 speculo init 完成初始化配置。",
    "",
  ];
  if (selection.workflowIds.length > 0) {
    lines.push("### 工作流入口（强制读取）", "", "初始化时已选择以下工作流，运行时必须强制读取对应入口文件：", "");
    for (const workflowId of [...selection.workflowIds].sort()) {
      lines.push("- ./speculo/workflows/" + workflowId + "/INDEX.md");
    }
    lines.push("");
  }
  return "<SPECULO>\n" + lines.join("\n") + "</SPECULO>";
}

async function writeAgentFiles(target: string, packageRoot: string, selection: WorkflowSelection): Promise<string[]> {
  const written: string[] = [];
  const speculoBlock = generateSpeculoContent(selection);
  const claudePath = join(target, "CLAUDE.md");
  if (!(await pathExists(claudePath))) {
    const claudeTemplate = join(assetRoot(packageRoot), "CLAUDE.md");
    if (await pathExists(claudeTemplate)) {
      await cp(claudeTemplate, claudePath);
    } else {
      await writeFile(claudePath, "# CLAUDE.md\n\n必须查看 [@AGENTS.md](./AGENTS.md) 文档，按照 Speculo 规范进行开发。\n", "utf8");
    }
    written.push("CLAUDE.md");
  }
  const agentsPath = join(target, "AGENTS.md");
  if (await pathExists(agentsPath)) {
    let content = await readFile(agentsPath, "utf8");
    const hasBlock = SPECULO_TAG_RE.test(content);
    content = hasBlock ? content.replace(SPECULO_TAG_RE, speculoBlock) : content.trimEnd() + "\n\n" + speculoBlock + "\n";
    await writeFile(agentsPath, content, "utf8");
    written.push(hasBlock ? "AGENTS.md (updated <SPECULO>)" : "AGENTS.md (appended <SPECULO>)");
  } else {
    const agentsTemplate = join(assetRoot(packageRoot), "AGENTS.md");
    let content = await (await pathExists(agentsTemplate)
      ? readFile(agentsTemplate, "utf8")
      : Promise.resolve("# AGENTS.md\n\n<SPECULO>\n</SPECULO>\n"));
    content = content.replace(SPECULO_TAG_RE, speculoBlock);
    await writeFile(agentsPath, content, "utf8");
    written.push("AGENTS.md");
  }
  return written;
}

async function resolveSelection(packageRoot: string, currentRoot: string, options: SpeculoOptions): Promise<WorkflowSelection> {
  const catalog = await discoverWorkflowCatalog(packageRoot);
  if (options.selection) {
    const ids = [...new Set(options.selection.workflowIds)].sort();
    for (const id of ids) if (!catalog.has(id)) throw new Error("Unknown workflow package: " + id);
    return { workflowIds: ids };
  }
  if (!isInteractive()) return selectAllFromCatalog(catalog);
  const installed = new Set(await scanInstalledWorkflows(currentRoot));
  return promptWorkflowSelection(catalog, {
    preSelectedWorkflowIds: new Set([...installed].filter((workflowId) => catalog.has(workflowId))),
  });
}

async function copySelectedWorkflow(packageRoot: string, previousRoot: string, stagedRoot: string, workflowId: string): Promise<void> {
  const source = join(assetRoot(packageRoot), "workflows", workflowId);
  if (!(await pathExists(join(source, WORKFLOW_ENTRY)))) throw new Error("Unknown workflow package: " + workflowId);
  await cp(source, join(stagedRoot, "workflows", workflowId), {
    recursive: true,
    force: true,
    filter: (path) => basename(path) !== STATE_TEMPLATE_DIR,
  });
  const stateSource = join(source, STATE_TEMPLATE_DIR);
  if (!(await pathExists(stateSource))) throw new Error("Workflow " + workflowId + " is missing _state/");
  const stagedState = join(stagedRoot, ".speculo", workflowId);
  await cp(stateSource, stagedState, { recursive: true, force: true });
  for (const preservedDirectory of ["changes", "archive"]) {
    await copyDirectoryContents(join(previousRoot, ".speculo", workflowId, preservedDirectory), join(stagedState, preservedDirectory));
  }
}

async function copyUnselectedCurrentWorkflows(catalog: WorkflowCatalog, selection: WorkflowSelection, previousRoot: string, stagedRoot: string): Promise<void> {
  const selected = new Set(selection.workflowIds);
  for (const workflowId of catalog.keys()) {
    if (selected.has(workflowId)) continue;
    const previousWorkflow = join(previousRoot, "workflows", workflowId);
    const previousState = join(previousRoot, ".speculo", workflowId);
    if (await pathExists(previousWorkflow)) await cp(previousWorkflow, join(stagedRoot, "workflows", workflowId), { recursive: true, force: true });
    if (await pathExists(previousState)) await cp(previousState, join(stagedRoot, ".speculo", workflowId), { recursive: true, force: true });
  }
}

async function buildStagedInstall(packageRoot: string, target: string, previousRoot: string, catalog: WorkflowCatalog, selection: WorkflowSelection): Promise<string> {
  await mkdir(target, { recursive: true });
  const stagedRoot = await mkdtemp(join(target, ".speculo-init-stage-"));
  try {
    await copyCoreAssets(packageRoot, stagedRoot);
    await copyCommandReports(join(previousRoot, ".speculo", "commands"), join(stagedRoot, ".speculo", "commands"));
    await copyUnselectedCurrentWorkflows(catalog, selection, previousRoot, stagedRoot);
    for (const workflowId of selection.workflowIds) await copySelectedWorkflow(packageRoot, previousRoot, stagedRoot, workflowId);
    return stagedRoot;
  } catch (error) {
    await rm(stagedRoot, { recursive: true, force: true });
    throw error;
  }
}

async function replaceInstall(stagedRoot: string, root: string): Promise<void> {
  if (!(await pathExists(root))) {
    await rename(stagedRoot, root);
    return;
  }
  const backupRoot = stagedRoot + "-backup";
  await rename(root, backupRoot);
  try {
    await rename(stagedRoot, root);
  } catch (error) {
    try {
      await rename(backupRoot, root);
    } catch (rollbackError) {
      throw new Error("Failed to replace Speculo installation and restore the previous installation: " + String(rollbackError));
    }
    throw error;
  }
  await rm(backupRoot, { recursive: true, force: true });
}

export async function initSpeculo(targetArg = ".", options: SpeculoOptions = {}): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);
  const existed = await pathExists(root);
  const catalog = await discoverWorkflowCatalog(packageRoot);
  const selection = await resolveSelection(packageRoot, root, options);
  let stagedRoot: string | undefined;
  try {
    stagedRoot = await buildStagedInstall(packageRoot, target, root, catalog, selection);
    await replaceInstall(stagedRoot, root);
    stagedRoot = undefined;
  } finally {
    if (stagedRoot) await rm(stagedRoot, { recursive: true, force: true });
  }
  const assets = [".speculo", "config.json", "commands", "skills"];
  assets.push(...selection.workflowIds.map((workflowId) => "workflows/" + workflowId));
  const gitignoreResult = await ensureSpecdevWorktreeIgnore(target, root);
  if (gitignoreResult) assets.push(gitignoreResult);
  assets.push(...await writeAgentFiles(target, packageRoot, selection));
  return { target, mode: existed ? "refresh" : "init", assets };
}
