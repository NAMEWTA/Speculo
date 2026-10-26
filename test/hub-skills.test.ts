import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { readAssetCatalog } from "../src/assets.js";
import { readProjectCoordination } from "../src/coordination.js";
import { initSpeculo } from "../src/index.js";
import { discoverHubCatalog, parseHubSkillSpec, readHubManifest, resolveHubIds } from "../src/hub-skills.js";
import { snapshotSkillTree } from "../src/skill-trees.js";
import { fingerprintTree } from "../src/manifest.js";
import { doctorSpeculo } from "../src/doctor.js";
import { readTransaction, recoverInstall, LOCK_NAME, TRANSACTIONS_ROOT } from "../src/transaction.js";
import { readProjectionManifest } from "../src/agent-skills.js";
import { InstallCancelled } from "../src/interaction.js";

const packageRoot = process.cwd();
const core = { packageRoot, selection: { workflowIds: [] } };
const hub = (ids: string[]) => ({ mode: "set" as const, assetIds: ids });
async function fixture(run: (target: string) => Promise<void>) {
  const target = await mkdtemp(join(tmpdir(), "speculo-hub-"));
  try { await run(target); } finally { await rm(target, { recursive: true, force: true }); }
}
async function healthy(target: string) {
  const report = await doctorSpeculo(target);
  assert.equal(report.healthy, true, JSON.stringify(report.checks.filter(c => !c.ok)));
}

test("Hub catalog has exactly 16 category/name entries and excludes nested example Skills", async () => {
  const catalog = await discoverHubCatalog(packageRoot);
  assert.equal(catalog.size, 16); assert.equal(new Set([...catalog.values()].map(s => s.id.split("/")[0])).size, 5);
  assert.ok(catalog.has("writing/eli5"));
  assert.ok(catalog.has("automation/herdr")); assert.ok(![...catalog.keys()].some(id => id.includes("_SKILL")));
  assert.deepEqual(parseHubSkillSpec("automation/orca,automation/herdr"), hub(["automation/herdr", "automation/orca"]));
  assert.throws(() => parseHubSkillSpec("../orca"), /--hub-skills/);
  assert.throws(() => resolveHubIds(undefined, catalog, ["retired/old"]), /unavailable-hub-skill/);
});

test("all complete Hub packages install identically in both targets, remain idempotent, and uninstall", () => fixture(async target => {
  const catalog = await discoverHubCatalog(packageRoot);
  const first = await initSpeculo(target, { ...core, hubSkills: { mode: "all" }, skillTargets: ["agents", "claude"] });
  assert.deepEqual(first.warnings, []); assert.equal(first.hub.created.length, 32);
  for (const host of ["agents", "claude"]) for (const skill of catalog.values()) {
    assert.deepEqual(await snapshotSkillTree(join(target, `.${host}/skills`, skill.name)), await snapshotSkillTree(skill.root));
  }
  assert.equal((await readHubManifest(target))?.packages.length, 32);
  await assert.rejects(readdir(join(target, ".agents/speculo/skills-hub")), /ENOENT/);
  await healthy(target);
  const before = await fingerprintTree(join(target, ".agents/skills"));
  const refresh = await initSpeculo(target, { packageRoot });
  assert.deepEqual(refresh.hub.created, []); assert.deepEqual(refresh.hub.updated, []);
  assert.equal(await fingerprintTree(join(target, ".agents/skills")), before);
  const removed = await initSpeculo(target, { ...core, hubSkills: { mode: "none" } });
  assert.equal(removed.hub.removed.length, 32);
  for (const host of ["agents", "claude"]) assert.deepEqual(await readdir(join(target, `.${host}/skills`)), []);
  await healthy(target);
}));

test("selected packages only, shared targets move full resources, and reselect after uninstall works", () => fixture(async target => {
  await initSpeculo(target, { ...core, hubSkills: hub(["automation/grok-bot-team-steward"]), skillTargets: ["agents"] });
  assert.deepEqual(await readdir(join(target, ".agents/skills")), ["grok-bot-team-steward"]);
  await readFile(join(target, ".agents/skills/grok-bot-team-steward/templates/snapshot/skills/_SKILL/SKILL.md"));
  const moved = await initSpeculo(target, { ...core, skillTargets: ["claude"] });
  assert.equal(moved.hub.created.length, 1); assert.equal(moved.hub.removed.length, 1);
  assert.deepEqual(await readdir(join(target, ".agents/skills")), []);
  await initSpeculo(target, { ...core, hubSkills: { mode: "none" }, skillTargets: [] });
  const again = await initSpeculo(target, { ...core, hubSkills: hub(["automation/grok-bot-team-steward"]), skillTargets: ["agents"] });
  assert.deepEqual(again.warnings, []); await healthy(target);
}));

