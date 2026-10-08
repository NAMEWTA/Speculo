import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstat, mkdir, readFile, readdir, readlink, rename, rm, symlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fingerprintTree, isTreeFingerprint, TREE_FINGERPRINT_PREFIX } from "./manifest.js";
import { EXTERNAL_NAMES, assertImage, imageDigest, readImage, replaceImage, syncDirectory, writeDurableJson, type ExternalEdit } from "./external-files.js";

export const LOCK_NAME = ".speculo-init.lock";
export type TransactionPhase = "prepared" | "old-renamed" | "installed" | "skills-applying" | "skills-projected" | "external-finalized" | "committed" | "rolled-back";
export type TransactionHook = (phase: TransactionPhase) => Promise<void>;
export type SkillNode =
  | { kind: "absent" }
  | { kind: "file"; content: string; mode: number }
  | { kind: "symlink"; target: string }
  | { kind: "directory"; file: "SKILL.md"; content: string; mode: number };
export type SkillRecord = { name: string; before: SkillNode; after: SkillNode };
type Journal = {
  schema_version: 1 | 2; id: string; host: string; pid: number; target: string;
  stage: string; backup: string; before: string; after: string;
  phase: TransactionPhase; external: ExternalEdit[]; skills?: SkillRecord[];
};
const BASE_PHASES = ["prepared", "old-renamed", "installed", "external-finalized", "committed", "rolled-back"] as const;
const SKILL_PHASES = ["skills-applying", "skills-projected"] as const;

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}
async function directory(path: string): Promise<void> {
  if (!(await exists(path))) return;
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`unsafe-transaction-directory: ${path}`);
}
export async function assertInstallDirectory(target: string): Promise<void> {
  await directory(join(target, "speculo"));
}
function journalPath(target: string): string { return join(target, LOCK_NAME, "transaction.json"); }

