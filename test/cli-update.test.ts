import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { test } from 'node:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { main } from '../src/cli-app.js';
import { getLocalVersion } from '../src/version.js';
import { InstallCancelled } from '../src/interaction.js';

test('excluded and invalid CLI invocations never run the automatic update boundary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'speculo-update-cli-'));
  let checks = 0;
  const checkUpdate = async () => { checks++; return 19; };
  try {
    for (const argv of [['--help'], ['--invalid'], ['update'], ['init', '--core-only', '--workflows', 'all'],
      ['doctor', dir, '--json'], ['recover', dir], ['resolve', dir]]) {
      await main(argv, { interactive: true, env: {}, checkUpdate });
    }
    for (const options of [{ interactive: false, env: {} }, { interactive: true, env: { CI: '1' } },
      { interactive: true, env: { SPECULO_NO_UPDATE_CHECK: '1' } },
      { interactive: true, env: { SPECULO_UPDATE_RESUME: await getLocalVersion(process.cwd()) } }]) {
      await main(['doctor', dir], { ...options, checkUpdate });
    }
    assert.equal(checks, 0);
    assert.deepEqual(await readdir(dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('updates run before init transactions and doctor; completion and cancellation do not execute the old command', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'speculo-update-before-init-'));
  let checks = 0;
  try {
    for (const argv of [['init', dir, '--core-only'], ['doctor', dir]]) {
      assert.equal(await main(argv, { interactive: true, env: {}, checkUpdate: async () => { checks++; return 19; } }), 19);
      assert.equal(await main(argv, { interactive: true, env: {}, checkUpdate: async () => { throw new InstallCancelled(); } }), 130);
    }
    assert.equal(checks, 2);
    assert.deepEqual(await readdir(dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('choosing update later continues into the original installation interaction', async () => {
  // Real Clack output must not share the test runner's serialized stdout pipe.
  // Node 22 can misparse non-ASCII bytes: https://github.com/nodejs/node/issues/65934.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('./fixtures/cli-update-later.js', import.meta.url)),
  ], { env, timeout: 30000, encoding: 'utf8' });
  assert.match(stdout, /已取消，未应用安装变更。/);
});