test("full package updates add/remove nested files and preserve executable modes, with closed source references", () => fixture(async sandbox => {
  const source = join(sandbox, "source"), target = join(sandbox, "project"), skill = join(source, "skills-hub/coding/sample-helper");
  await mkdir(source); await cp(join(packageRoot, "template"), join(source, "template"), { recursive: true });
  await cp(join(packageRoot, "package.json"), join(source, "package.json"));
  await mkdir(join(skill, "scripts"), { recursive: true }); await mkdir(join(skill, "empty"));
  await writeFile(join(skill, "SKILL.md"), "---\nname: sample-helper\ndescription: Example helper\n---\n[Runner](scripts/run.sh)\n");
  await writeFile(join(skill, "scripts/run.sh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  await writeFile(join(skill, "scripts/old.txt"), "old");
  const options = { packageRoot: source, hubSkills: hub(["coding/sample-helper"]) };
  await initSpeculo(target, options);
  const installed = join(target, ".agents/skills/sample-helper");
  assert.deepEqual(await snapshotSkillTree(installed), await snapshotSkillTree(skill));
  await rm(join(skill, "scripts/old.txt")); await rm(join(skill, "empty"), { recursive: true });
  await mkdir(join(skill, "references/deep"), { recursive: true }); await writeFile(join(skill, "references/deep/new.md"), "new");
  await writeFile(join(skill, "scripts/run.sh"), "#!/bin/sh\nprintf updated\n");
  const updated = await initSpeculo(target, options);
  assert.deepEqual(updated.hub.updated, ["agents:coding/sample-helper"]);
  assert.deepEqual(await snapshotSkillTree(installed), await snapshotSkillTree(skill)); await healthy(target);
  const collision=join(installed,"references/deep/local.md");
  await writeFile(collision,"user bytes");
  await writeFile(join(skill,"references/deep/local.md"),"user bytes");
  const installedBefore=await fingerprintTree(installed);
  const conflict=await initSpeculo(target,options);
  assert.deepEqual(conflict.hub.conflicts,["agents:coding/sample-helper"]);
  assert.equal(await fingerprintTree(installed),installedBefore);
  assert.ok(!(await readHubManifest(target))!.packages[0].nodes.some(n=>n.path==='references/deep/local.md'));
  await rm(join(skill,"references/deep/local.md"));
  const before = await fingerprintTree(target);
  await writeFile(join(skill, "SKILL.md"), "---\nname: sample-helper\ndescription: Example helper\n---\n[Missing](references/missing.md)\n");
  await assert.rejects(initSpeculo(target, options), /hub-resource-link/);
  assert.equal(await fingerprintTree(target), before);
}));

for (const change of ["content", "extra", "symlink", "mode", "readonly", "type"] as const) test(`Hub uninstall handles ${change} according to ownership`, { skip: process.platform === "win32" && ["symlink", "mode"].includes(change) }, () => fixture(async target => {
  await initSpeculo(target, { ...core, hubSkills: hub(["automation/herdr", "automation/orca"]) });
  const root = join(target, ".agents/skills/herdr"), file = join(root, "SKILL.md");
  if (change === "content") await writeFile(file, "user edit");
  if (change === "extra") await writeFile(join(root, "user.txt"), "mine");
  if (change === "mode") await chmod(file, 0o600);
  if (change === "readonly") await chmod(file, 0o444);
  if (change === "type") { await rm(file); await mkdir(file); }
  if (change === "symlink") { await rm(file); await symlink(join(packageRoot, "skills-hub/automation/herdr/SKILL.md"), file); }
  const before = await fingerprintTree(root);
  const result = await initSpeculo(target, { ...core, hubSkills: { mode: "none" } });
  if (["symlink", "readonly", "type"].includes(change)) {
    assert.deepEqual(result.hub.conflicts, ["agents:automation/herdr"]);
    assert.deepEqual(result.hub.removed, ["agents:automation/orca"]);
    assert.equal(await fingerprintTree(root), before);
    assert.equal((await readHubManifest(target))?.packages.length, 1);
    assert.equal((await doctorSpeculo(target)).healthy, false);
  } else {
    assert.deepEqual(result.hub.conflicts, []);
    assert.equal(result.hub.removed.length, 2);
    await assert.rejects(readFile(file), /ENOENT/);
    if (change === "extra") assert.equal(await readFile(join(root, "user.txt"), "utf8"), "mine");
    assert.equal((await readHubManifest(target))?.packages.length, 0);
    await healthy(target);
  }
}));

test("unmanaged same-name Skill is never adopted, and no target is rejected before installation", () => fixture(async target => {
  await assert.rejects(initSpeculo(target, { ...core, hubSkills: hub(["automation/herdr"]), skillTargets: [] }), /requires at least one/);
  await assert.rejects(readFile(join(target, ".agents/speculo/config.json")), /ENOENT/);
  await mkdir(join(target, ".agents/skills/herdr"), { recursive: true });
  await cp(join(packageRoot, "skills-hub/automation/herdr/SKILL.md"), join(target, ".agents/skills/herdr/SKILL.md"));
  const result = await initSpeculo(target, { ...core, hubSkills: hub(["automation/herdr", "automation/orca"]) });
  assert.equal(result.hub.conflicts.length, 1); assert.equal(result.hub.created.length, 1);
  assert.deepEqual((await readHubManifest(target))?.packages.map(p => p.id), ["automation/orca"]);
}));

test("cancelled Hub preview leaves installed trees and manifests unchanged", () => fixture(async target => {
  await initSpeculo(target, { ...core, hubSkills: hub(["automation/herdr"]) });
  const before = await fingerprintTree(target);
  await assert.rejects(initSpeculo(target, { ...core, hubSkills: { mode: "none" }, confirmInstall: async preview => {
    assert.deepEqual(preview.hub?.removed, ["agents:automation/herdr"]); return false;
  } }), InstallCancelled);
  assert.equal(await fingerprintTree(target), before);
}));

test("workflow deselection removes methods, projections and navigation but retains runtime and dormant rules", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning", "specdev"] }, skills: { mode: "all" }, skillTargets: ["agents", "claude"] });
  const state = join(target, ".agents/speculo/.speculo");
  await mkdir(join(state, "coordination"), { recursive: true });
  await writeFile(join(state, "coordination/project.json"), JSON.stringify({ schema_version: 1, defaults: { mode: "lead" }, rules: [{ work_id: "learning/lesson", choice: { mode: "lead" } }] }));
  await writeFile(join(state, "learning/custom.bin"), Buffer.from([0, 255, 42]));
  const runtime = await fingerprintTree(join(state, "learning"));
  const removed = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
  assert.deepEqual(removed.removedWorkflowIds, ["learning"]); assert.deepEqual(removed.warnings, []);
  await assert.rejects(readdir(join(target, ".agents/speculo/workflows/learning")), /ENOENT/);
  for (const host of ["agents", "claude"]) await assert.rejects(readdir(join(target, `.${host}/skills/learning-l-lesson`)), /ENOENT/);
  assert.ok(!(await readProjectionManifest(target))?.asset_ids.some(id => id.startsWith("learning/") || id === "domain/learning"));
  assert.doesNotMatch(await readFile(join(target, "AGENTS.md"), "utf8"), /learning\/context/);
  assert.equal(await fingerprintTree(join(state, "learning")), runtime); await healthy(target);
  assert.equal((await readProjectCoordination(state, await readAssetCatalog(join(target, ".agents/speculo"))))?.rules[0].work_id, "learning/lesson");
  await initSpeculo(target, { ...core }); await healthy(target);
  await initSpeculo(target, { packageRoot }); await healthy(target); // inactive registry survives a core-only refresh
  await assert.rejects(initSpeculo(target, { ...core, skills: hub(["learning/lesson"]) }), /refresh is blocked/);
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
  assert.equal(await fingerprintTree(join(state, "learning")), runtime); await healthy(target);
  assert.equal((await readProjectCoordination(state, await readAssetCatalog(join(target, ".agents/speculo"))))?.rules[0].work_id, "learning/lesson");
  await initSpeculo(target, { ...core });
  const choices = JSON.parse(await readFile(join(state, "coordination/project.json"), "utf8"));
  choices.rules[0].stage = "unknown-stage"; await writeFile(join(state, "coordination/project.json"), JSON.stringify(choices));
  assert.equal((await doctorSpeculo(target)).healthy, false);
}));

