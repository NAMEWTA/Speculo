import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { validateStructuredRuntime } from "../src/structured.js";
import { validateOpsResources } from "../src/ops-resources.js";
import { assertOpsResourceApproval, type ResourceDispatchEnvelope } from "../src/kernel.js";
import { discoverWorkflowCatalog } from "../src/workflows.js";

const packageRoot=process.cwd();
const workflowRoot=join(packageRoot,"template/workflows/ops");
async function json(path:string):Promise<Record<string,any>> { return JSON.parse(await readFile(path,"utf8")); }
async function writeJson(path:string,value:unknown):Promise<void> {await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+"\n",{mode:0o600});}
async function seed(){return json(join(workflowRoot,"_state/status.json"));}
async function schema(){return json(join(workflowRoot,"common/schemas/status.schema.json"));}
function host(root="/srv/ops") {return {host_id:"node-a",display_name:"Node A",platform:"linux",transport:"local",root,identity:"a".repeat(64),connection:{}};}
function project(){return {project_id:"app-a",display_name:"APP A",kind:"app",service_type:null,source:{type:"local",location:"/source",revision:"v1"}};}
function deployment(){return {deployment_id:"app-a-prod",project_id:"app-a",host_id:"node-a",environment:"prod",instance:"main",layout:"flat",method:"native",version:"v1",observed_version:"v1",root:"/srv/ops/app-a",status:"completed",installed_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-01T00:00:00Z",run_id:"run-test",compose_name:null,storage:[{component:"app",purpose:"storage",path:"/srv/ops/app-a/data/app/storage"}],commands:{start:[],stop:[],verify:[]},credential_refs:[],backup:"verified project backup method",recovery:"explicit recovery only",notes:[],source:project().source,service:{}};}
async function resourceState(){const s=await seed();s.hosts["node-a"]=host();s.projects["app-a"]=project();s.deployments["app-a-prod"]=deployment();return s;}

describe("OPS 2.2 three-worker resource workflow",()=>{
 it("discovers exactly the three replacement works",async()=>{
  const entries=(await readdir(workflowRoot,{withFileTypes:true})).filter(e=>e.isDirectory()&&!["common","_state"].includes(e.name)).map(e=>e.name).sort();
  assert.deepEqual(entries,["D-project-deploy","H-host-manage","I-initialize"]);
  const catalog=await discoverWorkflowCatalog(packageRoot);assert.ok(catalog.has("ops"));
  const readme=await readFile(join(workflowRoot,"README.md"),"utf8");for(const name of entries)assert.ok(readme.includes("**"+name+"**"));
 });
 it("runs static/package self-check without target mutation",()=>{
  const p=spawnSync(process.execPath,[join(workflowRoot,"common/tools/validate-ops.mjs"),"--self-check"],{encoding:"utf8"});assert.equal(p.status,0,p.stdout+p.stderr);
 });
 it("runs executor contract tests including node-less bootstrap",()=>{
  const p=spawnSync(process.execPath,["--test",join(workflowRoot,"common/tests/test_ops.mjs"),join(workflowRoot,"common/tests/test_ops_bootstrap.mjs")],{encoding:"utf8",timeout:120000});
  assert.equal(p.status,0,p.stdout+p.stderr);
 });
 it("validates v3 resource seed with no change lifecycle",async()=>{
  const s=await seed();assert.equal(s.schema_version,3);assert.ok(!("active" in s));validateOpsResources(s,await schema());
 });
 it("validates a correctly mapped native deployment",async()=>validateOpsResources(await resourceState(),await schema()));
 it("rejects an extra resource-state field under real schema",async()=>{
  const s=await seed();s.unreviewed=true;const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/unknown/);
 });
 it("rejects persistent root escape",async()=>{
  const s=await resourceState();s.deployments["app-a-prod"].storage[0].path="/tmp/hidden-data";const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/persistence escapes/);
 });
 it("rejects deployment root override",async()=>{
  const s=await resourceState();s.deployments["app-a-prod"].root="/srv/ops/elsewhere";const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/persistence policy/);
 });
 it("rejects duplicate physical host roots",async()=>{
  const s=await resourceState();s.hosts["node-b"]={...host(),host_id:"node-b"};const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/duplicate physical/);
 });
 it("rejects nested host roots",async()=>{
  const s=await resourceState();s.hosts["node-b"]={...host("/srv/ops/nested"),host_id:"node-b"};const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/overlapping registered/);
 });
 it("rejects Windows system root and ADS root",async()=>{
  for(const root of ["C:\\Windows","C:\\Ops:stream"]) {const s=await seed();s.hosts["node-a"]={...host(root),platform:"windows"};const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/system\/ADS/);}
 });
 it("rejects local connection parameters",async()=>{
  const s=await resourceState();s.hosts["node-a"].connection={hostname:"bad"};const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/local connection/);
 });
 it("rejects orphan deployments",async()=>{
  const s=await resourceState();delete s.hosts["node-a"];const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/orphan/);
 });
 it("rejects overlapping flat and instances roots",async()=>{
  const s=await resourceState();s.deployments["app-a-test"]={...deployment(),deployment_id:"app-a-test",environment:"test",layout:"instances",root:"/srv/ops/app-a/instances/test/main",storage:[]};const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/overlapping/);
 });
 it("cannot disable strict Docker persistence policy",async()=>{
  const s=await seed();s.policies.strict_docker_root=false;const sc=await schema();assert.throws(()=>validateOpsResources(s,sc),/constant/);
 });
 it("requires exact approval for resource dispatch, even reversible writes",()=>{
  const e:ResourceDispatchEnvelope={schema_version:2,workflow:"ops",subject:{kind:"host",id:"node-a"},run_id:"run-test",plan_digest:"a".repeat(64),stage:"host-manage",transport:"native",required_capabilities:{},input_artifacts:[],output_artifacts:[],risk:"local-reversible"};
  assert.doesNotThrow(()=>assertOpsResourceApproval(e,"a".repeat(64)));assert.throws(()=>assertOpsResourceApproval(e,"b".repeat(64)),/approval-mismatch/);
 });
 it("kernel checkpoint schema keeps v1 and adds v2",async()=>{
  const s=await json(join(packageRoot,"template/.speculo/kernel/checkpoint.schema.json"));assert.equal(s.oneOf.length,2);assert.equal(s.oneOf[0].properties.schema_version.const,1);assert.equal(s.oneOf[1].properties.schema_version.const,2);assert.ok(!s.oneOf[1].required.includes("change_id"));
 });
 it("installs v3 state and never creates old OPS changes directory",async()=>{
  const target=await mkdtemp(join(tmpdir(),"ops-install-"));try{
   await initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}});const root=join(target,"speculo");const s=await json(join(root,".speculo/ops/status.json"));assert.equal(s.schema_version,3);
   const installed=(await readdir(join(root,"workflows/ops")));assert.ok(installed.includes("D-project-deploy"));assert.ok(!installed.includes("I-intake-and-assess"));
   const stateFiles=await readdir(join(root,".speculo/ops"));assert.ok(!stateFiles.includes("changes"));
  }finally{await rm(target,{recursive:true,force:true});}
 });
 it("refresh preserves private plaintext bytes and POSIX modes",async()=>{
  const target=await mkdtemp(join(tmpdir(),"ops-refresh-"));try{
   await initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}});const root=join(target,"speculo");const privateRoot=join(root,".speculo/ops/private");await mkdir(privateRoot,{mode:0o700});const p=join(privateRoot,"credentials.json");const secret=Buffer.from('{"example":"SYNTHETIC-TEST-ONLY"}\n');await writeFile(p,secret,{mode:0o600});if(process.platform!=="win32"){await chmod(p,0o600);await chmod(privateRoot,0o700);}
   if(process.platform==="win32")await assert.rejects(initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}}),/ACL-preserving/);
   else{await initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}});assert.deepEqual(await readFile(p),secret);assert.equal((await stat(p)).mode&0o777,0o600);assert.equal((await stat(privateRoot)).mode&0o777,0o700);}
  }finally{await rm(target,{recursive:true,force:true});}
 });
 it("preserves legacy empty v2 seed without manufacturing v3 approvals",async()=>{
  const target=await mkdtemp(join(tmpdir(),"ops-legacy-"));try{
   await initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}});const root=join(target,"speculo");const p=join(root,".speculo/ops/status.json");await writeJson(p,{schema_version:2,workflow:"ops",active:[],archived:[]});await initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}});assert.equal((await json(p)).schema_version,2);
  }finally{await rm(target,{recursive:true,force:true});}
 });
 it("structured runtime validates v3 with the shipped schema",async()=>{
  const target=await mkdtemp(join(tmpdir(),"ops-structured-"));try{
   await initSpeculo(target,{packageRoot,selection:{workflowIds:["ops"]}});const root=join(target,"speculo");await writeJson(join(root,".speculo/ops/status.json"),await resourceState());await validateStructuredRuntime(root,["ops"]);
  }finally{await rm(target,{recursive:true,force:true});}
 });
 it("status and archive routing no longer treat OPS as change folders",async()=>{
  const status=await readFile(join(packageRoot,"template/commands/status.md"),"utf8");assert.match(status,/Ops schema v3/);assert.doesNotMatch(status,/ops\/projects\/\{project_id\}\/changes/);
  const archive=await readFile(join(packageRoot,"template/commands/archive-and-consolidate.md"),"utf8");assert.match(archive,/OPS 资源运行记录/);
 });
});
