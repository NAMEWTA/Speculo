import {changeFixture as seedChange} from "./workspace-fixture.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { initSpeculo } from "../src/index.js";
import { readSpecdevConfig } from "../src/structured.js";
import { planExternalEdits } from "../src/agent-files.js";
import { image, bytes, type ExternalName, type FileImage } from "../src/external-files.js";

const root = process.cwd(), wf = join(root, "template/workflows/specdev");
const transportModule = () => import(pathToFileURL(join(wf, "common/tools/github-transport.mjs")).href);
const artifactModule = () => import(pathToFileURL(join(wf, "common/tools/delivery-artifacts.mjs")).href);
const validatorModule = () => import(pathToFileURL(join(wf, "common/tools/validate-specdev.mjs")).href);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const base = "a".repeat(40), head = "b".repeat(40);
const marker = "specdev:2026-10-08-demo:PR-001";
const body = "AI-assisted change\n\n<!-- " + marker + " -->";

function github() {
  const state: any = {
    pull: { number: 1, title: "Change", body, state: "open", draft: true,
      base: { sha: base, ref: "main" }, head: { sha: head, ref: "feature" },
      comments: 2, review_comments: 1, changed_files: 1, updated_at: "2026-10-08T00:00:00Z",
      html_url: "https://github.com/owner/repo/pull/1", user: { login: "author" }, labels: [] },
    exists: true, calls: [], timeoutCreate: false, truncate: false, drift: false,
    issue: { number: 2, title: "Issue", body: "Issue body", state: "open", html_url: "https://github.com/owner/repo/issues/2", comments: 0 },
    issueComments: [],
  };
  const run = async (args: string[]) => {
    state.calls.push(args);
    if (args[0] === "api") {
      const path = args[1];
      if (path.startsWith("repos/owner/repo/pulls?")) return JSON.stringify([state.exists ? [state.pull] : []]);
      if (path.includes("/commits/")) return JSON.stringify({ sha: path.endsWith("main") ? base : head });
      if (/\/pulls\/1$/.test(path)) {
        if (args.includes("-H")) return "diff --git a/file b/file\n+change";
        const p = structuredClone(state.pull);
        if (state.drift) { state.pull.head.sha = "c".repeat(40); state.drift = false; }
        return JSON.stringify(p);
      }
      if (path.includes("/pulls/1/files?")) return JSON.stringify(state.truncate ? [[]] : [[{filename:"file",patch:"+change"}]]);
      if (path.includes("/pulls/1/reviews?")) return JSON.stringify([[{id:1,state:"APPROVED"}]]);
      if (path.includes("/pulls/1/comments?")) return JSON.stringify([[{id:1,body:"review"}]]);
      if (path.includes("/issues/1/comments?")) return JSON.stringify([[{id:1,body:"first"}],[{id:2,body:"second"}]]);
      if (path.includes("/issues/2/comments?")) return JSON.stringify([state.issueComments]);
      if (path.endsWith("/issues/2")) return JSON.stringify(state.issue);
    }
    if (args[0] === "pr" && args[1] === "create") {
      state.exists = true;
      if (state.timeoutCreate) throw Error("timeout after creation");
      return state.pull.html_url;
    }
    if (args[0] === "pr" && args[1] === "edit") {
      state.pull.body = args[args.indexOf("--body")+1];
      state.pull.title = args[args.indexOf("--title")+1];
      return "";
    }
    if (args[0] === "pr" && args[1] === "ready") { state.pull.draft = false; return ""; }
    if (args[0] === "issue" && args[1] === "comment") {
      state.issueComments.push({body:args[args.indexOf("--body")+1]}); state.issue.comments++; return "";
    }
    if (args[0] === "issue" && args[1] === "close") { state.issue.state="closed"; return ""; }
    throw Error("unexpected gh call " + JSON.stringify(args));
  };
  return {state,run};
}
const options = () => ({repo:"owner/repo",number:"1",base:"main",head:"feature",base_sha:base,head_sha:head,
  title:"Change",body_file:"body.md",marker,expected_body_sha256:sha(body)});
const writes = (calls: string[][]) => calls.filter(a=>a[0]!=="api");

