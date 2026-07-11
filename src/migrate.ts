import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathExists } from "./utils.js";

type LegacyWorkflow = "dev" | "doc" | "person";
type MigrationSourceLayout = "none" | "v2" | "transitional-v3";

type LegacyChange = {
  sourceWorkflow: LegacyWorkflow;
  sourcePath: string;
  originalName: string;
  destinationRelative: string;
  archived: boolean;
  status: Record<string, unknown>;
};

export type MigrationAction = {
  kind: string;
  from?: string;
  to?: string;
  detail: string;
};

export type MigrationPlan = {
  target: string;
  legacyDetected: boolean;
  sourceLayout: MigrationSourceLayout;
  actions: MigrationAction[];
  blockers: string[];
  changes: LegacyChange[];
};

export type MigrateOptions = {
  packageRoot?: string;
  apply?: boolean;
};

export type MigrateResult = {
  target: string;
  legacyDetected: boolean;
  applied: boolean;
  actions: MigrationAction[];
};

const V2_MARKERS = [
  "dev-status.json",
  "doc-status.json",
  "person-status.json",
  ".config",
  "archive",
  "dev",
  "doc",
];

const TRANSITIONAL_DOCS_STATE = join(
  "commands",
  ".config",
  "docs-sync-state.json"
);
const COMMAND_RUN_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const LEGACY_ROOT_ENTRIES = new Set([
  "AGENTS.md",
  ".config",
  "archive",
  "commands",
  "dev",
  "doc",
  "person",
  "dev-status.json",
  "doc-status.json",
  "person-status.json",
  ".DS_Store",
]);

const CHANGE_NAME_RE =
  /^(\d{4})-(\d{2})-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

function installRoot(target: string): string {
  return join(resolve(target), "speculo");
}

function stateRoot(target: string): string {
  return join(installRoot(target), ".speculo");
}

async function directoryNames(path: string): Promise<string[]> {
  if (!(await pathExists(path))) return [];
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function readStatus(
  path: string,
  blockers: string[]
): Promise<Record<string, unknown> | undefined> {
  if (!(await pathExists(path))) {
    blockers.push("Missing change status: " + path);
    return undefined;
  }

  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch {
    blockers.push("Invalid change status JSON: " + path);
    return undefined;
  }
}

async function validateLegacyIndex(
  path: string,
  blockers: string[]
): Promise<void> {
  if (!(await pathExists(path))) return;

  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (
      !value ||
      typeof value !== "object" ||
      !Array.isArray((value as Record<string, unknown>).active)
    ) {
      blockers.push("Invalid legacy workflow index shape: " + path);
    }
  } catch {
    blockers.push("Invalid legacy workflow index JSON: " + path);
  }
}

async function readLegacyDocsSyncState(
  path: string,
  blockers: string[]
): Promise<Record<string, unknown> | undefined> {
  if (!(await pathExists(path))) return undefined;

  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      blockers.push("Invalid legacy docs-sync state shape: " + path);
      return undefined;
    }
    const state = value as Record<string, unknown>;
    for (const key of ["tracked_docs", "tracked_assets", "synced_docs", "synced_assets"]) {
      const entries = state[key];
      if (
        entries !== undefined &&
        (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string"))
      ) {
        blockers.push("Invalid legacy docs-sync " + key + ": " + path);
      }
    }
    for (const key of ["last_sync_sha", "previous_sync_sha"]) {
      const sha = state[key];
      if (sha !== undefined && sha !== null && typeof sha !== "string") {
        blockers.push("Invalid legacy docs-sync " + key + ": " + path);
      }
    }
    return state;
  } catch {
    blockers.push("Invalid legacy docs-sync state JSON: " + path);
    return undefined;
  }
}

function legacyName(source: "dev" | "doc", originalName: string): string {
  const match = originalName.match(CHANGE_NAME_RE);
  if (!match) return originalName;
  return match[1] + "-" + match[2] + "-" + match[3] +
    "-legacy-" + source + "-" + match[4];
}