test("workflow uninstall preserves added files without retaining methods", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person", "learning"] }, skills: { mode: "all" } });
  const root = join(target, ".agents/speculo/workflows/person");
  await writeFile(join(root, "local.txt"), "mine");
  await mkdir(join(root, "user-empty"));
  const pointerRoot=join(target,".agents/skills/person");
  await writeFile(join(pointerRoot,"SKILL.md"),"edited pointer");
  await writeFile(join(pointerRoot,"user.txt"),"preserve pointer addition");
  await writeFile(join(root, "SKILL.md"), "edited method");
  const result = await initSpeculo(target, core);
  assert.deepEqual(result.removedWorkflowIds, ["learning", "person"]);
  assert.deepEqual(result.warnings, []);
  assert.equal(await readFile(join(root, "local.txt"), "utf8"), "mine");
  await assert.rejects(readFile(join(root, "SKILL.md")), /ENOENT/);
  assert.deepEqual(await readdir(join(root,"user-empty")),[]);
  assert.equal(await readFile(join(pointerRoot,"user.txt"),"utf8"),"preserve pointer addition");
  await healthy(target);
  assert.ok(!(await readProjectionManifest(target))?.asset_ids.includes("domain/person"));
}));

test("workflow resource symlink conflict is retained verbatim while a sibling uninstalls", { skip: process.platform === "win32" }, () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person", "learning"] } });
  const root = join(target, ".agents/speculo/workflows/person");
  await symlink("SKILL.md", join(root, "user-link.md"));
  const before = await fingerprintTree(root);
  const result = await initSpeculo(target, core);
  assert.deepEqual(result.removedWorkflowIds, ["learning"]);
  assert.ok(result.warnings.some(w => w.includes("workflow-removal-conflict person")));
  assert.equal(await fingerprintTree(root), before);
}));