test("PR reads all pages and reviews and rejects incomplete or drifting snapshots", async () => {
  const {createTransport}=await transportModule();
  const f=github(), read=createTransport(f.run);
  const result=await read("pr-read",{repo:"owner/repo",number:"1"});
  assert.equal(result.comments.length,2); assert.equal(result.reviews.length,1);
  assert.equal(result.review_comments.length,1); assert.match(result.diff,/diff --git/);
  assert.equal(result.pagination_complete,true); assert.equal(result.baseRefOid,base);
  assert.equal(result.files[0].path,"file");
  f.state.pull.merged_at="2026-10-08T01:00:00Z";
  assert.equal((await read("pr-read",{repo:"owner/repo",number:"1"})).state,"MERGED");
  delete f.state.pull.merged_at;
  f.state.truncate=true; await assert.rejects(read("pr-read",{repo:"owner/repo",number:"1"}),/pagination/);
  f.state.truncate=false; f.state.drift=true; await assert.rejects(read("pr-read",{repo:"owner/repo",number:"1"}),/drift/);
});
test("PR create dry-run has no writes and creation timeout recovers without duplicate", async () => {
  const {createTransport}=await transportModule(), f=github();
  f.state.exists=false;
  const run=createTransport(f.run,async()=>body);
  await run("pr-create",options()); assert.equal(writes(f.state.calls).length,0);
  assert.ok(f.state.calls.some((a:string[])=>a[1]?.includes("head=owner%3Afeature")));
  f.state.timeoutCreate=true;
  const created=await run("pr-create",{...options(),apply:true});
  assert.equal(created.status,"created"); assert.equal(created.isDraft,true);
  await run("pr-create",{...options(),apply:true});
  assert.equal(writes(f.state.calls).filter((a:string[])=>a[1]==="create").length,1);
});
test("PR update protects human edits and SHA drift and checks readback", async () => {
  const {createTransport}=await transportModule(), f=github();
  const run=createTransport(f.run,async()=>body+"\nUpdated");
  await assert.rejects(run("pr-update",{...options(),apply:true,expected_body_sha256:"0".repeat(64)}),/body drift/);
  await assert.rejects(run("pr-update",{...options(),apply:true,head_sha:"c".repeat(40)}),/SHA drift/);
  assert.equal(writes(f.state.calls).length,0);
  const result=await run("pr-update",{...options(),apply:true});
  assert.equal(result.body,body+"\nUpdated"); assert.equal(result.status,"updated");
});
test("PR ready dry-run does not change draft, apply is idempotent", async () => {
  const {createTransport}=await transportModule(),f=github(), run=createTransport(f.run);
  await run("pr-ready",options());assert.equal(f.state.pull.draft,true);assert.equal(writes(f.state.calls).length,0);
  await run("pr-ready",{...options(),apply:true});await run("pr-ready",{...options(),apply:true});
  assert.equal(f.state.pull.draft,false);assert.equal(writes(f.state.calls).length,1);
});
test("Issue close is read-only by default and retries do not duplicate comments", async () => {
  const {createTransport}=await transportModule(),f=github(),run=createTransport(f.run,async()=>"AI-assisted completion");
  const o={repo:"owner/repo",number:"2",comment_file:"comment.md",marker:"specdev:demo:completion"};
  await run("issue-comment-close",o);assert.equal(writes(f.state.calls).length,0);
  await run("issue-comment-close",{...o,apply:true});await run("issue-comment-close",{...o,apply:true});
  assert.equal(f.state.issueComments.length,1);assert.equal(f.state.issue.state,"closed");
});
test("wrong object type and invalid flags fail without mutation", async () => {
  const {createTransport,parseArgs}=await transportModule(),f=github();
  f.state.issue.pull_request={url:"pr"};
  await assert.rejects(createTransport(f.run)("issue-read",{repo:"owner/repo",number:"2"}),/pull request/);
  assert.throws(()=>parseArgs(["pr-ready","--shell","rm"]),/invalid option/);
  assert.equal(writes(f.state.calls).length,0);
});

