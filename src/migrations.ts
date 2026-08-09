import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { pathExists } from "./utils.js";

export type MigrationStatus = "not-required" | "migrated" | "pending";

export type MigrationBlocker = {
  code: string;
  path: string;
  message: string;
};

export type RuntimeMigrationResult = {
  status: MigrationStatus;
  sourceVersion: string | null;
  targetVersion: string;
  backupPath: string | null;
  blockers: MigrationBlocker[];
};

export type RuntimeMigrationOptions = {
  packageRoot: string;
  previousRoot: string;
  stagedRoot: string;
  selectedWorkflowIds: string[];
  unselectedWorkflowIds: string[];
};

type JsonObject = Record<string, unknown>;

type BackupEntry = {
  path: string;
  type: "file" | "symlink";
  bytes?: number;
  sha256?: string;
  target?: string;
};

const BACKUP_RELATIVE = ".speculo/back";
const INSTALL_RELATIVE = ".speculo/install.json";
const MIGRATION_RELATIVE = ".speculo/migration.json";
const SNAPSHOT_DIR = ".migration-snapshot";
const MANAGED_STATE_ENTRIES = new Set([
  "README.md",
  "workspace.json",
  "install.json",
  "migration.json",
  "back",
]);

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

async function readJson(path: string): Promise<JsonObject> {
  return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

async function readTargetVersion(packageRoot: string): Promise<string> {
  const manifest = await readJson(join(packageRoot, "package.json"));
  if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(manifest.version)) {
    throw new Error("package.json has no valid semantic version");
  }
  return manifest.version;
}

function versionBefore07(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return true;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major === 0 && minor < 7;
}

async function sourceVersion(snapshotState: string): Promise<{ version: string | null; blockers: MigrationBlocker[] }> {
  const installPath = join(snapshotState, "install.json");
  if (!(await pathExists(installPath))) return { version: "0.7.0-unversioned", blockers: [] };
  try {
    const install = await readJson(installPath);
    if (install.schema_version !== 1 || typeof install.package_version !== "string") {
      return {
        version: null,
        blockers: [{ code: "invalid-install-manifest", path: ".speculo/install.json", message: "install manifest must use schema v1 and contain package_version" }],
      };
    }
    return { version: install.package_version, blockers: [] };
  } catch (error) {
    return {
      version: null,
      blockers: [{ code: "invalid-json", path: ".speculo/install.json", message: String(error) }],
    };
  }
}

async function copySnapshot(previousRoot: string, snapshotRoot: string): Promise<void> {
  await mkdir(snapshotRoot, { recursive: true });
  const configPath = join(previousRoot, "config.json");
  if (await pathExists(configPath)) await cp(configPath, join(snapshotRoot, "config.json"), { force: true });
  const previousState = join(previousRoot, ".speculo");
  if (!(await pathExists(previousState))) return;
  await cp(previousState, join(snapshotRoot, "state"), {
    recursive: true,
    force: true,
    filter: (source) => {
      const item = toPosix(relative(previousState, source));
      return item !== "back" && !item.startsWith("back/") && item !== "migration.json";
    },
  });
}

