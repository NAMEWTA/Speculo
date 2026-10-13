#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const source='template/workflows/person/person-s-steelman-deliberation/assets/canonical-body.md';
const output='template/canonical/canonical-person-steelman-deliberation.md';
const body=(await readFile(source,'utf8')).replace(/\r\n/g,'\n');
if(/<Path>|\{roots\.|template\/|\.speculo\//.test(body))throw Error('Person canonical source isolation failed');
if(process.argv.includes('--check')){if((await readFile(output,'utf8')).replace(/\r\n/g,'\n')!==body)throw Error('Person canonical is stale');}
else await writeFile(output,body);
execFileSync(process.execPath,['.agents/skills/speculo-write-canonical/scripts/build-canonical.mjs','--repo','.', '--entry','template/workflows/person/person-s-steelman-deliberation/SKILL.md','--output',output,'--check'],{stdio:'inherit'});
console.log('person canonical: current');
