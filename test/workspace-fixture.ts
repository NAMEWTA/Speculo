import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_ROOTS } from '../src/paths.js';
export async function changeFixture(project:string,name:string):Promise<string>{
 const state=join(project,'.agents/speculo/.speculo'),root=join(state,'specdev/changes',name);
 await mkdir(root,{recursive:true});
 await writeFile(join(state,'workspace.json'),JSON.stringify({schema_version:2,layout_version:'agents-v2',installation_id:'00000000-0000-0000-0000-000000000000',path_base:'project-root',roots:DEFAULT_ROOTS}));
 await writeFile(join(state,'specdev/config.json'),await readFile('template/workflows/specdev/specdev-i-init-setup/assets/config-template.json'));
 return root;
}
export function fixtureProject(change:string):string{return change.split(/[\\/]\.agents[\\/]speculo[\\/]/)[0];}
