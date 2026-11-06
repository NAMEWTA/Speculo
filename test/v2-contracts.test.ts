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

test('directory discovery rejects duplicate public skill names', () => fixture(async root => {
  await mkdir(join(root,'workflows/speculo-status'),{recursive:true});
  await mkdir(join(root,'commands/status'),{recursive:true});
  await writeFile(join(root,'workflows/speculo-status/SKILL.md'),'---\nname: speculo-status\ndescription: Collision\n---\n');
  await writeFile(join(root,'commands/status/COMMAND.md'),'---\nid: status\ndescription: Collision\n---\n');
  await assert.rejects(readAssetCatalog(root), /duplicate-asset-name/);
}));
