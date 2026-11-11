import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { readAssetCatalog, parseFrontmatter, validateSkill } from '../src/assets.js';
import { DEFAULT_ROOTS, WORKSPACE_PATH, assertSupportedProject, locateProject, readWorkspace, resolvePathReference } from '../src/paths.js';
import { fingerprintTree } from '../src/manifest.js';
async function fixture(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'speculo-v2-contracts-'));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}
async function workspace(root: string) {
  const value = { schema_version: 2, layout_version: 'agents-v2', installation_id: randomUUID(), path_base: 'project-root', roots: DEFAULT_ROOTS };
  await mkdir(dirname(join(root, WORKSPACE_PATH)), { recursive: true });
  await writeFile(join(root, WORKSPACE_PATH), JSON.stringify(value));
  return value;
}
test('v2 path lookup works inside installed state and nested project directories', () => fixture(async root => {
  const w = await workspace(root);
  for (const rel of ['src/feature/nested', '.agents/speculo/.speculo/specdev/changes/2026-10-13-feature']) {
    const nested = join(root, rel); await mkdir(nested, { recursive: true });
    assert.equal(await locateProject(nested), root);
    assert.equal(await resolvePathReference(nested, '<Path>{roots.references}/memory.md</Path>'), join(root, DEFAULT_ROOTS.references, 'memory.md'));
  }
  for (const p of ['../escape', '/outside', 'C:/outside', '{roots.unknown}/x', '{roots.state}/../outside', '{roots.state}/{change}', '<Path>broken']) await assert.rejects(resolvePathReference(root, p));
}));
test('workspace rejects altered roots, versions and malformed identities without changing files', () => fixture(async root => {
  const w = await workspace(root);
  for (const v of [{...w, schema_version:1}, {...w,installation_id:'-'.repeat(36)}, {...w,roots:{...w.roots,state:'runtime'}}, {...w, roots:{...w.roots, extra:'x'}}]) {
    await writeFile(join(root, WORKSPACE_PATH), JSON.stringify(v)); const before=await fingerprintTree(root);
    await assert.rejects(readWorkspace(root), /invalid-workspace/);
    assert.equal(await fingerprintTree(root), before);
  }
}));
test('old installations and ambiguous casing are rejected without mutation', () => fixture(async root => {
  await mkdir(join(root,'speculo/.speculo'),{recursive:true}); await writeFile(join(root,'speculo/.speculo/opaque'), 'old user data');
  const before=await fingerprintTree(root); await assert.rejects(assertSupportedProject(root), /unsupported-installation/); assert.equal(await fingerprintTree(root),before);
  await mkdir(join(root,'.Agents')); await assert.rejects(assertSupportedProject(root), /ambiguous-workspace/);
}));
test('path resolver rejects a linked reference directory', () => fixture(async root => {
  await workspace(root); const external=await mkdtemp(join(tmpdir(),'speculo-outside-'));
  try { await symlink(external,join(root,DEFAULT_ROOTS.references),process.platform==='win32'?'junction':'dir'); await assert.rejects(resolvePathReference(root,'{roots.references}/file'),/path-symlink/); }
  finally { await rm(external,{recursive:true,force:true}); }
}));
test('strict YAML rejects aliases, duplicate keys, unsafe mappings and host-only fields in sources', () => {
  for(const source of ['---\nname: a\nname: b\n---','---\nx: &a yes\ny: *a\n---','---\nmetadata:\n  __proto__: x\n---']) assert.throws(()=>parseFrontmatter(source));
  assert.ok(validateSkill('---\nname: work\ndescription: test\ndisable-model-invocation: true\n---','work').length);
  assert.throws(()=>parseFrontmatter(Buffer.from([0xff,0xfe,0x00])));
});
test('directory discovery accepts a standard single-file Skill without manifests or proprietary metadata', () => fixture(async root => {
  await mkdir(join(root,'workflows/sample'),{recursive:true});
  await mkdir(join(root,'commands/status'),{recursive:true});
  await writeFile(join(root,'workflows/sample/SKILL.md'),'---\nname: sample\ndescription: Sample workflow\n---\n# Sample\n');
  await writeFile(join(root,'commands/status/COMMAND.md'),'---\nid: status\ndescription: Current status\n---\n');
  const catalog = await readAssetCatalog(root);
  assert.deepEqual(catalog.assets.map(asset => asset.id), ['command/status','domain/sample']);
  await writeFile(join(root,'commands/status/COMMAND.md'),'---\nid: elsewhere\ndescription: Wrong folder\n---\n');
  await assert.rejects(readAssetCatalog(root), /invalid-command-header/);
}));

