import { INSTALL_ROOT, containedPath, assertSupportedProject } from "./paths.js";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstat, mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { dirname, relative, join, resolve } from "node:path";
import { fingerprintTree, isTreeFingerprint, TREE_FINGERPRINT_PREFIX } from "./manifest.js";
import { EXTERNAL_NAMES, image, assertImage, imageDigest, readImage, replaceImage, syncDirectory, writeDurableJson, type ExternalEdit } from "./external-files.js";

export const LOCK_NAME = ".agents/.speculo-install.lock";
export const TRANSACTIONS_ROOT = ".agents/.speculo-transactions";
export type TransactionPhase = "prepared" | "old-renamed" | "installed" | "skills-applying" | "skills-projected" | "external-finalized" | "committed" | "rolled-back";
export type TransactionHook = (phase: TransactionPhase) => Promise<void>;
export type SkillNode = {kind:"absent"} | {kind:"file";content:string;mode:number};
export type SkillRecord = {name:string;before:SkillNode;after:SkillNode};
type Journal = {schema_version:3;id:string;host:string;pid:number;target:string;stage:string;backup:string;before:string;after:string;phase:TransactionPhase;external:ExternalEdit[];skills?:SkillRecord[]};
const BASE_PHASES = ["prepared","old-renamed","installed","external-finalized","committed","rolled-back"] as const;
const SKILL_PHASES = ["skills-applying","skills-projected"] as const;
async function exists(path:string):Promise<boolean>{try{await lstat(path);return true;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e;}}
async function directory(path:string):Promise<void>{if(!(await exists(path)))return;const st=await lstat(path);if(!st.isDirectory()||st.isSymbolicLink())throw new Error('unsafe-transaction-directory: '+path);}
async function syncInstallParents(target: string): Promise<void> {
  for (const path of [target, join(target, '.agents'), join(target, TRANSACTIONS_ROOT)]) {
    if (await exists(path)) { await directory(path); await syncDirectory(path); }
  }
}
export async function assertInstallDirectory(target:string):Promise<void>{await assertSupportedProject(target);await directory(join(target,'.agents'));await directory(join(target,INSTALL_ROOT));await containedPath(target,LOCK_NAME);await containedPath(target,TRANSACTIONS_ROOT);}
/** Call only while holding this installation/recovery lock, after owned trees are cleaned. */
export async function cleanEmptyTransactionsDirectory(target: string): Promise<void> {
  const path = await containedPath(target, TRANSACTIONS_ROOT);
  await directory(path);
  try { await rmdir(path); }
  catch (error) {
    if (["ENOENT", "ENOTEMPTY", "EEXIST"].includes((error as NodeJS.ErrnoException).code ?? "")) return;
    throw error;
  }
  await syncDirectory(join(target, ".agents"));
}
function journalPath(target:string):string{return join(target,LOCK_NAME,'transaction.json');}
function validNode(value:SkillNode):boolean{return !!value&&(value.kind==='absent'?Object.keys(value).length===1:value.kind==='file'&&Object.keys(value).length===3&&typeof value.content==='string'&&Buffer.from(value.content,'base64').toString('base64')===value.content&&Number.isInteger(value.mode)&&value.mode>=0&&value.mode<=0o777);}
function validSkills(records:SkillRecord[]):boolean{return Array.isArray(records)&&records.length>0&&records.length<=10000&&JSON.stringify(records).length<=64*1024*1024&&new Set(records.map(r=>r.name)).size===records.length&&records.every(r=>/^\.(agents|claude)\/skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/(SKILL\.md|agents\/openai\.yaml)$/.test(r.name)&&validNode(r.before)&&validNode(r.after));}
function journalShapeValid(j:Journal):boolean{return j.skills===undefined?(BASE_PHASES as readonly string[]).includes(j.phase):validSkills(j.skills)&&[...BASE_PHASES,...SKILL_PHASES].includes(j.phase);}
function imageOf(node:SkillNode){return node.kind==='absent'?null:image(Buffer.from(node.content,'base64'),node.mode);}
function sameImage(a:Awaited<ReturnType<typeof readImage>>,node:SkillNode){return imageDigest(a)===imageDigest(imageOf(node));}
async function applySkillProjection(j:Journal):Promise<void>{
 for(const r of j.skills??[])await assertImage(await containedPath(j.target,r.name),imageOf(r.before));
 for(const r of j.skills??[]){const file=await containedPath(j.target,r.name);await mkdir(dirname(file),{recursive:true});await replaceImage(file,imageOf(r.before),imageOf(r.after));}
}
async function restoreSkillProjection(j:Journal):Promise<void>{
 for(const r of j.skills??[]){const current=await readImage(await containedPath(j.target,r.name));if(!sameImage(current,r.before)&&!sameImage(current,r.after))throw new Error('recovery-drift: '+r.name);}
 for(const r of [...j.skills??[]].reverse()){
  const file=await containedPath(j.target,r.name),current=await readImage(file);if(sameImage(current,r.before))continue;
  await mkdir(dirname(file),{recursive:true});await replaceImage(file,current,imageOf(r.before));
 }
}
async function cleanEmptyProjectionDirectories(j:Journal, side:'before'|'after'):Promise<void>{
 for(const r of j.skills??[])if(r[side].kind==='absent'){
  let dir=dirname(await containedPath(j.target,r.name));
  const boundary=join(j.target,r.name.startsWith('.agents/')?'.agents/skills':'.claude/skills');
  while(dir!==boundary){try{await rmdir(dir);}catch(e){if(!['ENOENT','ENOTEMPTY','EEXIST'].includes((e as NodeJS.ErrnoException).code??''))throw e;break;}dir=dirname(dir);}
 }
}

