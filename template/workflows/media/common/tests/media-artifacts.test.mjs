import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import * as m from '../tools/media-tools.mjs';

function fixture(fn) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'media-artifacts-')), change = '2026-10-19-contract';
  const dir = join(root, 'changes', change); mkdirSync(dir, { recursive: true });
  const status = { schema_version: 1, change, status: 'active', current_work: null, works_run: [], revision: 1, blockers: [], updated_at: '2026-10-19T00:00:00Z' };
  const manifest = { schema_version: 1, change, artifacts: [] };
  const add = (id, owner, kind, path, content, dependencies = []) => {
    const file = join(dir, path); mkdirSync(dirname(file), { recursive: true });
    if (content !== null) writeFileSync(file, content);
    const a = { id, owner, kind, root: 'change', path, version: 1, sha256: content === null ? null : m.fingerprintArtifact(dir, path).sha256, evidence_kind: content === null ? 'unverified' : 'executed', depends_on: dependencies.map(d => ({ id: d.id, version: d.version, sha256: d.sha256 })) };
    manifest.artifacts.push(a); return a;
  };
  const check = () => m.validateArtifactManifest(manifest, dir, status);
  const save = () => {
    writeFileSync(join(dir, '.status.json'), JSON.stringify(status)); writeFileSync(join(dir, 'artifacts.json'), JSON.stringify(manifest));
    const terminal = ['completed', 'cancelled'].includes(status.status);
    writeFileSync(join(root, 'status.json'), JSON.stringify({ schema_version: 1, workflow: 'media', active: terminal ? [] : [change], completed: terminal ? [change] : [] }));
  };
  try { return fn({ root, dir, status, manifest, add, check, save }); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('completion checks only promised outputs: article, exact prompt and project need no unrequested image/movie', () => fixture(f => {
  f.add('article', 'media/brief', 'document', 'master.md', '# Original local test text\n');
  f.add('prompt', 'media/hand-drawn', 'prompt', 'visual/prompt.txt', 'Original bytes\r\n  preserved  \n');
  f.add('project', 'media/video', 'video-project', 'video/scene.html', '<p>Engineering fixture; not rendered</p>');
  f.status.works_run = ['media/brief', 'media/hand-drawn', 'media/video']; f.status.status = 'completed';
  assert.equal(f.check().artifacts, 3); f.save(); m.validateStateRoot(f.root);
  assert.equal(readFileSync(join(f.dir, 'visual/prompt.txt'), 'utf8'), 'Original bytes\r\n  preserved  \n');
}));

test('pending promises are allowed until their owner finishes; missing final cannot be replaced by an engineering file', () => fixture(f => {
  f.add('project', 'media/video', 'video-project', 'video/scene.html', '<p>Source</p>');
  f.add('final', 'media/video', 'video-final', 'video/final.mp4', null); f.check();
  f.status.works_run = ['media/video']; assert.throws(f.check, /artifact-not-produced:final/);
  f.status.works_run = []; f.status.status = 'completed'; assert.throws(f.check, /artifact-not-produced:final/);
}));

test('completed output missing or manually changed is blocked with its owner and never repaired', () => fixture(f => {
  const a = f.add('article', 'media/brief', 'document', 'master.md', 'First'); f.status.works_run = [a.owner]; f.check();
  writeFileSync(join(f.dir, a.path), 'Human edit'); assert.throws(f.check, /artifact-drift:article:media\/brief/);
  assert.equal(readFileSync(join(f.dir, a.path), 'utf8'), 'Human edit'); rmSync(join(f.dir, a.path));
  assert.throws(f.check, /artifact-missing:article:media\/brief/);
}));

test('dependency changes invalidate only consumers naming that identity; unchanged bytes still require a matching version', () => fixture(f => {
  const source = f.add('brief', 'media/brief', 'data', 'brief.json', '{}');
  const view = f.add('prompt', 'media/hand-drawn', 'prompt', 'visual/prompt.txt', 'Derived text', [source]);
  f.add('independent', 'media/deconstruct', 'document', 'deconstruction.md', 'Independent original observation');
  f.check(); source.version++; assert.throws(f.check, /dependency-stale:prompt/);
  view.depends_on[0].version = source.version; f.check();
  writeFileSync(join(f.dir, source.path), '{"topic":"changed"}'); source.sha256 = m.fingerprintArtifact(f.dir, source.path).sha256;
  assert.throws(f.check, /dependency-stale:prompt/);
}));

for (const [label, mutate, pattern] of [
  ['foreign owner', f => { f.manifest.artifacts[0].owner = 'media/video'; }, /artifact-owner/],
  ['duplicate owner path', f => { f.manifest.artifacts.push({ ...f.manifest.artifacts[0], id: 'duplicate' }); }, /owned-twice/],
  ['unknown artifact version', f => { f.manifest.schema_version = 2; }, /artifact-change/],
  ['unknown field', f => { f.manifest.artifacts[0].approved = true; }, /unknown-or-missing/],
  ['path escape', f => { f.manifest.artifacts[0].path = '../master.md'; }, /artifact-owner|unsafe-path/],
  ['no owned output for finished Work', f => { f.status.works_run = ['media/video']; }, /without-owned-artifact/],
  ['simulation cannot fulfill completed output', f => { f.status.status = 'completed'; f.manifest.artifacts[0].evidence_kind = 'simulated'; }, /not-executed/],
  ['cycle', f => { const a = f.manifest.artifacts[0]; a.depends_on = [{ id: a.id, version: a.version, sha256: a.sha256 }]; }, /dependency-cycle/],
]) test('manifest rejects ' + label, () => fixture(f => {
  f.add('article', 'media/brief', 'document', 'master.md', 'Content'); mutate(f); assert.throws(f.check, pattern);
}));

test('mutable permanent knowledge keeps its truth owner; historical completion requires an immutable evidence snapshot', () => fixture(f => {
  mkdirSync(join(f.root, 'context')); writeFileSync(join(f.root, 'context/creator.md'), 'Current profile');
  const a = f.add('profile', 'media/init-setup', 'document', 'context-snapshot/creator.md', 'Current profile');
  f.status.works_run = [a.owner]; f.status.status = 'completed'; f.check();
  writeFileSync(join(f.root, 'context/creator.md'), 'Legitimate later profile'); f.check();
  a.root = 'media'; a.path = 'context/creator.md'; assert.throws(f.check, /needs-snapshot/);
}));

test('text renamed to a promised PNG is not a generated image', () => fixture(f => {
  f.add('picture', 'media/hand-drawn', 'image', 'visual/image.png', 'A prompt, not a raster image');
  assert.throws(f.check, /image-format:picture/);
}));

test('a final report cannot replace the promised actual review file', () => fixture(f => {
  const movie = f.add('final', 'media/video', 'video-final', 'video/final.mp4', 'Invalid media fixture; never accepted or rendered');
  const identity = { fixture: 'SIMULATED NEGATIVE REPORT; no execution evidence' };
  const report = f.add('report', 'media/video', 'report', 'video/render-report.json', JSON.stringify({ schema_version: 2, evidence_kind: 'executed', status: 'rendered-needs-review', mode: 'final', output_sha256: movie.sha256, execution_identity: identity, execution_digest: m.digest(identity), review: { sha256: 'a'.repeat(64) } }));
  movie.depends_on = [{ id: report.id, version: report.version, sha256: report.sha256 }];
  assert.throws(f.check, /final-review-required:final/);
}));

test('local draft promises read actual copied media and actual body, never infer publication', () => fixture(f => {
  const d = { schema_version: 1, content_id: 'contract', revision: 1, channel: 'local', account: 'fictional-test', title: 'Test', body: 'Original text', media: ['image.txt'], sources: [], claims: [], approvals: [], publication_authorization: 'not-authorized' };
  writeFileSync(join(f.dir, 'image.txt'), 'Real local copied bytes');
  d.approvals = ['direction', 'platform', 'title', 'final'].map(gate => ({ gate, approved: true, by: 'SIMULATED TEST FIXTURE; no user authorization', at: '2026-10-19T00:00:00Z', digest: m.draftFingerprint(d, f.dir) }));
  mkdirSync(join(f.dir, 'drafts')); const exported = m.exportDraft(d, join(f.dir, 'drafts'), f.dir);
  const path = 'drafts/' + exported.path.split(/[\\/]/).at(-1) + '/package.json';
  f.add('draft', 'media/publish-draft', 'local-draft', path, readFileSync(join(f.dir, path)));
  f.status.works_run = ['media/publish-draft']; f.check();
  writeFileSync(join(exported.path, 'draft.md'), 'Human edit'); assert.throws(f.check, /draft-body-drift/);
  writeFileSync(join(exported.path, 'draft.md'), '# Test\n\nOriginal text\n\n---\nLocal draft only. No upload, login or publication was performed.\n');
  writeFileSync(join(exported.path, 'media/1-image.txt'), 'Changed copy'); assert.throws(f.check, /draft-copy-drift/);
  assert.equal(JSON.parse(readFileSync(join(f.dir, path))).publication_performed, false);
}));