test("a projection resource added after removal preflight blocks uninstall and preserves methods", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person"] }, skills: { mode: "all" } });
  const before = await fingerprintTree(join(target, ".agents/speculo"));
  const extra = join(target, ".agents/skills/person/user.txt");
  await assert.rejects(initSpeculo(target, { ...core, beforeCommit: async () => { await writeFile(extra, "concurrent user content"); } }), /drift/);
  assert.equal(await fingerprintTree(join(target, ".agents/speculo")), before);
  assert.equal(await readFile(extra, "utf8"), "concurrent user content");
}));

for (const phase of ["skills-applying", "skills-projected", "external-finalized"] as const) test(`full Hub rollback at ${phase}`, () => fixture(async target => {
  await initSpeculo(target, { ...core, hubSkills: hub(["automation/grok-bot-team-steward"]), skillTargets: ["agents", "claude"] });
  const before = await fingerprintTree(target);
  await assert.rejects(initSpeculo(target, { ...core, hubSkills: hub(["writing/job-application"]), transactionHook: async p => { if (p === phase) throw new Error("hub fault"); } }), /hub fault/);
  assert.equal(await fingerprintTree(target), before); await healthy(target);
}));

test("killed partial nested copy recovers every resource and preserves recovery evidence on drift", { skip: process.platform === "win32" }, () => fixture(async target => {
  await initSpeculo(target, core);
  const before = await fingerprintTree(join(target, ".agents/speculo"));
  const imports = ["index", "transaction", "skill-trees"].map(n => pathToFileURL(resolve(`dist/src/${n}.js`)).href);
  const script = `import {initSpeculo} from ${JSON.stringify(imports[0])}; import {readTransaction} from ${JSON.stringify(imports[1])}; import {applySkillRecords} from ${JSON.stringify(imports[2])};
    const target=${JSON.stringify(target)}; await initSpeculo(target,{packageRoot:${JSON.stringify(packageRoot)},selection:{workflowIds:[]},hubSkills:{mode:"set",assetIds:["automation/grok-bot-team-steward"]},transactionHook:async p=>{if(p==="skills-applying"){const j=await readTransaction(target); await applySkillRecords(target,j.skills.slice(0,20),"after"); process.kill(process.pid,"SIGKILL");}}});`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 30000 });
  assert.equal(child.signal, "SIGKILL", child.stderr);
  const journal = await readTransaction(target); assert.equal(journal.schema_version, 4);
  const extra = join(target, ".agents/skills/grok-bot-team-steward/concurrent.txt");
  await writeFile(extra, "preserve");
  await assert.rejects(recoverInstall(target, journal.id), /recovery-drift/);
  await readFile(join(target, LOCK_NAME, "transaction.json")); assert.equal(await readFile(extra, "utf8"), "preserve");
  await rm(extra);
  assert.equal((await recoverInstall(target, journal.id)).outcome, "rolled-back");
  assert.equal(await fingerprintTree(join(target, ".agents/speculo")), before);
  await assert.rejects(readdir(join(target, ".agents/skills/grok-bot-team-steward")), /ENOENT/);
  await assert.rejects(readdir(join(target, TRANSACTIONS_ROOT)), /ENOENT/); await healthy(target);
}));

