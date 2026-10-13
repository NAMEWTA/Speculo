#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
for(const domain of await readdir('template/workflows',{withFileTypes:true}))if(domain.isDirectory())execFileSync(process.execPath,['.agents/skills/speculo-write-workflows/scripts/generate-index.mjs',`template/workflows/${domain.name}`,...process.argv.slice(2)],{stdio:'inherit'});
