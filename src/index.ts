import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathExists } from "./utils.js";
import {
  discoverWorkflowCatalog,
  promptCategorySelection,
  scanInstalledWorkflows,
  selectAllFromCatalog,
  isInteractive,
  type WorkflowSelection,
} from "./workflows.js";

export type SpeculoCommandResult = {
  target: string;
  mode: 'init' | 'update';
  copied?: string[];
  updated?: string[];
};

export type SpeculoOptions = {
  packageRoot?: string;
  /** If true, install all workflows without prompting (--all equivalent). */
  all?: boolean;
  /** Explicit workflow selection for programmatic use (bypasses prompt). */
  selection?: WorkflowSelection;
};

const INIT_ASSETS = [".speculo", "commands", "skills", "workflows", "vendor"] as const;
const UPDATE_ASSETS = ["commands", "skills", "workflows"] as const;

// Assets install under a single `speculo/` directory inside the target,
// mirroring the package layout — never scattered into the target root.
const INSTALL_SUBDIR = "speculo";

function assetRoot(packageRoot: string): string {
  return join(packageRoot, "template");
}

function installRoot(target: string): string {
  return join(target, INSTALL_SUBDIR);
}

async function ensureAssetSource(packageRoot: string, asset: string): Promise<string> {
  const source = join(assetRoot(packageRoot), asset);
  if (!(await pathExists(source))) {
    throw new Error(`Missing packaged Speculo asset: template/${asset}`);
  }
  return source;
}

async function collectConflicts(root: string, assets: readonly string[]): Promise<string[]> {
  const conflicts: string[] = [];
  for (const asset of assets) {
    const destination = join(root, asset);
    if (await pathExists(destination)) {
      conflicts.push(destination);
    }
  }
  return conflicts;
}

/**
 * Merge vendor skills from the template into the install root.
 * Only copies skills that don't already exist — never overwrites.
 * Returns a list of `vendor/<name>` paths that were added.
 */
async function mergeVendor(packageRoot: string, root: string): Promise<string[]> {
  const added: string[] = [];
  const vendorSrc = join(assetRoot(packageRoot), "vendor");
  const vendorDest = join(root, "vendor");

  await mkdir(vendorDest, { recursive: true });

  let entries;
  try {
    entries = await readdir(vendorSrc, { withFileTypes: true });
  } catch {
    // No vendor/ in template — nothing to merge
    return added;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dest = join(vendorDest, entry.name);
    if (await pathExists(dest)) continue; // already exists, skip
    await cp(join(vendorSrc, entry.name), dest, { recursive: true });
    added.push(`vendor/${entry.name}`);
  }
  return added;
}

/**
 * Copy selected workflows from the template to the install root.
 * Handles category-level metadata (00-INDEX.md, _templates/) along with
 * individual workflow directories.
 */
async function copyWorkflows(
  packageRoot: string,
  root: string,
  selection: WorkflowSelection,
  options: { overwrite?: boolean } = {}
): Promise<string[]> {
  const copied: string[] = [];
  const workflowsRoot = join(root, "workflows");
  const templateWorkflows = join(packageRoot, "template", "workflows");
  const overwrite = options.overwrite ?? false;

  await mkdir(workflowsRoot, { recursive: true });

  // Track which category metadata has already been copied
  const categoriesDone = new Set<string>();

  for (const wf of selection.workflows) {
    const cat = wf.category;

    // Copy category-level 00-INDEX.md (only once per category)
    if (!categoriesDone.has(cat)) {
      const catDir = join(workflowsRoot, cat);
      await mkdir(catDir, { recursive: true });

      // 00-INDEX.md
      const indexSrc = join(templateWorkflows, cat, "00-INDEX.md");
      const indexDest = join(catDir, "00-INDEX.md");
      if (overwrite && (await pathExists(indexDest))) {
        await rm(indexDest, { force: true });
      }
      if (await pathExists(indexSrc)) {
        await cp(indexSrc, indexDest, { force: overwrite, errorOnExist: !overwrite });
      }

      // _templates/
      const templatesSrc = join(templateWorkflows, cat, "_templates");
      const templatesDest = join(catDir, "_templates");
      if (overwrite && (await pathExists(templatesDest))) {
        await rm(templatesDest, { recursive: true, force: true });
      }
      if (await pathExists(templatesSrc)) {
        await cp(templatesSrc, templatesDest, { recursive: true, force: overwrite, errorOnExist: !overwrite });
      }

      categoriesDone.add(cat);
    }

    // Copy the workflow directory
    const wfSrc = join(templateWorkflows, cat, wf.name);
    const wfDest = join(workflowsRoot, cat, wf.name);

    if (overwrite && (await pathExists(wfDest))) {
      await rm(wfDest, { recursive: true, force: true });
    }

    if (await pathExists(wfSrc)) {
      await cp(wfSrc, wfDest, { recursive: true, force: overwrite, errorOnExist: !overwrite });
      copied.push(`workflows/${cat}/${wf.name}`);
    }
  }

  return copied;
}

