/** Real encoded MP4/PNG files; review scores are explicit contract fixtures, never observed aesthetic approval. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { digest, fingerprintArtifact } from '../tools/media-tools.mjs';

const tool = resolve(dirname(fileURLToPath(import.meta.url)), '../tools/media-tools.mjs');
const call = (exe, args, options = {}) => spawnSync(exe, args, { encoding: 'utf8', timeout: 30000, ...options });
const writeJSON = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
function snapshot(root) {
  const files = {};
  function visit(dir, prefix = '') {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + item.name, path = join(dir, item.name);
      if (item.isDirectory()) { files[name + '/'] = 'directory'; visit(path, name + '/'); }
      else files[name] = createHash('sha256').update(readFileSync(path)).digest('hex');
    }
  }
  visit(root); return files;
}

test('final artifact CLI consumes complete review gates and actual encoded preview/still evidence', { timeout: 120000 }, async t => {
  for (const command of ['ffmpeg', 'ffprobe']) {
    const available = call(command, ['-version']);
    if (available.error || available.status !== 0) {
      if (process.env.MEDIA_RENDER_REQUIRED === '1') assert.fail('MEDIA_RENDER_REQUIRED: missing ' + command);
      t.skip('Actual final consumer not run: missing preinstalled ' + command); return;
    }
  }
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'media-final-consumer-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const change = '2026-10-19-final-contract', dir = join(root, 'changes', change), source = join(dir, 'video/source'), previewRoot = join(dir, 'video/preview');
  for (const folder of [source, previewRoot, join(previewRoot, 'stills'), join(dir, 'video/final')]) mkdirSync(folder, { recursive: true });
  const encoded = call('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=128x128:r=3:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-n', join(previewRoot, 'preview.mp4')]);
  assert.equal(encoded.error, undefined); assert.equal(encoded.status, 0, encoded.stderr);
  const stills = call('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', join(previewRoot, 'preview.mp4'), '-frames:v', '3', '-threads', '1', '-n', join(previewRoot, 'stills/one-%d.png')]);
  assert.equal(stills.error, undefined); assert.equal(stills.status, 0, stills.stderr);
  copyFileSync(join(previewRoot, 'preview.mp4'), join(dir, 'video/final/final.mp4'));
  const brief = { schema_version: 1, content_id: 'final-consumer', topic: 'Mechanical review consumption', conclusion: 'Read the actual review', audience: 'Maintainers', platform: 'offline-test', style: 'original fixture', font: 'Fixture font; not rendered by a browser', duration_seconds: 1, width: 128, height: 128, fps: 3, colors: ['#000000'], voice: { mode: 'silent' }, hooks: ['result', 'pain', 'counterintuitive'].map(kind => ({ kind, text: 'Contract fixture ' + kind })), claims: [], sources: [] };
  const plan = { schema_version: 1, narration: 'Silent fixture', audio: null, transcript: null, shots: [{ id: 'one', start: 0, end: 1, message: 'Contract', narration: 'Silent', caption: 'Fixture only', visual: 'Black frame', assets: [] }] };
  writeJSON(join(dir, 'brief.json'), brief); writeJSON(join(source, 'plan.json'), plan);
  writeFileSync(join(source, 'scene.html'), '<p>Input fixture; browser rendering and aesthetic review were not performed.</p>');
  const inputs = { brief: fingerprintArtifact(dir, 'brief.json').sha256, plan: fingerprintArtifact(source, 'plan.json').sha256, html: fingerprintArtifact(source, 'scene.html').sha256, assets: {} };
  const inputDigest = digest(inputs), identity = { fixture: 'SIMULATED browser identity and review; actual FFmpeg encoded MP4/PNG files', ffmpeg_version: call('ffmpeg', ['-version']).stdout.split('\n')[0] }, executionDigest = digest(identity);
  const rows = [
    ['brief', 'media/brief', 'data', 'brief.json', []],
    ['plan', 'media/video', 'data', 'video/source/plan.json', ['brief']],
    ['html', 'media/video', 'video-project', 'video/source/scene.html', ['plan']],
    ['preview-report', 'media/video', 'report', 'video/preview/render-report.json', ['brief', 'plan', 'html']],
    ['preview', 'media/video', 'video-preview', 'video/preview/preview.mp4', ['preview-report']],
    ...[1, 2, 3].map(n => ['still-' + n, 'media/video', 'image', `video/preview/stills/one-${n}.png`, ['preview-report']]),
    ['review', 'media/video', 'report', 'video/preview/review.json', ['preview', 'still-1', 'still-2', 'still-3']],
    ['final-report', 'media/video', 'report', 'video/final/render-report.json', ['brief', 'plan', 'html', 'review']],
    ['final', 'media/video', 'video-final', 'video/final/final.mp4', ['final-report']],
  ];
  const review = { schema_version: 2, evidence_kind: 'executed', reviewer: 'SIMULATED CONTRACT FIXTURE; no actual quality review or user approval', input_digest: inputDigest, execution_digest: executionDigest,
    preview: { path: 'preview.mp4', sha256: fingerprintArtifact(previewRoot, 'preview.mp4').sha256, duration_seconds: 1 },
    stills: [1, 2, 3].map(n => ({ shot_id: 'one', path: `stills/one-${n}.png`, sha256: fingerprintArtifact(previewRoot, `stills/one-${n}.png`).sha256, accepted: true })),
    checks: Object.fromEntries(['fonts', 'captions', 'aspect', 'rhythm', 'audio_sync', 'determinism'].map(k => [k, true])),
    scores: Object.fromEntries(['accuracy', 'readability', 'visual_consistency', 'rhythm', 'audio_visual'].map(k => [k, 8])), blockers: [] };
  function reports(currentReview) {
    writeJSON(join(previewRoot, 'review.json'), currentReview);
    const shared = { schema_version: 2, evidence_kind: 'executed', status: 'rendered-needs-review', input_digest: inputDigest, inputs, execution_identity: identity, execution_digest: executionDigest, width: 128, height: 128, fps: 3, duration_seconds: 1 };
    writeJSON(join(previewRoot, 'render-report.json'), { ...shared, mode: 'preview', review: null, output_sha256: fingerprintArtifact(previewRoot, 'preview.mp4').sha256 });
    writeJSON(join(dir, 'video/final/render-report.json'), { ...shared, mode: 'final', output_sha256: fingerprintArtifact(dir, 'video/final/final.mp4').sha256,
      review: { sha256: fingerprintArtifact(previewRoot, 'review.json').sha256, input_digest: inputDigest, execution_digest: executionDigest, preview_sha256: currentReview.preview?.sha256 } });
  }
  function manifest() {
    const artifacts = rows.map(([id, owner, kind, path, dependencies]) => ({ id, owner, kind, root: 'change', path, version: 1, sha256: fingerprintArtifact(dir, path).sha256, evidence_kind: 'executed', depends_on: dependencies }));
    for (const a of artifacts) a.depends_on = a.depends_on.map(id => { const d = artifacts.find(a => a.id === id); return { id, version: d.version, sha256: d.sha256 }; });
    // Validate the consuming final first so these cases exercise review consumption, independent of list order.
    artifacts.unshift(artifacts.pop());
    return { schema_version: 1, change, artifacts };
  }
  reports(review);
  writeJSON(join(dir, '.status.json'), { schema_version: 1, change, status: 'completed', current_work: null, works_run: ['media/brief', 'media/video'], revision: 1, blockers: [], updated_at: '2026-10-19T00:00:00Z' });
  writeJSON(join(dir, 'artifacts.json'), manifest());
  const originalFiles = {};
  function save(dir, prefix = '') { for (const item of readdirSync(dir, { withFileTypes: true })) { if (item.isDirectory()) save(join(dir, item.name), prefix + item.name + '/'); else originalFiles[prefix + item.name] = readFileSync(join(dir, item.name)); } }
  save(dir);
  function reset() { for (const [name, bytes] of Object.entries(originalFiles)) writeFileSync(join(dir, name), bytes); }
  function consume(pattern) {
    const before = snapshot(root), result = call(process.execPath, [tool, 'check-artifacts', dir], { cwd: tmpdir() });
    assert.equal(result.error, undefined);
    if (pattern) { assert.equal(result.status, 1, result.stdout + result.stderr); assert.match(result.stderr, pattern); }
    else { assert.equal(result.status, 0, result.stdout + result.stderr); assert.equal(JSON.parse(result.stdout).valid, true); }
    assert.deepEqual(snapshot(root), before, 'consumer must not repair or overwrite evidence');
  }
  await t.test('actual final/preview/three PNGs with complete consistent contract data pass', () => consume());
  for (const [label, mutate, pattern] of [
    ['failed check', r => { r.checks.fonts = false; }, /review-checks/],
    ['low score', r => { r.scores.rhythm = 7; }, /review-score/],
    ['explicit blocker', r => { r.blockers = ['Observed fixture failure; do not deliver']; }, /review-blockers/],
    ['missing preview and stills', r => { delete r.preview; delete r.stills; }, /final-review-required/],
    ['incomplete still set', r => { r.stills.pop(); }, /three-stills/],
  ]) await t.test(label + ' cannot be laundered through matching report digests', () => {
    reset(); const candidate = structuredClone(review); mutate(candidate); reports(candidate); writeJSON(join(dir, 'artifacts.json'), manifest()); consume(pattern);
  });
  await t.test('deleted reviewed PNG fails without altering the rest of the package', () => {
    reset(); rmSync(join(previewRoot, 'stills/one-2.png')); consume(/missing-file/);
  });
  await t.test('changed reviewed bytes fail even while report/review hashes still match', () => {
    reset(); writeFileSync(join(previewRoot, 'stills/one-2.png'), 'Changed file'); consume(/review-still-drift/);
  });
  await t.test('text with an updated matching SHA cannot impersonate a reviewed image', () => {
    reset(); writeFileSync(join(previewRoot, 'stills/one-2.png'), 'This is not an image');
    const candidate = structuredClone(review); candidate.stills[1].sha256 = fingerprintArtifact(previewRoot, 'stills/one-2.png').sha256;
    reports(candidate); writeJSON(join(dir, 'artifacts.json'), manifest()); consume(/image-format/);
  });
  await t.test('review must own an actual dependency on each reviewed evidence file', () => {
    reset(); const value = manifest(), row = value.artifacts.find(a => a.id === 'review'); row.depends_on = row.depends_on.filter(d => d.id !== 'still-2');
    writeJSON(join(dir, 'artifacts.json'), value); consume(/review-evidence-dependency/);
  });
  await t.test('missing production inputs are not accepted as equal undefined fields', () => {
    reset(); const report = JSON.parse(readFileSync(join(dir, 'video/final/render-report.json'))); delete report.inputs;
    writeJSON(join(dir, 'video/final/render-report.json'), report); writeJSON(join(dir, 'artifacts.json'), manifest()); consume(/video-inputs-required/);
  });
  await t.test('actual production input drift is rejected before accepting historical final media', () => {
    reset(); writeFileSync(join(source, 'scene.html'), '<p>External edit</p>'); consume(/video-input-drift:html/);
  });
  reset(); assert.equal(existsSync(join(previewRoot, 'stills/one-2.png')), true);
});