function validNode(node: unknown): node is SkillNode {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const value = node as SkillNode;
  if (value.kind === "absent") return Object.keys(value).length === 1;
  if (value.kind === "symlink") return typeof value.target === "string" && value.target.length > 0 && !value.target.includes("\0") && !value.target.startsWith("/") && Object.keys(value).length === 2;
  if ((value.kind === "file" || value.kind === "directory") && typeof value.content === "string" && Number.isInteger(value.mode) && value.mode >= 0 && value.mode <= 0o777 &&
      Buffer.from(value.content, "base64").toString("base64") === value.content && Object.keys(value).length === (value.kind === "file" ? 3 : 4)) {
    return value.kind === "file" || value.file === "SKILL.md";
  }
  return false;
}
function validSkills(skills: SkillRecord[] | undefined): skills is SkillRecord[] {
  if (!Array.isArray(skills) || skills.length === 0 || skills.length > 64) return false;
  const names = new Set<string>();
  return skills.every((record) => record && typeof record.name === "string" &&
    (record.name === ".speculo-managed.json" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.name)) &&
    !names.has(record.name) && names.add(record.name) && validNode(record.before) && validNode(record.after));
}
function journalShapeValid(j: Journal): boolean {
  if (j.schema_version === 1) return j.skills === undefined && (BASE_PHASES as readonly string[]).includes(j.phase);
  if (j.skills === undefined) return (BASE_PHASES as readonly string[]).includes(j.phase);
  return validSkills(j.skills) && [...BASE_PHASES, ...SKILL_PHASES].includes(j.phase);
}
function sameNode(left: SkillNode, right: SkillNode): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
async function readSkillNode(dir: string, name: string): Promise<SkillNode> {
  const path = join(dir, name);
  let stat;
  try { stat = await lstat(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "absent" }; throw error; }
  if (stat.isSymbolicLink()) return { kind: "symlink", target: await readlink(path) };
  if (stat.isDirectory()) {
    const entries = await readdir(path);
    if (entries.length !== 1 || entries[0] !== "SKILL.md") throw new Error(`agent-skill-drift: ${name}`);
    const file = join(path, "SKILL.md");
    const fileStat = await lstat(file);
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) throw new Error(`agent-skill-drift: ${name}`);
    return { kind: "directory", file: "SKILL.md", content: (await readFile(file)).toString("base64"), mode: 0o644 };
  }
  if (!stat.isFile()) throw new Error(`agent-skill-drift: ${name}`);
  return { kind: "file", content: (await readFile(path)).toString("base64"), mode: 0o644 };
}
async function writeSkillNode(dir: string, name: string, node: SkillNode): Promise<void> {
  const path = join(dir, name);
  await rm(path, { recursive: true, force: true });
  if (node.kind === "absent") return;
  if (node.kind === "symlink") { await symlink(node.target, path, process.platform === "win32" ? "dir" : undefined); return; }
  if (node.kind === "file") { await writeFile(path, Buffer.from(node.content, "base64"), { mode: node.mode }); return; }
  await mkdir(path, { mode: 0o755 });
  await writeFile(join(path, node.file), Buffer.from(node.content, "base64"), { mode: node.mode });
}
async function ensureSkillDir(target: string): Promise<string> {
  const parent = join(target, ".agents");
  const dir = join(parent, "skills");
  for (const path of [parent, dir]) {
    try {
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`agent-skill-parent: ${path}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(path, { mode: 0o755 });
    }
  }
  return dir;
}
async function applySkillProjection(j: Journal): Promise<void> {
  const records = j.skills ?? [];
  const dir = await ensureSkillDir(j.target);
  for (const record of records) {
    const current = await readSkillNode(dir, record.name);
    if (!sameNode(current, record.before)) throw new Error(`agent-skill-drift: ${record.name}`);
  }
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (sameNode(record.before, record.after)) continue;
    const temp = `.speculo-skill-${j.id}-${index}`;
    const aside = `.speculo-skill-old-${j.id}-${index}`;
    if (record.after.kind !== "absent") await writeSkillNode(dir, temp, record.after);
    if (record.before.kind !== "absent") await rename(join(dir, record.name), join(dir, aside));
    if (record.after.kind !== "absent") await rename(join(dir, temp), join(dir, record.name));
    if (record.before.kind !== "absent") await rm(join(dir, aside), { recursive: true, force: true });
  }
  await syncDirectory(dir);
}
async function restoreSkillProjection(j: Journal): Promise<void> {
  const records = j.skills ?? [];
  const dir = join(j.target, ".agents", "skills");
  if (!(await exists(dir))) return;
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const live = join(dir, record.name);
    const aside = join(dir, `.speculo-skill-old-${j.id}-${index}`);
    const temp = join(dir, `.speculo-skill-${j.id}-${index}`);
    if (await exists(aside) && !(await exists(live))) await rename(aside, live);
    await rm(temp, { recursive: true, force: true });
    await rm(aside, { recursive: true, force: true });
    const current = await readSkillNode(dir, record.name);
    if (sameNode(current, record.before)) continue;
    if (current.kind !== "absent" && !sameNode(current, record.after)) throw new Error(`recovery-drift: .agents/skills/${record.name}`);
    await writeSkillNode(dir, record.name, record.before);
  }
  await syncDirectory(dir);
}

export async function readTransaction(target: string): Promise<Journal> {
  await directory(join(target, LOCK_NAME));
  const raw = await readImage(journalPath(target));
  if (!raw) throw new Error("unidentified-lock: no durable transaction; inspect owner.json and preserve all residues");
  const j = JSON.parse(Buffer.from(raw.content, "base64").toString("utf8")) as Journal;
  if (!j || typeof j !== "object" || ![1, 2].includes(j.schema_version) || j.target !== resolve(target) || !/^[a-f0-9-]{36}$/.test(j.id) ||
      typeof j.host !== "string" || !Number.isSafeInteger(j.pid) || j.pid < 1 ||
      !/^\.speculo-init-stage-[A-Za-z0-9]+$/.test(j.stage) || j.backup !== j.stage + "-backup" ||
      !(j.schema_version === 1
        ? typeof j.before === "string" && /^(absent|[a-f0-9]{64})$/.test(j.before) && typeof j.after === "string" && /^[a-f0-9]{64}$/.test(j.after)
        : isTreeFingerprint(j.before) && isTreeFingerprint(j.after, false)) ||
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
  return j;
}

/** Legacy content-only journals remain readable, but cannot prove safe cleanup. */
function assertCurrentSnapshot(j: Journal): void {
  if (j.schema_version !== 2) {
    throw new Error("legacy-transaction-snapshot: v1 omitted modes and directories; preserve journal, lock, stage and backup; manual recovery requires an independently verified snapshot; do not relabel or delete the journal");
  }
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
  if (j.skills && (["skills-applying", "skills-projected", "external-finalized"] as const).includes(j.phase as "skills-applying" | "skills-projected" | "external-finalized")) {
    await restoreSkillProjection(j);
  }
  const root = join(j.target, "speculo"), stage = join(j.target, j.stage), backup = join(j.target, j.backup);
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
  for (const e of [...j.external].reverse()) {
    const current = await readImage(join(j.target, e.name));
    await replaceImage(join(j.target, e.name), current, e.before);
  }
  if (!untouched) {
    if (r === j.after) await rename(root, stage);
    if (j.before !== "absent") await rename(backup, root);
    await syncDirectory(j.target);
  }
  await save(j, "rolled-back");
  if (await fingerprintTree(stage) !== "absent" && await fingerprintTree(stage) !== j.after) throw new Error("recovery-drift: staged directory changed");
  await rm(stage, { recursive: true, force: true });
}

async function finish(j: Journal): Promise<void> {
  assertCurrentSnapshot(j);
  const root = join(j.target, "speculo"), backup = join(j.target, j.backup);
  await directory(root); await directory(backup);
  if (await fingerprintTree(root) !== j.after) throw new Error("recovery-drift: committed installation changed");
  for (const e of j.external) await assertImage(join(j.target, e.name), e.after);
  const fingerprint = await fingerprintTree(backup);
  if (fingerprint !== "absent" && fingerprint !== j.before) throw new Error("recovery-drift: backup changed; preserve it");
  await rm(backup, { recursive: true, force: true });
  await syncDirectory(j.target);
}

export async function commitInstall(target: string, stagedRoot: string, before: string, external: ExternalEdit[], hook?: TransactionHook, skills?: SkillRecord[] | null): Promise<void> {
  if (!isTreeFingerprint(before) || (before !== "absent" && !before.startsWith(TREE_FINGERPRINT_PREFIX))) throw new Error("invalid-current-tree-snapshot");
  const projecting = Array.isArray(skills) && skills.length > 0;
  const j: Journal = { schema_version: 2, id: randomUUID(), host: hostname(), pid: process.pid, target,
    stage: basename(stagedRoot), backup: basename(stagedRoot) + "-backup", before,
    after: await fingerprintTree(stagedRoot), phase: "prepared", external, ...(projecting ? { skills } : {}) };
  const root = join(target, "speculo");
  if (await fingerprintTree(root) !== before) throw new Error("concurrent-drift: installation changed before commit");
  for (const e of external) await assertImage(join(target, e.name), e.before);
  await save(j, "prepared");
  try {
    await hook?.("prepared");
    // Recheck after the durable checkpoint, before moving any user directory.
    if (await fingerprintTree(root) !== before || await fingerprintTree(stagedRoot) !== j.after) throw new Error("concurrent-drift: prepared snapshot changed");
    if (before !== "absent") await rename(root, join(target, j.backup));
    await syncDirectory(target);
    await save(j, "old-renamed"); await hook?.("old-renamed");
    if (await fingerprintTree(root) !== "absent" || await fingerprintTree(join(target, j.backup)) !== before || await fingerprintTree(stagedRoot) !== j.after) throw new Error("concurrent-drift: renamed snapshot changed");
    await rename(stagedRoot, root); await syncDirectory(target);
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
    if (success) { await rm(join(target, LOCK_NAME), { recursive: true }); await syncDirectory(target); }
  }
}

export async function hasTransaction(target: string): Promise<boolean> { return exists(journalPath(target)); }
