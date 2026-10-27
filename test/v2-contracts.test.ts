import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { readAssetCatalog, parseFrontmatter, validateSkill } from '../src/assets.js';
import { readProjectCoordination, validateProjectCoordination, type CoordinationChoice } from '../src/coordination.js';
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
test('coordination accepts host, named tools and registered per-stage choices without probing tools', () => {
  for (const mode of ['host','orca','herdr','cli']) validateProjectCoordination({schema_version:2,defaults:{mode},rules:[]},catalog);
  const work=catalog.assets.find(a=>a.kind==='work-skill'&&a.stages.length)!;
  validateProjectCoordination({schema_version:2,defaults:{mode:'host'},rules:[{work_id:work.id,stage:work.stages[0],choice:{mode:'cli',selection:'preferred',tool:'user chosen CLI',model:'user chosen model',guide:'local help',interaction:'headless',fallback:['host']}}]},catalog);
});
test('coordination rejects unknown fields, retired modes, duplicate rules, invalid stages and unauthorized fallback', () => {
  const defaults={mode:'host'}, base={schema_version:2,defaults,rules:[]};
  const rule={work_id:'specdev/implement',choice:{mode:'host'}};
  for (const v of [{...base,runner:{}},{...base,schema_version:1},{...base,defaults:{mode:'lead'}},{...base,defaults:{mode:'native'}},{...base,defaults:{mode:'host',interaction:'headless'}},{...base,defaults:{mode:'cli',interaction:'unknown'}},{...base,defaults:{mode:'cli',interaction:['headless']}},{...base,defaults:{mode:'cli',selection:'required',fallback:['host']}},{...base,defaults:{mode:'cli',fallback:['host','host']}},{...base,rules:[rule,rule]},{...base,rules:[{...rule,stage:'unknown'}]},{...base,rules:[{...rule,work_id:'missing/work'}]}]) assert.throws(()=>validateProjectCoordination(v,catalog),/coordination-policy-conflict/);
});
test('initialization example and all optional choices remain schema-compatible and read-only without tools or skills', () => fixture(async root => {
  const require = createRequire(import.meta.url), Ajv = require('ajv/dist/2020.js').default;
  const schema = JSON.parse(await readFile('template/references/coordination/project-facts.schema.json', 'utf8'));
  const validate = new Ajv({ strict: true }).compile(schema);
  const setup = await readFile('template/references/coordination/initialization.md', 'utf8');
  const exampleBlock = setup.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(exampleBlock, 'initialization must supply a complete project configuration example');
  const example = JSON.parse(exampleBlock[1]);
  assert.equal(validate(example), true, JSON.stringify(validate.errors));
  validateProjectCoordination(example, catalog);

  const beforeMissing = await fingerprintTree(root);
  assert.equal(await readProjectCoordination(root, catalog), null);
  assert.equal(await fingerprintTree(root), beforeMissing);

  const defaults: CoordinationChoice[] = [{ mode: 'host' }, { mode: 'cli', selection: 'preferred', fallback: ['host'] }, { mode: 'cli', tool: 'chosen CLI', interaction: 'headless' }, { mode: 'cli', interaction: 'interactive' }];
  for (const mode of ['herdr', 'orca'] as const) for (const host of ['agents', 'claude']) {
    defaults.push({ mode, selection: 'preferred', fallback: ['host'], guide: `.${host}/skills/${mode}/SKILL.md` });
  }
  const rules = [{ work_id: 'specdev/code-review', choice: { mode: 'cli', selection: 'required', tool: 'explicit-reviewer', guide: 'local help', interaction: 'headless' } }];
  await mkdir(join(root, 'coordination'));
  const file = join(root, 'coordination/project.json');
  for (const choice of defaults) {
    const value = { schema_version: 2, defaults: choice, rules };
    assert.equal(validate(value), true, JSON.stringify(validate.errors));
    await writeFile(file, JSON.stringify(value, null, 2) + '\n');
    const before = await fingerprintTree(root);
    assert.deepEqual(await readProjectCoordination(root, catalog), value);
    assert.deepEqual(await readProjectCoordination(root, catalog), value);
    assert.equal(await fingerprintTree(root), before);
  }
  const invalid = [{ ...example, schema_version: 1 }, { ...example, defaults: { mode: 'lead' } }, { ...example, defaults: { mode: 'host', interaction: 'headless' } }, { ...example, defaults: { mode: 'cli', interaction: ['headless'] } }, { ...example, defaults: { mode: 'cli', selection: ['preferred'] } }, { ...example, defaults: { mode: 'cli', tool: '   ' } }, { ...example, defaults: { mode: 'herdr', selection: 'required', fallback: ['host'] } }];
  for (const value of invalid) { assert.equal(validate(value), false); assert.throws(() => validateProjectCoordination(value, catalog)); }
  for (const source of ['{ invalid', ...invalid.map(value => JSON.stringify(value))]) {
    await writeFile(file, source);
    const before = await fingerprintTree(root);
    await assert.rejects(readProjectCoordination(root, catalog));
    assert.equal(await fingerprintTree(root), before);
    assert.equal(await readFile(file, 'utf8'), source);
  }
}));
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

test('structured refresh validates current Markdown facts and rejects unsupported authority without rewriting state',()=>fixture(async root=>{
 const change='2026-10-13-current-facts',directory=join(root,'.speculo/specdev'),changeRoot=join(directory,'changes',change);
 await mkdir(changeRoot,{recursive:true});
 const readme=join(changeRoot,'README.md');
 await writeFile(readme,'# Current request\nOutcome: active\n');
 const original=await fingerprintTree(root);
 await validateStructuredRuntime(root,['specdev']);assert.equal(await fingerprintTree(root),original);
 for(const text of ['Outcome: active\nOutcome: completed\n','Outcome: archived\n']){
  await writeFile(readme,text);const before=await fingerprintTree(root);
  await assert.rejects(validateStructuredRuntime(root,['specdev']),/outcome-invalid/);
  assert.equal(await fingerprintTree(root),before);
 }
 await writeFile(readme,'# Current request\nOutcome: active\n');
 for(const [path,diagnostic] of [[join(directory,'status.json'),/unsupported-specdev-protocol/],[join(changeRoot,'.status.json'),/mixed-protocol/],[join(directory,'.markdown-conversion-pending'),/recovery-required/]] as const){
  await writeFile(path,'{"unsupported":"authority or unfinished operation"}\r\n');const before=await fingerprintTree(root);
  await assert.rejects(validateStructuredRuntime(root,['specdev']),diagnostic);
  assert.equal(await fingerprintTree(root),before);await rm(path);
 }
 await validateStructuredRuntime(root,['specdev']);assert.equal(await fingerprintTree(root),original);
}));
