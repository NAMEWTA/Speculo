#!/usr/bin/env node
/** Build a real tarball, install it outside this repository, and exercise shipped assets. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pnpmCommand } from './pnpm-command.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manager=process.env.npm_execpath;
if(!manager||!manager.toLowerCase().includes('pnpm'))throw Error('Run with pnpm verify-package');
const temporaryRoot=await realpath(tmpdir());
const sandbox=await mkdtemp(join(temporaryRoot,'speculo-package-'));
const run=(args,cwd=sandbox)=>execFileSync(process.execPath,args,{cwd,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024,env:{...process.env,CI:'true'}});
try{
  const packed=join(sandbox,'packed'); await mkdir(packed);
  execFileSync(...pnpmCommand(['pack','--pack-destination',packed]),{cwd:root,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024,env:{...process.env,CI:'true'}});
  const tarballs=(await readdir(packed)).filter(n=>n.endsWith('.tgz'));assert.equal(tarballs.length,1);
  await writeFile(join(sandbox,'package.json'),JSON.stringify({private:true,type:'module'}));
  execFileSync(...pnpmCommand(['add','--ignore-scripts',join(packed,tarballs[0])]),{cwd:sandbox,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024,env:{...process.env,CI:'true'}});
  const installed=join(sandbox,'node_modules/@namewta/speculo'),cli=join(installed,'dist/src/cli.js'),project=join(sandbox,'project');
  await assert.rejects(readFile(join(installed,'scripts/generate-runtime.mjs')),/ENOENT/);
  assert.match(run([cli,'--help']),/--skill-targets/);
  run([cli,'init',project,'--workflows','learning,media,ops,person,specdev','--skill-targets','agents,claude','--skills','all']);
  const doctor=JSON.parse(run([cli,'doctor',project,'--json']));assert.equal(doctor.healthy,true,JSON.stringify(doctor.checks.filter(c=>!c.ok)));
  const assets=join(project,'.agents/speculo'),lib=await import(pathToFileURL(join(assets,'lib/speculo-runtime.mjs')).href);
  assert.equal((await lib.readAssetCatalog(assets)).assets.length,53);
  assert.equal(JSON.parse(await readFile(join(assets,'workflows/specdev/runtime-contract.json'),'utf8')).state_seed,'optional');
  for (const name of ['status.json','config.json']) await assert.rejects(readFile(join(assets,'.speculo/specdev',name)),/ENOENT/);
  const canonicalRoot=join(installed,'template/canonical');
  const canonicalNames=(await readdir(canonicalRoot)).filter(name=>name.startsWith('canonical-')&&name.endsWith('.md'));
  assert.equal(canonicalNames.length,12);
  assert.equal(canonicalNames.filter(name=>name.startsWith('canonical-specdev-')).length,5);
  for(const name of canonicalNames)assert.ok((await readFile(join(canonicalRoot,name),'utf8')).trim().length>0,`empty packaged canonical: ${name}`);
  assert.deepEqual(lib.parseOutcome('```\nOutcome: completed\n```\nOutcome: active\n'),{outcome:'active',line:4});
  assert.equal(lib.parseFrontmatter('---\nname: sample\ndescription: Unicode 多行\n---').fields.name,'sample');
  const designValidators=await import(pathToFileURL(join(assets,'lib/design-validators.mjs')).href);
  assert.equal(designValidators.designPackage({schema_version:2}),false);
  const designCatalog=JSON.parse(await readFile(join(assets,'workflows/specdev/specdev-p-prototype/design-library/catalog.json'),'utf8'));
  assert.equal(designValidators.designCatalog(designCatalog),true);
  assert.equal(designCatalog.templates.length,12);assert.equal(designCatalog.references.length,10);
  const projections=JSON.parse(await readFile(join(assets,'.speculo/projections.json'),'utf8'));assert.equal(projections.files.length,116);assert.equal(projections.schema_version,3);assert.deepEqual(projections.targets,['agents','claude']);assert.equal(projections.asset_ids.length,53);
  run([join(assets,'workflows/specdev/common/tools/validate-specdev.mjs'),'--self-check']);
  run([join(assets,'workflows/media/common/tools/validate-media.mjs'),'--state-root',join(assets,'.speculo/media')]);
  run([join(assets,'commands/engineering-standards-builder/scripts/validate-builder.mjs'),'--root',join(assets,'commands/engineering-standards-builder')]);
  const nested=join(project,'src/nested');await mkdir(nested,{recursive:true});
  assert.ok(run([cli,'resolve',nested,'--path','{roots.references}/coordination/coordination-contract.md']).trim().endsWith('coordination-contract.md'));
  const directProject=join(sandbox,'direct-project'),directChange=join(directProject,'data/specdev/changes/2026-10-14-direct');
  await mkdir(directChange,{recursive:true});
  await writeFile(join(directChange,'README.md'),'# Direct\nOutcome: active\n<a id="scope"></a>\n## Scope\nRead-only direct Spec verification.\n<a id="acceptance"></a>\n## Acceptance\n- [ ] AC-1 keeps the declared read scope.\n<a id="verification"></a>\n## Verification\nActual execution is pending.\n## Next Step\nRun the scoped check.\n');
  const directContext=lib.resolveWorkContextSync({projectRoot:directProject,methodRoot:assets,stateRoot:'data'});
  assert.equal(directContext.installation,'absent');
  assert.equal(lib.readChangeFactsSync(directContext,'2026-10-14-direct').outcome,'active');
  run([join(assets,'workflows/specdev/common/tools/validate-specdev.mjs'),'--repo',directProject,'--method-root',assets,'--state-root',join(directProject,'data'),'--stage','spec',directChange]);
  assert.deepEqual(await readdir(directChange),['README.md']);
  const legacyName='2025-01-01-frozen',legacyRoot=join(directContext.specdevRoot,'archive/2025-01',legacyName);
  await mkdir(legacyRoot,{recursive:true});
  const legacy={...JSON.parse(await readFile(join(root,'test/fixtures/specdev-legacy-change-v6.json'),'utf8')),change:legacyName,change_status:'archived',archived:true,archive_path:`<Path>{roots.state}/specdev/archive/2025-01/${legacyName}</Path>`};
  await writeFile(join(legacyRoot,'.status.json'),JSON.stringify(legacy));
  assert.equal(lib.readLegacyChangeEvidenceSync(directContext,legacyName).readonly,true);
  const compiledArtifacts=await import(pathToFileURL(join(installed,'dist/src/specdev-artifacts.js')).href);
  assert.equal(compiledArtifacts.readLegacyChangeEvidenceSync(directContext,legacyName).readonly,true);
  await writeFile(join(legacyRoot,'.status.json'),JSON.stringify({...legacy,worktrees:undefined}));
  assert.throws(()=>lib.readLegacyChangeEvidenceSync(directContext,legacyName),/invalid frozen v6 schema/);
  await writeFile(join(legacyRoot,'.status.json'),JSON.stringify(legacy));
  const preserved=new Map([
    ['design/DESIGN.md',Buffer.from('# User design baseline\r\n\r\nOriginal bytes remain unchanged.\r\n')],
    ['design/revisions/DESIGN-0001.md',Buffer.from('# Immutable historical revision\n')],
    ['changes/2026-10-14-legacy-ui/README.md',Buffer.from('# Preserved prototype work\r\nOutcome: active\r\n')],
    ['changes/2026-10-14-legacy-ui/prototypes/UI-001/design-system.md',Buffer.from('---\nschema_version: 2\nstatus: ready\n---\nHistorical package is read-only.\n')],
    ['changes/2026-10-14-legacy-ui/prototypes/UI-001/final/index.html',Buffer.from('<!doctype html><title>Legacy user prototype</title>\r\n')],
  ]);
  for(const [locator,bytes] of preserved){const target=join(assets,'.speculo/specdev',locator);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);}
  run([cli,'init',project]);
  for(const [locator,bytes] of preserved)assert.deepEqual(await readFile(join(assets,'.speculo/specdev',locator)),bytes,`refresh changed user design: ${locator}`);
  assert.equal(JSON.parse(run([cli,'doctor',project,'--json'])).healthy,true);
  console.log(`verify-package: ${tarballs[0]}; isolated install/refresh, optional SpecDev seed, explicit-root direct Work, 53 assets, 116 projection files, 12 canonical documents, standalone design validators, 12/10 catalog, byte-preserved designs and nested resolver passed`);
}finally{
  // The only recursive cleanup target is the exact mkdtemp directory created above.
  assert.ok(resolve(sandbox).startsWith(temporaryRoot+ (process.platform==='win32'?'\\':'/')));
  await rm(sandbox,{recursive:true,force:true});
}