async function collectBackupEntries(root: string, current = root): Promise<BackupEntry[]> {
  if (!(await pathExists(current))) return [];
  const entries: BackupEntry[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      entries.push(...await collectBackupEntries(root, path));
      continue;
    }
    const itemPath = toPosix(relative(root, path));
    if (entry.isSymbolicLink()) {
      entries.push({ path: itemPath, type: "symlink", target: await readlink(path) });
      continue;
    }
    if (!entry.isFile()) continue;
    const content = await readFile(path);
    entries.push({
      path: itemPath,
      type: "file",
      bytes: content.byteLength,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

async function writeBackup(
  snapshotRoot: string,
  stagedRoot: string,
  source: string | null,
  target: string,
): Promise<void> {
  const backupRoot = join(stagedRoot, BACKUP_RELATIVE);
  await rm(backupRoot, { recursive: true, force: true });
  await mkdir(backupRoot, { recursive: true });
  const snapshotConfig = join(snapshotRoot, "config.json");
  const snapshotState = join(snapshotRoot, "state");
  if (await pathExists(snapshotConfig)) await cp(snapshotConfig, join(backupRoot, "config.json"), { force: true });
  if (await pathExists(snapshotState)) await cp(snapshotState, join(backupRoot, "state"), { recursive: true, force: true });
  const files = await collectBackupEntries(backupRoot);
  await writeFile(join(backupRoot, "manifest.json"), JSON.stringify({
    schema_version: 1,
    source_version: source,
    target_version: target,
    created_at: new Date().toISOString(),
    files,
  }, null, 2) + "\n", "utf8");
}

async function inspectJsonTree(root: string): Promise<MigrationBlocker[]> {
  if (!(await pathExists(root))) return [];
  const blockers: MigrationBlocker[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const label = toPosix(relative(dirname(root), path));
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isSymbolicLink()) {
        blockers.push({ code: "state-symlink", path: label, message: "runtime state symlinks require manual migration review" });
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          JSON.parse(await readFile(path, "utf8"));
        } catch (error) {
          blockers.push({ code: "invalid-json", path: label, message: String(error) });
        }
      }
    }
  }
  await visit(root);
  return blockers;
}

function expectArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