export async function readTransaction(target: string): Promise<Journal> {
  await assertInstallDirectory(target);
  await containedPath(target, `${LOCK_NAME}/transaction.json`);
  await directory(join(target, LOCK_NAME));
  const raw = await readImage(journalPath(target));
  if (!raw) throw new Error("unidentified-lock: no durable transaction; inspect owner.json and preserve all residues");
  const j = JSON.parse(Buffer.from(raw.content, "base64").toString("utf8")) as Journal;
  if (!j || typeof j !== "object" || j.schema_version !== 3 || j.target !== resolve(target) || !/^[a-f0-9-]{36}$/.test(j.id) ||
      typeof j.host !== "string" || !Number.isSafeInteger(j.pid) || j.pid < 1 ||
      !/^\.agents\/\.speculo-transactions\/stage-[A-Za-z0-9]+$/.test(j.stage) || j.backup !== j.stage + "-backup" ||
      !(isTreeFingerprint(j.before) && isTreeFingerprint(j.after, false)) ||
      !journalShapeValid(j) ||
      !Array.isArray(j.external) || j.external.length !== EXTERNAL_NAMES.length ||
      new Set(j.external.map((e) => e?.name)).size !== EXTERNAL_NAMES.length) throw new Error("invalid-transaction-journal");
  for (const e of j.external) {
    if (!e || !EXTERNAL_NAMES.includes(e.name)) throw new Error("invalid-transaction-external-path");
    for (const value of [e.before, e.after]) {
      if (value !== null && (!value || typeof value.content !== "string" || !Number.isInteger(value.mode) || value.mode < 0 || value.mode > 0o777 ||
          Buffer.from(value.content, "base64").toString("base64") !== value.content)) throw new Error("invalid-transaction-file-image");
    }
  }
  for(const path of [j.stage,j.backup])await containedPath(target,path);
  return j;
}

/** Only current snapshots on their original platform may be recovered. */
function assertCurrentSnapshot(j: Journal): void {
  if (j.schema_version !== 3) throw new Error("invalid-transaction-version");
  if ((j.before !== "absent" && !j.before.startsWith(TREE_FINGERPRINT_PREFIX)) || !j.after.startsWith(TREE_FINGERPRINT_PREFIX)) {
    throw new Error("snapshot-platform-mismatch: recover on the original snapshot platform; preserve all evidence");
  }
}

