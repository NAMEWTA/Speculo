#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { buildDocumentGraph } from '../../../../scripts/lib/workflow-document-graph.mjs';
import { readAssetCatalog, validateSkill } from '../../../../template/lib/speculo-runtime.mjs';
const args=process.argv.slice(2),root=resolve(args.shift()??'.');let workflow,skillsOnly=false,json=false;
for(let i=0;i<args.length;i++){if(args[i]==='--workflow'){workflow=args[++i];if(!/^[a-z0-9-]+$/.test(workflow??''))throw Error('invalid workflow');}else if(args[i]==='--skills-only')skillsOnly=true;else if(args[i]==='--json')json=true;else throw Error('unknown argument '+args[i]);}
const graph=await buildDocumentGraph(root,{roots:skillsOnly?['.agents/skills']:workflow?[`template/workflows/${workflow}`,'.agents/skills']:undefined});
const errors=[...graph.errors];
for(const entry of await readdir(join(root,'.agents/skills'),{withFileTypes:true}))if(entry.isDirectory()&&!entry.name.startsWith('_')){
 const source=await readFile(join(root,'.agents/skills',entry.name,'SKILL.md'));
 errors.push(...validateSkill(source,entry.name).map(e=>entry.name+': '+e));
}
if(!skillsOnly)try{await readAssetCatalog(join(root,'template'));}catch(e){errors.push(String(e));}
console.log(json?JSON.stringify({valid:!errors.length,errors},null,2):errors.length?errors.join('\n'):'Speculo source assets: valid');process.exitCode=errors.length?1:0;
