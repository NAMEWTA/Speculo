import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathExists } from "./utils.js";

export type SpeculoCommandResult = {
  target: string;
  copied?: string[];
  updated?: string[];
};

export type SpeculoOptions = {
  packageRoot?: string;
};

const INIT_ASSETS = [".speculo", "commands", "skills", "workflows"] as const;
const UPDATE_ASSETS = ["commands", "skills", "workflows"] as const;

// Assets install under a single `speculo/` directory inside the target,
// mirroring the package layout — never scattered into the target root.
const INSTALL_SUBDIR = "speculo";

function assetRoot(packageRoot: string): string {
  return join(packageRoot, "speculo");
}

function installRoot(target: string): string {
  return join(target, INSTALL_SUBDIR);
}

async function ensureAssetSource(packageRoot: string, asset: string): Promise<string> {
  const source = join(assetRoot(packageRoot), asset);
  if (!(await pathExists(source))) {
    throw new Error(`Missing packaged Speculo asset: speculo/${asset}`);
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

export async function initSpeculo(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);

  await mkdir(root, { recursive: true });

  const conflicts = await collectConflicts(root, INIT_ASSETS);
  if (conflicts.length > 0) {
    throw new Error(
      [
        "Speculo init refused to overwrite existing paths:",
        ...conflicts.map((conflict) => `- ${conflict}`)
      ].join("\n")
    );
  }

  const copied: string[] = [];
  for (const asset of INIT_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(root, asset);
    await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
    copied.push(asset);
  }

  return { target, copied };
}

export async function updateSpeculo(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);

  await mkdir(root, { recursive: true });

  const updated: string[] = [];
  for (const asset of UPDATE_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(root, asset);
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, { recursive: true, force: true });
    updated.push(asset);
  }

  return { target, updated };
}
