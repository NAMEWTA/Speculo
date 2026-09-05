import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { assertJsonObject, reconcileConfig, type ConfigMergeStats, type JsonObject } from "./config.js";
import { collectFiles, toPosix, type ManagedFileRecord } from "./manifest.js";
import { readSpecdevConfig, validateStructuredRuntime, validateSpecdevConfig, type StructuredChange } from "./structured.js";
import { pathExists } from "./utils.js";

export type RefreshBlocker = {
  code: string;
  path: string;
  message: string;
};

export class RefreshBlockedError extends Error {
  readonly blockers: RefreshBlocker[];

  constructor(blockers: RefreshBlocker[]) {
    super("Speculo refresh is blocked; the existing installation was not changed.");
    this.name = "RefreshBlockedError";
    this.blockers = blockers;
  }
}

export type RefreshSummary = {
  status: "initialized" | "updated";
  sourceVersion: string | null;
  targetVersion: string;
  managedFiles: number;
  preservedFiles: number;
  config: ConfigMergeStats;
  structuredUpgrades: number;
  backupPath: string | null;
};

export type PrepareRefreshOptions = {
  packageRoot: string;
  previousRoot: string;
  stagedRoot: string;
  selectedWorkflowIds: string[];
  installedWorkflowIds: string[];
  existed: boolean;
};

type RefreshContract = {
  schema_version: number;
  runtime_root: string;
  managed_roots: string[];
  managed_metadata: string[];
  reserved_runtime: string[];
  project_config: {
    path: string;
    baseline: string;
    schema_version: number;
    additional_properties: boolean;
  };
};

type WorkflowRuntimeContract = {
  schema_version: number;
  workflow: string;
  config: null | {
    path: string;
    template: string;
    baseline: string;
    schema_version: number;
    optional: boolean;
    additional_properties: Record<string, boolean>;
  };
  structured_state: string[];
  opaque_default: string;
};

type BackupItem = {
  sourcePath: string;
  before: Buffer;
  reason: string;
};

const EMPTY_STATS: ConfigMergeStats = { added: 0, updated: 0, preserved: 0, removed: 0 };

function addStats(target: ConfigMergeStats, next: ConfigMergeStats): void {
  target.added += next.added;
  target.updated += next.updated;
  target.preserved += next.preserved;
  target.removed += next.removed;
}

async function readJson(path: string, label: string): Promise<JsonObject> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new RefreshBlockedError([{ code: "invalid-json", path: label, message: String(error) }]);
  }
  try {
    assertJsonObject(value, label);
  } catch (error) {
    throw new RefreshBlockedError([{ code: "invalid-config", path: label, message: String(error) }]);
  }
  return value;
}

async function packageVersion(packageRoot: string): Promise<string> {
  const manifest = await readJson(join(packageRoot, "package.json"), "package.json");
  if (typeof manifest.version !== "string") throw new Error("package.json has no version");
  return manifest.version;
}

async function sourceVersion(previousRoot: string): Promise<string> {
  const path = join(previousRoot, ".speculo", "install.json");
  if (!(await pathExists(path))) {
    throw new RefreshBlockedError([{
      code: "legacy-installation",
      path: ".speculo/install.json",
      message: "Speculo 1.0 requires a schema v3 install manifest; remove or rename the existing speculo/ directory before initializing",
    }]);
  }
  const install = await readJson(path, ".speculo/install.json");
  if (Number(install.schema_version) !== 3 || typeof install.package_version !== "string") {
    throw new RefreshBlockedError([{
      code: "legacy-installation",
      path: ".speculo/install.json",
      message: "Speculo 1.0 does not read or migrate 0.x installations; remove or rename the old speculo/ directory before initializing",
    }]);
  }
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(install.package_version);
  if (!match || Number(match[1]) !== 1) {
    throw new RefreshBlockedError([{
      code: "legacy-installation",
      path: ".speculo/install.json",
      message: "refresh requires a Speculo 1.x installation; 0.x state is intentionally incompatible",
    }]);
  }
  return install.package_version;
}