test("schema 3 file-only transaction fixture remains recoverable", { skip: process.platform === "win32" }, () => fixture(async target => {
  await initSpeculo(target, core);
  const before = await fingerprintTree(join(target, ".agents/speculo"));
  const script = `import {initSpeculo} from ${JSON.stringify(pathToFileURL(resolve("dist/src/index.js")).href)}; await initSpeculo(${JSON.stringify(target)},{packageRoot:${JSON.stringify(packageRoot)},skills:{mode:"all"},transactionHook:async p=>{if(p==="skills-projected")process.kill(process.pid,"SIGKILL")}});`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 30000 });
  assert.equal(child.signal, "SIGKILL", child.stderr);
  const file = join(target, LOCK_NAME, "transaction.json"), journal = JSON.parse(await readFile(file, "utf8"));
  journal.schema_version = 3; await writeFile(file, JSON.stringify(journal));
  assert.equal((await readTransaction(target)).schema_version, 3);
  await recoverInstall(target, journal.id);
  assert.equal(await fingerprintTree(join(target, ".agents/speculo")), before); await healthy(target);
}));

test('Hub repairs edits and missing files, preserves additions without adopting them',()=>fixture(async target=>{
 await initSpeculo(target,{...core,hubSkills:hub(['automation/grok-bot-team-steward']),skillTargets:['agents','claude']});
 for(const host of ['agents','claude']){
  const root=join(target,`.${host}/skills/grok-bot-team-steward`);
  await writeFile(join(root,'SKILL.md'),'local edit');
  const manifest=(await readHubManifest(target))!.packages.find(p=>p.host===host)!;
  const resource=manifest.nodes.find(n=>n.kind==='file'&&n.path!=='SKILL.md')!;
  await rm(join(root,resource.path));
  await mkdir(join(root,'user/nested'),{recursive:true});await writeFile(join(root,'user/nested/notes.txt'),'keep');
 }
 const refreshed=await initSpeculo(target,{packageRoot});
 assert.deepEqual(refreshed.warnings,[]);assert.equal(refreshed.hub.updated.length,2);await healthy(target);
 for(const p of (await readHubManifest(target))!.packages)assert.ok(!p.nodes.some(n=>n.path.startsWith('user')));
 assert.deepEqual((await initSpeculo(target,{packageRoot})).hub.updated,[]);
 const removed=await initSpeculo(target,{...core,hubSkills:{mode:'none'}});assert.equal(removed.hub.removed.length,2);
 for(const host of ['agents','claude'])assert.equal(await readFile(join(target,`.${host}/skills/grok-bot-team-steward/user/nested/notes.txt`),'utf8'),'keep');
 await healthy(target);
}));

for(const phase of ['skills-applying','skills-projected','external-finalized'] as const)test(`repair rollback restores actual edited contents, modes and additions at ${phase}`,()=>fixture(async target=>{
 await initSpeculo(target,{...core,hubSkills:hub(['automation/herdr']),skills:hub(['command/handoff'])});
 await writeFile(join(target,'.agents/skills/herdr/SKILL.md'),'hub edit');
 await writeFile(join(target,'.agents/skills/herdr/user.txt'),'user data');
 const pointer=join(target,'.agents/skills/speculo-handoff/SKILL.md');await writeFile(pointer,'pointer edit');await chmod(pointer,0o664);
 const before=await fingerprintTree(target);
 await assert.rejects(initSpeculo(target,{packageRoot,transactionHook:async p=>{if(p===phase)throw Error('repair fault');}}),/repair fault/);
 assert.equal(await fingerprintTree(target),before);
}));
