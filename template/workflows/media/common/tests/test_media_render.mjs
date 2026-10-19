/** Real CLI/encoding smoke. Does not create an aesthetic review or final-publication approval. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, fingerprintArtifact, validateArtifactManifest } from '../tools/media-tools.mjs';

const workflow = resolve(process.env.MEDIA_WORKFLOW_ROOT || fileURLToPath(new URL('../..', import.meta.url)));
const python = process.env.MEDIA_RENDER_PYTHON || 'python3';
const required = process.env.MEDIA_RENDER_REQUIRED === '1';
function call(args, options = {}) {
  const result = spawnSync(python, ['-B', ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, ...options });
  assert.ifError(result.error); return result;
}
function pythonAvailable(t) {
  const p = spawnSync(python, ['-I', '-c', 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)'], { encoding: 'utf8', timeout: 5000 });
  if (!p.error && p.status === 0) return true;
  if (required) assert.fail('MEDIA_RENDER_REQUIRED: existing Python 3.10+ required');
  t.skip('Python 3.10+ unavailable; no CLI or render execution claimed'); return false;
}
function fixture(layout, fn) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'media-real-cli-'));
  try {
    let installed = workflow;
    if (layout === 'installed-copy') {
      installed = join(root, 'installed/media');
      cpSync(workflow, installed, { recursive: true, filter: source => basename(source) !== '_state' });
      assert.equal(existsSync(join(installed, '_state')), false);
    }
    const change = '2026-10-19-render-smoke', dir = join(root, 'state/changes', change), source = join(dir, 'video/source');
    mkdirSync(source, { recursive: true });
    const brief = { schema_version: 1, content_id: 'offline-smoke', topic: 'Offline rendering', conclusion: 'A real preview needs observation', audience: 'Maintainers', platform: 'local-test', style: 'original typography fixture', font: 'DejaVu Sans', duration_seconds: 1, width: 320, height: 180, fps: 3, colors: ['#101828', '#ffffff'], voice: { mode: 'silent' }, hooks: ['result', 'pain', 'counterintuitive'].map(kind => ({ kind, text: 'Original offline test fixture: ' + kind })), claims: [], sources: [] };
    const plan = { schema_version: 1, narration: 'Explicit silent test', audio: null, transcript: null, font_files: [], shots: [{ id: 'one', start: 0, end: 1, message: 'Real preview', narration: 'Silent local fixture', caption: 'Needs observation', visual: 'Text and deterministic bar', assets: [] }] };
    writeFileSync(join(dir, 'brief.json'), JSON.stringify(brief)); writeFileSync(join(source, 'plan.json'), JSON.stringify(plan));
    writeFileSync(join(source, 'scene.html'), '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#101828;color:white;font-family:"DejaVu Sans"}h1{font-size:24px;margin:24px}#bar{height:12px;background:#63b3ed}</style><h1>Offline preview</h1><div id="bar"></div><script>window.render=t=>{document.querySelector("#bar").style.width=(40+200*t)+"px"}</script>');
    const output = join(dir, 'video/preview'), renderer = join(installed, 'media-v-video/scripts/render_preview.py');
    const args = [renderer, '--brief', join(dir, 'brief.json'), '--plan', join(source, 'plan.json'), '--html', join(source, 'scene.html'), '--output', output];
    return fn({ root, dir, source, output, args, brief, plan, change });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

for (const layout of ['source', 'installed-copy']) {
  test(`Python CLI ${layout} resolves the actual shared validator and writes nothing for input checks`, t => {
    if (!pythonAvailable(t)) return;
    fixture(layout, f => {
      const result = call([...f.args, '--check-inputs']); assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout); assert.equal(report.evidence_kind, 'input-check'); assert.equal(report.valid, true); assert.equal(existsSync(f.output), false);
      delete f.brief.font; writeFileSync(join(f.dir, 'brief.json'), JSON.stringify(f.brief));
      const invalid = call([...f.args, '--check-inputs']); assert.notEqual(invalid.status, 0); assert.equal(existsSync(f.output), false);
      f.brief.font = 'DejaVu Sans'; f.brief.fps = 2; writeFileSync(join(f.dir, 'brief.json'), JSON.stringify(f.brief));
      const tooFewFrames = call([...f.args, '--check-inputs']); assert.notEqual(tooFewFrames.status, 0); assert.match(tooFewFrames.stderr, /three distinct frame instants/); assert.equal(existsSync(f.output), false);
    });
  });

  test(`Python CLI ${layout} makes an actual offline preview, stills and execution report`, { timeout: 120000 }, t => {
    if (!pythonAvailable(t)) return;
    const probe = call(['-I', '-c', 'import importlib.util,json,shutil; print(json.dumps({"playwright":importlib.util.find_spec("playwright") is not None,"chromium":shutil.which("chromium") or shutil.which("chromium-browser"),"ffmpeg":shutil.which("ffmpeg"),"ffprobe":shutil.which("ffprobe"),"fc_match":shutil.which("fc-match")}))']);
    assert.equal(probe.status, 0, probe.stderr); const dependencies = JSON.parse(probe.stdout);
    const chromium = process.env.MEDIA_RENDER_CHROMIUM || dependencies.chromium;
    const missing = Object.entries({ ...dependencies, chromium }).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) {
      if (required) assert.fail('MEDIA_RENDER_REQUIRED: missing preinstalled ' + missing.join(', '));
      t.skip('Actual rendering not run: missing preinstalled ' + missing.join(', ')); return;
    }
    fixture(layout, f => {
      const result = call([...f.args, '--chromium', chromium, '--reviewed-html']);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(readFileSync(join(f.output, 'render-report.json')));
      assert.equal(report.schema_version, 2); assert.equal(report.evidence_kind, 'executed'); assert.equal(report.status, 'rendered-needs-review');
      assert.equal(report.execution_digest, digest(report.execution_identity)); assert.match(report.execution_identity.renderer_sha256, /^[a-f0-9]{64}$/);
      assert.ok(report.execution_identity.fonts.files.every(font => /^[a-f0-9]{64}$/.test(font.sha256)));
      assert.equal(report.output_sha256, fingerprintArtifact(f.output, 'preview.mp4').sha256); assert.equal(report.determinism, true); assert.deepEqual(report.network_requests_blocked, []);
      assert.equal(report.stills.length, 3); assert.equal(new Set(report.stills.map(s => s.time)).size, 3);
      for (const still of report.stills) assert.equal(fingerprintArtifact(f.output, still.path).sha256, still.sha256);
      assert.equal(existsSync(join(f.output, 'review.json')), false); assert.equal(existsSync(join(f.output, 'final.mp4')), false);
      const artifacts = [
        ['brief', 'media/brief', 'data', 'brief.json', []],
        ['plan', 'media/video', 'data', 'video/source/plan.json', ['brief']],
        ['html', 'media/video', 'video-project', 'video/source/scene.html', ['plan']],
        ['report', 'media/video', 'report', 'video/preview/render-report.json', ['brief', 'plan', 'html']],
        ['preview', 'media/video', 'video-preview', 'video/preview/preview.mp4', ['report']],
      ].map(([id, owner, kind, path, dependencies]) => ({ id, owner, kind, root: 'change', path, version: 1, sha256: fingerprintArtifact(f.dir, path).sha256, evidence_kind: 'executed', depends_on: dependencies }));
      for (const a of artifacts) a.depends_on = a.depends_on.map(id => { const d = artifacts.find(a => a.id === id); return { id, version: d.version, sha256: d.sha256 }; });
      const manifest = { schema_version: 1, change: f.change, artifacts }, status = { change: f.change, status: 'completed', works_run: ['media/brief', 'media/video'] };
      assert.equal(validateArtifactManifest(manifest, f.dir, status).valid, true);
      rmSync(join(f.output, 'preview.mp4')); assert.throws(() => validateArtifactManifest(manifest, f.dir, status), /artifact-missing:preview/);
    });
  });
}
