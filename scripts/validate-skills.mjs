#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateSkill, readAssetCatalog } from '../template/lib/speculo-runtime.mjs';
export { validateSkill };
export async function validateSkills(root) {
  const errors = []; let checked = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, {withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isSymbolicLink()) { errors.push(`${path}: unexpected symlink in skill source`); continue; }
      if(entry.isDirectory()) await walk(path);
      else if(entry.name==='SKILL.md') {
        checked++;
        for(const error of validateSkill(await readFile(path),basename(dirname(path))))errors.push(`${path}: ${error}`);
      }
    }
  }
  await walk(join(root,'template'));
  try { await readAssetCatalog(join(root,'template')); } catch(error) { errors.push(String(error)); }
  return {checked,errors};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {checked,errors}=await validateSkills(resolve(process.argv[2]??'.'));
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
  else console.log(`Agent Skills source validation: ${checked} passed (not a host invocation certification)`);
}
