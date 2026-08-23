import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fingerprintTree } from "./manifest.js";
import { assertNoLegacyPending, prepareRefresh, RefreshBlockedError, type RefreshSummary } from "./refresh.js";
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
  refresh: RefreshSummary;
};

export type SpeculoOptions = {
  packageRoot?: string;
  selection?: WorkflowSelection;
  beforeCommit?: (installRoot: string) => Promise<void>;
};

const CORE_ASSETS = [".speculo", "commands", "skills", "config.json"] as const;
const INSTALL_SUBDIR = "speculo";
const WORKFLOW_ENTRY = "INDEX.md";
const STATE_TEMPLATE_DIR = "_state";
const SPECULO_TAG_RE = /<SPECULO>[\s\S]*?<\/SPECULO>/;
const SPECDEV_WORKTREE_IGNORE = "specdev-worktree/";
const SPECULO_BACKUP_IGNORE = "speculo/.speculo/back/";

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

async function copyCoreAssets(packageRoot: string, stagedRoot: string): Promise<void> {
  for (const asset of CORE_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    await cp(source, join(stagedRoot, asset), {
      recursive: asset !== "config.json",
      force: true,
    });
  }
}

function hasIgnorePattern(content: string, expected: string): boolean {
  return content.split(/\r?\n/).some((line) => {
    const pattern = line.trim();
    if (!pattern || pattern.startsWith("#") || pattern.startsWith("!")) return false;
    return pattern.replace(/^\//, "").replace(/\/$/, "") === expected.replace(/^\//, "").replace(/\/$/, "");
  });
}

async function ensureRuntimeIgnores(target: string, root: string): Promise<string> {
  const patterns = [SPECULO_BACKUP_IGNORE];
  if (await pathExists(join(root, "workflows", "specdev", WORKFLOW_ENTRY))) patterns.unshift(SPECDEV_WORKTREE_IGNORE);
  const ignorePath = join(target, ".gitignore");
  if (!(await pathExists(ignorePath))) {
    await writeFile(ignorePath, patterns.join("\n") + "\n", "utf8");
    return ".gitignore (created runtime ignores)";
  }
  let content = await readFile(ignorePath, "utf8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const missing = patterns.filter((pattern) => !hasIgnorePattern(content, pattern));
  if (missing.length === 0) return ".gitignore (preserved runtime ignores)";
  const separator = content.length === 0 || content.endsWith("\n") ? "" : newline;
  content += separator + missing.join(newline) + newline;
  await writeFile(ignorePath, content, "utf8");
  return ".gitignore (updated runtime ignores)";
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
    "`speculo init` 会直接替换受管理静态资产，并依据 refresh contract 保留用户 runtime state、合并持久配置。",
    "结构化状态不兼容时初始化会在替换前停止，当前安装保持不变。",
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

async function copySelectedWorkflow(packageRoot: string, stagedRoot: string, workflowId: string): Promise<void> {
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
}

async function copyUnselectedCurrentWorkflows(catalog: WorkflowCatalog, selection: WorkflowSelection, previousRoot: string, stagedRoot: string): Promise<void> {
  const selected = new Set(selection.workflowIds);
  for (const workflowId of catalog.keys()) {
    if (selected.has(workflowId)) continue;
    const previousWorkflow = join(previousRoot, "workflows", workflowId);
    if (await pathExists(previousWorkflow)) await cp(previousWorkflow, join(stagedRoot, "workflows", workflowId), { recursive: true, force: true });
  }
}

async function installedUnselectedWorkflowIds(catalog: WorkflowCatalog, selection: WorkflowSelection, previousRoot: string): Promise<string[]> {
  const selected = new Set(selection.workflowIds);
  const installed: string[] = [];
  for (const workflowId of catalog.keys()) {
    if (!selected.has(workflowId) && await pathExists(join(previousRoot, "workflows", workflowId, WORKFLOW_ENTRY))) installed.push(workflowId);
  }
  return installed.sort();
}

async function buildStagedInstall(
  packageRoot: string,
  target: string,
  previousRoot: string,
  catalog: WorkflowCatalog,
  selection: WorkflowSelection,
  existed: boolean,
): Promise<{ stagedRoot: string; refresh: RefreshSummary }> {
  await mkdir(target, { recursive: true });
  const stagedRoot = await mkdtemp(join(target, ".speculo-init-stage-"));
  try {
    await copyCoreAssets(packageRoot, stagedRoot);
    await copyUnselectedCurrentWorkflows(catalog, selection, previousRoot, stagedRoot);
    for (const workflowId of selection.workflowIds) await copySelectedWorkflow(packageRoot, stagedRoot, workflowId);
    const unselectedWorkflowIds = await installedUnselectedWorkflowIds(catalog, selection, previousRoot);
    const refresh = await prepareRefresh({
      packageRoot,
      previousRoot,
      stagedRoot,
      selectedWorkflowIds: selection.workflowIds,
      installedWorkflowIds: [...new Set([...selection.workflowIds, ...unselectedWorkflowIds])].sort(),
      existed,
    });
    return { stagedRoot, refresh };
  } catch (error) {
    await rm(stagedRoot, { recursive: true, force: true });
    throw error;
  }
}

async function replaceInstall(stagedRoot: string, root: string): Promise<void> {
  const expectedFingerprint = await fingerprintTree(stagedRoot);
  if (!(await pathExists(root))) {
    await rename(stagedRoot, root);
    if (await fingerprintTree(root) !== expectedFingerprint) {
      await rename(root, stagedRoot);
      throw new Error("post-install validation failed");
    }
    return;
  }
  const backupRoot = stagedRoot + "-backup";
  await rename(root, backupRoot);
  try {
    await rename(stagedRoot, root);
    if (await fingerprintTree(root) !== expectedFingerprint) throw new Error("post-install validation failed");
  } catch (error) {
    try {
      if (await pathExists(root)) await rename(root, stagedRoot);
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
  await mkdir(target, { recursive: true });
  const lockRoot = join(target, ".speculo-init.lock");
  try {
    await mkdir(lockRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    throw new RefreshBlockedError([{ code: "refresh-locked", path: lockRoot, message: "another speculo init is already running" }]);
  }
  let stagedRoot: string | undefined;
  let refresh: RefreshSummary | undefined;
  try {
    if (existed) await assertNoLegacyPending(root);
    const catalog = await discoverWorkflowCatalog(packageRoot);
    const selection = await resolveSelection(packageRoot, root, options);
    const initialFingerprint = await fingerprintTree(root);
    const staged = await buildStagedInstall(packageRoot, target, root, catalog, selection, existed);
    stagedRoot = staged.stagedRoot;
    refresh = staged.refresh;
    await options.beforeCommit?.(root);
    if (await fingerprintTree(root) !== initialFingerprint) {
      throw new RefreshBlockedError([{
        code: "concurrent-drift",
        path: "speculo",
        message: "the active installation changed while refresh staging was in progress",
      }]);
    }
    await replaceInstall(stagedRoot, root);
    stagedRoot = undefined;
    const assets = [".speculo", "config.json", "commands", "skills"];
    assets.push(...selection.workflowIds.map((workflowId) => "workflows/" + workflowId));
    const gitignoreResult = await ensureRuntimeIgnores(target, root);
    assets.push(gitignoreResult);
    assets.push(...await writeAgentFiles(target, packageRoot, selection));
    if (!refresh) throw new Error("Speculo refresh result was not produced");
    return { target, mode: existed ? "refresh" : "init", assets, refresh };
  } finally {
    if (stagedRoot) await rm(stagedRoot, { recursive: true, force: true });
    await rm(lockRoot, { recursive: true, force: true });
  }
}
