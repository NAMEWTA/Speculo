import { mkdir, rename, link, unlink, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConfigError, parseDocument } from './document.mjs';
import { createPlan, desiredText } from './plan.mjs';
import { inspect } from './inspect.mjs';
import { observeWriters } from './writers.mjs';
import { safePath, metadata, readBounded, fingerprint, same, sha256, newPrivateFile, makePrivateDirs, cleanCreatedDirs } from './io.mjs';

const roots = plan => [...new Set(plan.entries.map(e => e.root))].sort();
const stateRoot = root => join(root, '.wta-ai-cli-config');
const transactionRoot = (root, id) => join(stateRoot(root), 'transactions', id);
const journalPath = plan => join(transactionRoot(roots(plan)[0], plan.id), 'journal.json');
const backupPath = (plan, entry, index) => join(transactionRoot(entry.root, plan.id), index + '.pre-optimize.bak');
async function ensurePrivateState(root, made) {
  const path = stateRoot(root);
  await makePrivateDirs(path, made);
  const meta = await metadata(path);
  if (process.platform !== 'win32' && (meta.mode & 0o077)) throw new ConfigError('state_directory_not_private');
}
async function lockAll(plan, made) {
  const acquired = [];
  try {
    for (const root of roots(plan)) {
      await ensurePrivateState(root, made);
      const path = join(stateRoot(root), 'lock');
      try { await mkdir(path, { mode: 0o700 }); } catch { throw new ConfigError('transaction_lock_exists_or_denied'); }
      acquired.push(path);
      await newPrivateFile(join(path, 'owner.json'), JSON.stringify({ pid: process.pid, plan_id: plan.id }));
    }
    return acquired;
  } catch (error) { await unlock(acquired); throw error; }
}
async function unlock(locks) {
  for (const path of [...locks].reverse()) {
    try { await unlink(join(path, 'owner.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await cleanCreatedDirs([path]);
  }
}
async function writeJournal(plan, journal, initial = false) {
  const path = journalPath(plan);
  if (initial) return newPrivateFile(path, JSON.stringify(journal, null, 2) + '\n');
  await safePath(path, { privateWrite: true });
  const temporary = path + '.' + randomUUID() + '.tmp';
  await newPrivateFile(temporary, JSON.stringify(journal, null, 2) + '\n');
  try { await rename(temporary, path); }
  finally { try { await unlink(temporary); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
}
async function currentFingerprint(entry) { return fingerprint(await readBounded(entry.path)); }
async function assertWritable(entry, observe) {
  await safePath(entry.path, { privateWrite: true });
  if (entry.before.exists && process.platform !== 'win32' && (entry.before.mode & 0o022)) throw new ConfigError('shared_writable_target');
  if (entry.before.exists && process.platform !== 'win32' && !(entry.before.mode & 0o200)) throw new ConfigError('target_readonly');
  const result = await observe(entry.path);
  if (result.state !== 'clear') throw new ConfigError(result.state === 'busy' ? 'active_writer' : 'writer_observation_unknown');
}
async function readJournal(plan) {
  const file = await readBounded(journalPath(plan));
  if (!file.exists) return null;
  const journal = parseDocument(file.text, 'json').value;
  if (journal.schema_version !== 1 || journal.plan_id !== plan.id || journal.records?.length !== plan.entries.length) throw new ConfigError('journal_invalid');
  return journal;
}
export async function verify(plan, { env = process.env } = {}) {
  const results = [];
  for (const entry of plan.entries) {
    try {
      const file = await readBounded(entry.path);
      if (entry.kind === 'config' && file.exists) parseDocument(file.text, entry.format);
      results.push({ client: entry.client, kind: entry.kind, matches: file.exists && file.sha256 === entry.after_hash });
    } catch (error) { results.push({ client: entry.client, kind: entry.kind, matches: false, code: error.code ?? 'read_failed' }); }
  }
  let policy = false, dependencies = false;
  try {
    const snapshot = await inspect(plan.spec, { env });
    policy = !snapshot.findings.some(f => f.severity === 'blocker') && snapshot.clients.every(c => c.cells.every(cell => cell.matches_policy === true));
    const targets = new Set(plan.entries.map(e => e.path));
    const current = snapshot.files.filter(f => !targets.has(f.path)).map(f => ({ path: f.path, fingerprint: fingerprint(f), ...(f.error ? { error: f.error } : {}) }));
    dependencies = same(current, plan.observations.files.filter(f => !targets.has(f.path)))
      && same(snapshot.evidenceFingerprint, plan.observations.evidence) && snapshot.environment.digest === plan.observations.environment;
  } catch { /* A changed/unknown source must not be reported as passing. */ }
  return { schema_version: 1, plan_id: plan.id, passed: results.every(r => r.matches) && policy && dependencies, results, policy, dependencies,
    verified: ['local-file-hash', 'configuration-syntax', 'observed-policy-and-dependency-fingerprints'],
    not_verified: ['host-CLI-load', 'real-account-limits', 'OS-and-server-policy', 'existing-integrations-network-behavior'] };
}
async function restore(plan, journal, observe) {
  // Preflight the complete rollback set before changing any file. Never clobber
  // edits made after apply, even if the operator repeats the old confirmation.
  for (let i = 0; i < plan.entries.length; i++) {
    const entry = plan.entries[i], record = journal.records[i];
    if (!record.changed) continue;
    if (!record.after || !same(await currentFingerprint(entry), record.after)) throw new ConfigError('rollback_target_changed');
    await assertWritable({ ...entry, before: record.after }, observe);
    if (entry.before.exists) {
      const backup = await readBounded(backupPath(plan, entry, i));
      if (backup.sha256 !== entry.before.sha256) throw new ConfigError('backup_integrity_failed');
    }
  }
  for (let i = plan.entries.length - 1; i >= 0; i--) {
    const entry = plan.entries[i], record = journal.records[i];
    if (!record.changed) continue;
    if (!same(await currentFingerprint(entry), record.after)) throw new ConfigError('rollback_target_changed');
    if (!entry.before.exists) await unlink(entry.path);
    else {
      const backup = await readBounded(backupPath(plan, entry, i));
      const stage = entry.path + '.wta-restore-' + randomUUID();
      await newPrivateFile(stage, backup.text);
      try {
        if (process.platform !== 'win32') await chmod(stage, entry.before.mode);
        await rename(stage, entry.path);
      } finally { try { await unlink(stage); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
    }
    const actual = await readBounded(entry.path);
    if (entry.before.exists ? actual.sha256 !== entry.before.sha256 || actual.mode !== entry.before.mode : actual.exists) throw new ConfigError('rollback_verification_failed');
    record.changed = false;
    await writeJournal(plan, journal);
  }
  journal.status = 'rolled-back';
  await writeJournal(plan, journal);
}
export async function apply(plan, { confirm, quiescent = false, observe = observeWriters, env = process.env, checkpoint = async () => {} } = {}) {
  if (confirm !== plan.id || !quiescent) throw new ConfigError('exact_confirmation_and_quiescent_sessions_required');
  if (process.platform === 'win32' && observe === observeWriters) throw new ConfigError('native_windows_mutation_not_supported');
  if (!plan.ready || !plan.entries.length) throw new ConfigError('plan_blocked');
  const made = [], staged = [];
  let locks = [], journal = null;
  try {
    locks = await lockAll(plan, made);
    const prior = await readJournal(plan);
    if (prior) {
      if (prior.status === 'applied' && (await verify(plan, { env })).passed) return { status: 'already-applied', plan_id: plan.id };
      throw new ConfigError('existing_transaction_requires_review');
    }
    const refreshed = await createPlan(plan.spec, { env });
    if (refreshed.id !== plan.id) throw new ConfigError('plan_stale');
    for (const entry of plan.entries) if (!entry.noop) await assertWritable(entry, observe);
    if (plan.entries.every(entry => entry.noop)) return { status: 'no-change', plan_id: plan.id };
    journal = { schema_version: 1, plan_id: plan.id, status: 'prepared', records: plan.entries.map(() => ({ changed: false, after: null })) };
    for (const root of roots(plan)) await makePrivateDirs(transactionRoot(root, plan.id), made);
    await writeJournal(plan, journal, true);
    for (let i = 0; i < plan.entries.length; i++) {
      const entry = plan.entries[i];
      if (entry.noop) continue;
      const original = await readBounded(entry.path);
      if (!same(fingerprint(original), entry.before)) throw new ConfigError('plan_stale');
      if (original.exists) await newPrivateFile(backupPath(plan, entry, i), original.text);
      await makePrivateDirs(dirname(entry.path), made);
      const content = await desiredText(plan, entry);
      if (sha256(content) !== entry.after_hash) throw new ConfigError('planned_content_mismatch');
      const path = entry.path + '.wta-stage-' + randomUUID();
      await newPrivateFile(path, content);
      staged.push(path);
      if (original.exists && process.platform !== 'win32') await chmod(path, original.mode);
      journal.records[i].after = fingerprint(await readBounded(path));
      journal.records[i].stage = path; // Exact recovery path, local private journal only.
    }
    await writeJournal(plan, journal);
    await checkpoint('staged');
    // All observations are rechecked after staging and before the first commit.
    if ((await createPlan(plan.spec, { env })).id !== plan.id) throw new ConfigError('plan_stale');
    for (let i = 0; i < plan.entries.length; i++) {
      const entry = plan.entries[i], record = journal.records[i];
      if (entry.noop) continue;
      if (!same(await currentFingerprint(entry), entry.before)) throw new ConfigError('plan_stale');
      await assertWritable(entry, observe);
      if (entry.before.exists) await rename(record.stage, entry.path);
      else {
        await link(record.stage, entry.path); // No-replace creation, same filesystem.
        record.changed = true; // Preserve recovery ownership even if staging cleanup fails.
        await unlink(record.stage);
      }
      record.changed = true;
      if (!same(await currentFingerprint(entry), record.after)) throw new ConfigError('readback_mismatch');
      await writeJournal(plan, journal);
      await checkpoint('committed', i);
    }
    if (!(await verify(plan, { env })).passed) throw new ConfigError('verification_failed');
    journal.status = 'applied';
    await writeJournal(plan, journal);
    return { status: 'applied', plan_id: plan.id, verification: await verify(plan, { env }), backup_journal: journalPath(plan) };
  } catch (error) {
    if (journal) {
      try { await restore(plan, journal, observe); error.rollback = 'restored'; }
      catch (rollbackError) { error.rollback = 'blocked:' + (rollbackError.code ?? 'failure'); }
    }
    throw error;
  } finally {
    for (const path of staged) { try { await unlink(path); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
    await unlock(locks);
    await cleanCreatedDirs(made);
  }
}
export async function rollback(plan, { confirm, quiescent = false, observe = observeWriters } = {}) {
  if (confirm !== plan.id || !quiescent) throw new ConfigError('exact_confirmation_and_quiescent_sessions_required');
  if (process.platform === 'win32' && observe === observeWriters) throw new ConfigError('native_windows_mutation_not_supported');
  const made = []; let locks = [];
  try {
    locks = await lockAll(plan, made);
    const journal = await readJournal(plan);
    if (!journal) throw new ConfigError('transaction_missing');
    if (journal.status === 'rolled-back') return { status: 'already-rolled-back', plan_id: plan.id };
    await restore(plan, journal, observe);
    return { status: 'rolled-back', plan_id: plan.id, retained: 'private recovery journal and backups' };
  } finally { await unlock(locks); await cleanCreatedDirs(made); }
}
