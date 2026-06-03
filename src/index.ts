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

function assetRoot(packageRoot: string): string {
  return join(packageRoot, "speculo");
}

async function ensureAssetSource(packageRoot: string, asset: string): Promise<string> {
  const source = join(assetRoot(packageRoot), asset);
  if (!(await pathExists(source))) {
    throw new Error(`Missing packaged Speculo asset: speculo/${asset}`);
  }
  return source;
}

async function collectConflicts(target: string, assets: readonly string[]): Promise<string[]> {
  const conflicts: string[] = [];
  for (const asset of assets) {
    const destination = join(target, asset);
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

  await mkdir(target, { recursive: true });

  const conflicts = await collectConflicts(target, INIT_ASSETS);
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
    const destination = join(target, asset);
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

  await mkdir(target, { recursive: true });

  const updated: string[] = [];
  for (const asset of UPDATE_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(target, asset);
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, { recursive: true, force: true });
    updated.push(asset);
  }

  return { target, updated };
}