async function resolveSelection(
  packageRoot: string,
  root: string,
  options: SpeculoOptions,
  mode: 'init' | 'update'
): Promise<WorkflowSelection> {
  // Explicit selection from caller (programmatic use)
  if (options.selection) {
    return options.selection;
  }

  // --all flag or non-interactive → select all
  if (options.all || !isInteractive()) {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    return selectAllFromCatalog(catalog);
  }

  // Interactive mode
  const catalog = await discoverWorkflowCatalog(packageRoot);

  if (mode === 'update') {
    // Pre-select categories that already have at least one workflow installed
    let installed: { category: string; name: string }[] = [];
    try {
      installed = await scanInstalledWorkflows(root);
    } catch {
      // root not readable — treat as empty
    }
    const preSelectedCategories = new Set(installed.map((w) => w.category));
    return promptCategorySelection(catalog, { preSelectedCategories });
  }

  // Init mode: no pre-selected categories
  return promptCategorySelection(catalog);
}

async function initFresh(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);

  await mkdir(root, { recursive: true });

  // Collect conflicts for non-workflow assets only
  // (workflows are selective, no blanket conflict check)
  const nonWorkflowAssets = INIT_ASSETS.filter(a => a !== 'workflows');
  const conflicts = await collectConflicts(root, nonWorkflowAssets);
  if (conflicts.length > 0) {
    throw new Error(
      [
        "Speculo init refused to overwrite existing paths:",
        ...conflicts.map((conflict) => `- ${conflict}`)
      ].join("\n")
    );
  }

  const copied: string[] = [];

  // Copy non-workflow assets in full
  for (const asset of nonWorkflowAssets) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(root, asset);
    await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
    copied.push(asset);
  }

  // Selective workflow copy
  const selection = await resolveSelection(packageRoot, root, options, 'init');
  const workflowPaths = await copyWorkflows(packageRoot, root, selection);
  for (const wf of workflowPaths) {
    copied.push(wf);
  }

  return { target, mode: 'init', copied };
}

async function initOverwrite(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);

  await mkdir(root, { recursive: true });

  const updated: string[] = [];

  // Full refresh for non-workflow assets (current rm+cp behavior)
  for (const asset of UPDATE_ASSETS.filter(a => a !== 'workflows')) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(root, asset);
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, { recursive: true, force: true });
    updated.push(asset);
  }

  // Vendor handling: full overwrite with --all, merge otherwise
  if (options.all) {
    const vendorSrc = await ensureAssetSource(packageRoot, "vendor");
    const vendorDest = join(root, "vendor");
    await rm(vendorDest, { recursive: true, force: true });
    await cp(vendorSrc, vendorDest, { recursive: true, force: true });
    updated.push("vendor");
  } else {
    const added = await mergeVendor(packageRoot, root);
    for (const item of added) updated.push(item);
  }

  // Selective workflow overwrite
  const selection = await resolveSelection(packageRoot, root, options, 'update');
  const workflowPaths = await copyWorkflows(packageRoot, root, selection, { overwrite: true });
  for (const wf of workflowPaths) {
    updated.push(wf);
  }

  return { target, mode: 'update', updated };
}

export async function initSpeculo(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const root = installRoot(target);

  if (await pathExists(root)) {
    const result = await initOverwrite(targetArg, options);
    return { ...result, mode: 'update' };
  }

  const result = await initFresh(targetArg, options);
  return { ...result, mode: 'init' };
}
