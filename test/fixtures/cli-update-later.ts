import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../../src/cli-app.js';
import { InstallCancelled } from '../../src/interaction.js';
import { prompts } from '../../src/install-ui.js';
import { offerUpdate } from '../../src/update-flow.js';

// Run the real interactive transition with captured terminal streams. Assertion
// failures propagate through the child's nonzero exit rather than being hidden.
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
  // Preparing the lock can leave an empty .agents parent; no installation is committed.
  await assert.rejects(readdir(join(dir, '.agents', 'speculo')), { code: 'ENOENT' });
} finally {
  Object.assign(prompts, original);
  await rm(dir, { recursive: true, force: true });
}
