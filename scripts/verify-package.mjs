#!/usr/bin/env node
/** Build a real tarball, install it outside this repository, and exercise shipped assets. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manager=process.env.npm_execpath;
if(!manager||!manager.toLowerCase().includes('pnpm'))throw Error('Run with pnpm verify-package');
const sandbox=await mkdtemp(join(tmpdir(),'speculo-package-'));
const run=(args,cwd=sandbox)=>execFileSync(process.execPath,args,{cwd,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024,env:{...process.env,CI:'true'}});
try{
  const packed=join(sandbox,'packed'); await mkdir(packed);
  run([manager,'pack','--pack-destination',packed],root);
  const tarballs=(await readdir(packed)).filter(n=>n.endsWith('.tgz'));assert.equal(tarballs.length,1);
  await writeFile(join(sandbox,'package.json'),JSON.stringify({private:true,type:'module'}));
  run([manager,'add','--ignore-scripts',join(packed,tarballs[0])]);
  const installed=join(sandbox,'node_modules/@namewta/speculo'),cli=join(installed,'dist/src/cli.js'),project=join(sandbox,'project');
  await assert.rejects(readFile(join(installed,'scripts/generate-runtime.mjs')),/ENOENT/);
  assert.match(run([cli,'--help']),/--claude-skills/);
  run([cli,'init',project,'--workflows','learning,media,ops,person,specdev','--agent-skills','all','--claude-skills','all']);
  const doctor=JSON.parse(run([cli,'doctor',project,'--json']));assert.equal(doctor.healthy,true,JSON.stringify(doctor.checks.filter(c=>!c.ok)));
  const assets=join(project,'.agents/speculo'),lib=await import(pathToFileURL(join(assets,'lib/speculo-runtime.mjs')).href);
  assert.equal((await lib.readAssetCatalog(assets)).assets.length,53);
  assert.equal(lib.parseFrontmatter('---\nname: sample\ndescription: Unicode 多行\n---').fields.name,'sample');
  const projections=JSON.parse(await readFile(join(assets,'.speculo/projections.json'),'utf8'));assert.equal(projections.files.length,116);
  run([join(assets,'workflows/specdev/common/tools/validate-specdev.mjs'),'--self-check']);
  run([join(assets,'workflows/media/common/tools/validate-media.mjs'),'--state-root',join(assets,'.speculo/media')]);
  run([join(assets,'commands/engineering-standards-builder/scripts/validate-builder.mjs'),'--root',join(assets,'commands/engineering-standards-builder')]);
  const nested=join(project,'src/nested');await mkdir(nested,{recursive:true});
  assert.ok(run([cli,'resolve',nested,'--path','{roots.references}/coordination/coordination-contract.md']).trim().endsWith('coordination-contract.md'));
  run([cli,'init',project]);
  assert.equal(JSON.parse(run([cli,'doctor',project,'--json'])).healthy,true);
  console.log(`verify-package: ${tarballs[0]}; isolated install/refresh, 53 assets, 116 projection files, shipped validators and nested resolver passed`);
}finally{
  // The only recursive cleanup target is the exact mkdtemp directory created above.
  assert.ok(resolve(sandbox).startsWith(resolve(tmpdir())+ (process.platform==='win32'?'\\':'/')));
  await rm(sandbox,{recursive:true,force:true});
}
