import { createHash, randomUUID } from "node:crypto";
import { chmod, cp, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { assertJsonObject, reconcileConfig, type ConfigMergeStats, type JsonObject } from "./config.js";
import { collectFiles, toPosix, type ManagedFileRecord } from "./manifest.js";
import { readSpecdevConfig, validateStructuredRuntime, validateSpecdevConfig } from "./structured.js";
import { pathExists } from "./utils.js";
import { containedPath } from "./paths.js";
import { isHistoricalArchiveMonth } from "./specdev-artifacts.js";

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
  backupPath: string | null;
};

export type PrepareRefreshOptions = {
  packageRoot: string;
  previousRoot: string;
  stagedRoot: string;
  selectedWorkflowIds: string[];
  installedWorkflowIds: string[];
  retainedWorkflowIds?: string[];
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

export type WorkflowRuntimeContract = {
  schema_version: number;
  workflow: string;
  state_seed?: "required" | "optional";
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
      code: "unsupported-installation-version",
      path: ".speculo/install.json",
      message: "Speculo 2 requires a schema v4 install manifest; existing data is preserved",
    }]);
  }
  const install = await readJson(path, ".speculo/install.json");
  if (install.schema_version !== 4 || typeof install.package_version !== "string") {
    throw new RefreshBlockedError([{
      code: "unsupported-installation-version",
      path: ".speculo/install.json",
      message: "Speculo 2 does not read or migrate earlier installations; existing data is preserved",
    }]);
  }
  if (!/^2\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(install.package_version)) {
    throw new RefreshBlockedError([{
      code: "unsupported-installation-version",
      path: ".speculo/install.json",
      message: "refresh requires a Speculo 2.x installation",
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

export async function loadWorkflowContract(stagedRoot: string, workflowId: string): Promise<WorkflowRuntimeContract> {
  const path = join(stagedRoot, "workflows", workflowId, "runtime-contract.json");
  const contract = await readJson(path, `workflows/${workflowId}/runtime-contract.json`);
  if (
    contract.schema_version !== 1 || contract.workflow !== workflowId ||
    !Array.isArray(contract.structured_state) || contract.opaque_default !== "preserve-byte-for-byte"
  ) {
    throw new Error("workflow " + workflowId + " has an invalid runtime contract");
  }
  if (contract.state_seed !== undefined && contract.state_seed !== "required" && contract.state_seed !== "optional") {
    throw new Error("workflow " + workflowId + " state_seed must be required or optional");
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

async function assertNoSymlinks(root: string, skip: string[] = []): Promise<void> {
  if (!(await pathExists(root))) return;
  const blockers: RefreshBlocker[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (skip.includes(toPosix(relative(root, path)))) continue;
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
  const segments = path.split("/");
  if (segments[0] === "specdev" && segments[1] === "changes" && segments[2] === "archive" && isHistoricalArchiveMonth(segments[3] ?? "")) return false;
  return contracts.some((contract) =>
    (contract.config !== null && matchesContractPath(path, contract.config.path)) ||
    contract.structured_state.some((pattern) => matchesContractPath(path, pattern))
  );
}

async function preserveRuntimeModes(source: string, target: string): Promise<void> {
  const metadata = await lstat(source);
  if (metadata.isSymbolicLink()) throw new Error("runtime symlinks require explicit migration before refresh");
  if (process.platform !== "win32") await chmod(target, metadata.mode & 0o7777);
  if (metadata.isDirectory()) {
    for (const entry of await readdir(source)) await preserveRuntimeModes(join(source, entry), join(target, entry));
  }
}

async function copyPreviousRuntime(
  previousRoot: string,
  stagedRoot: string,
  reserved: Set<string>,
): Promise<void> {
  const previousState = join(previousRoot, ".speculo");
  if (!(await pathExists(previousState))) return;
  const stagedState = join(stagedRoot, ".speculo");
  if (process.platform === "win32" && await pathExists(join(previousState, "ops", "private", "credentials.json"))) {
    throw new Error("OPS plaintext ledger requires ACL-preserving static-only installer on Windows; runtime refresh is blocked");
  }
  for (const entry of await readdir(previousState, { withFileTypes: true })) {
    if (reserved.has(entry.name) && entry.name !== "back") continue;
    await cp(join(previousState, entry.name), join(stagedState, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
    await preserveRuntimeModes(join(previousState, entry.name), join(stagedState, entry.name));
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
  return new Map(await Promise.all(records.map(async (record) => [record.path, record.sha256 + ":" + (process.platform === "win32" ? "windows" : (await lstat(join(stateRoot, record.path))).mode & 0o7777)] as [string, string])));
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
  if (merged.removedPaths.length > 0) {
    const reasons = [merged.removedPaths.length > 0 ? "removed fields: " + merged.removedPaths.join(", ") : ""].filter(Boolean);
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
  if (items.length === 0) return null;
  const backupId = randomUUID();
  const root = join(stagedRoot, ".speculo", "back", backupId);
  const unique = new Map<string, BackupItem>();
  for (const item of items) if (!unique.has(item.sourcePath)) unique.set(item.sourcePath, item);
  const files = [];
  for (const item of unique.values()) {
    const backupPath = backupDestination(item.sourcePath);
    const path = join(root, backupPath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, item.before, { mode: 0o600 });
    if (process.platform !== "win32") await chmod(path, 0o600);
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
  return ".agents/speculo/.speculo/back/" + backupId;
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
  retainedWorkflowIds: string[] = [],
): Promise<ManagedFileRecord[]> {
  const all = await collectFiles(stagedRoot, { skipDirectory: p => retainedWorkflowIds.some(id => p === `workflows/${id}`) });
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
    // A preserved third-party file never becomes CLI-owned merely because of its directory.
    if (!file.path.startsWith('.speculo/') && file.path !== 'catalog.json' &&
        !priorManaged.has(file.path) && !await pathExists(join(packageRoot,'template',file.path))) continue;
    let owner: string | null = null;
    let kind: ManagedFileRecord["kind"] = "static";
    if (contract.managed_metadata.includes(file.path)) owner = "core";
    else if (file.path === ".speculo/commands/.gitkeep") owner = "core/runtime-seed";
    else if (file.path.startsWith("commands/")) owner = "core/commands";
    else if (file.path.startsWith("references/") || file.path.startsWith("lib/") || file.path === "catalog.json") owner = "core/assets";
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
      mode: process.platform === "win32" ? 0o666 : (await lstat(join(stagedRoot, file.path))).mode & 0o777,
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
    schema_version: 4,
    package_version: targetVersion,
    workflows: [...installedWorkflowIds].sort(),
    managed_manifest: ".speculo/managed.json",
    config_baseline_schema: 1,
  }, null, 2) + "\n", "utf8");
  return managed;
}

async function preserveUnmanagedStatic(previousRoot:string, stagedRoot:string, retained:string[] = []):Promise<void>{
  const manifest=await readJson(join(previousRoot,'.speculo/managed.json'),'managed files');
  if(manifest.schema_version!==2||!Array.isArray(manifest.files))throw new RefreshBlockedError([{code:'invalid-managed-manifest',path:'.speculo/managed.json',message:'cannot establish static ownership'}]);
  const owned=new Set(manifest.files.map(item=>(item as JsonObject).path));
  async function visit(dir:string){
    for(const entry of await readdir(dir,{withFileTypes:true})){
      const source=join(dir,entry.name),p=toPosix(relative(previousRoot,source));
      if(p==='.speculo'||p==='config.json'||retained.some(id=>p===`workflows/${id}`))continue;
      if(owned.has(p)){
        const stat=await lstat(source);
        if(!stat.isFile()||stat.nlink!==1||!(stat.mode&0o200)||stat.mode&0o7000)throw new RefreshBlockedError([{code:'unsafe-managed-asset',path:p,message:'owned asset is linked, readonly or has unsafe permissions; preserve and resolve before refresh'}]);
        continue;
      }
      if(entry.isDirectory()){
        const target=await containedPath(stagedRoot,p);
        if(![...owned].some(path=>typeof path==='string'&&path.startsWith(p+'/'))&&!await pathExists(target)){
          await mkdir(target,{recursive:true});
          if(process.platform!=='win32')await chmod(target,(await lstat(source)).mode&0o777);
        }
        await visit(source);continue;
      }
      const target=await containedPath(stagedRoot,p);
      if(await pathExists(target)){
        throw new RefreshBlockedError([{code:'unmanaged-asset-conflict',path:p,message:'a new packaged asset conflicts with an unowned file; existing file preserved'}]);
      }
      if(entry.isSymbolicLink())throw new RefreshBlockedError([{code:'unmanaged-asset-conflict',path:p,message:'preserve unowned symlink; resolve its ownership before refresh'}]);
      await mkdir(dirname(target),{recursive:true});await cp(source,target,{preserveTimestamps:true});
    }
  }
  await visit(previousRoot);
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
    await preserveUnmanagedStatic(options.previousRoot,options.stagedRoot,options.retainedWorkflowIds);
    await assertNoSymlinks(previousState);
    if (await pathExists(join(previousState, "specdev", ".markdown-conversion-pending"))) {
      throw new RefreshBlockedError([{ code: "markdown-conversion-pending", path: ".speculo/specdev/.markdown-conversion-pending", message: "the original conversion owner must finish recovery before replacing this installation" }]);
    }
    const opaqueBefore = await opaqueFiles(previousState, reserved, workflowContracts);
    await copyPreviousRuntime(options.previousRoot, options.stagedRoot, reserved);
    await reconcileProjectConfig(options.previousRoot, options.stagedRoot, true, contract.project_config, stats, backups);
    for (const workflowContract of workflowContracts) {
      await reconcileWorkflowConfig(options.previousRoot, options.stagedRoot, workflowContract, true, stats, backups);
    }
    try {
      await validateStructuredRuntime(options.stagedRoot, options.selectedWorkflowIds);
    } catch (error) {
      const message = String(error).split(stagedState).join(previousState);
      throw new RefreshBlockedError([{
        code: message.includes("learning-reset-required") ? "learning-reset-required" : "structured-state-conflict",
        path: message.includes("Learning") ? ".speculo/learning" : ".speculo",
        message,
      }]);
    }
    verifyOpaqueFiles(opaqueBefore, await opaqueFiles(stagedState, reserved, workflowContracts));
    const backupPath = await writeTargetedBackup(options.stagedRoot, backups, source ?? "unknown", targetVersion);
    const managed = await writeMetadata(options.packageRoot, options.previousRoot, options.stagedRoot, contract, targetVersion, source, selected, options.installedWorkflowIds, options.retainedWorkflowIds);
    await assertNoSymlinks(options.stagedRoot, (options.retainedWorkflowIds ?? []).map(id => `workflows/${id}`));
    return {
      status: "updated",
      sourceVersion: source,
      targetVersion,
      managedFiles: managed.length,
      preservedFiles: opaqueBefore.size,
      config: stats,
      backupPath,
    };
  }

  await reconcileProjectConfig(options.previousRoot, options.stagedRoot, false, contract.project_config, stats, backups);
  for (const workflowContract of workflowContracts) {
    await reconcileWorkflowConfig(options.previousRoot, options.stagedRoot, workflowContract, false, stats, backups);
  }
  await validateStructuredRuntime(options.stagedRoot, options.selectedWorkflowIds);
  const managed = await writeMetadata(options.packageRoot, options.previousRoot, options.stagedRoot, contract, targetVersion, null, selected, options.installedWorkflowIds, options.retainedWorkflowIds);
  await assertNoSymlinks(options.stagedRoot, (options.retainedWorkflowIds ?? []).map(id => `workflows/${id}`));
  return {
    status: "initialized",
    sourceVersion: null,
    targetVersion,
    managedFiles: managed.length,
    preservedFiles: 0,
    config: stats,
    backupPath: null,
  };
}
