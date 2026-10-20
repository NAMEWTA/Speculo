import { readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { getNpmContext, inspectNpmPackage } from './update-npm.js';
import { formatInvocation, ProcessCancelledError, runProcess } from './update-process.js';
import type { OwnedInstall } from './update-flow.js';
import { inspectVoltaInstall } from './volta-update.js';

export async function inspectSelfInstall(options: { packageRoot: string; name: string; executable: string; argv: string[]; env: NodeJS.ProcessEnv }): Promise<OwnedInstall | undefined> {
  const { name, executable, packageRoot, argv, env } = options;
  const volta = await inspectVoltaInstall(options);
  if (volta !== undefined) return volta ?? undefined;
  try {
    const context = await getNpmContext(env);
    const identity = { npmPackage: name, executable };
    const root = join(context.root, name);
    const ownedRoot = await realpath(root);
    if (ownedRoot !== await realpath(packageRoot)) return;
    const state = await inspectNpmPackage(identity, context);
    if (!state.entryPath || state.reason) return;
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    let entry = join(root, typeof manifest.bin === 'string' ? manifest.bin : manifest.bin[executable]);
    const cwd = process.cwd();
    // Pin the same global prefix for both npm and its subprocesses.
    const npmEnv = { ...context.env };
    for (const key of Object.keys(npmEnv)) if (key.toLowerCase() === 'npm_config_prefix') delete npmEnv[key];
    npmEnv.npm_config_prefix = context.prefix;
    return {
      nodeVersion: context.nodeVersion!,
      command: version => formatInvocation({ file: context.file, args: ['install', '-g', `${name}@${version}`, '--prefix', context.prefix] }),
      async install(version) {
        const before = await inspectNpmPackage(identity, context);
        if (!before.entryPath || before.reason || await realpath(root) !== ownedRoot) return 1;
        const result = await runProcess({ file: context.file, args: ['install', '-g', `${name}@${version}`, '--prefix', context.prefix], cwd, env: npmEnv }, { terminateTree: true });
        if (result.error || result.cleanupError) throw new Error(result.error ?? result.cleanupError);
        return result.code;
      },
      async verify(version) {
        const after = await inspectNpmPackage(identity, context);
        const next = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
        const nextBin = typeof next.bin === 'string' ? next.bin : next.bin?.[executable];
        if (after.reason || !after.entryPath || next.name !== name || next.version !== version
          || typeof nextBin !== 'string' || await realpath(root) !== ownedRoot) return false;
        entry = join(root, nextBin);
        return true;
      },
      async resume(nextEnv) {
        const result = await runProcess({ file: process.execPath, args: [entry, ...argv], cwd, env: nextEnv });
        if (result.error || result.cleanupError) throw new Error(result.error ?? result.cleanupError);
        return result.code;
      },
    };
  } catch (error) {
    if (error instanceof ProcessCancelledError) throw error;
    return;
  }
}