const markdown=(meta:Record<string,unknown>,headings:string[])=>"---\n"+Object.entries(meta).map(([k,v])=>k+": "+JSON.stringify(v)).join("\n")+"\n---\n\n"+headings.map(h=>"## "+h+"\nObserved evidence.\n").join("\n");
test("delivery records enforce verification and completed release targets", async () => {
  const temp=await mkdtemp(join(tmpdir(),"speculo-records-"));
  try {
    const {validateRecord}=await artifactModule(),{parseFrontmatter}=await validatorModule();
    const id="2026-10-08-demo", common={schema_version:1,updated_at:"2026-10-08T00:00:00Z"};
    const pr={...common,artifact:"pull-request",change:id,id:"PR-001",requested:true,delivery_target:"ready",status:"ready",repo:"owner/repo",base_sha:base,head_sha:head,body_sha256:sha(body),verification:"passed",url:"https://github.com/owner/repo/pull/1"};
    const pp=join(temp,"PR-001.md"), headings=["Summary","Evidence","Before / After","Merge Risk","Authorization","Receipt","Recovery"];
    await writeFile(pp,markdown(pr,headings));assert.deepEqual(validateRecord(pp,"pull-request",parseFrontmatter,id).errors,[]);
    await writeFile(pp,markdown({...pr,verification:"pending"},headings));assert.match(validateRecord(pp,"pull-request",parseFrontmatter,id).errors.join("\n"),/verification/);
    const rp=join(temp,"DEL-001.md"),rh=["Targets","Plan","Evidence","Authorization","Receipts","Recovery"];
    const target={kind:"npm",identity:"@scope/package",required:true,version:"2.0.0-beta.1",registry:"https://registry.npmjs.org",dist_tag:"next",observed:"verified",receipt:"registry-read:package@2.0.0-beta.1"};
    const rec={...common,artifact:"delivery-run",id:"DEL-001",mode:"release",status:"completed",repo:"owner/repo",change:null,commit_sha:base,npm_target:"required",targets:[target]};
    await writeFile(rp,markdown(rec,rh));assert.deepEqual(validateRecord(rp,"delivery-run",parseFrontmatter).errors,[]);
    await writeFile(rp,markdown({...rec,npm_target:"unknown"},rh));assert.match(validateRecord(rp,"delivery-run",parseFrontmatter).errors.join("\n"),/unknown/);
    await writeFile(rp,markdown({...rec,targets:[target,{...target,kind:"github-release",identity:"v2.0.0-beta.1",observed:"failed",receipt:null}]},rh));
    assert.match(validateRecord(rp,"delivery-run",parseFrontmatter).errors.join("\n"),/verified receipt/);
    await writeFile(rp,markdown({...rec,targets:[{...target,dist_tag:null}]},rh));assert.match(validateRecord(rp,"delivery-run",parseFrontmatter).errors.join("\n"),/metadata/);
    await writeFile(rp,markdown({...rec,mode:"release-preflight",targets:[{...target,observed:"pending",receipt:null}]},rh));
    assert.deepEqual(validateRecord(rp,"delivery-run",parseFrontmatter).errors,[]);

  } finally {await rm(temp,{recursive:true,force:true});}
});

