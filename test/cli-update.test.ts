import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../src/cli-app.js';
import { getLocalVersion } from '../src/version.js';
import { InstallCancelled } from '../src/interaction.js';
import { prompts } from '../src/install-ui.js';
import { offerUpdate } from '../src/update-flow.js';

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
  const dir = await mkdtemp(join(tmpdir(), 'speculo-update-later-'));
  const original = { select: prompts.select, multiselect: prompts.multiselect, confirm: prompts.confirm };
  const events: string[] = [];
  const cancelWizard = async () => { events.push('installation interaction'); throw new InstallCancelled(); };
  Object.assign(prompts, { select: cancelWizard, multiselect: cancelWizard, confirm: cancelWizard });
  try {
    const code = await main(['init', dir], { interactive: true, env: {}, checkUpdate: () => offerUpdate({
      name: '@namewta/speculo', local: '1.0.0', prefix: 'SPECULO', language: 'zh-CN', env: {},
      fetch: async () => ({ version: '2.0.0' }),
      inspect: async () => { throw new Error('Update later must not inspect installers'); },
      ui: {
        choose: async (message, choices) => {
          events.push('update choice');
          assert.match(message, /当前版本号：v1\.0\.0\n最新版本号：v2\.0\.0/);
          assert.deepEqual(choices.map(choice => choice.label), ['立即更新', '下次更新']);
          return 'skip';
        },
        message() {},
      },
    }) });
    assert.equal(code, 130);
    assert.deepEqual(events, ['update choice', 'installation interaction']);
  } finally {
    Object.assign(prompts, original);
    await rm(dir, { recursive: true, force: true });
  }
});
