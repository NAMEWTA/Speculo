import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstat, mkdir, rename, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fingerprintTree } from "./manifest.js";
import { EXTERNAL_NAMES, assertImage, imageDigest, readImage, replaceImage, syncDirectory, writeDurableJson, type ExternalEdit } from "./external-files.js";

export const LOCK_NAME = ".speculo-init.lock";
export type TransactionPhase = "prepared" | "old-renamed" | "installed" | "external-finalized" | "committed" | "rolled-back";
export type TransactionHook = (phase: TransactionPhase) => Promise<void>;
type Journal = {
  schema_version: 1; id: string; host: string; pid: number; target: string;
  stage: string; backup: string; before: string; after: string;
  phase: TransactionPhase; external: ExternalEdit[];
};

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

export async function readTransaction(target: string): Promise<Journal> {
  await directory(join(target, LOCK_NAME));
  const raw = await readImage(journalPath(target));
  if (!raw) throw new Error("unidentified-lock: no durable transaction; inspect owner.json and preserve all residues");
  const j = JSON.parse(Buffer.from(raw.content, "base64").toString("utf8")) as Journal;
  if (j.schema_version !== 1 || j.target !== resolve(target) || !/^[a-f0-9-]{36}$/.test(j.id) ||
      typeof j.host !== "string" || !Number.isSafeInteger(j.pid) || j.pid < 1 ||
      !/^\.speculo-init-stage-[A-Za-z0-9]+$/.test(j.stage) || j.backup !== j.stage + "-backup" ||
      !/^(absent|[a-f0-9]{64})$/.test(j.before) || !/^[a-f0-9]{64}$/.test(j.after) ||
      !["prepared", "old-renamed", "installed", "external-finalized", "committed", "rolled-back"].includes(j.phase) ||
      !Array.isArray(j.external) || j.external.length !== EXTERNAL_NAMES.length ||
      new Set(j.external.map((e) => e.name)).size !== EXTERNAL_NAMES.length) throw new Error("invalid-transaction-journal");
  for (const e of j.external) {
    if (!EXTERNAL_NAMES.includes(e.name)) throw new Error("invalid-transaction-external-path");
    for (const value of [e.before, e.after]) {
      if (value !== null && (!value || typeof value.content !== "string" || !Number.isInteger(value.mode) || value.mode < 0 || value.mode > 0o777 ||
          Buffer.from(value.content, "base64").toString("base64") !== value.content)) throw new Error("invalid-transaction-file-image");
    }
  }
  return j;
}

async function save(j: Journal, phase: TransactionPhase): Promise<void> {
  await writeDurableJson(journalPath(j.target), { ...j, phase });
  j.phase = phase;
}

/** Validate every source before moving any directory or restoring any external file. */
async function rollback(j: Journal): Promise<void> {
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
  const root = join(j.target, "speculo"), backup = join(j.target, j.backup);
  await directory(root); await directory(backup);
  if (await fingerprintTree(root) !== j.after) throw new Error("recovery-drift: committed installation changed");
  for (const e of j.external) await assertImage(join(j.target, e.name), e.after);
  const fingerprint = await fingerprintTree(backup);
  if (fingerprint !== "absent" && fingerprint !== j.before) throw new Error("recovery-drift: backup changed; preserve it");
  await rm(backup, { recursive: true, force: true });
  await syncDirectory(j.target);
}

export async function commitInstall(target: string, stagedRoot: string, before: string, external: ExternalEdit[], hook?: TransactionHook): Promise<void> {
  const j: Journal = { schema_version: 1, id: randomUUID(), host: hostname(), pid: process.pid, target,
    stage: basename(stagedRoot), backup: basename(stagedRoot) + "-backup", before,
    after: await fingerprintTree(stagedRoot), phase: "prepared", external };
  const root = join(target, "speculo");
  if (await fingerprintTree(root) !== before) throw new Error("concurrent-drift: installation changed before commit");
  for (const e of external) await assertImage(join(target, e.name), e.before);
  await save(j, "prepared");
  try {
    await hook?.("prepared");
    if (before !== "absent") await rename(root, join(target, j.backup));
    await syncDirectory(target);
    await save(j, "old-renamed"); await hook?.("old-renamed");
    await rename(stagedRoot, root); await syncDirectory(target);
    await save(j, "installed"); await hook?.("installed");
    if (await fingerprintTree(root) !== j.after) throw new Error("post-install validation failed");
    for (const e of external) await replaceImage(join(target, e.name), e.before, e.after);
    await save(j, "external-finalized"); await hook?.("external-finalized");
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
