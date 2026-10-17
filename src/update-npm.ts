import { valid } from 'semver';
import { constants } from 'node:fs';
import { access, lstat, readFile, readlink, realpath, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { delimiter, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { probeProcess } from './update-process.js';

const readCmdShim = createRequire(import.meta.url)('read-cmd-shim') as (path: string) => Promise<string>;

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

export interface NpmContext {
  file: string;
  version: string;
  prefix: string;
  root: string;
  env: NodeJS.ProcessEnv;
  cwd?: string;
  nodeVersion?: string;
}

export interface NpmPackageState {
  installed: boolean;
  entryPath?: string;
  reason?: 'missing' | 'invalid-package' | 'external-link' | 'missing-entry' | 'foreign-entry';
}

async function findPathExecutable(name: string, env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const pathKey = Object.keys(env).find(key => process.platform === 'win32' ? key.toLowerCase() === 'path' : key === 'PATH');
  for (const directory of (env[pathKey ?? 'PATH'] ?? '').split(delimiter).filter(Boolean)) {
    const candidate = resolve(directory.replace(/^"(.*)"$/, '$1'), name + (process.platform === 'win32' ? '.cmd' : ''));
    try {
      if (!(await stat(candidate)).isFile()) continue;
      await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
      return candidate;
    } catch { /* Keep searching PATH. */ }
  }
}

/** Inspect only the named package in this npm scope; never inspect PATH aliases. */
export async function inspectNpmPackage(
  tool: { npmPackage: string; executable: string },
  context: NpmContext,
): Promise<NpmPackageState> {
  const packageDir = join(context.root, tool.npmPackage);
  const binDir = process.platform === 'win32' ? context.prefix : join(context.prefix, 'bin');
  const entryPath = join(binDir, tool.executable + (process.platform === 'win32' ? '.cmd' : ''));
  const entries = process.platform === 'win32'
    ? [entryPath, join(binDir, tool.executable), join(binDir, `${tool.executable}.ps1`)] : [entryPath];
  try {
    const packageStat = await lstat(packageDir);
    const realRoot = await realpath(context.root);
    if (packageStat.isSymbolicLink() || await realpath(packageDir) !== resolve(realRoot, tool.npmPackage)) {
      return { installed: false, reason: 'external-link' };
    }
    if (!packageStat.isDirectory()) return { installed: false, reason: 'invalid-package' };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { installed: false, reason: 'invalid-package' };
    // npm may inherit force from configuration, so EEXIST is not an ownership guard.
    for (const entry of entries) {
      try { await lstat(entry); return { installed: false, reason: 'foreign-entry' }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return { installed: false, reason: 'invalid-package' }; }
    }
    return { installed: false, reason: 'missing' };
  }
  let manifest: { name?: unknown; bin?: unknown } | null;
  try {
    const manifestPath = join(packageDir, 'package.json');
    if (!isInside(await realpath(packageDir), await realpath(manifestPath))) {
      return { installed: false, reason: 'external-link' };
    }
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { installed: false, reason: 'invalid-package' };
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { installed: false, reason: 'invalid-package' };
  }
  const declaredBin = typeof manifest.bin === 'string'
    ? manifest.bin
    : (manifest.bin as Record<string, unknown> | null)?.[tool.executable];
  if (manifest.name !== tool.npmPackage || typeof declaredBin !== 'string'
      || isAbsolute(declaredBin) || !isInside(packageDir, resolve(packageDir, declaredBin))) {
    return { installed: false, reason: 'invalid-package' };
  }
  const declaredTarget = resolve(packageDir, declaredBin);
  let realBin: string | undefined;
  try {
    realBin = await realpath(declaredTarget);
    if (!isInside(await realpath(packageDir), realBin)) {
      return { installed: false, reason: 'external-link' };
    }
  } catch {
    // Missing package binaries can be repaired, but an unrelated global bin must remain protected.
  }
  // npm creates three Windows launchers; protect siblings of the primary .cmd as well.
  for (const entry of entries.slice(1)) {
    try { await lstat(entry); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      return { installed: true, reason: 'foreign-entry' };
    }
    try {
      const target = resolve(binDir, await readCmdShim(entry));
      if (target !== declaredTarget && (!realBin || await realpath(target) !== realBin)) return { installed: true, reason: 'foreign-entry' };
    } catch { return { installed: true, reason: 'foreign-entry' }; }
  }
  try {
    const entryStat = await lstat(entryPath);
    if (process.platform !== 'win32' && !entryStat.isSymbolicLink()) {
      return { installed: true, reason: 'foreign-entry' };
    }
    const target = process.platform === 'win32'
      ? resolve(binDir, await readCmdShim(entryPath))
      : resolve(binDir, await readlink(entryPath));
    if (!realBin) {
      return { installed: true, reason: target === declaredTarget ? 'missing-entry' : 'foreign-entry' };
    }
    let realTarget: string;
    try {
      realTarget = await realpath(target);
    } catch {
      return { installed: true, reason: target === declaredTarget ? 'missing-entry' : 'foreign-entry' };
    }
    if (realTarget !== realBin) {
      return { installed: true, reason: 'foreign-entry' };
    }
    if (!(await stat(realBin)).isFile()) return { installed: true, reason: 'missing-entry' };
    await access(entryPath, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return { installed: true, entryPath };
  } catch (error) {
    return { installed: true, reason: (error as NodeJS.ErrnoException).code === 'ENOTASHIM' ? 'foreign-entry' : 'missing-entry' };
  }
}

/** Resolve npm and read its global scope and runtime. Throws if it cannot be identified. */
export async function getNpmContext(env: NodeJS.ProcessEnv = process.env): Promise<NpmContext> {
  const snapshot = { ...env };
  const pathKey = process.platform === 'win32' ? Object.keys(snapshot).sort().find(key => key.toLowerCase() === 'path') : 'PATH';
  if (process.platform === 'win32') {
    for (const key of Object.keys(snapshot)) {
      if (key.toLowerCase() === 'path' && key !== pathKey) delete snapshot[key];
    }
  }
  const cwd = process.cwd();
  const file = await findPathExecutable('npm', snapshot);
  if (!file) throw new Error('npm was not found in PATH.');
  const query = async (args: string[]): Promise<string> => {
    const result = await probeProcess({ file: file!, args, env: snapshot, cwd });
    if (result.code !== 0) throw new Error(result.error || result.stderr.trim() || 'Unable to inspect npm.');
    return result.stdout.trim();
  };
  const [runtimeText, prefix, root] = await Promise.all([
    query(['version', '--json', '--global']), query(['prefix', '--global']), query(['root', '--global']),
  ]);
  let runtime: { npm?: unknown; node?: unknown };
  try {
    runtime = JSON.parse(runtimeText);
  } catch {
    throw new Error('npm returned an invalid runtime version.');
  }
  if (typeof runtime.npm !== 'string' || !valid(runtime.npm)
      || typeof runtime.node !== 'string' || !valid(runtime.node)) {
    throw new Error('npm returned an invalid runtime version.');
  }
  const expectedRoot = process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib/node_modules');
  if (!isAbsolute(prefix) || !isAbsolute(root) || root !== expectedRoot || /[\r\n\0]/.test(prefix)) {
    throw new Error('npm returned an inconsistent global prefix/root.');
  }
  return { file, version: runtime.npm, nodeVersion: runtime.node, prefix, root, env: snapshot, cwd };
}

