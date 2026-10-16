#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pnpmCommand } from './pnpm-command.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),manager=process.env.npm_execpath;
if(!manager?.toLowerCase().includes('pnpm'))throw Error('Run with pnpm verify-generated');
async function snapshot(directory,prefix=''){
 const rows=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const relative=prefix+entry.name,path=join(directory,entry.name);
  if(entry.isDirectory())rows.push(...await snapshot(path,relative+'/'));
  else if(entry.isFile())rows.push([relative,createHash('sha256').update(await readFile(path)).digest('hex')]);
  else throw Error('unsupported template node '+relative);
 }
 return rows.sort((a,b)=>a[0].localeCompare(b[0]));
}
const before=await snapshot(join(root,'template'));
execFileSync(...pnpmCommand(['build']),{cwd:root,stdio:'pipe',timeout:300000});
const hubImage=await readFile(join(root,'dist/src/hub-resources.json'));
for(let pass=1;pass<=2;pass++){
 execFileSync(...pnpmCommand(['generate-assets']),{cwd:root,stdio:'pipe',timeout:300000});
 execFileSync(process.execPath,['scripts/generate-hub-bundle.mjs'],{cwd:root,stdio:'pipe',timeout:300000});
 assert.deepEqual(await readFile(join(root,'dist/src/hub-resources.json')),hubImage,`generation ${pass} changed Hub resource image`);
 assert.deepEqual(await snapshot(join(root,'template')),before,`generation ${pass} changed template content; rebuild before verification`);
}
console.log(`verify-generated: two generations unchanged across ${before.length} template files (routing, runtime library, all 12 canonical files and Hub resource image)`);