function validateRelativePath(path: string, label: string): void {
  if (!path || path.startsWith("/") || path.split("/").includes("..") || path.includes("\\")) {
    throw new Error(label + " contains an unsafe relative path: " + path);
  }
}

async function loadRefreshContract(stagedRoot: string): Promise<RefreshContract> {
  const contract = await readJson(join(stagedRoot, ".speculo", "refresh-contract.json"), ".speculo/refresh-contract.json");
  if (
    contract.schema_version !== 1 || contract.runtime_root !== ".speculo" ||
    !Array.isArray(contract.managed_roots) || !Array.isArray(contract.managed_metadata) ||
    !Array.isArray(contract.reserved_runtime) ||
    ![...contract.managed_roots, ...contract.managed_metadata, ...contract.reserved_runtime].every((item) => typeof item === "string")
  ) {
    throw new Error("template refresh contract must use schema v1 and declare managed and runtime paths");
  }
  assertJsonObject(contract.project_config, "project_config contract");
  for (const path of [...contract.managed_roots, ...contract.managed_metadata, ...contract.reserved_runtime]) {
    validateRelativePath(path, "refresh contract");
  }
  for (const root of contract.managed_roots) {
    if (root === ".speculo" || root.startsWith(".speculo/")) throw new Error("managed roots cannot own the runtime root");
  }
  for (const path of contract.managed_metadata) {
    if (!path.startsWith(".speculo/")) throw new Error("managed metadata must be inside .speculo");
    if (!contract.reserved_runtime.includes(path.slice(".speculo/".length))) {
      throw new Error("managed metadata must also be reserved runtime: " + path);
    }
  }
  if (
    typeof contract.project_config.path !== "string" || typeof contract.project_config.baseline !== "string" ||
    contract.project_config.schema_version !== 1 || contract.project_config.additional_properties !== true
  ) throw new Error("project_config contract is incomplete");
  validateRelativePath(contract.project_config.path, "project_config.path");
  validateRelativePath(contract.project_config.baseline, "project_config.baseline");
  return contract as RefreshContract;
}

async function loadWorkflowContract(stagedRoot: string, workflowId: string): Promise<WorkflowRuntimeContract> {
  const path = join(stagedRoot, "workflows", workflowId, "runtime-contract.json");
  const contract = await readJson(path, `workflows/${workflowId}/runtime-contract.json`);
  if (
    contract.schema_version !== 1 || contract.workflow !== workflowId ||
    !Array.isArray(contract.structured_state) || contract.opaque_default !== "preserve-byte-for-byte"
  ) {
    throw new Error("workflow " + workflowId + " has an invalid runtime contract");
  }
  for (const item of contract.structured_state) {
    if (typeof item !== "string") throw new Error("workflow " + workflowId + " has a non-string structured state path");
    validateRelativePath(item.replaceAll("*", "segment"), "structured_state");
  }
  if (contract.config !== null) {
    assertJsonObject(contract.config, "workflow config contract");
    const config = contract.config;
    for (const item of [config.path, config.template, config.baseline]) {
      if (typeof item !== "string") throw new Error("workflow " + workflowId + " config contract is incomplete");
      validateRelativePath(item, "workflow config contract");
    }
    if (!(config.path as string).startsWith(`.speculo/${workflowId}/`) || !(config.baseline as string).startsWith(".speculo/baselines/")) {
      throw new Error("workflow " + workflowId + " config paths cross their ownership boundary");
    }
  }
  for (const item of contract.structured_state) {
    if (!item.startsWith(`.speculo/${workflowId}/`)) {
      throw new Error("workflow " + workflowId + " structured state crosses its ownership boundary");
    }
  }
  return contract as WorkflowRuntimeContract;
}

async function assertNoSymlinks(root: string): Promise<void> {
  if (!(await pathExists(root))) return;
  const blockers: RefreshBlocker[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        blockers.push({
          code: "runtime-symlink",
          path: toPosix(relative(root, path)),
          message: "runtime symlinks cannot be proven to stay within the installation",
        });
      } else if (stats.isDirectory()) {
        await visit(path);
      }
    }
  }
  await visit(root);
  if (blockers.length > 0) throw new RefreshBlockedError(blockers);
}

