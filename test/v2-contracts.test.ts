import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { readAssetCatalog, parseFrontmatter, validateSkill } from '../src/assets.js';
import { validateProjectCoordination } from '../src/coordination.js';
import { DEFAULT_ROOTS, WORKSPACE_PATH, assertSupportedProject, locateProject, readWorkspace, resolvePathReference, workspaceForPathSync } from '../src/paths.js';
import { fingerprintTree } from '../src/manifest.js';
import { validateStructuredRuntime } from '../src/structured.js';
const catalog = await readAssetCatalog(join(process.cwd(), 'template'));
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
    assert.deepEqual(workspaceForPathSync(nested), { projectRoot: root, workspace: w });
    assert.equal(await resolvePathReference(nested, '<Path>{roots.references}/coordination/coordination-contract.md</Path>'), join(root, DEFAULT_ROOTS.references, 'coordination/coordination-contract.md'));
  }
  for (const p of ['../escape', '/outside', 'C:/outside', '{roots.unknown}/x', '{roots.state}/../outside', '{roots.state}/{change}', '<Path>broken']) await assert.rejects(resolvePathReference(root, p));
}));
test('workspace rejects altered roots, versions and malformed identities without changing files', () => fixture(async root => {
  const w = await workspace(root);
  for (const v of [{...w, schema_version:1}, {...w,installation_id:'-'.repeat(36)}, {...w,roots:{...w.roots,state:'runtime'}}, {...w, roots:{...w.roots, extra:'x'}}]) {
    await writeFile(join(root, WORKSPACE_PATH), JSON.stringify(v)); const before=await fingerprintTree(root);
    await assert.rejects(readWorkspace(root), /invalid-workspace/); assert.throws(()=>workspaceForPathSync(root), /invalid-workspace/);
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
test('coordination accepts Lead, named tools and registered per-stage choices without probing tools', () => {
  for (const mode of ['lead','orca','herdr','cli']) validateProjectCoordination({schema_version:1,defaults:{mode},rules:[]},catalog);
  const work=catalog.assets.find(a=>a.kind==='work-skill'&&a.stages.length)!;
  validateProjectCoordination({schema_version:1,defaults:{mode:'lead'},rules:[{work_id:work.id,stage:work.stages[0],choice:{mode:'cli',selection:'preferred',tool:'user chosen CLI',model:'user chosen model',guide:'local help',fallback:['lead']}}]},catalog);
});
test('coordination rejects unknown fields, retired modes, duplicate rules, invalid stages and unauthorized fallback', () => {
  const defaults={mode:'lead'}, base={schema_version:1,defaults,rules:[]};
  const rule={work_id:'specdev/implement',choice:{mode:'lead'}};
  for (const v of [{...base,runner:{}},{...base,schema_version:2},{...base,defaults:{mode:'native'}},{...base,defaults:{mode:'cli',selection:'required',fallback:['lead']}},{...base,defaults:{mode:'cli',fallback:['lead','lead']}},{...base,rules:[rule,rule]},{...base,rules:[{...rule,stage:'unknown'}]},{...base,rules:[{...rule,work_id:'missing/work'}]}]) assert.throws(()=>validateProjectCoordination(v,catalog),/coordination-policy-conflict/);
});
test('strict YAML rejects aliases, duplicate keys, unsafe mappings and host-only fields in sources', () => {
  for(const source of ['---\nname: a\nname: b\n---','---\nx: &a yes\ny: *a\n---','---\nmetadata:\n  __proto__: x\n---']) assert.throws(()=>parseFrontmatter(source));
  assert.ok(validateSkill('---\nname: work\ndescription: test\ndisable-model-invocation: true\n---','work').length);
  assert.throws(()=>parseFrontmatter(Buffer.from([0xff,0xfe,0x00])));
});
test('asset catalog rejects unregistered commands and duplicate manifest entries', () => fixture(async root => {
  await mkdir(join(root,'commands/test'),{recursive:true});
  await writeFile(join(root,'commands/test/COMMAND.md'),'---\nid: test\ndescription: Test command\n---\n');
  const manifest=join(root,'commands/manifest.json');
  await writeFile(manifest,JSON.stringify({schema_version:1,commands:[]})); await assert.rejects(readAssetCatalog(root),/unregistered-command/);
  await writeFile(manifest,JSON.stringify({schema_version:1,commands:['test/COMMAND.md','test/COMMAND.md']})); await assert.rejects(readAssetCatalog(root),/invalid-command-manifest/);
  await writeFile(manifest,JSON.stringify({schema_version:1,commands:['test/COMMAND.md']})); assert.equal((await readAssetCatalog(root)).assets.length,1);
}));

test('domain entry renames do not rename runtime knowledge indexes or OPS generated README files', async () => {
  const docs=await readFile('template/workflows/ops/common/tools/opslib/docs.mjs','utf8');
  assert.match(docs, /local\["README\.md"\]/); assert.match(docs,/knowledge\/INDEX\.md/);
  assert.doesNotMatch(docs,/common\/rules\/domain-runtime\.md|knowledge\/SKILL\.md/);
  const learning=await readFile('template/workflows/learning/common/tools/validate-learning.mjs','utf8');
  assert.match(learning,/\["INDEX\.md", "REVIEW\.md"\]/);
  assert.match(learning,/!candidate\.endsWith\("INDEX\.md"\)/);
  const status=await readFile('template/commands/status/COMMAND.md','utf8');
  assert.match(status,/\{roots\.workflows\}\/\{workflow\}\/SKILL\.md/);
  assert.doesNotMatch(status,/\{roots\.workflows\}\/\{workflow\}\/(INDEX|README)\.md/);
});

test('structured change versions are exact numbers and validation never rewrites state',()=>fixture(async root=>{
 const change='2026-10-13-exact-schema',directory=join(root,'.speculo/specdev'),path=join(directory,'changes',change,'.status.json');
 await mkdir(dirname(path),{recursive:true});
 await writeFile(join(directory,'status.json'),JSON.stringify({schema_version:5,workflow:'specdev',active:[{change}],archived:[]}));
 for(const version of ['6',5,6]){
  await writeFile(path,JSON.stringify({schema_version:version,artifact:'change-status',change}));const before=await fingerprintTree(root);
  if(version===6)await validateStructuredRuntime(root,['specdev']);else await assert.rejects(validateStructuredRuntime(root,['specdev']),/schema v6/);
  assert.equal(await fingerprintTree(root),before);
 }
}));