async function inspectSpecdevState(stateRoot: string): Promise<MigrationBlocker[]> {
  const blockers: MigrationBlocker[] = [];
  const statusPath = join(stateRoot, "specdev", "status.json");
  if (!(await pathExists(statusPath))) return blockers;
  let status: JsonObject;
  try {
    status = await readJson(statusPath);
  } catch {
    return blockers;
  }
  if (status.schema_version !== 4 || status.workflow !== "specdev" || !expectArray(status.active) || !expectArray(status.archived)) {
    blockers.push({ code: "unsupported-specdev-status", path: ".speculo/specdev/status.json", message: "automatic migration supports SpecDev global status schema v4 only" });
    return blockers;
  }
  const activeNames = new Set<string>();
  for (const item of status.active) {
    if (!item || typeof item !== "object" || typeof (item as JsonObject).change !== "string") {
      blockers.push({ code: "invalid-active-entry", path: ".speculo/specdev/status.json", message: "active entries must contain a change name" });
      continue;
    }
    const name = (item as JsonObject).change as string;
    if (activeNames.has(name)) {
      blockers.push({ code: "duplicate-active-change", path: ".speculo/specdev/status.json", message: `${name} appears more than once in active` });
    }
    activeNames.add(name);
    const changeStatusPath = join(stateRoot, "specdev", "changes", name, ".status.json");
    if (!(await pathExists(changeStatusPath))) {
      blockers.push({ code: "missing-active-change", path: `.speculo/specdev/changes/${name}/.status.json`, message: "active status entry has no matching change state" });
    } else {
      try {
        const changeStatus = await readJson(changeStatusPath);
        if (
          changeStatus.schema_version !== 3 ||
          changeStatus.artifact !== "change-status" ||
          changeStatus.change !== name ||
          !new Set(["active", "blocked", "completed"]).has(String(changeStatus.change_status))
        ) {
          blockers.push({ code: "unsupported-change-status", path: `.speculo/specdev/changes/${name}/.status.json`, message: "active change state must use schema v3 and match its index entry" });
        }
      } catch {
        // The JSON tree check reports the parse failure with the precise path.
      }
    }
  }
  const archivedNames = new Set<string>();
  for (const item of status.archived) {
    if (typeof item !== "string") {
      blockers.push({ code: "invalid-archived-entry", path: ".speculo/specdev/status.json", message: "archived entries must be change names" });
      continue;
    }
    if (archivedNames.has(item)) blockers.push({ code: "duplicate-archived-change", path: ".speculo/specdev/status.json", message: `${item} appears more than once in archived` });
    archivedNames.add(item);
    if (activeNames.has(item)) blockers.push({ code: "status-overlap", path: ".speculo/specdev/status.json", message: `${item} appears in both active and archived` });
    const month = item.slice(0, 7);
    const archivedStatusPath = join(stateRoot, "specdev", "archive", month, item, ".status.json");
    if (!(await pathExists(archivedStatusPath))) {
      blockers.push({ code: "missing-archived-change", path: `.speculo/specdev/archive/${month}/${item}/.status.json`, message: "archived status entry has no matching archived change state" });
    } else {
      try {
        const archivedStatus = await readJson(archivedStatusPath);
        if (
          archivedStatus.schema_version !== 3 ||
          archivedStatus.artifact !== "change-status" ||
          archivedStatus.change !== item ||
          archivedStatus.change_status !== "archived"
        ) {
          blockers.push({ code: "unsupported-archived-status", path: `.speculo/specdev/archive/${month}/${item}/.status.json`, message: "archived change state must use schema v3 and match its index entry" });
        }
      } catch {
        // The JSON tree check reports the parse failure with the precise path.
      }
    }
  }
  const changesRoot = join(stateRoot, "specdev", "changes");
  if (await pathExists(changesRoot)) {
    for (const entry of await readdir(changesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const changeStatusPath = join(changesRoot, entry.name, ".status.json");
      if (!(await pathExists(changeStatusPath))) {
        blockers.push({ code: "missing-change-status", path: `.speculo/specdev/changes/${entry.name}/.status.json`, message: "change directory has no status file" });
      } else if (!activeNames.has(entry.name)) {
        blockers.push({ code: "unindexed-active-change", path: `.speculo/specdev/changes/${entry.name}`, message: "change directory is missing from the active index" });
      }
    }
  }
  const archiveRoot = join(stateRoot, "specdev", "archive");
  if (await pathExists(archiveRoot)) {
    for (const monthEntry of await readdir(archiveRoot, { withFileTypes: true })) {
      if (!monthEntry.isDirectory()) continue;
      const monthRoot = join(archiveRoot, monthEntry.name);
      for (const changeEntry of await readdir(monthRoot, { withFileTypes: true })) {
        if (!changeEntry.isDirectory()) continue;
        const archivedStatusPath = join(monthRoot, changeEntry.name, ".status.json");
        if (!(await pathExists(archivedStatusPath))) {
          blockers.push({ code: "missing-archived-status", path: `.speculo/specdev/archive/${monthEntry.name}/${changeEntry.name}/.status.json`, message: "archived change directory has no status file" });
        } else if (!archivedNames.has(changeEntry.name)) {
          blockers.push({ code: "unindexed-archived-change", path: `.speculo/specdev/archive/${monthEntry.name}/${changeEntry.name}`, message: "archived change directory is missing from the archived index" });
        }
      }
    }
  }
  const configPath = join(stateRoot, "specdev", "config.json");
  if (await pathExists(configPath)) {
    try {
      const config = await readJson(configPath);
      if (config.schema_version !== 3) blockers.push({ code: "unsupported-specdev-config", path: ".speculo/specdev/config.json", message: "automatic migration supports SpecDev config schema v3 only" });
    } catch {
      // The JSON tree check reports the parse failure with the precise path.
    }
  }
  return blockers;
}

async function inspectCommandState(stateRoot: string): Promise<MigrationBlocker[]> {
  const commandsRoot = join(stateRoot, "commands");
  if (!(await pathExists(commandsRoot))) return [];
  const blockers: MigrationBlocker[] = [];
  for (const entry of await readdir(commandsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const statePath = join(commandsRoot, entry.name, "state.json");
    if (!(await pathExists(statePath))) continue;
    if (entry.name !== "docs-sync") {
      blockers.push({ code: "unknown-command-state", path: `.speculo/commands/${entry.name}/state.json`, message: "command state has no current migration contract" });
      continue;
    }
    try {
      const state = await readJson(statePath);
      if (state.schema_version !== 4 || state.command !== "docs-sync") {
        blockers.push({ code: "unsupported-command-state", path: ".speculo/commands/docs-sync/state.json", message: "automatic migration supports docs-sync state schema v4 only" });
      }
    } catch {
      // The JSON tree check reports the parse failure with the precise path.
    }
  }
  return blockers;
}

async function inspectPersonState(stateRoot: string): Promise<MigrationBlocker[]> {
  const statusPath = join(stateRoot, "person", "status.json");
  if (!(await pathExists(statusPath))) return [];
  try {
    const status = await readJson(statusPath);
    if (status.schema_version !== 1 || status.workflow !== "person" || !expectArray(status.active)) {
      return [{ code: "unsupported-person-status", path: ".speculo/person/status.json", message: "automatic migration supports person status schema v1 only" }];
    }
  } catch {
    // The JSON tree check reports the parse failure with the precise path.
  }
  return [];
}

async function inspectSnapshot(snapshotRoot: string, source: string | null): Promise<MigrationBlocker[]> {
  const blockers: MigrationBlocker[] = [];
  const configPath = join(snapshotRoot, "config.json");
  if (!(await pathExists(configPath))) {
    blockers.push({ code: "missing-config", path: "config.json", message: "existing installation has no project configuration" });
  } else if ((await lstat(configPath)).isSymbolicLink()) {
    blockers.push({ code: "state-symlink", path: "config.json", message: "project configuration symlinks require manual migration review" });
  } else {
    try {
      const config = await readJson(configPath);
      if (config.schema_version !== 1) blockers.push({ code: "unsupported-config", path: "config.json", message: "automatic migration supports project config schema v1 only" });
    } catch (error) {
      blockers.push({ code: "invalid-json", path: "config.json", message: String(error) });
    }
  }
  const stateRoot = join(snapshotRoot, "state");
  const stateRootIsSymlink = await pathExists(stateRoot) && (await lstat(stateRoot)).isSymbolicLink();
  if (stateRootIsSymlink) {
    blockers.push({ code: "state-symlink", path: ".speculo", message: "runtime state root symlinks require manual migration review" });
  }
  const workspacePath = join(stateRoot, "workspace.json");
  if (!stateRootIsSymlink && !(await pathExists(workspacePath))) {
    blockers.push({ code: "missing-workspace", path: ".speculo/workspace.json", message: "existing installation has no workspace root manifest" });
  } else if (!stateRootIsSymlink) {
    try {
      const workspace = await readJson(workspacePath);
      const roots = workspace.roots as JsonObject | undefined;
      if (
        workspace.schema_version !== 1 || workspace.path_base !== "project-root" ||
        !roots || typeof roots !== "object" ||
        ["config", "speculo", "state", "commands", "skills", "workflows"].some((key) => typeof roots[key] !== "string")
      ) {
        blockers.push({ code: "unsupported-workspace", path: ".speculo/workspace.json", message: "automatic migration supports workspace schema v1 with project-root aliases only" });
      }
    } catch {
      // The JSON tree check reports the parse failure with the precise path.
    }
  }
  if (source === null || versionBefore07(source)) {
    blockers.push({ code: "unsupported-source-version", path: ".speculo/install.json", message: "automatic migration supports v0.7 and newer installations only" });
  }
  if (!stateRootIsSymlink) {
    blockers.push(...await inspectJsonTree(stateRoot));
    blockers.push(...await inspectSpecdevState(stateRoot));
    blockers.push(...await inspectPersonState(stateRoot));
    blockers.push(...await inspectCommandState(stateRoot));
  }
  return blockers;
}

function mergeDefaults(defaults: unknown, previous: unknown): unknown {
  if (
    defaults && typeof defaults === "object" && !Array.isArray(defaults) &&
    previous && typeof previous === "object" && !Array.isArray(previous)
  ) {
    const merged: JsonObject = { ...(defaults as JsonObject) };
    for (const [key, value] of Object.entries(previous as JsonObject)) {
      merged[key] = key in merged ? mergeDefaults(merged[key], value) : value;
    }
    return merged;
  }
  return previous;
}

async function restoreCompatibleState(snapshotRoot: string, stagedRoot: string): Promise<void> {
  const snapshotState = join(snapshotRoot, "state");
  const stagedState = join(stagedRoot, ".speculo");
  if (await pathExists(snapshotState)) {
    for (const entry of await readdir(snapshotState, { withFileTypes: true })) {
      if (MANAGED_STATE_ENTRIES.has(entry.name)) continue;
      await cp(join(snapshotState, entry.name), join(stagedState, entry.name), {
        recursive: entry.isDirectory(),
        force: true,
      });
    }
  }
  const previousConfig = join(snapshotRoot, "config.json");
  if (await pathExists(previousConfig)) {
    const defaults = await readJson(join(stagedRoot, "config.json"));
    const previous = await readJson(previousConfig);
    await writeFile(join(stagedRoot, "config.json"), JSON.stringify(mergeDefaults(defaults, previous), null, 2) + "\n", "utf8");
  }
}

async function restoreUnselectedState(snapshotRoot: string, stagedRoot: string, workflowIds: string[]): Promise<void> {
  for (const workflowId of workflowIds) {
    const source = join(snapshotRoot, "state", workflowId);
    if (await pathExists(source)) await cp(source, join(stagedRoot, ".speculo", workflowId), { recursive: true, force: true });
  }
}

async function writeInstallManifest(stagedRoot: string, targetVersion: string, workflowIds: string[]): Promise<void> {
  await writeFile(join(stagedRoot, INSTALL_RELATIVE), JSON.stringify({
    schema_version: 1,
    package_version: targetVersion,
    workflows: [...new Set(workflowIds)].sort(),
  }, null, 2) + "\n", "utf8");
}

async function writePendingMarker(
  stagedRoot: string,
  source: string | null,
  target: string,
  blockers: MigrationBlocker[],
): Promise<void> {
  await writeFile(join(stagedRoot, MIGRATION_RELATIVE), JSON.stringify({
    schema_version: 1,
    status: "pending",
    source_version: source,
    target_version: target,
    backup_root: "speculo/.speculo/back",
    created_at: new Date().toISOString(),
    blockers,
  }, null, 2) + "\n", "utf8");
}

export async function assertNoPendingMigration(previousRoot: string): Promise<void> {
  const marker = join(previousRoot, MIGRATION_RELATIVE);
  if (!(await pathExists(marker))) return;
  throw new Error("Speculo runtime migration is pending. Run the migrate-runtime-state command before speculo init.");
}

export async function migrateRuntimeState(options: RuntimeMigrationOptions): Promise<RuntimeMigrationResult> {
  const targetVersion = await readTargetVersion(options.packageRoot);
  const snapshotRoot = join(options.stagedRoot, SNAPSHOT_DIR);
  await copySnapshot(options.previousRoot, snapshotRoot);
  const snapshotState = join(snapshotRoot, "state");
  const snapshotStateIsSymlink = await pathExists(snapshotState) && (await lstat(snapshotState)).isSymbolicLink();
  const versionResult = snapshotStateIsSymlink
    ? { version: null, blockers: [] }
    : await sourceVersion(snapshotState);
  const blockers = [...versionResult.blockers, ...await inspectSnapshot(snapshotRoot, versionResult.version)];

  await writeBackup(snapshotRoot, options.stagedRoot, versionResult.version, targetVersion);
  if (blockers.length === 0) {
    await restoreCompatibleState(snapshotRoot, options.stagedRoot);
  } else {
    await restoreUnselectedState(snapshotRoot, options.stagedRoot, options.unselectedWorkflowIds);
    await writePendingMarker(options.stagedRoot, versionResult.version, targetVersion, blockers);
  }
  await writeInstallManifest(options.stagedRoot, targetVersion, [...options.selectedWorkflowIds, ...options.unselectedWorkflowIds]);
  await rm(snapshotRoot, { recursive: true, force: true });
  return {
    status: blockers.length === 0 ? "migrated" : "pending",
    sourceVersion: versionResult.version,
    targetVersion,
    backupPath: "speculo/.speculo/back",
    blockers,
  };
}

export async function initializeRuntimeManifest(
  packageRoot: string,
  stagedRoot: string,
  workflowIds: string[],
): Promise<RuntimeMigrationResult> {
  const targetVersion = await readTargetVersion(packageRoot);
  await writeInstallManifest(stagedRoot, targetVersion, workflowIds);
  return {
    status: "not-required",
    sourceVersion: null,
    targetVersion,
    backupPath: null,
    blockers: [],
  };
}
