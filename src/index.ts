import { INSTALL_ROOT, DEFAULT_ROOTS, readWorkspace, validateWorkspace } from "./paths.js";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { planExternalEdits, readPersistentKnowledge, writeDiscoveryAssets } from "./agent-files.js";
import { planSkillProjection, resolveExposure, validateExposureRequest, type SkillRequest, type ProjectionHost, type ExposureSummary, type ProjectionSummaries } from "./agent-skills.js";
import { discoverHubCatalog, readHubManifest, resolveHubIds, planHubSkills, type HubSummary } from "./hub-skills.js";
import { planWorkflowRemoval, writeRemovalMetadata, type WorkflowRemoval } from "./workflow-install.js";
import { readAssetCatalog } from "./assets.js";
import { InstallCancelled } from "./interaction.js";
import { assertImage, snapshotExternalFiles, writeDurableJson } from "./external-files.js";
import { assertInstallDirectory, cleanEmptyTransactionsDirectory, commitInstall, hasTransaction, LOCK_NAME, TRANSACTIONS_ROOT, type TransactionHook } from "./transaction.js";
import { fingerprintTree } from "./manifest.js";
import { prepareRefresh, loadWorkflowContract, RefreshBlockedError, type RefreshSummary } from "./refresh.js";
import { pathExists } from "./utils.js";
import {
  discoverWorkflowCatalog,
  isInteractive,
  scanInstalledWorkflows,
  readInstalledWorkflowIds,
  type WorkflowSelection,
} from "./workflows.js";

export type SpeculoCommandResult = {
  target: string;
  mode: "init" | "refresh";
  assets: string[];
  refresh: RefreshSummary;
  exposure: ExposureSummary & { projected: number };
  projections: ProjectionSummaries;
  warnings: string[];
  hub: HubSummary;
  removedWorkflowIds: string[];
};

export type InstallProgress = "staging" | "staged" | "committing" | "committed";
export type InstallPreview = {
  target: string;
  mode: "init" | "refresh";
  workflowIds: string[];
  retainedWorkflowIds: string[];
  removedWorkflowIds?: string[];
  hub?: HubSummary;
  exposure: ExposureSummary;
  projections: ProjectionSummaries;
  warnings: string[];
};

export type SpeculoOptions = {
  packageRoot?: string;
  selection?: WorkflowSelection;
  skillTargets?: ProjectionHost[];
  skills?: SkillRequest;
  hubSkills?: SkillRequest;
  /** Ask once for missing exposure options after staging; library calls default to non-interactive. */
  promptExposure?: boolean;
  /** Called after staging and validation, before any active installation changes. */
  confirmInstall?: (preview: InstallPreview) => Promise<boolean>;
  onProgress?: (phase: InstallProgress) => void;
  beforeCommit?: (installRoot: string) => Promise<void>;
  /** Test/integration fault-injection seam; never enabled through environment variables. */
  transactionHook?: TransactionHook;
};

const CORE_ASSETS = [".speculo", "commands", "references", "lib", "config.json"] as const;
const INSTALL_SUBDIR = INSTALL_ROOT;
const WORKFLOW_ENTRY = "SKILL.md";
const STATE_TEMPLATE_DIR = "_state";
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
      // Tooling may import bundled fixtures; its local cache is not a skill asset.
      filter: (path) => basename(path) !== ".gradle",
    });
  }
}

async function copySelectedWorkflow(packageRoot: string, stagedRoot: string, workflowId: string): Promise<void> {
  const source = join(assetRoot(packageRoot), "workflows", workflowId);
  if (!(await pathExists(join(source, WORKFLOW_ENTRY)))) throw new Error("Unknown workflow package: " + workflowId);
  await cp(source, join(stagedRoot, "workflows", workflowId), {
    recursive: true,
    force: true,
    filter: (path) => basename(path) !== STATE_TEMPLATE_DIR,
  });
  const contract = await loadWorkflowContract(stagedRoot, workflowId);
  const stateSource = join(source, STATE_TEMPLATE_DIR);
  if (!(await pathExists(stateSource))) {
    if (contract.state_seed === "optional") return;
    throw new Error("Workflow " + workflowId + " is missing required _state/");
  }
  const stagedState = join(stagedRoot, ".speculo", workflowId);
  await cp(stateSource, stagedState, { recursive: true, force: true });
}