test("requested PR delivery remains an independent archive gate", async () => {
  const temp=await mkdtemp(join(tmpdir(),"speculo-delivery-gates-")),id="2026-10-08-review",change=await seedChange(temp,id);
  try {
    const {validateChange}=await validatorModule();
    await writeFile(join(change,"README.md"),"# Delivery fixture\n\nOutcome: active\n");
    const cfg=join(temp,".agents/speculo/.speculo/specdev");await mkdir(cfg,{recursive:true});
    await cp(join(wf,"specdev-i-init-setup/assets/config-template.json"),join(cfg,"config.json"));
    const readme=await readFile(join(change,"README.md"),"utf8");
    await mkdir(join(change,"pull-requests"));
    const common={schema_version:1,change:id,updated_at:"2026-10-08T00:00:00Z"};
    const pr={...common,artifact:"pull-request",id:"PR-001",requested:true,delivery_target:"ready",status:"planned",repo:"owner/repo",base_sha:base,head_sha:head,body_sha256:sha(body),verification:"pending",url:null};
    const pp=join(change,"pull-requests/PR-001.md"),hh=["Summary","Evidence","Before / After","Merge Risk","Authorization","Receipt","Recovery"];
    await writeFile(pp,markdown(pr,hh));assert.match(validateChange(change,"archive-ready").errors.join("\n"),/pending PR delivery/);
    await writeFile(pp,markdown({...pr,status:"draft",url:"https://github.com/owner/repo/pull/1"},hh));assert.match(validateChange(change,"archive-ready").errors.join("\n"),/pending PR delivery/);
    await writeFile(pp,markdown({...pr,requested:false},hh));assert.doesNotMatch(validateChange(change,"archive-ready").errors.join("\n"),/pending PR delivery/);
    assert.equal(await readFile(join(change,"README.md"),"utf8"),readme);
  } finally {await rm(temp,{recursive:true,force:true});}
});
test("logic prototypes require inline offline content, browser evidence and matching digest", async () => {
  const temp=await mkdtemp(join(tmpdir(),"speculo-logic-")),dir=join(temp,"LOGIC-001");await mkdir(dir);
  try {
    const {validateRecord}=await artifactModule(),{parseFrontmatter}=await validatorModule();
    const html='<!doctype html><button id="reset">Reset</button><script>let state=0; document.getElementById("reset").onclick=()=>state=0;</script>';
    const meta={schema_version:1,artifact:"logic-prototype",change:"2026-10-08-demo",id:"LOGIC-001",status:"ready",verification:"passed",html_sha256:sha(html),updated_at:"2026-10-08T00:00:00Z"};
    const p=join(dir,"logic.md");
    await writeFile(p,markdown(meta,["Model","Scenarios","Evidence","Decisions","Handoff"]));await writeFile(join(dir,"index.html"),html);
    assert.deepEqual(validateRecord(p,"logic-prototype",parseFrontmatter,meta.change).errors,[]);
    await writeFile(join(dir,"index.html"),html+'<script src="https://example.com/a.js"></script>');
    const errors=validateRecord(p,"logic-prototype",parseFrontmatter,meta.change).errors.join("\n");
    assert.match(errors,/offline/);assert.match(errors,/digest/);
  } finally {await rm(temp,{recursive:true,force:true});}
});
test("config accepts only the current schema without migrating user data", async () => {
  const template=JSON.parse(await readFile(join(wf,"specdev-i-init-setup/assets/config-template.json"),"utf8"));
  const current={...template,interaction_language:"en"};
  assert.equal(readSpecdevConfig(current).value,current);
  for(const version of [4,5,6])assert.throws(()=>readSpecdevConfig({...current,schema_version:version}),/must be 7/);
});
test("CLAUDE existing text remains user owned", () => {
  for(const [text,expected] of [
    ["# CLAUDE.md\n\nSpeculo agent handbook: see [AGENTS.md](./AGENTS.md).\n","# CLAUDE.md\n\nSpeculo agent handbook: see [AGENTS.md](./AGENTS.md).\n"],
    ["# User instructions\nKeep this exact content.\n","# User instructions\nKeep this exact content.\n"],
  ]) {
    const snapshots=new Map<ExternalName,FileImage>([["CLAUDE.md",image(text)]]);
    const result=planExternalEdits(snapshots,[],false);
    assert.equal(bytes(result[0].after).toString("utf8"),expected);
  }
});

test("source Skill rejects host-only extensions; Command projection owns policy", async () => {
 const {validateSkill}=await import(pathToFileURL(join(root,"scripts/validate-skills.mjs")).href);
 const content='---\nname: sample\ndescription: Explicit request\ndisable-model-invocation: true\n---\n';
 assert.match(validateSkill(content,"sample").join("\n"),/unsupported top-level/);
 assert.deepEqual(validateSkill(content.replace('disable-model-invocation: true\n',''),"sample"),[]);
});

test("old config schemas are rejected and opaque runtime bytes are preserved", async () => {
 const temp=await mkdtemp(join(tmpdir(),"speculo-reject-old-config-"));
 try {
  await initSpeculo(temp,{packageRoot:root,selection:{workflowIds:["specdev"]}});
  const runtime=join(temp,".agents/speculo/.speculo/specdev"),config=join(runtime,"config.json");
  await mkdir(runtime,{recursive:true});
  const current=JSON.parse(await readFile(join(wf,"specdev-i-init-setup/assets/config-template.json"),"utf8"));current.schema_version=5;
  const original=JSON.stringify(current);await writeFile(config,original);await writeFile(join(runtime,"opaque.bin"),Buffer.from([0,255,10,0]));
  await assert.rejects(initSpeculo(temp,{packageRoot:root,selection:{workflowIds:["specdev"]}}),/blocked/);
  assert.equal(await readFile(config,"utf8"),original);assert.deepEqual(await readFile(join(runtime,"opaque.bin")),Buffer.from([0,255,10,0]));
 } finally {await rm(temp,{recursive:true,force:true});}
});