function monthFromName(name: string): string {
  return name.slice(0, 7);
}

async function collectActiveChanges(
  root: string,
  workflow: LegacyWorkflow,
  blockers: string[]
): Promise<LegacyChange[]> {
  const workflowRoot = join(root, workflow);
  const names = await directoryNames(workflowRoot);
  const changes: LegacyChange[] = [];

  for (const name of names) {
    if (!CHANGE_NAME_RE.test(name)) {
      blockers.push("Malformed legacy change directory: " + join(workflowRoot, name));
      continue;
    }
    const status = await readStatus(
      join(workflowRoot, name, ".status.json"),
      blockers
    );
    if (!status) continue;

    if (workflow === "person") {
      changes.push({
        sourceWorkflow: workflow,
        sourcePath: join(workflowRoot, name),
        originalName: name,
        destinationRelative: join("person", "changes", name),
        archived: false,
        status,
      });
    } else {
      const destinationName = legacyName(workflow, name);
      changes.push({
        sourceWorkflow: workflow,
        sourcePath: join(workflowRoot, name),
        originalName: name,
        destinationRelative: join(
          "matt-pocock",
          "archive",
          monthFromName(name),
          destinationName
        ),
        archived: true,
        status,
      });
    }
  }

  return changes;
}

async function collectArchivedChanges(
  root: string,
  workflow: LegacyWorkflow,
  blockers: string[]
): Promise<LegacyChange[]> {
  const workflowArchive = join(root, "archive", workflow);
  const months = await directoryNames(workflowArchive);
  const changes: LegacyChange[] = [];

  for (const month of months) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      blockers.push("Malformed legacy archive month: " + join(workflowArchive, month));
      continue;
    }
    for (const name of await directoryNames(join(workflowArchive, month))) {
      if (!CHANGE_NAME_RE.test(name)) {
        blockers.push(
          "Malformed legacy archived change: " +
          join(workflowArchive, month, name)
        );
        continue;
      }
      const status = await readStatus(
        join(workflowArchive, month, name, ".status.json"),
        blockers
      );
      if (!status) continue;

      if (workflow === "person") {
        changes.push({
          sourceWorkflow: workflow,
          sourcePath: join(workflowArchive, month, name),
          originalName: name,
          destinationRelative: join("person", "archive", month, name),
          archived: true,
          status,
        });
      } else {
        const destinationName = legacyName(workflow, name);
        changes.push({
          sourceWorkflow: workflow,
          sourcePath: join(workflowArchive, month, name),
          originalName: name,
          destinationRelative: join(
            "matt-pocock",
            "archive",
            month,
            destinationName
          ),
          archived: true,
          status,
        });
      }
    }
  }

  return changes;
}

export async function detectLegacyState(target: string): Promise<boolean> {
  const root = stateRoot(target);
  if (!(await pathExists(root))) return false;
  for (const marker of V2_MARKERS) {
    if (await pathExists(join(root, marker))) return true;
  }
  if (await pathExists(join(root, TRANSITIONAL_DOCS_STATE))) return true;
  return (await legacyCommandRunNames(root)).length > 0;
}

async function detectV2State(target: string): Promise<boolean> {
  const root = stateRoot(target);
  if (!(await pathExists(root))) return false;
  for (const marker of V2_MARKERS) {
    if (await pathExists(join(root, marker))) return true;
  }
  return false;
}