async function buildStagedInstall(
  packageRoot: string,
  target: string,
  previousRoot: string,
  removal: WorkflowRemoval,
  selection: WorkflowSelection,
  existed: boolean,
): Promise<{ stagedRoot: string; refresh: RefreshSummary }> {
  await mkdir(target, { recursive: true });
  await mkdir(join(target, TRANSACTIONS_ROOT), { recursive: true });
  const stagedRoot = await mkdtemp(join(target, TRANSACTIONS_ROOT, "stage-"));
  try {
    await copyCoreAssets(packageRoot, stagedRoot);
    for (const id of removal.retained) await cp(join(previousRoot, "workflows", id), join(stagedRoot, "workflows", id), { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
    for (const workflowId of selection.workflowIds) await copySelectedWorkflow(packageRoot, stagedRoot, workflowId);

    const workspace = { schema_version: 2, layout_version: "agents-v2", installation_id: existed ? (await readWorkspace(target)).installation_id : randomUUID(), path_base: "project-root", roots: DEFAULT_ROOTS };
    validateWorkspace(workspace);
    await writeFile(join(stagedRoot, ".speculo", "workspace.json"), JSON.stringify(workspace, null, 2) + "\n");
    await writeDiscoveryAssets(packageRoot, stagedRoot);
    const refresh = await prepareRefresh({
      packageRoot,
      previousRoot,
      stagedRoot,
      selectedWorkflowIds: selection.workflowIds,
      retainedWorkflowIds: removal.retained,
      installedWorkflowIds: [...new Set([...selection.workflowIds, ...removal.retained])].sort(),
      existed,
    });
    await writeRemovalMetadata(stagedRoot, removal);
    for (const id of removal.retained) if (await fingerprintTree(join(previousRoot, "workflows", id)) !== await fingerprintTree(join(stagedRoot, "workflows", id))) throw new Error("retained-workflow-drift: " + id);
    return { stagedRoot, refresh };
  } catch (error) {
    await rm(stagedRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function initSpeculo(targetArg = ".", options: SpeculoOptions = {}): Promise<SpeculoCommandResult> {
  validateExposureRequest(options.skillTargets, options.skills);
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);
  await assertInstallDirectory(target);
  if (options.skillTargets?.length === 0) {
    const currentHub = await readHubManifest(target);
    const ids = resolveHubIds(options.hubSkills, await discoverHubCatalog(packageRoot), currentHub?.packages.map(p => p.id) ?? []);
    if (ids.length) throw new Error("--hub-skills requires at least one --skill-targets destination");
  }
  const existed = await pathExists(root);
  // Reject unsafe handbook nodes before creating installation scaffolding.
  // The authoritative snapshot is still retaken after acquiring the lock.
  await snapshotExternalFiles(target);
  await mkdir(target, { recursive: true });
  await mkdir(join(target, ".agents"), { recursive: true });
  const lockRoot = join(target, LOCK_NAME);
  try {
    await mkdir(lockRoot, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    throw new RefreshBlockedError([{ code: "refresh-locked", path: lockRoot, message: "another speculo init is already running" }]);
  }
  let stagedRoot: string | undefined;
  let refresh: RefreshSummary | undefined;
  let failure: unknown;
  try {
    await writeFile(join(lockRoot, ".gitignore"), "*\n", { mode: 0o600 });
    await writeDurableJson(join(lockRoot, "owner.json"), { schema_version: 1, id: randomUUID(), host: hostname(), pid: process.pid, started_at: new Date().toISOString() });
    const externalSnapshot = await snapshotExternalFiles(target);
    const initialFingerprint = await fingerprintTree(root);

    const catalog = await discoverWorkflowCatalog(packageRoot);
    const hubCatalog = await discoverHubCatalog(packageRoot), hubManifest = await readHubManifest(target);
    const installedBefore = await readInstalledWorkflowIds(root);
    let workflowIds = [...new Set(options.selection?.workflowIds ?? installedBefore)].sort();
    for (const id of workflowIds) if (!catalog.has(id)) throw new Error("Unavailable workflow: " + id + "; explicitly select a new list or none");
    const priorHubIds = [...new Set(hubManifest?.packages.map(p => p.id) ?? [])];
    let hubIds = resolveHubIds(options.hubSkills, hubCatalog, priorHubIds);
    if (isInteractive() && options.promptExposure && (!options.selection || !options.hubSkills)) {
      const { promptPackages } = await import("./install-ui.js");
      ({ workflowIds, hubIds } = await promptPackages({ workflows: catalog, hub: hubCatalog, workflowIds, hubIds, chooseWorkflows: !options.selection, chooseHub: !options.hubSkills }));
    }
    if (hubIds.length && options.skillTargets?.length === 0) throw new Error("--hub-skills requires at least one --skill-targets destination");
    const selection = { workflowIds };
    const removal = await planWorkflowRemoval(target, root, installedBefore, workflowIds);
    options.onProgress?.("staging");
    const staged = await buildStagedInstall(packageRoot, target, root, removal, selection, existed);
    stagedRoot = staged.stagedRoot;
    refresh = staged.refresh;
    options.onProgress?.("staged");
    await options.beforeCommit?.(root);
    if (await fingerprintTree(root) !== initialFingerprint) {
      throw new RefreshBlockedError([{
        code: "concurrent-drift",
        path: INSTALL_ROOT,
        message: "the active installation changed while refresh staging was in progress",
      }]);
    }
    const assets = [".speculo", "config.json", "commands", "references", "lib"];
    assets.push(...selection.workflowIds.map((workflowId) => "workflows/" + workflowId));
    const installed = await scanInstalledWorkflows(stagedRoot);
    const references = await readPersistentKnowledge(stagedRoot, installed);
    const edits = planExternalEdits(externalSnapshot, references, installed.includes("specdev"));
    for (const edit of edits) await assertImage(join(target, edit.name), edit.before);
    const assetCatalog = await readAssetCatalog(stagedRoot);
    const exposure = await resolveExposure({
      target, catalog: assetCatalog, targets: options.skillTargets, request: options.skills, prompt: options.promptExposure === true,
      removedAssetIds: removal.removedAssetIds, hubSelected: hubIds.length > 0, defaultTargets: hubManifest ? [...new Set([...hubManifest.targets, ...hubManifest.packages.filter(p => hubIds.includes(p.id)).map(p => p.host)])] : undefined,
    });
    const projection = await planSkillProjection({ target, stagedRoot, packageVersion: refresh.targetVersion, exposure });
    if (projection.blockers.length) throw new RefreshBlockedError(projection.blockers);
    const removalDrift = projection.warnings.filter(w => removal.removedAssetIds.some(id => w.path.endsWith(":" + id)));
    if (removalDrift.length) throw new RefreshBlockedError(removalDrift);
    const hub = await planHubSkills({ target, stagedRoot, packageVersion: refresh.targetVersion, catalog: hubCatalog, ids: hubIds, targets: exposure.targets });
    const warnings = [...removal.warnings, ...projection.warnings.map(w => `${w.code} ${w.path}: ${w.message}`), ...hub.warnings];
    if (options.confirmInstall && !await options.confirmInstall({
      target, mode: existed ? "refresh" : "init", workflowIds: selection.workflowIds,
      retainedWorkflowIds: installed.filter(id => !selection.workflowIds.includes(id)),
      exposure: projection.exposure, projections: projection.summaries, warnings, hub: hub.summary, removedWorkflowIds: removal.removed,
    })) throw new InstallCancelled(0);
    options.onProgress?.("committing");
    const removedProjectionPaths = new Set(removal.projectionRecords.map(r => r.name));
    await commitInstall(target, stagedRoot, initialFingerprint, edits, options.transactionHook, [
      ...(projection.records ?? []).filter(r => !removedProjectionPaths.has(r.name)), ...removal.projectionRecords, ...hub.records,
    ]);
    assets.push(...edits.map((edit) => edit.name + " (managed discovery/runtime references)"));
    stagedRoot = undefined;
    options.onProgress?.("committed");
    if (!refresh) throw new Error("Speculo refresh result was not produced");
    return { target, mode: existed ? "refresh" : "init", assets, refresh, exposure: { ...projection.exposure, projected: projection.count }, projections: projection.summaries, warnings, hub: hub.summary, removedWorkflowIds: removal.removed };
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    // A failed rollback or killed process leaves durable evidence; never delete it in finally.
    if (!(await hasTransaction(target))) {
      try {
        if (stagedRoot) await rm(stagedRoot, { recursive: true, force: true });
        await cleanEmptyTransactionsDirectory(target);
        await rm(lockRoot, { recursive: true, force: true });
      } catch (cleanupError) {
        // Preserve the original error as well as the lock/residue for inspection.
        throw new Error(`installation-cleanup-failed: ${String(cleanupError)}${failure === undefined ? "" : `; original error: ${String(failure)}`}`, { cause: failure ?? cleanupError });
      }
    }
  }
}
