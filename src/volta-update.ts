import { constants } from 'node:fs';
import { access, readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { inspectNpmPackage } from './update-npm.js';
import { formatInvocation, probeProcess, ProcessCancelledError, runProcess } from './update-process.js';
import type { OwnedInstall } from './update-flow.js';

/** Volta stores each npm tool in its own prefix, outside the active npm global scope. */
// null means this is a Volta package whose ownership could not be verified; do not fall back to npm.
export async function inspectVoltaInstall(options: { packageRoot: string; name: string; executable: string; argv: string[]; env: NodeJS.ProcessEnv }): Promise<OwnedInstall | null | undefined> {
  const { name, executable, packageRoot, argv } = options;
  const home = options.env.VOLTA_HOME || (process.platform === 'win32'
    ? options.env.LOCALAPPDATA && join(options.env.LOCALAPPDATA, 'Volta')
    : join(options.env.HOME || homedir(), '.volta'));
  if (!home || !isAbsolute(home)) return;
  const prefix = join(home, 'tools', 'image', 'packages', name);
  const scope = { prefix, root: process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib', 'node_modules') };
  const root = join(scope.root, name);
  let matched = false;
  try {
    const ownedRoot = await realpath(root);
    if (ownedRoot !== await realpath(packageRoot)) return;
    matched = true;
    if (options.env.VOLTA_BYPASS !== undefined) return null;
    let executablePath: string | undefined;
    for (const basename of process.platform === 'win32' ? ['volta.exe', 'volta.cmd'] : ['volta']) {
      const candidate = join(home, 'bin', basename);
      try {
        await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
        executablePath = candidate;
        break;
      } catch { /* Try the next launcher in this Volta installation. */ }
    }
    if (!executablePath) return null;
    const file = executablePath;
    const env: NodeJS.ProcessEnv = { ...options.env, VOLTA_HOME: home };
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'npm_config_prefix') delete env[key];
    const cwd = process.cwd();
    const inspect = async () => {
      try {
        if (await realpath(root) !== ownedRoot) return;
        const state = await inspectNpmPackage({ npmPackage: name, executable }, scope);
        if (!state.entryPath || state.reason) return;
        const selected = await probeProcess({ file, args: ['which', executable], cwd, env });
        if (selected.code !== 0 || selected.error || selected.cleanupError) return;
        const path = selected.stdout.trim();
        if (!isAbsolute(path) || await realpath(path) !== await realpath(state.entryPath)) return;
        const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
        if (manifest.name !== name) return;
        return { entry: await realpath(state.entryPath), version: manifest.version };
      } catch (error) {
        if (error instanceof ProcessCancelledError) throw error;
        return;
      }
    };
    let current = await inspect();
    if (!current) return null;
    // Volta's documented global npm interception also pins the existing Node runtime.
    const invocation = (version: string) => ({ file, args: ['run', '--node', process.versions.node, '--bundled-npm', 'npm', 'install', '--global', `${name}@${version}`], cwd, env });
    return {
      nodeVersion: process.versions.node,
      command: version => formatInvocation(invocation(version)),
      async install(version) {
        if (!await inspect()) return 1;
        const result = await runProcess(invocation(version), { terminateTree: true });
        if (result.error || result.cleanupError) throw new Error(result.error ?? result.cleanupError);
        return result.code;
      },
      async verify(version) {
        const next = await inspect();
        if (!next || next.version !== version) return false;
        current = next;
        return true;
      },
      async resume(nextEnv) {
        const result = await runProcess({ file: process.execPath, args: [current!.entry, ...argv], cwd, env: nextEnv });
        if (result.error || result.cleanupError) throw new Error(result.error ?? result.cleanupError);
        return result.code;
      },
    };
  } catch (error) {
    if (error instanceof ProcessCancelledError) throw error;
    return matched ? null : undefined;
  }
}