async function save(j: Journal, phase: TransactionPhase): Promise<void> {
  assertCurrentSnapshot(j);
  await writeDurableJson(journalPath(j.target), { ...j, phase });
  j.phase = phase;
}

/** Validate every source before moving any directory or restoring any external file. */
async function rollback(j: Journal): Promise<void> {
  assertCurrentSnapshot(j);
  const root = join(j.target, INSTALL_ROOT), stage = join(j.target, j.stage), backup = join(j.target, j.backup);
  for(const path of [INSTALL_ROOT,j.stage,j.backup])await containedPath(j.target,path);
  for (const path of [root, stage, backup]) await directory(path);
  const r = await fingerprintTree(root), s = await fingerprintTree(stage), b = await fingerprintTree(backup);
  const untouched = r === j.before && b === "absent" && (s === j.after || s === "absent");
  const renamed = j.before !== "absent" && b === j.before &&
    ((r === "absent" && s === j.after) || (r === j.after && s === "absent"));
  const newInstall = j.before === "absent" && b === "absent" && r === j.after && s === "absent";
  if (!untouched && !renamed && !newInstall) throw new Error("recovery-drift: installation layout differs from before/after evidence; preserve all directories");
  for (const e of j.external) {
    const digest = imageDigest(await readImage(join(j.target, e.name)));
    if (![imageDigest(e.before), imageDigest(e.after)].includes(digest)) throw new Error(`recovery-drift: ${e.name}; concurrent content preserved`);
  }
  if (j.skills && ["skills-applying", "skills-projected", "external-finalized"].includes(j.phase)) await restoreSkillProjection(j);
  for (const e of [...j.external].reverse()) {
    const current = await readImage(join(j.target, e.name));
    await replaceImage(join(j.target, e.name), current, e.before);
  }
  if (!untouched) {
    if (r === j.after) await rename(root, stage);
    if (j.before !== "absent") await rename(backup, root);
    await syncInstallParents(j.target);
  }
  await save(j, "rolled-back");
  if (await fingerprintTree(stage) !== "absent" && await fingerprintTree(stage) !== j.after) throw new Error("recovery-drift: staged directory changed");
  await rm(stage, { recursive: true, force: true });
  await cleanEmptyProjectionDirectories(j,'before');
  await cleanEmptyTransactionsDirectory(j.target);
}

async function finish(j: Journal): Promise<void> {
  assertCurrentSnapshot(j);
  const root = join(j.target, INSTALL_ROOT), backup = join(j.target, j.backup);
  for(const path of [INSTALL_ROOT,j.backup])await containedPath(j.target,path);
  await directory(root); await directory(backup);
  if (await fingerprintTree(root) !== j.after) throw new Error("recovery-drift: committed installation changed");
  for (const e of j.external) await assertImage(join(j.target, e.name), e.after);
  for (const r of j.skills??[]) await assertImage(await containedPath(j.target,r.name),imageOf(r.after));
  const fingerprint = await fingerprintTree(backup);
  if (fingerprint !== "absent" && fingerprint !== j.before) throw new Error("recovery-drift: backup changed; preserve it");
  await rm(backup, { recursive: true, force: true });
  await syncInstallParents(j.target);
  await cleanEmptyProjectionDirectories(j,'after');
  await cleanEmptyTransactionsDirectory(j.target);
}

