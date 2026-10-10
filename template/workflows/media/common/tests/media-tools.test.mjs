import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as m from '../tools/media-tools.mjs';
const brief = () => ({ schema_version: 1, content_id: 'safe-drafts', topic: 'Safe drafts', conclusion: 'Review before handoff', audience: 'Creators', platform: 'local-demo', style: 'clean typography', font: 'DejaVu Sans', duration_seconds: 18, width: 640, height: 360, fps: 12, colors: ['#101828', '#ffffff'], voice: { mode: 'silent' }, hooks: ['result', 'pain', 'counterintuitive'].map(kind => ({ kind, text: `${kind}: review before handoff` })), claims: [], sources: [] });
const plan = () => ({ schema_version: 1, narration: 'Explicit silent on-screen text demonstration', audio: null, transcript: null, shots: [0, 1, 2].map(i => ({ id: `shot-${i + 1}`, start: i * 6, end: (i + 1) * 6, message: 'Review before handoff', narration: 'Silent, on-screen text', caption: 'Local draft', visual: 'Typography and progress line', assets: [] })) });
const draft = () => ({ schema_version: 1, content_id: 'safe-drafts', revision: 1, channel: 'local-demo', account: 'fictional-account', title: 'Review before handoff', body: 'An original local workflow demonstration, not published.', media: [], sources: [], claims: [], approvals: [], publication_authorization: 'not-authorized' });
function approve(d, root) { const digest = m.draftFingerprint(d, root); d.approvals = ['direction', 'platform', 'title', 'final'].map(gate => ({ gate, approved: true, by: 'SIMULATED TEST FIXTURE, NOT USER APPROVAL', at: '2026-10-10T00:00:00Z', digest })); return d; }
function fixture(fn) { const dir = mkdtempSync(join(tmpdir(), 'media-test-')); try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); } }
test('complete brief and three Hook kinds pass', () => assert.equal(m.validateBrief(brief()).content_id, 'safe-drafts'));
test('missing inputs, guessed defaults and malformed numeric fields block video', () => {
  for (const key of ['font', 'audience', 'duration_seconds', 'fps', 'voice', 'style']) { const b = brief(); delete b[key]; assert.throws(() => m.validateVideo(b, plan())); }
  assert.throws(() => m.validateBrief({ ...brief(), fps: '24' })); assert.throws(() => m.validateBrief({ ...brief(), width: 641 }));
  const b = brief(); b.hooks = b.hooks.map(h => ({ ...h, kind: 'result' })); assert.throws(() => m.validateBrief(b), /three-hooks/);
});
test('pending facts can remain research, not enter production', () => {
  const b = brief(); b.claims = [{ id: 'c1', text: 'Unverified number', kind: 'fact', evidence_status: 'pending', source_ids: [] }];
  m.validateBrief(b); assert.throws(() => m.validateVideo(b, plan()), /pending-fact/); b.claims[0].evidence_status = 'verified'; assert.throws(() => m.validateBrief(b), /without-source/);
});
test('verified facts need existing unique source records', () => {
  const b = brief(); b.sources = [{ id: 's1', locator: 'user-measurement.txt:1', evidence: 'Observed measurement' }]; b.claims = [{ id: 'c1', text: 'Observed measurement', kind: 'fact', evidence_status: 'verified', source_ids: ['s1'] }];
  m.validateVideo(b, plan()); b.claims[0].source_ids = ['missing']; assert.throws(() => m.validateBrief(b), /missing-source/);
});
test('silent mode cannot pretend to have audio/transcript', () => { m.validateVideo(brief(), plan()); assert.throws(() => m.validateVideo(brief(), { ...plan(), transcript: [] }), /silent/); });
test('provided audio requires a file and monotonic transcript before shots', () => fixture(root => {
  const b = brief(); b.voice.mode = 'provided'; const p = plan(); p.audio = 'voice.wav';
  assert.throws(() => m.validateVideo(b, p, root)); writeFileSync(join(root, 'voice.wav'), 'mock file, not encoded audio');
  assert.throws(() => m.validateVideo(b, p, root), /transcript/); p.transcript = [{ start: 0, end: 2, text: 'Hello' }]; m.validateVideo(b, p, root);
  p.transcript.push({ start: 1, end: 3, text: 'Overlap' }); assert.throws(() => m.validateVideo(b, p, root), /timing/);
}));
test('timeline gaps, duplicate shot IDs and missing assets block video', () => {
  for (const mutate of [p => p.shots[1].start++, p => p.shots[1].id = p.shots[0].id, p => p.shots[0].assets = ['missing.png']]) { const p = plan(); mutate(p); assert.throws(() => m.validateVideo(brief(), p)); }
});
test('21 styles resolve by number, Chinese name and registered English aliases', () => {
  const menu = m.styleMenu(); assert.equal(menu.length, 21); assert.deepEqual(menu.map(s => s.id).sort(), [...Array.from({ length: 20 }, (_, i) => String(i + 1)), '3.1'].sort());
  for (const s of menu) for (const key of [s.id, s.name, ...s.aliases]) assert.equal(m.selectStyle(key).id, s.id);
  assert.throws(() => m.selectStyle('unknown')); assert.throws(() => m.selectStyle(''));
});
test('paths reject traversal, absolutes, Windows paths, empty segments and links', () => fixture(root => {
  for (const bad of ['../x', '/tmp/x', 'C:\\x', 'https://x', 'a//b', './x', 'a/../x']) assert.throws(() => m.localPath(root, bad, false));
  if (process.platform !== 'win32') { symlinkSync(tmpdir(), join(root, 'link')); assert.throws(() => m.localPath(root, 'link/x', false), /symlink/); }
}));
test('four current approvals are required; content/account changes invalidate them', () => fixture(root => {
  const d = draft(); assert.throws(() => m.exportDraft(d, root), /approval/); assert.equal(readdirSync(root).length, 0);
  approve(d); m.exportDraft(d, root); for (const k of ['body', 'account', 'title', 'channel']) { const x = structuredClone(d); x[k] += ' changed'; assert.throws(() => m.exportDraft(x, root), /approval/); }
}));
test('local export never requests network, repeats idempotently and preserves human edits', () => fixture(root => {
  const old = globalThis.fetch; globalThis.fetch = () => { throw new Error('network forbidden'); };
  try { const d = approve(draft()); const a = m.exportDraft(d, root), b = m.exportDraft(d, root); assert.equal(a.path, b.path); assert.equal(b.reused, true); assert.deepEqual(a.side_effects, []);
    assert.equal(JSON.parse(readFileSync(join(a.path, 'package.json'))).publication_performed, false);
    writeFileSync(join(a.path, 'draft.md'), 'human edit'); assert.throws(() => m.exportDraft(d, root), /drift/); assert.equal(readFileSync(join(a.path, 'draft.md'), 'utf8'), 'human edit');
  } finally { globalThis.fetch = old; }
}));
test('media copies are complete; changed source bytes invalidate approvals', () => fixture(root => {
  writeFileSync(join(root, 'image.txt'), 'first'); const d = draft(); d.media = ['image.txt']; approve(d, root);
  const out = m.exportDraft(d, root, root); assert.equal(readFileSync(join(out.path, 'media/1-image.txt'), 'utf8'), 'first');
  writeFileSync(join(root, 'image.txt'), 'second'); assert.throws(() => m.validateDraft(d, root), /approval/);
}));
test('publication stays disabled even with approval-looking data', () => {
  const d = approve(draft()); d.action = 'publish'; assert.throws(() => m.validateDraft(d), /external-action/); delete d.action; d.publication_authorization = 'approved-publish'; assert.throws(() => m.validateDraft(d), /publication-disabled/);
});
test('foreign locks are preserved and prevent staging writes', () => fixture(root => {
  const d = approve(draft()), fp = m.draftFingerprint(d); const lock = join(root, `safe-drafts-r1-${fp.slice(0, 12)}.lock`); mkdirSync(lock);
  assert.throws(() => m.exportDraft(d, root)); assert.equal(existsSync(lock), true); assert.equal(readdirSync(root).length, 1);
}));
test('state rejects unknown versions/fields and terminal index conflicts', () => {
  m.validateStatus({ schema_version: 1, workflow: 'media', active: [], completed: [] });
  for (const s of [{ schema_version: 2, workflow: 'media', active: [], completed: [] }, { schema_version: 1, workflow: 'media', active: [], completed: [], foreign: true }]) assert.throws(() => m.validateStatus(s));
  const id = '2026-10-10-demo', s = { schema_version: 1, workflow: 'media', active: [id], completed: [] }, c = { schema_version: 1, change: id, status: 'active', current_work: null, works_run: [], revision: 1, blockers: [], updated_at: '2026-10-10T00:00:00Z' };
  m.validateStatus(s, { [id]: c }); c.status = 'completed'; assert.throws(() => m.validateStatus(s, { [id]: c }), /terminal-index/);
});
test('final video rejects stale review, missing stills and any score below eight', () => {
  const b = brief(), p = plan(), r = { evidence_kind: 'executed', reviewer: 'fixture', input_digest: 'input', preview: { path: 'preview.mp4', sha256: 'a'.repeat(64), duration_seconds: 18 }, stills: p.shots.flatMap(s => [1, 2, 3].map(n => ({ shot_id: s.id, path: `${s.id}-${n}.png`, sha256: 'b'.repeat(64), accepted: true }))), checks: Object.fromEntries(['fonts', 'captions', 'aspect', 'rhythm', 'audio_sync', 'determinism'].map(k => [k, true])), scores: Object.fromEntries(['accuracy', 'readability', 'visual_consistency', 'rhythm', 'audio_visual'].map(k => [k, 8])), blockers: [] };
  m.validateReview(r, b, p, 'input'); assert.throws(() => m.validateReview(r, b, p, 'new'), /stale/); r.scores.rhythm = 7; assert.throws(() => m.validateReview(r, b, p, 'input'), /score/); r.scores.rhythm = 8; r.stills.pop(); assert.throws(() => m.validateReview(r, b, p, 'input'), /three-stills/);
});
test('reviewed renderer returns exact stdout bytes offline; changed package invalidates review', t => {
  const probe = spawnSync('python3', ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)']); if (probe.status !== 0) return t.skip('optional Python 3.10+ not installed');
  fixture(root => { mkdirSync(join(root, 'scripts')); mkdirSync(join(root, 'assets'));
    for (const f of ['LICENSE', 'STYLES.md', 'PROTOCOL.md', 'PACKAGE-MANIFEST.json', 'scripts/hosted_images.py', 'assets/image-manifest.json']) writeFileSync(join(root, f), 'original test fixture, not upstream content');
    writeFileSync(join(root, 'scripts/render_prompt.py'), 'import os,sys\nassert os.environ["HAND_DRAWN_OFFLINE"] == "1"\nsys.stdout.buffer.write("原样\\r\\n  text  \\n".encode())\n');
    const reviewedDigest = m.fingerprintPackage(root); assert.deepEqual(m.renderPrompt({ skillRoot: root, reviewedDigest, style: '1', variables: { N: '3' } }), Buffer.from('原样\r\n  text  \n'));
    writeFileSync(join(root, 'STYLES.md'), 'changed'); assert.throws(() => m.renderPrompt({ skillRoot: root, reviewedDigest, style: '1' }), /review-required/);
  });
});
test('unreviewed/incomplete package and unknown style cannot execute a renderer', () => fixture(root => {
  assert.throws(() => m.renderPrompt({ skillRoot: root, reviewedDigest: '0'.repeat(64), style: '3.1' })); writeFileSync(join(root, 'STYLES.md'), 'fixture');
  assert.throws(() => m.renderPrompt({ skillRoot: root, reviewedDigest: m.fingerprintPackage(root), style: '3.1' }), /missing-file/);
}));
