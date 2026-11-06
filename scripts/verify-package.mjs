#!/usr/bin/env node
/** Exercise a real npm tarball in an isolated project, including refresh and removal. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pnpmCommand } from './pnpm-command.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = await mkdtemp(join(await realpath(tmpdir()), 'speculo-package-'));
const options = cwd => ({ cwd, encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, CI: 'true' } });
const run = (args, cwd = sandbox) => execFileSync(process.execPath, args, options(cwd));

try {
  const packed = join(sandbox, 'packed');
  await mkdir(packed);
  execFileSync(...pnpmCommand(['pack', '--pack-destination', packed]), options(root));
  const tarballs = (await readdir(packed)).filter(name => name.endsWith('.tgz'));
  assert.equal(tarballs.length, 1);
  await writeFile(join(sandbox, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(...pnpmCommand(['add', '--ignore-scripts', join(packed, tarballs[0])]), options(sandbox));

  const installed = join(sandbox, 'node_modules/@namewta/speculo');
  const cli = join(installed, 'dist/src/cli.js');
  const project = join(sandbox, 'project');
  const method = join(project, '.agents/speculo');
  const data = join(method, '.speculo');
  const { readAssetCatalog } = await import(pathToFileURL(join(installed, 'dist/src/assets.js')).href);
  const { discoverHubCatalog } = await import(pathToFileURL(join(installed, 'dist/src/hub-catalog.js')).href);
  const { snapshotSkillTree } = await import(pathToFileURL(join(installed, 'dist/src/skill-trees.js')).href);

  assert.match(run([cli, '--help']), /--skill-targets/);
  run([cli, 'init', project, '--workflows', 'all', '--hub-skills', 'all', '--skill-targets', 'agents,claude', '--skills', 'all']);
  const healthy = () => {
    const result = JSON.parse(run([cli, 'doctor', project, '--json']));
    assert.equal(result.healthy, true, JSON.stringify(result.checks.filter(check => !check.ok)));
  };
  healthy();
  const catalog = await readAssetCatalog(method);
  assert.deepEqual(catalog.assets.filter(asset => asset.kind === 'domain-skill').map(asset => asset.id).sort(), ['domain/learning', 'domain/media', 'domain/person', 'domain/specdev']);
  assert.equal(catalog.assets.filter(asset => asset.kind === 'work-skill').length, 0);
  for (const domain of ['learning', 'media', 'person', 'specdev']) {
    assert.deepEqual(await readdir(join(method, 'workflows', domain)), ['SKILL.md']);
    await assert.rejects(readdir(join(data, domain)), { code: 'ENOENT' });
  }
  for (const deleted of ['template/lib', 'template/canonical', 'template/workflows/ops']) {
    await assert.rejects(readdir(join(installed, deleted)), { code: 'ENOENT' });
  }

  const hub = await discoverHubCatalog(installed);
  for (const skill of hub.values()) {
    assert.deepEqual(skill.tree, await snapshotSkillTree(join(root, 'skills-hub', skill.id)), `packaged Hub differs: ${skill.id}`);
    for (const host of ['agents', 'claude']) {
      assert.deepEqual(await snapshotSkillTree(join(project, `.${host}/skills`, skill.name)), skill.tree, `projected Hub differs: ${host}/${skill.id}`);
    }
  }
  const nested = join(project, 'src/nested');
  await mkdir(nested, { recursive: true });
  assert.ok(run([cli, 'resolve', nested, '--path', '{roots.references}/memory.md']).trim().endsWith('memory.md'));

  // Neither malformed historical JSON nor non-Markdown knowledge belongs to the installer.
  const records = new Map([
    ['releases/v1/README.md', Buffer.from('# v1\r\nImplementation checked; user acceptance pending.\r\n')],
    ['knowledge/design/dashboard.html', Buffer.from('<!doctype html><title>Approved prototype</title>\n')],
    ['environments/staging.md', Buffer.from('# staging\nDeploy: use the repository script.\n')],
    ['specdev/changes/old/config.json', Buffer.from('{ historical, deliberately not valid JSON }\r\n')],
    ['ops/resources.json', Buffer.from('legacy deployment facts\n')],
  ]);
  for (const [path, bytes] of records) {
    await mkdir(dirname(join(data, path)), { recursive: true });
    await writeFile(join(data, path), bytes);
  }
  run([cli, 'init', project]);
  for (const [path, bytes] of records) assert.deepEqual(await readFile(join(data, path)), bytes, `refresh rewrote ${path}`);
  healthy();
  run([cli, 'init', project, '--core-only']);
  assert.deepEqual(JSON.parse(await readFile(join(data, 'install.json'), 'utf8')).workflows, []);
  for (const [path, bytes] of records) assert.deepEqual(await readFile(join(data, path)), bytes, `removal rewrote ${path}`);
  healthy();
  for (const domain of ['learning', 'media', 'person', 'specdev']) await assert.rejects(readFile(join(method, 'workflows', domain, 'SKILL.md')), { code: 'ENOENT' });
  const commands = catalog.assets.filter(asset => asset.kind === 'command').map(asset => asset.name).sort();
  for (const host of ['agents', 'claude']) assert.deepEqual((await readdir(join(project, `.${host}/skills`))).sort(), commands);
  console.log(`verify-package: ${tarballs[0]}; isolated install/refresh/removal, ${catalog.assets.length} entries, ${hub.size} complete Hub packages, both hosts, nested resolver and opaque user data passed`);
} finally {
  await rm(sandbox, { recursive: true, force: true });
}