export async function commitInstall(target: string, stagedRoot: string, before: string, external: ExternalEdit[], hook?: TransactionHook, skills?: SkillRecord[] | null): Promise<void> {
  if (!isTreeFingerprint(before) || (before !== "absent" && !before.startsWith(TREE_FINGERPRINT_PREFIX))) throw new Error("invalid-current-tree-snapshot");
  const projecting = Array.isArray(skills) && skills.length > 0;
  const j: Journal = { schema_version: 3, id: randomUUID(), host: hostname(), pid: process.pid, target,
    stage: relative(target, stagedRoot).split("\\").join("/"), backup: relative(target, stagedRoot).split("\\").join("/") + "-backup", before,
    after: await fingerprintTree(stagedRoot), phase: "prepared", external, ...(projecting ? { skills } : {}) };
  const root = join(target, INSTALL_ROOT);
  if (await fingerprintTree(root) !== before) throw new Error("concurrent-drift: installation changed before commit");
  for (const e of external) await assertImage(join(target, e.name), e.before);
  await save(j, "prepared");
  try {
    await hook?.("prepared");
    // Recheck after the durable checkpoint, before moving any user directory.
    if (await fingerprintTree(root) !== before || await fingerprintTree(stagedRoot) !== j.after) throw new Error("concurrent-drift: prepared snapshot changed");
    if (before !== "absent") await rename(root, join(target, j.backup));
    await syncInstallParents(target);
    await save(j, "old-renamed"); await hook?.("old-renamed");
    if (await fingerprintTree(root) !== "absent" || await fingerprintTree(join(target, j.backup)) !== before || await fingerprintTree(stagedRoot) !== j.after) throw new Error("concurrent-drift: renamed snapshot changed");
    await rename(stagedRoot, root); await syncInstallParents(target);
    await save(j, "installed"); await hook?.("installed");
    if (await fingerprintTree(root) !== j.after || await fingerprintTree(join(target, j.backup)) !== before) throw new Error("post-install validation failed: snapshot drift");
    if (projecting) {
      await save(j, "skills-applying"); await hook?.("skills-applying");
      await applySkillProjection(j);
      await save(j, "skills-projected"); await hook?.("skills-projected");
    }
    for (const e of external) await replaceImage(join(target, e.name), e.before, e.after);
    await save(j, "external-finalized"); await hook?.("external-finalized");
    if (await fingerprintTree(root) !== j.after || await fingerprintTree(join(target, j.backup)) !== before) throw new Error("concurrent-drift: final snapshot changed");
    for (const e of external) await assertImage(join(target, e.name), e.after);
    for (const r of j.skills??[]) await assertImage(await containedPath(target,r.name),imageOf(r.after));
    await save(j, "committed"); await hook?.("committed");
    await finish(j);
  } catch (error) {
    if (j.phase === "committed") throw new Error(`committed-cleanup-pending: run doctor then recover with transaction ${j.id}; ${String(error)}`);
    try { await rollback(j); }
    catch (recoveryError) { throw new Error(`recovery-required: transaction ${j.id}; ${String(error)}; ${String(recoveryError)}`); }
    await rm(journalPath(target));
    throw error;
  }
  await rm(journalPath(target));
}

/** Explicit local recovery only. Never steals a live, remote-host, or unidentified lock. */
export async function recoverInstall(targetArg: string, id: string): Promise<{ id: string; outcome: string }> {
  const target = resolve(targetArg);
  const j = await readTransaction(target);
  if (j.id !== id) throw new Error("recovery-transaction-mismatch");
  assertCurrentSnapshot(j);
  if (j.host !== hostname()) throw new Error("recovery-host-mismatch: inspect the original host before recovery");
  try { process.kill(j.pid, 0); throw new Error("recovery-owner-live: stop the owning process first"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
  const guard = join(target, LOCK_NAME, "recovery.lock");
  await mkdir(guard, { mode: 0o700 });
  let success = false;
  try {
    if (j.phase === "committed") await finish(j); else await rollback(j);
    success = true;
    return { id, outcome: j.phase === "committed" ? "completed-cleanup" : "rolled-back" };
  } finally {
    await rm(guard, { recursive: true, force: true });
    if (success) { await rm(join(target, LOCK_NAME), { recursive: true }); await syncInstallParents(target); }
  }
}

export async function hasTransaction(target: string): Promise<boolean> { return exists(journalPath(target)); }