async function legacyCommandRunNames(root: string): Promise<string[]> {
  const commandsRoot = join(root, "commands");
  if (!(await pathExists(commandsRoot))) return [];
  const entries = await readdir(commandsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && COMMAND_RUN_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export async function planMigration(
  target: string
): Promise<MigrationPlan> {
  const resolvedTarget = resolve(target);
  const root = stateRoot(resolvedTarget);
  const v2Detected = await detectV2State(resolvedTarget);
  const transitionalDetected =
    (await pathExists(join(root, TRANSITIONAL_DOCS_STATE))) ||
    (await legacyCommandRunNames(root)).length > 0;
  const sourceLayout: MigrationSourceLayout = v2Detected
    ? "v2"
    : transitionalDetected
      ? "transitional-v3"
      : "none";
  const legacyDetected = sourceLayout !== "none";
  const blockers: string[] = [];
  const actions: MigrationAction[] = [];
  const changes: LegacyChange[] = [];

  if (!legacyDetected) {
    return {
      target: resolvedTarget,
      legacyDetected,
      sourceLayout,
      actions,
      blockers,
      changes,
    };
  }

  if (!(await pathExists(root))) {
    blockers.push("Missing legacy state root: " + root);
    return {
      target: resolvedTarget,
      legacyDetected,
      sourceLayout,
      actions,
      blockers,
      changes,
    };
  }

  if (sourceLayout === "transitional-v3") {
    const oldState = join(root, TRANSITIONAL_DOCS_STATE);
    const newState = join(root, "commands", "docs-sync", "state.json");
    if (await pathExists(oldState)) {
      await readLegacyDocsSyncState(oldState, blockers);
      if (await pathExists(newState)) {
        blockers.push("Docs-sync state destination already exists: " + newState);
      }
      actions.push({
        kind: "move-docs-sync-state",
        from: ".speculo/" + TRANSITIONAL_DOCS_STATE,
        to: ".speculo/commands/docs-sync/state.json",
        detail: "Move the transitional v3 baseline into its command namespace",
      });
    }
    for (const name of await legacyCommandRunNames(root)) {
      const destination = join(root, "commands", "_legacy", name);
      if (await pathExists(destination)) {
        blockers.push("Legacy command report destination exists: " + destination);
      }
      actions.push({
        kind: "preserve-command-report",
        from: ".speculo/commands/" + name,
        to: ".speculo/commands/_legacy/" + name,
        detail: "Preserve the old report directory without rewriting history",
      });
    }
    return {
      target: resolvedTarget,
      legacyDetected,
      sourceLayout,
      actions,
      blockers,
      changes,
    };
  }

  const rootEntries = await readdir(root);
  for (const entry of rootEntries) {
    if (!LEGACY_ROOT_ENTRIES.has(entry)) {
      blockers.push("Unknown legacy state entry requires manual handling: " + join(root, entry));
    }
  }

  for (const workflow of ["dev", "doc", "person"] as const) {
    await validateLegacyIndex(
      join(root, workflow + "-status.json"),
      blockers
    );
  }

  await readLegacyDocsSyncState(
    join(root, "dev", "docs-sync-state.json"),
    blockers
  );

  for (const workflow of ["dev", "doc", "person"] as const) {
    changes.push(...await collectActiveChanges(root, workflow, blockers));
    changes.push(...await collectArchivedChanges(root, workflow, blockers));
  }

  const destinations = new Set<string>();
  for (const change of changes) {
    if (destinations.has(change.destinationRelative)) {
      blockers.push("Migration destination collision: " + change.destinationRelative);
    }
    destinations.add(change.destinationRelative);
    actions.push({
      kind: change.archived ? "archive-change" : "preserve-active-change",
      from: relative(installRoot(resolvedTarget), change.sourcePath),
      to: join(".speculo", change.destinationRelative),
      detail: change.sourceWorkflow + "/" + change.originalName,
    });
  }

  if (await pathExists(join(root, ".config"))) {
    actions.push({
      kind: "move-config",
      from: ".speculo/.config",
      to: ".speculo/matt-pocock/.config",
      detail: "Move shared v2 configuration into the Matt workflow",
    });
  }

  if (await pathExists(join(root, "dev", "docs-sync-state.json"))) {
    actions.push({
      kind: "move-docs-sync-state",
      from: ".speculo/dev/docs-sync-state.json",
      to: ".speculo/commands/docs-sync/state.json",
      detail: "Move docs-sync baseline to the global command namespace",
    });
  }

  for (const legacyPath of [
    "workflows/dev",
    "workflows/doc",
    "vendor/codebase-design",
    "vendor/resolving-merge-conflicts",
  ]) {
    if (await pathExists(join(installRoot(resolvedTarget), legacyPath))) {
      actions.push({
        kind: "remove-legacy-asset",
        from: legacyPath,
        detail: "Remove framework-managed v2 asset after state migration",
      });
    }
  }

  return {
    target: resolvedTarget,
    legacyDetected,
    sourceLayout,
    actions,
    blockers,
    changes,
  };
}

async function copyDirectoryContents(
  source: string,
  destination: string
): Promise<void> {
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

function migratedStatus(
  change: LegacyChange,
  destinationName: string,
  destinationRelative: string,
  now: string
): Record<string, unknown> {
  const status = { ...change.status };
  delete status.category;
  status.schema_version = 1;
  status.workflow = change.sourceWorkflow === "person" ? "person" : "matt-pocock";
  status.name = destinationName;
  status.updated_at = now;

  if (change.archived) {
    status.change_status = "archived";
    status.current_phase = "migration-archive";
    status.archived = true;
    status.archive_path = "speculo/.speculo/" +
      destinationRelative.replaceAll("\\", "/");
    if (change.sourceWorkflow !== "person") {
      status.legacy_source = {
        workflow: change.sourceWorkflow,
        original_name: change.originalName,
        original_status: change.status.change_status ?? "unknown",
      };
    }
    const history = Array.isArray(status.phase_history)
      ? [...status.phase_history]
      : [];
    history.push({
      phase: "migration-archive",
      entered_at: now,
      completed_at: now,
      status: "completed",
    });
    status.phase_history = history;
  }

  return status;
}

function migratedDocsSyncState(
  legacy: Record<string, unknown>
): Record<string, unknown> {
  const tracked = Array.isArray(legacy.tracked_assets)
    ? legacy.tracked_assets
    : Array.isArray(legacy.tracked_docs) ? legacy.tracked_docs : [];
  const synced = Array.isArray(legacy.synced_assets)
    ? legacy.synced_assets
    : Array.isArray(legacy.synced_docs) ? legacy.synced_docs : [];
  const lastSyncSha = typeof legacy.last_sync_sha === "string"
    ? legacy.last_sync_sha
    : null;
  const previousSyncSha = typeof legacy.previous_sync_sha === "string"
    ? legacy.previous_sync_sha
    : null;
  const totalSyncs =
    typeof legacy.total_syncs === "number" &&
      Number.isInteger(legacy.total_syncs) &&
      legacy.total_syncs >= 0
      ? legacy.total_syncs
      : 0;

  return {
    schema_version: 4,
    command: "docs-sync",
    state_path: "speculo/.speculo/commands/docs-sync/state.json",
    baseline: {
      mode: "explicit",
      sha: lastSyncSha,
    },
    last_range: {
      from_sha: previousSyncSha,
      to_sha: lastSyncSha,
    },
    project_targets: [],
    pending_legacy_targets: [...new Set(tracked)],
    scope_revision: 0,
    scope_confirmed_at: null,
    last_sync_run_at: typeof legacy.last_sync_run_at === "string"
      ? legacy.last_sync_run_at
      : null,
    total_syncs: totalSyncs,
    synced_assets: synced,
  };
}

function reportMarkdown(plan: MigrationPlan, now: string): string {
  const lines = [
    "# Speculo v3 Migration Report",
    "",
    "- Generated: " + now,
    "- Target: " + plan.target,
    "- Source layout: " + plan.sourceLayout,
    "- Actions: " + plan.actions.length,
    "",
    "## Actions",
    "",
  ];
  for (const action of plan.actions) {
    lines.push(
      "- " + action.kind + ": " +
      (action.from ? action.from : "") +
      (action.to ? " -> " + action.to : "") +
      " — " + action.detail
    );
  }
  lines.push(
    "",
    "## Follow-up",
    "",
    "Run `speculo init <target>` and select matt-pocock/person as needed.",
    "Legacy dev/doc active work is historical archive and is not resumed automatically.",
    ""
  );
  return lines.join("\n");
}

async function preserveLegacyCommandEntries(
  source: string,
  destination: string
): Promise<void> {
  if (!(await pathExists(source))) return;
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".config" || entry.name === "_legacy") continue;
    await mkdir(destination, { recursive: true });
    await cp(join(source, entry.name), join(destination, entry.name), {
      recursive: entry.isDirectory(),
      force: false,
      errorOnExist: true,
    });
  }
  await copyDirectoryContents(join(source, "_legacy"), destination);
}

async function writeMigrationReport(
  stage: string,
  plan: MigrationPlan,
  now: string
): Promise<void> {
  const reportRoot = join(stage, "commands", "migrate");
  await mkdir(reportRoot, { recursive: true });
  const stem = now.slice(0, 10) + "-workspace-layout-v3";
  let reportPath = join(reportRoot, stem + ".md");
  let suffix = 2;
  while (await pathExists(reportPath)) {
    reportPath = join(reportRoot, stem + "-" + String(suffix).padStart(2, "0") + ".md");
    suffix += 1;
  }
  await writeFile(reportPath, reportMarkdown(plan, now));
}

async function buildMigratedState(
  plan: MigrationPlan,
  packageRoot: string,
  stage: string
): Promise<void> {
  const root = stateRoot(plan.target);
  const now = new Date().toISOString();
  const templateRoot = join(packageRoot, "template");

  if (plan.sourceLayout === "transitional-v3") {
    await cp(root, stage, { recursive: true, force: true });
    const workspaceDestination = join(stage, "workspace.json");
    if (!(await pathExists(workspaceDestination))) {
      await cp(
        join(templateRoot, ".speculo", "workspace.json"),
        workspaceDestination,
        { force: false, errorOnExist: true }
      );
    }

    const commandsRoot = join(stage, "commands");
    const legacyRoot = join(commandsRoot, "_legacy");
    for (const name of await legacyCommandRunNames(stage)) {
      await mkdir(legacyRoot, { recursive: true });
      await rename(join(commandsRoot, name), join(legacyRoot, name));
    }

    const oldState = join(stage, TRANSITIONAL_DOCS_STATE);
    if (await pathExists(oldState)) {
      const legacy = JSON.parse(await readFile(oldState, "utf8")) as Record<
        string,
        unknown
      >;
      const destination = join(commandsRoot, "docs-sync", "state.json");
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(
        destination,
        JSON.stringify(migratedDocsSyncState(legacy), null, 2) + "\n"
      );
      await rm(oldState, { force: true });
      const oldConfigDir = dirname(oldState);
      if ((await readdir(oldConfigDir)).length === 0) {
        await rm(oldConfigDir, { recursive: true, force: true });
      }
    }

    await writeMigrationReport(stage, plan, now);
    return;
  }

  await cp(join(templateRoot, ".speculo"), stage, {
    recursive: true,
    force: true,
  });
  await cp(
    join(templateRoot, "workflows", "matt-pocock", "_state"),
    join(stage, "matt-pocock"),
    { recursive: true, force: true }
  );
  await cp(
    join(templateRoot, "workflows", "person", "_state"),
    join(stage, "person"),
    { recursive: true, force: true }
  );

  await preserveLegacyCommandEntries(
    join(root, "commands"),
    join(stage, "commands", "_legacy")
  );
  await copyDirectoryContents(
    join(root, ".config"),
    join(stage, "matt-pocock", ".config")
  );

  const docsSyncSource = join(root, "dev", "docs-sync-state.json");
  if (await pathExists(docsSyncSource)) {
    const legacyDocsSync = JSON.parse(
      await readFile(docsSyncSource, "utf8")
    ) as Record<string, unknown>;
    const docsSync = migratedDocsSyncState(legacyDocsSync);
    const destination = join(stage, "commands", "docs-sync", "state.json");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(
      destination,
      JSON.stringify(docsSync, null, 2) + "\n"
    );
  }

  const personActive: Array<Record<string, unknown>> = [];
  for (const change of plan.changes) {
    const destination = join(stage, change.destinationRelative);
    await mkdir(dirname(destination), { recursive: true });
    await cp(change.sourcePath, destination, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });

    const destinationName = basename(destination);
    const status = migratedStatus(
      change,
      destinationName,
      change.destinationRelative,
      now
    );
    await writeFile(
      join(destination, ".status.json"),
      JSON.stringify(status, null, 2) + "\n"
    );

    if (
      change.sourceWorkflow === "person" &&
      !change.archived &&
      status.change_status === "active"
    ) {
      personActive.push({
        name: destinationName,
        current_phase: status.current_phase ?? "00-init",
        updated_at: status.updated_at,
      });
    }
  }

  await writeFile(
    join(stage, "person", "status.json"),
    JSON.stringify(
      { schema_version: 1, workflow: "person", active: personActive },
      null,
      2
    ) + "\n"
  );

  await writeMigrationReport(stage, plan, now);
}