function isReserved(path: string, reserved: Set<string>): boolean {
  const first = path.split("/")[0];
  return reserved.has(first);
}

function matchesContractPath(runtimePath: string, contractPath: string): boolean {
  const expected = contractPath.startsWith(".speculo/") ? contractPath.slice(".speculo/".length) : contractPath;
  const actualSegments = runtimePath.split("/");
  const expectedSegments = expected.split("/");
  const memo = new Map<string, boolean>();
  function match(actualIndex: number, expectedIndex: number): boolean {
    const key = `${actualIndex}:${expectedIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (expectedIndex === expectedSegments.length) return actualIndex === actualSegments.length;
    const segment = expectedSegments[expectedIndex];
    let result: boolean;
    if (segment === "**") {
      result = match(actualIndex, expectedIndex + 1) ||
        (actualIndex < actualSegments.length && match(actualIndex + 1, expectedIndex));
    } else {
      result = actualIndex < actualSegments.length &&
        (segment === "*" || segment === actualSegments[actualIndex]) &&
        match(actualIndex + 1, expectedIndex + 1);
    }
    memo.set(key, result);
    return result;
  }
  return match(0, 0);
}

function isStructured(path: string, contracts: WorkflowRuntimeContract[]): boolean {
  return contracts.some((contract) =>
    (contract.config !== null && matchesContractPath(path, contract.config.path)) ||
    contract.structured_state.some((pattern) => matchesContractPath(path, pattern))
  );
}

async function copyPreviousRuntime(
  previousRoot: string,
  stagedRoot: string,
  reserved: Set<string>,
): Promise<void> {
  const previousState = join(previousRoot, ".speculo");
  if (!(await pathExists(previousState))) return;
  const stagedState = join(stagedRoot, ".speculo");
  for (const entry of await readdir(previousState, { withFileTypes: true })) {
    if (reserved.has(entry.name)) continue;
    await cp(join(previousState, entry.name), join(stagedState, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
  const baselines = join(previousState, "baselines");
  if (await pathExists(baselines)) {
    await cp(baselines, join(stagedState, "baselines"), { recursive: true, force: true });
  }
}

async function opaqueFiles(
  stateRoot: string,
  reserved: Set<string>,
  contracts: WorkflowRuntimeContract[],
): Promise<Map<string, string>> {
  const records = await collectFiles(stateRoot, {
    include: (path) => !isReserved(path, reserved) && !isStructured(path, contracts),
  });
  return new Map(records.map((record) => [record.path, record.sha256]));
}

function verifyOpaqueFiles(before: Map<string, string>, after: Map<string, string>): void {
  const blockers: RefreshBlocker[] = [];
  for (const [path, hash] of before) {
    if (after.get(path) !== hash) {
      blockers.push({ code: "persistent-drift", path: `.speculo/${path}`, message: "opaque runtime content changed during refresh staging" });
    }
  }
  if (blockers.length > 0) throw new RefreshBlockedError(blockers);
}

async function reconcileProjectConfig(
  previousRoot: string,
  stagedRoot: string,
  existed: boolean,
  contract: RefreshContract["project_config"],
  stats: ConfigMergeStats,
  backups: BackupItem[],
): Promise<void> {
  const incomingPath = join(stagedRoot, contract.path);
  const incoming = await readJson(incomingPath, contract.path);
  const baselinePath = join(previousRoot, contract.baseline);
  const nextBaselinePath = join(stagedRoot, contract.baseline);
  await mkdir(dirname(nextBaselinePath), { recursive: true });

  if (!existed) {
    await writeFile(nextBaselinePath, JSON.stringify(incoming, null, 2) + "\n", "utf8");
    return;
  }
  const localPath = join(previousRoot, contract.path);
  if (!(await pathExists(localPath))) {
    throw new RefreshBlockedError([{ code: "missing-config", path: contract.path, message: "existing installation has no project config" }]);
  }
  if ((await lstat(localPath)).isSymbolicLink()) {
    throw new RefreshBlockedError([{ code: "runtime-symlink", path: contract.path, message: "persistent config symlinks are not supported" }]);
  }
  const before = await readFile(localPath);
  const local = await readJson(localPath, contract.path);
  if (local.schema_version !== contract.schema_version) {
    throw new RefreshBlockedError([{ code: "unsupported-config", path: contract.path, message: "project config schema_version must be " + contract.schema_version }]);
  }
  const baseline = await pathExists(baselinePath) ? await readJson(baselinePath, ".speculo/baselines/config.json") : undefined;
  let merged;
  try {
    merged = reconcileConfig({ baseline, local, incoming, allowsUnknown: () => contract.additional_properties });
  } catch (error) {
    throw new RefreshBlockedError([{ code: "config-conflict", path: contract.path, message: String(error) }]);
  }
  addStats(stats, merged.stats);
  if (merged.removedPaths.length > 0) backups.push({ sourcePath: contract.path, before, reason: "removed config fields: " + merged.removedPaths.join(", ") });
  await writeFile(incomingPath, JSON.stringify(merged.value, null, 2) + "\n", "utf8");
  await writeFile(nextBaselinePath, JSON.stringify(incoming, null, 2) + "\n", "utf8");
}

async function reconcileWorkflowConfig(
  previousRoot: string,
  stagedRoot: string,
  contract: WorkflowRuntimeContract,
  existed: boolean,
  stats: ConfigMergeStats,
  backups: BackupItem[],
): Promise<void> {
  if (contract.config === null) return;
  const incoming = await readJson(join(stagedRoot, contract.config.template), contract.config.template);
  const nextBaselinePath = join(stagedRoot, contract.config.baseline);
  await mkdir(dirname(nextBaselinePath), { recursive: true });
  await writeFile(nextBaselinePath, JSON.stringify(incoming, null, 2) + "\n", "utf8");
  if (!existed) return;

  const localPath = join(previousRoot, contract.config.path);
  if (!(await pathExists(localPath))) return;
  const before = await readFile(localPath);
  const localRaw = await readJson(localPath, contract.config.path);
  const baselinePath = join(previousRoot, contract.config.baseline);
  const baselineRaw = await pathExists(baselinePath) ? await readJson(baselinePath, contract.config.baseline) : undefined;
  let localConfig;
  let baselineConfig;
  try {
    localConfig = readSpecdevConfig(localRaw);
    baselineConfig = baselineRaw ? readSpecdevConfig(baselineRaw) : undefined;
  } catch (error) {
    throw new RefreshBlockedError([{ code: "config-schema", path: contract.config.path, message: String(error) }]);
  }
  let merged;
  try {
    merged = reconcileConfig({
      baseline: baselineConfig?.value,
      local: localConfig.value,
      incoming,
      allowsUnknown: (parent) => contract.config?.additional_properties[parent.join(".")] ?? false,
    });
    validateSpecdevConfig(merged.value);
  } catch (error) {
    throw new RefreshBlockedError([{ code: "config-conflict", path: contract.config.path, message: String(error) }]);
  }
  addStats(stats, merged.stats);
  if (localConfig.migrated || merged.removedPaths.length > 0) {
    const reasons = [localConfig.migrated ? "schema reconciliation" : "", merged.removedPaths.length > 0 ? "removed fields: " + merged.removedPaths.join(", ") : ""].filter(Boolean);
    backups.push({ sourcePath: contract.config.path, before, reason: reasons.join("; ") });
  }
  const stagedPath = join(stagedRoot, contract.config.path);
  await mkdir(dirname(stagedPath), { recursive: true });
  await writeFile(stagedPath, JSON.stringify(merged.value, null, 2) + "\n", "utf8");
}

function backupDestination(sourcePath: string): string {
  return sourcePath.startsWith(".speculo/") ? "state/" + sourcePath.slice(".speculo/".length) : sourcePath;
}

async function writeTargetedBackup(stagedRoot: string, items: BackupItem[], source: string, target: string): Promise<string | null> {
  const root = join(stagedRoot, ".speculo", "back");
  await rm(root, { recursive: true, force: true });
  if (items.length === 0) return null;
  const unique = new Map<string, BackupItem>();
  for (const item of items) if (!unique.has(item.sourcePath)) unique.set(item.sourcePath, item);
  const files = [];
  for (const item of unique.values()) {
    const backupPath = backupDestination(item.sourcePath);
    const path = join(root, backupPath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, item.before);
    files.push({
      source_path: item.sourcePath,
      backup_path: backupPath,
      bytes: item.before.byteLength,
      sha256: createHash("sha256").update(item.before).digest("hex"),
      reason: item.reason,
    });
  }
  await writeFile(join(root, "manifest.json"), JSON.stringify({
    schema_version: 2,
    scope: "targeted-refresh-backup",
    source_version: source,
    target_version: target,
    created_at: new Date().toISOString(),
    files: files.sort((left, right) => left.source_path.localeCompare(right.source_path)),
  }, null, 2) + "\n", "utf8");
  return "speculo/.speculo/back";
}

async function writeMetadata(
  packageRoot: string,
  previousRoot: string,
  stagedRoot: string,
  contract: RefreshContract,
  targetVersion: string,
  source: string | null,
  selected: Set<string>,
  installedWorkflowIds: string[],
): Promise<ManagedFileRecord[]> {
  const all = await collectFiles(stagedRoot);
  const priorManagedPath = join(previousRoot, ".speculo", "managed.json");
  const priorManaged = new Set<string>();
  if (await pathExists(priorManagedPath)) {
    const manifest = await readJson(priorManagedPath, ".speculo/managed.json");
    if (Array.isArray(manifest.files)) {
      for (const item of manifest.files) {
        if (item && typeof item === "object" && typeof (item as JsonObject).path === "string") priorManaged.add((item as JsonObject).path as string);
      }
    }
  }
  const managed: ManagedFileRecord[] = [];
  for (const file of all) {
    let owner: string | null = null;
    let kind: ManagedFileRecord["kind"] = "static";
    if (contract.managed_metadata.includes(file.path)) owner = "core";
    else if (file.path === ".speculo/commands/.gitkeep") owner = "core/runtime-seed";
    else if (file.path.startsWith("commands/")) owner = "core/commands";
    else if (file.path.startsWith("skills/")) owner = "core/skills";
    else if (file.path.startsWith(".speculo/baselines/")) {
      const match = /^\.speculo\/baselines\/workflows\/([^/]+)\//.exec(file.path);
      owner = match ? "workflow/" + match[1] : "core/config";
      kind = "baseline";
    } else if (file.path.startsWith("workflows/")) {
      const workflowId = file.path.split("/")[1];
      if (
        installedWorkflowIds.includes(workflowId) &&
        (selected.has(workflowId) || priorManaged.has(file.path) || await pathExists(join(packageRoot, "template", file.path)))
      ) owner = "workflow/" + workflowId;
    }
    if (file.path.endsWith("runtime-contract.json")) kind = "contract";
    if (owner) managed.push({
      ...file,
      owner,
      kind,
      package_version: owner.startsWith("workflow/") && !selected.has(owner.slice("workflow/".length))
        ? source ?? targetVersion
        : targetVersion,
    });
  }
  managed.sort((left, right) => left.path.localeCompare(right.path));
  const stateRoot = join(stagedRoot, ".speculo");
  await writeFile(join(stateRoot, "managed.json"), JSON.stringify({
    schema_version: 2,
    package_version: targetVersion,
    files: managed,
  }, null, 2) + "\n", "utf8");
  await writeFile(join(stateRoot, "install.json"), JSON.stringify({
    schema_version: 3,
    package_version: targetVersion,
    workflows: [...installedWorkflowIds].sort(),
    managed_manifest: ".speculo/managed.json",
    config_baseline_schema: 1,
  }, null, 2) + "\n", "utf8");
  return managed;
}

function structuredBackups(changes: StructuredChange[], stagedRoot: string): BackupItem[] {
  return changes.map((change) => ({
    sourcePath: toPosix(relative(stagedRoot, change.path)),
    before: change.before,
    reason: change.reason,
  }));
}

export async function assertNoLegacyPending(previousRoot: string): Promise<void> {
  const marker = join(previousRoot, ".speculo", "migration.json");
  if (!(await pathExists(marker))) return;
  throw new RefreshBlockedError([{
    code: "legacy-pending-migration",
    path: ".speculo/migration.json",
    message: "complete the installed migrate-runtime-state Agent command before refreshing this legacy installation",
  }]);
}

export async function prepareRefresh(options: PrepareRefreshOptions): Promise<RefreshSummary> {
  const targetVersion = await packageVersion(options.packageRoot);
  const source = options.existed ? await sourceVersion(options.previousRoot) : null;
  const contract = await loadRefreshContract(options.stagedRoot);
  const selected = new Set(options.selectedWorkflowIds);
  const reserved = new Set(contract.reserved_runtime);
  const workflowContracts = await Promise.all(options.selectedWorkflowIds.map((workflowId) => loadWorkflowContract(options.stagedRoot, workflowId)));
  const stats = { ...EMPTY_STATS };
  const backups: BackupItem[] = [];
  const previousState = join(options.previousRoot, ".speculo");
  const stagedState = join(options.stagedRoot, ".speculo");

  if (options.existed) {
    await assertNoSymlinks(previousState);
    const opaqueBefore = await opaqueFiles(previousState, reserved, workflowContracts);
    await copyPreviousRuntime(options.previousRoot, options.stagedRoot, reserved);
    await reconcileProjectConfig(options.previousRoot, options.stagedRoot, true, contract.project_config, stats, backups);
    for (const workflowContract of workflowContracts) {
      await reconcileWorkflowConfig(options.previousRoot, options.stagedRoot, workflowContract, true, stats, backups);
    }
    let structured: StructuredChange[];
    try {
      structured = await validateStructuredRuntime(options.stagedRoot, options.selectedWorkflowIds);
    } catch (error) {
      const message = String(error);
      throw new RefreshBlockedError([{
        code: message.includes("learning-reset-required") ? "learning-reset-required" : "structured-state-conflict",
        path: message.includes("Learning") ? ".speculo/learning" : ".speculo",
        message,
      }]);
    }
    backups.push(...structuredBackups(structured, options.stagedRoot));
    verifyOpaqueFiles(opaqueBefore, await opaqueFiles(stagedState, reserved, workflowContracts));
    const backupPath = await writeTargetedBackup(options.stagedRoot, backups, source ?? "unknown", targetVersion);
    const managed = await writeMetadata(options.packageRoot, options.previousRoot, options.stagedRoot, contract, targetVersion, source, selected, options.installedWorkflowIds);
    await assertNoSymlinks(options.stagedRoot);
    return {
      status: "updated",
      sourceVersion: source,
      targetVersion,
      managedFiles: managed.length,
      preservedFiles: opaqueBefore.size,
      config: stats,
      structuredUpgrades: structured.length,
      backupPath,
    };
  }

  await reconcileProjectConfig(options.previousRoot, options.stagedRoot, false, contract.project_config, stats, backups);
  for (const workflowContract of workflowContracts) {
    await reconcileWorkflowConfig(options.previousRoot, options.stagedRoot, workflowContract, false, stats, backups);
  }
  const managed = await writeMetadata(options.packageRoot, options.previousRoot, options.stagedRoot, contract, targetVersion, null, selected, options.installedWorkflowIds);
  await assertNoSymlinks(options.stagedRoot);
  return {
    status: "initialized",
    sourceVersion: null,
    targetVersion,
    managedFiles: managed.length,
    preservedFiles: 0,
    config: stats,
    structuredUpgrades: 0,
    backupPath: null,
  };
}
