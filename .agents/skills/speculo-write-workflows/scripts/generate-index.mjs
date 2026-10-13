#!/usr/bin/env node
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parseFrontmatter, validateSkill } from '../../../../template/lib/speculo-runtime.mjs';

const args=process.argv.slice(2), check=args.includes('--check');
if(args.filter(a=>a!=='--check').length!==1||args.some(a=>a.startsWith('--')&&a!=='--check'))throw Error('Usage: generate-index.mjs <workflow-path> [--check]');
const root=resolve(args.find(a=>a!=='--check')),domain=basename(root);
const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
if(manifest.schema_version!==2||manifest.id!==domain||manifest.entry!=='SKILL.md'||!Array.isArray(manifest.works))throw Error('invalid domain manifest');
const rows=[], ids=new Set();
for(const entry of [...manifest.works].sort()){
 if(!new RegExp(`^${domain}-[a-z]-[a-z0-9-]+/SKILL\\.md$`).test(entry))throw Error('unsafe Work entry');
 const source=await readFile(join(root,entry),'utf8'), errors=validateSkill(source,entry.split('/')[0]);
 if(errors.length)throw Error(entry+': '+errors.join('; '));
 const {fields}=parseFrontmatter(source),id=fields.metadata?.['speculo-id'];
 if(!id?.startsWith(domain+'/')||ids.has(id))throw Error('missing/duplicate Work identity');ids.add(id);
 const title=source.match(/^# (.+)$/m)?.[1]??fields.name;
 rows.push(`- **${id}** — ${title}：<Path>{roots.workflows}/${domain}/${entry}</Path>`);
}
const file=join(root,'SKILL.md'),original=(await readFile(file,'utf8')).replace(/\r\n/g,'\n');
if(parseFrontmatter(original).fields.metadata?.['speculo-id']!==`domain/${domain}`)throw Error('invalid domain Skill');
if(!/^## 能力路由\n[\s\S]*?\n## 永久知识/m.test(original))throw Error('missing routing section boundaries');
const next=original.replace(/^## 能力路由\n[\s\S]*?\n## 永久知识/m,`## 能力路由\n\n<!-- AUTO-INDEX-START -->\n\n${rows.join('\n')}\n\n<!-- AUTO-INDEX-END -->\n\n## 永久知识`);
if(next!==original){if(check)throw Error(`STALE domain routing: ${domain}`);const temp=file+'.tmp-'+process.pid;try{await writeFile(temp,next);await rename(temp,file);}finally{await rm(temp,{force:true});}}
console.log(`domain routing ${check?'check':'write'}: ${domain} (${ids.size} Works)`);
