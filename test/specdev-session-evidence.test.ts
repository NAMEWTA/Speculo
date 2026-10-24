import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, appendFile, rm, rename, symlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const api = await import(pathToFileURL(join(process.cwd(), 'template/workflows/specdev/specdev-r-retro/scripts/session-evidence.mjs')).href);
const sessionId = 'session-123', time = '2026-10-24T10:00:00Z', locator = 'sessions/2026/10/24/rollout-session-123.jsonl';
async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const logRoot = await mkdtemp(join(tmpdir(), 'speculo-session-'));
  t.after(() => rm(logRoot, { recursive: true, force: true }));
  const projectRoot = join(logRoot, 'project'), path = join(logRoot, locator);
  await mkdir(dirname(path), { recursive: true });
  const lines = [
    { timestamp: time, type: 'session_meta', payload: { id: sessionId, cwd: projectRoot, cli_version: 'fixture' } },
    { timestamp: time, type: 'event_msg', payload: { message: 'Observed failing test, before correction.' } },
    { timestamp: '2026-10-24T10:01:00Z', type: 'event_msg', payload: { message: 'Correction verified.' } },
  ];
  await writeFile(path, lines.map(x => JSON.stringify(x)).join('\n') + '\n');
  return { logRoot, projectRoot, sessionId, path, locator, fromLine: 2, toLine: 3, cutoff: '2026-10-24T10:01:00Z' };
}
test('locates the actual thread and keeps bounded evidence stable when the log grows', async t => {
  const f = await fixture(t);
  const found = await api.locateCodexSessions(f);
  assert.equal(found.availability, 'available'); assert.equal(found.candidates[0].locator, locator);
  const before = await api.readCodexSession(f);
  assert.equal(before.complete, true); assert.equal(before.records.length, 2);
  await appendFile(f.path, JSON.stringify({ timestamp: '2026-10-24T10:02:00Z', type: 'event_msg', payload: { message: 'RETRO derived conclusion' } }) + '\n');
  assert.equal((await api.readCodexSession(f)).sha256, before.sha256);
  const expanded = await api.readCodexSession({ ...f, toLine: 4 });
  assert.equal(expanded.excluded_after_cutoff, 1); assert.equal(expanded.sha256, before.sha256);
  assert.equal((await api.readCodexSession({ ...f, maxBytes: 1 })).complete, false);
  assert.equal((await api.readCodexSession({ ...f, toLine: 20 })).complete, false);
});
test('rejects false session identity, project mismatch and unsafe locators', async t => {
  const f = await fixture(t);
  await assert.rejects(api.readCodexSession({ ...f, sessionId: 'another' }), /metadata\/ID mismatch/);
  await assert.rejects(api.readCodexSession({ ...f, projectRoot: '/different-project' }), /project mismatch/);
  for (const bad of ['sessions/../../outside.jsonl', '/absolute/session.jsonl', 'sessions/./x.jsonl']) await assert.rejects(api.readCodexSession({ ...f, locator: bad }), /invalid host-relative/);
  await assert.rejects(api.readCodexSession({ ...f, fromLine: 0 }), /line range/);
  await assert.rejects(api.readCodexSession({ ...f, cutoff: 'unknown' }), /cutoff/);
});
test('relocates an archived session by ID and reports disappearance without inventing evidence', async t => {
  const f = await fixture(t), archived = join(f.logRoot, 'archived_sessions/rollout-session-123.jsonl');
  await mkdir(dirname(archived)); await rename(f.path, archived);
  const result = await api.locateCodexSessions(f);
  assert.equal(result.candidates[0].locator, 'archived_sessions/rollout-session-123.jsonl');
  await rm(archived);
  assert.deepEqual(await api.locateCodexSessions(f), { candidates: [], issues: [], availability: 'unavailable' });
});
test('does not follow session symlinks or silently accept malformed records', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  const external = join(f.logRoot, 'outside.jsonl'); await rename(f.path, external); await symlink(external, f.path);
  await assert.rejects(api.readCodexSession(f), /symlinks/);
  await rm(f.path); await rename(external, f.path); await appendFile(f.path, '{incomplete');
  assert.equal((await api.readCodexSession(f)).complete, true); // An appended partial event cannot invalidate the captured range.
  await assert.rejects(api.readCodexSession({ ...f, toLine: 4 }), /invalid JSONL/);
});

test('bounds a single oversized JSONL event and rejects duplicate matching session identities', async t => {
  const f = await fixture(t);
  await appendFile(f.path, JSON.stringify({ timestamp: time, payload: 'x'.repeat(1024 * 1024) }) + '\n');
  await assert.rejects(api.readCodexSession({ ...f, toLine: 4 }), /exceeds read limit/);
  const duplicate = join(f.logRoot, 'archived_sessions/rollout-session-123.jsonl');
  await mkdir(dirname(duplicate));
  await writeFile(duplicate, JSON.stringify({ timestamp: time, type: 'session_meta', payload: { id: sessionId, cwd: f.projectRoot } }) + '\n');
  const found = await api.locateCodexSessions(f);
  assert.equal(found.availability, 'unknown'); assert.equal(found.candidates.length, 2);
});
