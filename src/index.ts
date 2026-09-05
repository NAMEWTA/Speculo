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
const SPECDEV_WORKTREE_IGNORE = "specdev-worktree/";
const SPECULO_BACKUP_IGNORE = "speculo/.speculo/back/";
const KNOWLEDGE_START = "<!-- SPECULO-PERSISTENT-KNOWLEDGE:START -->";
const KNOWLEDGE_END = "<!-- SPECULO-PERSISTENT-KNOWLEDGE:END -->";
const LEGACY_SPECULO_BLOCK = /<SPECULO>[\s\S]*?<\/SPECULO>/g;
const KNOWLEDGE_BLOCK = /<!-- SPECULO-PERSISTENT-KNOWLEDGE:START -->[\s\S]*?<!-- SPECULO-PERSISTENT-KNOWLEDGE:END -->/g;

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

type KnowledgeReference = { workflow: string; path: string };

async function readPersistentKnowledge(packageRoot: string, workflowIds: string[]): Promise<KnowledgeReference[]> {
  const references: KnowledgeReference[] = [];
  for (const workflowId of workflowIds) {
    const manifestPath = join(assetRoot(packageRoot), "workflows", workflowId, "manifest.json");
    let manifest: unknown;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      throw new Error("Invalid workflow manifest: " + manifestPath + " (" + String(error) + ")");
    }
    if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("Invalid workflow manifest object: " + manifestPath);
    }
    const knowledge = (manifest as { persistent_knowledge?: unknown }).persistent_knowledge;
    if (knowledge === undefined) continue;
    if (!Array.isArray(knowledge) || knowledge.some((path) => typeof path !== "string")) {
      throw new Error("workflow manifest persistent_knowledge must be a string array: " + workflowId);
    }
    for (const path of knowledge as string[]) {
      if (!/^<Path>\{roots\.state\}\/[^<]+<\/Path>$/.test(path) || path.includes("workflows/") || path.includes("_state/") || path.includes("/changes/") || path.includes("/archive/")) {
        throw new Error("Unsafe workflow manifest persistent_knowledge path: " + workflowId + " -> " + path);
      }
      references.push({ workflow: workflowId, path });
    }
  }
  return references;
}

function renderKnowledgeBlock(references: KnowledgeReference[]): string {
  if (references.length === 0) return "";
  const lines = [
    KNOWLEDGE_START,
    "## Speculo 永久知识",
    "",
    "以下路径只在当前任务相关时按需读取，不会自动激活 workflow 或 Work：",
    "",
  ];
  for (const reference of references) lines.push("- " + reference.workflow + "：" + reference.path);
  lines.push(KNOWLEDGE_END);
  return lines.join("\n");
}

function updateAgentsContent(content: string, references: KnowledgeReference[]): string {
  const next = content.replace(LEGACY_SPECULO_BLOCK, "").replace(KNOWLEDGE_BLOCK, "");
  const block = renderKnowledgeBlock(references);
  if (!block) return next;
  if (!next) return block + "\n";
  const separator = next.endsWith("\n\n") ? "" : next.endsWith("\n") ? "\n" : "\n\n";
  return next + separator + block + "\n";
}

async function writeAgentFiles(target: string, references: KnowledgeReference[]): Promise<string[]> {
  const written: string[] = [];
  const agentsPath = join(target, "AGENTS.md");
  const hadAgents = await pathExists(agentsPath);
  const beforeAgents = hadAgents ? await readFile(agentsPath, "utf8") : "";
  const afterAgents = updateAgentsContent(hadAgents ? beforeAgents : "# AGENTS.md\n", references);
  if (!hadAgents || afterAgents !== beforeAgents) {
    await writeFile(agentsPath, afterAgents, "utf8");
    written.push(hadAgents ? "AGENTS.md (updated persistent knowledge)" : "AGENTS.md (created persistent knowledge)");
  }

  const claudePath = join(target, "CLAUDE.md");
  if (!(await pathExists(claudePath))) {
    await writeFile(claudePath, "# CLAUDE.md\n\nSpeculo agent handbook: see [AGENTS.md](./AGENTS.md).\n", "utf8");
    written.push("CLAUDE.md (created redirect)");
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

type ExternalSnapshot = { path: string; existed: boolean; content?: Buffer };

async function snapshotExternalFiles(target: string): Promise<ExternalSnapshot[]> {
  const snapshots: ExternalSnapshot[] = [];
  for (const name of [".gitignore", "AGENTS.md", "CLAUDE.md"]) {
    const path = join(target, name);
    if (await pathExists(path)) snapshots.push({ path, existed: true, content: await readFile(path) });
    else snapshots.push({ path, existed: false });
  }
  return snapshots;
}

async function restoreExternalFiles(snapshots: ExternalSnapshot[]): Promise<void> {
  for (const snapshot of snapshots) {
    if (snapshot.existed) await writeFile(snapshot.path, snapshot.content ?? Buffer.alloc(0));
    else await rm(snapshot.path, { force: true });
  }
}

async function replaceInstall(stagedRoot: string, root: string, finalize?: () => Promise<void>): Promise<void> {
  const expectedFingerprint = await fingerprintTree(stagedRoot);
  if (!(await pathExists(root))) {
    await rename(stagedRoot, root);
    if (await fingerprintTree(root) !== expectedFingerprint) {
      await rename(root, stagedRoot);
      throw new Error("post-install validation failed");
    }
    try { await finalize?.(); } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
    return;
  }
  const backupRoot = stagedRoot + "-backup";
  await rename(root, backupRoot);
  try {
    await rename(stagedRoot, root);
    if (await fingerprintTree(root) !== expectedFingerprint) throw new Error("post-install validation failed");
    await finalize?.();
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
    const assets = [".speculo", "config.json", "commands", "skills"];
    assets.push(...selection.workflowIds.map((workflowId) => "workflows/" + workflowId));
    const references = await readPersistentKnowledge(packageRoot, selection.workflowIds);
    const externalSnapshot = await snapshotExternalFiles(target);
    await replaceInstall(stagedRoot, root, async () => {
      try {
        assets.push(await ensureRuntimeIgnores(target, root));
        assets.push(...await writeAgentFiles(target, references));
      } catch (error) {
        await restoreExternalFiles(externalSnapshot);
        throw error;
      }
    });
    stagedRoot = undefined;
    if (!refresh) throw new Error("Speculo refresh result was not produced");
    return { target, mode: existed ? "refresh" : "init", assets, refresh };
  } finally {
    if (stagedRoot) await rm(stagedRoot, { recursive: true, force: true });
    await rm(lockRoot, { recursive: true, force: true });
  }
}
