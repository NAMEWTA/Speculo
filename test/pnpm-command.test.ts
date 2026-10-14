import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const { pnpmCommand } = await import(pathToFileURL(resolve('scripts/pnpm-command.mjs')).href);

test('pnpm runners execute JavaScript, absolute native and PATH native entries with literal arguments', async () => {
  const root = await mkdtemp(join(tmpdir(), 'speculo pnpm runner '));
  const args = ['directory with spaces', 'literal $value & data'];
  const print = 'console.log(JSON.stringify(process.argv.slice(2)))';
  const env = { ...process.env, PATH: `${root}${delimiter}${process.env.PATH ?? ''}` };
  try {
    const script = join(root, 'pnpm.cjs');
    await writeFile(script, print);
    const nativeName = process.platform === 'win32' ? 'pnpm.exe' : 'pnpm';
    const native = join(root, nativeName);
    await copyFile(process.execPath, native);
    for (const [manager, commandArgs] of [
      [script, args],
      [native, [script, ...args]],
      [nativeName, [script, ...args]],
    ] as const) {
      const [command, argv] = pnpmCommand(commandArgs, manager);
      const output = execFileSync(command, argv, { cwd: root, env, encoding: 'utf8' });
      assert.deepEqual(JSON.parse(output), args);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