async function moveLegacyAssetsToBackup(
  root: string,
  backup: string
): Promise<Array<{ source: string; backup: string }>> {
  const moved: Array<{ source: string; backup: string }> = [];
  for (const relativePath of [
    "workflows/dev",
    "workflows/doc",
    "vendor/codebase-design",
    "vendor/resolving-merge-conflicts",
  ]) {
    const source = join(root, relativePath);
    if (!(await pathExists(source))) continue;
    const destination = join(backup, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
    moved.push({ source, backup: destination });
  }
  return moved;
}

async function restoreLegacyAssets(
  moved: Array<{ source: string; backup: string }>
): Promise<void> {
  for (const item of [...moved].reverse()) {
    if (!(await pathExists(item.backup))) continue;
    await mkdir(dirname(item.source), { recursive: true });
    await rename(item.backup, item.source);
  }
}

export async function migrateSpeculo(
  targetArg = ".",
  options: MigrateOptions = {}
): Promise<MigrateResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const plan = await planMigration(target);

  if (plan.blockers.length > 0) {
    throw new Error(
      ["Speculo migration blocked:", ...plan.blockers.map((item) => "- " + item)]
        .join("\n")
    );
  }

  if (!plan.legacyDetected || !options.apply) {
    return {
      target,
      legacyDetected: plan.legacyDetected,
      applied: false,
      actions: plan.actions,
    };
  }

  const root = installRoot(target);
  const state = stateRoot(target);
  const stage = join(root, ".speculo-migrate-stage");
  const backup = join(root, ".speculo-migrate-backup");
  const assetBackup = join(root, ".speculo-migrate-assets");
  await rm(stage, { recursive: true, force: true });
  await rm(backup, { recursive: true, force: true });
  await rm(assetBackup, { recursive: true, force: true });

  await buildMigratedState(plan, packageRoot, stage);

  let stateMoved = false;
  let newStateInstalled = false;
  let movedAssets: Array<{ source: string; backup: string }> = [];
  try {
    movedAssets = await moveLegacyAssetsToBackup(root, assetBackup);
    await rename(state, backup);
    stateMoved = true;
    await rename(stage, state);
    newStateInstalled = true;
  } catch (error) {
    if (newStateInstalled && (await pathExists(state))) {
      await rm(state, { recursive: true, force: true });
    }
    if (stateMoved && (await pathExists(backup))) {
      await rename(backup, state);
    }
    await restoreLegacyAssets(movedAssets);
    await rm(stage, { recursive: true, force: true });
    throw error;
  }

  await rm(backup, { recursive: true, force: true });
  await rm(assetBackup, { recursive: true, force: true });

  return {
    target,
    legacyDetected: true,
    applied: true,
    actions: plan.actions,
  };
}
