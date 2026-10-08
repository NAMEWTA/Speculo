#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inventory = JSON.parse(await readFile(resolve(root,"scripts/specdev-upstream.json"),"utf8"));
const errors=[], safe = p => typeof p === "string" && /^[a-zA-Z0-9_.\/-]+$/.test(p) && !p.startsWith("/") && !p.split("/").includes("..");
if (!/^[a-f0-9]{40}$/.test(inventory.revision) || inventory.repository !== "https://github.com/mattpocock/skills" || inventory.schema_version !== 1) errors.push("invalid upstream identity");
const files=new Map();
for(const file of inventory.files ?? []) {
  if(!safe(file.path)||files.has(file.path)||!/^[a-f0-9]{64}$/.test(file.sha256)) errors.push("invalid or duplicate file " + file.path);
  files.set(file.path,file);
}
const entries=new Set();
for(const entry of inventory.entries ?? []) {
  if(entries.has(entry.path)||!files.has(entry.path)||!entry.path.endsWith("/SKILL.md")) errors.push("invalid entry " + entry.path);
  entries.add(entry.path);
  if(!["adapted","excluded"].includes(entry.classification)||!entry.rationale?.trim()) errors.push("missing disposition " + entry.path);
  if(entry.classification==="adapted"&&!entry.targets?.length) errors.push("missing target " + entry.path);
  for(const p of entry.targets ?? []) {
    if(!safe(p)) { errors.push("unsafe target " + p); continue; }
    try { if(!(await stat(resolve(root,p))).isFile()) errors.push("target not a file " + p); } catch { errors.push("missing target " + p); }
  }
}
if(entries.size!==38 || [...files.keys()].filter(p=>p.endsWith("/SKILL.md")).some(p=>!entries.has(p))) errors.push("expected complete 38-entry inventory");
if(process.argv.includes("--online") && !errors.length) {
  const queue=[...files.values()];
  await Promise.all(Array.from({length:4},async()=>{while(queue.length){
    const f=queue.shift();
    try {
      const response=await fetch("https://raw.githubusercontent.com/mattpocock/skills/"+inventory.revision+"/"+f.path,{signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw Error("HTTP "+response.status);
      if(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex")!==f.sha256) errors.push("source hash drift: "+f.path);
    } catch(error) { errors.push(f.path+": "+error.message); }
  }}));
}
if(errors.length){console.error(errors.join("\n"));process.exitCode=1;}
else console.log("Upstream: 38 dispositions, "+files.size+" file digests; "+(process.argv.includes("--online")?"pinned source hashes verified":"offline inventory checked; remote hashes not revalidated")+"; semantic fidelity requires review.");
