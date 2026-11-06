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
  const works = catalog.assets.filter(asset => asset.kind === 'work-skill');
  assert.equal(works.length, 39, 'every original Work capability must have a packaged entry');
  assert.deepEqual(Object.fromEntries(['learning', 'media', 'person', 'specdev'].map(domain =>
    [domain, works.filter(asset => asset.domain === domain).length])),
    { learning: 9, media: 7, person: 2, specdev: 21 });
  for (const asset of catalog.assets) {
    assert.deepEqual(await readFile(join(method, asset.entry)), await readFile(join(root, 'template', asset.entry)), `packaged method differs: ${asset.id}`);
    for (const host of ['agents', 'claude']) {
      const pointerFile = join(project, `.${host}/skills`, asset.name, 'SKILL.md');
      const pointer = await readFile(pointerFile, 'utf8');
      const link = /\[完整说明\]\(([^)]+)\)/.exec(pointer)?.[1];
      assert.ok(link, `missing authoritative entry link: ${host}/${asset.id}`);
      assert.equal(await realpath(resolve(dirname(pointerFile), link)), await realpath(join(method, asset.entry)));
    }
  }
  for (const domain of ['learning', 'media', 'person', 'specdev']) {
    await assert.rejects(readdir(join(data, domain)), { code: 'ENOENT' });
  }
  for (const deleted of ['template/lib', 'template/canonical', 'template/workflows/ops']) {
    await assert.rejects(readdir(join(installed, deleted)), { code: 'ENOENT' });
  }
  // Check actual resources as well as the entry names: a router without its
  // source material or executable helper is not a complete installed capability.
  for (const resource of [
    'commands/source-code-zip/scripts/zip_source_code.cjs',
    'workflows/media/media-v-video/scripts/render_preview.py',
    'workflows/media/media-v-video/scripts/verify_render.py',
    'workflows/media/media-v-video/examples/timeline.html',
    'workflows/person/person-m-mao-zedong-cognitive-os/books/src/目录.md',
    'workflows/specdev/specdev-p-prototype/design-library/templates/assets/prototypes.css',
    'workflows/specdev/specdev-p-prototype/design-library/research-snapshot/ui-gallery/01-dense-ide.html',
    'workflows/specdev/specdev-p-prototype/design-library/upstream/awesome-design-md/LICENSE',
  ]) assert.deepEqual(await readFile(join(method, resource)), await readFile(join(root, 'template', resource)), `missing or changed resource: ${resource}`);
  assert.match(run([join(method, 'commands/source-code-zip/scripts/zip_source_code.cjs'), '--help']), /--dry-run/);

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
