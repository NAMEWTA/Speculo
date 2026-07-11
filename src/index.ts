import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { detectLegacyState } from "./migrate.js";
import { pathExists } from "./utils.js";
import {
  discoverWorkflowCatalog,
  isInteractive,
  promptWorkflowSelection,
  scanInstalledWorkflows,
  selectAllFromCatalog,
  type WorkflowSelection,
} from "./workflows.js";

export type SpeculoCommandResult = {
  target: string;
  mode: "init" | "update";
  copied?: string[];
  updated?: string[];
};

export type SpeculoOptions = {
  packageRoot?: string;
  all?: boolean;
  selection?: WorkflowSelection;
};

const CORE_ASSETS = [".speculo", "commands", "skills"] as const;
const INSTALL_SUBDIR = "speculo";
const WORKFLOW_ENTRY = "WORKFLOW.md";
const STATE_TEMPLATE_DIR = "_state";
const MATT_WORKFLOW_ID = "matt-pocock";

function assetRoot(packageRoot: string): string {
  return join(packageRoot, "template");
}

function installRoot(target: string): string {
  return join(target, INSTALL_SUBDIR);
}

async function ensureAssetSource(
  packageRoot: string,
  asset: string
): Promise<string> {
  const source = join(assetRoot(packageRoot), asset);
  if (!(await pathExists(source))) {
    throw new Error("Missing packaged Speculo asset: template/" + asset);
  }
  return source;
}

async function copyCoreAssets(
  packageRoot: string,
  root: string,
  overwrite: boolean
): Promise<string[]> {
  const copied: string[] = [];
  for (const asset of CORE_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(root, asset);
    if (asset === ".speculo" && overwrite) {
      await copyMissingTree(source, destination);
      copied.push(asset);
      continue;
    }
    if (overwrite && asset !== ".speculo") {
      await rm(destination, { recursive: true, force: true });
    }
    await cp(source, destination, {
      recursive: true,
      force: overwrite,
      errorOnExist: !overwrite,
    });
    copied.push(asset);
  }
  return copied;
}

async function copyMissingTree(
  source: string,
  destination: string
): Promise<void> {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourceEntry = join(source, entry.name);
    const destinationEntry = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyMissingTree(sourceEntry, destinationEntry);
    } else if (!(await pathExists(destinationEntry))) {
      await cp(sourceEntry, destinationEntry, {
        force: false,
        errorOnExist: true,
      });
    }
  }
}

function shouldCopyVendorEntry(
  name: string,
  selection: WorkflowSelection
): boolean {
  return name !== MATT_WORKFLOW_ID ||
    selection.workflowIds.includes(MATT_WORKFLOW_ID);
}

async function copyVendor(
  packageRoot: string,
  root: string,
  selection: WorkflowSelection,
  mode: "fresh" | "merge" | "overwrite"
): Promise<string[]> {
  const sourceRoot = await ensureAssetSource(packageRoot, "vendor");
  const destinationRoot = join(root, "vendor");
  const copied: string[] = [];

  if (mode === "overwrite") {
    await rm(destinationRoot, { recursive: true, force: true });
  }
  await mkdir(destinationRoot, { recursive: true });

  const entries = await readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!shouldCopyVendorEntry(entry.name, selection)) continue;

    const source = join(sourceRoot, entry.name);
    const destination = join(destinationRoot, entry.name);
    if (mode === "merge" && (await pathExists(destination))) continue;

    await cp(source, destination, {
      recursive: entry.isDirectory(),
      force: mode === "overwrite",
      errorOnExist: mode === "fresh",
    });
    copied.push("vendor/" + entry.name);
  }

  return copied;
}

async function copyWorkflowPackages(
  packageRoot: string,
  root: string,
  selection: WorkflowSelection,
  overwrite: boolean
): Promise<string[]> {
  const copied: string[] = [];
  const sourceRoot = join(assetRoot(packageRoot), "workflows");
  const destinationRoot = join(root, "workflows");
  await mkdir(destinationRoot, { recursive: true });

  for (const workflowId of selection.workflowIds) {
    const source = join(sourceRoot, workflowId);
    const entry = join(source, WORKFLOW_ENTRY);
    if (!(await pathExists(entry))) {
      throw new Error("Unknown workflow package: " + workflowId);
    }

    const destination = join(destinationRoot, workflowId);
    if (overwrite) {
      await rm(destination, { recursive: true, force: true });
    }

    await cp(source, destination, {
      recursive: true,
      force: overwrite,
      errorOnExist: !overwrite,
      filter: (path) => basename(path) !== STATE_TEMPLATE_DIR,
    });
    copied.push("workflows/" + workflowId);

    const stateSource = join(source, STATE_TEMPLATE_DIR);
    const stateDestination = join(root, ".speculo", workflowId);
    if (!(await pathExists(stateSource))) {
      throw new Error("Workflow " + workflowId + " is missing _state/");
    }
    if (!(await pathExists(stateDestination))) {
      await cp(stateSource, stateDestination, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
      copied.push(".speculo/" + workflowId);
    }
  }

  return copied;
}

async function resolveSelection(
  packageRoot: string,
  root: string,
  options: SpeculoOptions,
  mode: "init" | "update"
): Promise<WorkflowSelection> {
  if (options.selection) return options.selection;

  const catalog = await discoverWorkflowCatalog(packageRoot);
  if (options.all || !isInteractive()) return selectAllFromCatalog(catalog);

  if (mode === "update") {
    const installed = await scanInstalledWorkflows(root);
    return promptWorkflowSelection(catalog, {
      preSelectedWorkflowIds: new Set(installed),
    });
  }

  return promptWorkflowSelection(catalog);
}

async function initFresh(
  targetArg: string,
  options: SpeculoOptions
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);
  const selection = await resolveSelection(packageRoot, root, options, "init");

  await mkdir(root, { recursive: true });
  const copied = await copyCoreAssets(packageRoot, root, false);
  await copyVendor(packageRoot, root, selection, "fresh");
  copied.push("vendor");
  copied.push(
    ...await copyWorkflowPackages(packageRoot, root, selection, false)
  );

  return { target, mode: "init", copied };
}

async function initUpdate(
  targetArg: string,
  options: SpeculoOptions
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);
  const selection = await resolveSelection(packageRoot, root, options, "update");
  const updated = await copyCoreAssets(packageRoot, root, true);

  if (options.all) {
    await copyVendor(packageRoot, root, selection, "overwrite");
    updated.push("vendor");
  } else {
    updated.push(...await copyVendor(packageRoot, root, selection, "merge"));
  }

  updated.push(
    ...await copyWorkflowPackages(packageRoot, root, selection, true)
  );

  return { target, mode: "update", updated };
}

export async function initSpeculo(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const root = installRoot(target);

  if (!(await pathExists(root))) {
    return initFresh(targetArg, options);
  }

  if (await detectLegacyState(target)) {
    throw new Error(
      "Legacy Speculo state detected. Run `speculo migrate " +
      targetArg + "` to preview, then `speculo migrate --apply " +
      targetArg + "` before updating."
    );
  }

  return initUpdate(targetArg, options);
}