test('Work discovery preserves task IDs without loading manifests, stages or nested reference skills', () => fixture(async root => {
  const sources = [
    ['workflows/sample/SKILL.md', 'sample'],
    ['workflows/sample/sample-i-implement/SKILL.md', 'sample-i-implement'],
    ['workflows/sample/research/SKILL.md', 'research'],
    ['workflows/sample/references/private/SKILL.md', 'private'],
  ];
  for (const [path, name] of sources) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), `---\nname: ${name}\ndescription: ${name}\n---\n# ${name}\n`);
  }
  // Retired protocol files have no bearing on discovery of real Skill entries.
  await writeFile(join(root, 'workflows/sample/manifest.json'), '{ obsolete manifest');
  const { assets } = await readAssetCatalog(root);
  assert.deepEqual(assets.map(asset => [asset.id, asset.kind, asset.domain]), [
    ['domain/sample', 'domain-skill', 'sample'],
    ['sample/implement', 'work-skill', 'sample'],
    ['sample/research', 'work-skill', 'sample'],
  ]);
  assert.equal(assets.find(asset => asset.id === 'sample/implement')?.entry, 'workflows/sample/sample-i-implement/SKILL.md');
  assert.ok(assets.every(asset => !('stages' in asset)));
}));

test('Work discovery rejects ambiguous public IDs and invalid entries', () => fixture(async root => {
  for (const name of ['sample', 'sample/sample-i-task', 'sample/task']) {
    await mkdir(join(root, 'workflows', name), { recursive: true });
    await writeFile(join(root, 'workflows', name, 'SKILL.md'), `---\nname: ${name.split('/').at(-1)}\ndescription: Example\n---\n`);
  }
  await assert.rejects(readAssetCatalog(root), /duplicate-asset-id/);
  await rm(join(root, 'workflows/sample/task'), { recursive: true });
  await writeFile(join(root, 'workflows/sample/sample-i-task/SKILL.md'), '---\nname: wrong\ndescription: Wrong folder\n---\n');
  await assert.rejects(readAssetCatalog(root), /name must match/);
}));

test('Work discovery rejects a linked entry before reading external content', {skip:process.platform==='win32'}, () => fixture(async root => {
  await mkdir(join(root, 'workflows/sample/sample-i-task'), { recursive: true });
  await writeFile(join(root, 'workflows/sample/SKILL.md'), '---\nname: sample\ndescription: Sample\n---\n');
  const outside = await mkdtemp(join(tmpdir(), 'speculo-linked-work-'));
  try {
    const source = join(outside, 'SKILL.md');
    await writeFile(source, '---\nname: sample-i-task\ndescription: External\n---\n');
    await symlink(source, join(root, 'workflows/sample/sample-i-task/SKILL.md'), 'file');
    await assert.rejects(readAssetCatalog(root), /path-symlink/);
  } finally { await rm(outside, { recursive: true, force: true }); }
}));

test('directory discovery rejects duplicate public skill names', () => fixture(async root => {
  await mkdir(join(root,'workflows/speculo-status'),{recursive:true});
  await mkdir(join(root,'commands/status'),{recursive:true});
  await writeFile(join(root,'workflows/speculo-status/SKILL.md'),'---\nname: speculo-status\ndescription: Collision\n---\n');
  await writeFile(join(root,'commands/status/COMMAND.md'),'---\nid: status\ndescription: Collision\n---\n');
  await assert.rejects(readAssetCatalog(root), /duplicate-asset-name/);
}));
