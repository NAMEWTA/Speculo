#!/usr/bin/env node
/** Local-only primitives. No publishing API, installer or network client. */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, mkdirSync, renameSync, rmSync, writeFileSync, openSync, closeSync, readSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, parse, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const workflow = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHANGE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const WORKS = ['init-setup', 'brief', 'deconstruct', 'video', 'hand-drawn', 'publish-draft', 'retro'].map(x => `media/${x}`);
const text = x => typeof x === 'string' && x.trim().length > 0;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const unique = x => Array.isArray(x) && x.every(text) && new Set(x).size === x.length;
function need(ok, code) { if (!ok) throw new Error(`media:${code}`); }
function keys(x, names) { need(object(x) && names.every(k => k in x) && Object.keys(x).every(k => names.includes(k)), 'unknown-or-missing-fields'); }
export function canonical(x) {
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  if (object(x)) return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
  need(x === null || ['string', 'boolean', 'number'].includes(typeof x), 'not-json');
  need(typeof x !== 'number' || Number.isFinite(x), 'not-finite');
  return JSON.stringify(x);
}
export const digest = x => createHash('sha256').update(Buffer.isBuffer(x) ? x : canonical(x)).digest('hex');
export const readJSON = file => JSON.parse(readFileSync(file, 'utf8'));
/** Cooperative drift guard, not an atomic sandbox against hostile processes. */
export function localPath(root, relative, mustExist = true) {
  need(text(relative) && !isAbsolute(relative) && !/[\\:\0]/.test(relative), 'unsafe-path');
  const parts = relative.split('/'); need(parts.every(p => p && p !== '.' && p !== '..'), 'unsafe-path');
  let current = resolve(root); need(existsSync(current) && lstatSync(current).isDirectory(), 'missing-root');
  // Reject linked ancestors as well as the final root and child components.
  for (let p = current; ; p = dirname(p)) {
    need(!lstatSync(p).isSymbolicLink(), 'symlink');
    if (p === parse(p).root) break;
  }
  for (const p of parts) {
    current = join(current, p);
    try { need(!lstatSync(current).isSymbolicLink(), 'symlink'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; if (mustExist) throw new Error('media:missing-file'); }
  }
  return current;
}
export function validateStatus(s, changes = {}) {
  keys(s, ['schema_version', 'workflow', 'active', 'completed']);
  need(s.schema_version === 1 && s.workflow === 'media', 'state-version');
  for (const k of ['active', 'completed']) need(unique(s[k]) && s[k].every(n => CHANGE.test(n)), 'state-index');
  need(new Set([...s.active, ...s.completed]).size === s.active.length + s.completed.length, 'overlapping-index');
  for (const name of [...s.active, ...s.completed]) {
    const c = changes[name]; keys(c, ['schema_version', 'change', 'status', 'current_work', 'works_run', 'revision', 'blockers', 'updated_at']);
    need(c.schema_version === 1 && c.change === name, 'change-identity');
    need(['active', 'blocked', 'completed', 'cancelled'].includes(c.status), 'change-status');
    need(c.current_work === null || WORKS.includes(c.current_work), 'current-work');
    need(unique(c.works_run) && c.works_run.every(x => WORKS.includes(x)) && unique(c.blockers), 'state-lists');
    need(Number.isInteger(c.revision) && c.revision > 0, 'revision');
    need(text(c.updated_at) && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(c.updated_at) && Number.isFinite(Date.parse(c.updated_at)), 'state-time');
    const terminal = ['completed', 'cancelled'].includes(c.status);
    need(s.completed.includes(name) === terminal && (!terminal || c.current_work === null), 'terminal-index');
    need(c.status !== 'completed' || !c.blockers.length, 'completion-blocked');
    need(c.status !== 'blocked' || c.blockers.length > 0, 'missing-blocker');
  }
  return s;
}
export function validateStateRoot(root) {
  const s = readJSON(localPath(root, 'status.json'));
  need(Array.isArray(s.active) && Array.isArray(s.completed), 'state-index');
  const changes = {};
  for (const name of [...s.active, ...s.completed]) {
    need(typeof name === 'string' && CHANGE.test(name), 'change-name');
    changes[name] = readJSON(localPath(root, `changes/${name}/.status.json`));
  }
  validateStatus(s, changes);
  for (const [name, status] of Object.entries(changes)) {
    if (status.status === 'cancelled') continue;
    const changeRoot = localPath(root, `changes/${name}`);
    if (status.status === 'completed' || status.works_run.length || existsSync(join(changeRoot, 'artifacts.json'))) validateChangeArtifacts(changeRoot, status);
  }
  return s;
}

const SHA256 = /^[a-f0-9]{64}$/;
const sha256 = value => typeof value === 'string' && SHA256.test(value);
const artifactKinds = new Set(['document', 'data', 'report', 'prompt', 'image-request', 'image', 'video-project', 'video-preview', 'video-final', 'local-draft']);
function ownedPath(item) {
  if (item.root === 'media') {
    if (item.owner === 'media/init-setup') return ['context/creator.md', 'context/INDEX.md', 'dependency-report.json'].includes(item.path);
    return item.owner === 'media/retro' && /^context\/(templates|materials)\//.test(item.path);
  }
  if (item.root !== 'change') return false;
  if (item.owner === 'media/init-setup' && item.path.startsWith('context-snapshot/')) return true;
  if (item.owner === 'media/retro' && item.path.startsWith('knowledge-snapshot/')) return true;
  const paths = {
    'media/brief': ['brief.json', 'sources.md', 'claims.json', 'master.md'],
    'media/deconstruct': ['deconstruction.md'],
    'media/retro': ['retro.md', 'next-brief.md'],
    'media/init-setup': ['dependency-report.json'],
  };
  if (paths[item.owner]) return paths[item.owner].includes(item.path);
  const prefix = { 'media/video': 'video/', 'media/hand-drawn': 'visual/', 'media/publish-draft': 'drafts/' }[item.owner];
  return !!prefix && item.path.startsWith(prefix);
}

export function fingerprintArtifact(root, relative) {
  const file = localPath(root, relative), stat = lstatSync(file);
  need(stat.isFile(), 'artifact-not-file');
  const hash = createHash('sha256'), buffer = Buffer.allocUnsafe(1024 * 1024), fd = openSync(file, 'r');
  try { for (let size; (size = readSync(fd, buffer, 0, buffer.length, null)) > 0;) hash.update(buffer.subarray(0, size)); }
  finally { closeSync(fd); }
  return { path: relative, bytes: stat.size, sha256: hash.digest('hex') };
}

function checkImage(root, path, label) {
  const file = localPath(root, path), head = Buffer.alloc(32), fd = openSync(file, 'r');
  let size; try { size = readSync(fd, head, 0, head.length, 0); } finally { closeSync(fd); }
  const png = /\.png$/i.test(path) && size >= 24 && head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && head.readUInt32BE(16) > 0 && head.readUInt32BE(20) > 0;
  const jpeg = /\.jpe?g$/i.test(path) && size >= 3 && head[0] === 255 && head[1] === 216 && head[2] === 255;
  const webp = /\.webp$/i.test(path) && size >= 16 && head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP';
  need(png || jpeg || webp, 'image-format:' + label);
}

function checkEncodedVideo(file, brief, duration, label) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, shell: false });
  need(!probe.error && probe.status === 0, 'video-probe-unavailable-or-failed:' + label);
  const encoded = JSON.parse(probe.stdout), video = encoded.streams?.find(s => s.codec_type === 'video');
  const rate = video?.avg_frame_rate?.match(/^(\d+)\/(\d+)$/), fps = rate && Number(rate[1]) / Number(rate[2]);
  need(video && video.width === brief.width && video.height === brief.height && Number.isFinite(fps) && Math.abs(fps - brief.fps) < 1e-6
    && Math.abs(Number(encoded.format?.duration) - duration) <= 1 / brief.fps + .05, 'video-encoded-mismatch:' + label);
}

function renderInputs(report, reportArtifact, byId, changeRoot) {
  need(object(report.inputs) && ['brief', 'plan', 'html'].every(k => sha256(report.inputs[k])) && object(report.inputs.assets)
    && Object.values(report.inputs.assets).every(sha256) && sha256(report.input_digest) && digest(report.inputs) === report.input_digest, 'video-inputs-required:' + reportArtifact.id);
  const deps = reportArtifact.depends_on.map(d => byId.get(d.id));
  const source = (role, predicate) => {
    const artifact = deps.find(d => d.root === 'change' && d.sha256 === report.inputs[role] && predicate(d));
    need(artifact && artifact.evidence_kind === 'executed', 'video-input-dependency:' + role);
    need(fingerprintArtifact(changeRoot, artifact.path).sha256 === report.inputs[role], 'video-input-drift:' + role);
    return localPath(changeRoot, artifact.path);
  };
  const brief = readJSON(source('brief', d => d.owner === 'media/brief' && d.kind === 'data' && d.path === 'brief.json'));
  const planFile = source('plan', d => d.owner === 'media/video' && d.kind === 'data');
  const plan = readJSON(planFile), sourceRoot = dirname(planFile);
  source('html', d => d.owner === 'media/video' && d.kind === 'video-project');
  validateVideo(brief, plan, sourceRoot);
  const assets = [...new Set([...plan.shots.flatMap(s => s.assets), ...(plan.audio ? [plan.audio] : []), ...(plan.font_files ?? [])])].sort();
  need(JSON.stringify(Object.keys(report.inputs.assets).sort()) === JSON.stringify(assets), 'video-input-assets');
  for (const name of assets) {
    const path = localPath(sourceRoot, name), hash = fingerprintArtifact(sourceRoot, name).sha256;
    need(hash === report.inputs.assets[name], 'video-input-drift:' + name);
    need(deps.some(d => d.root === 'change' && d.sha256 === hash && localPath(changeRoot, d.path) === path), 'video-input-dependency:' + name);
  }
  return { brief, plan };
}

export function validateArtifactManifest(manifest, changeRoot, status) {
  keys(manifest, ['schema_version', 'change', 'artifacts']);
  need(manifest.schema_version === 1 && manifest.change === status.change && basename(changeRoot) === status.change
    && basename(dirname(changeRoot)) === 'changes', 'artifact-change');
  need(Array.isArray(manifest.artifacts) && manifest.artifacts.length <= 1000, 'artifact-list');
  if (status.status === 'completed') need(manifest.artifacts.length > 0, 'completion-without-promises');
  const byId = new Map(), paths = new Set();
  for (const a of manifest.artifacts) {
    keys(a, ['id', 'owner', 'kind', 'root', 'path', 'version', 'sha256', 'evidence_kind', 'depends_on']);
    need(text(a.id) && ID.test(a.id) && !byId.has(a.id), 'artifact-id');
    need(WORKS.includes(a.owner) && artifactKinds.has(a.kind) && text(a.path) && ownedPath(a), 'artifact-owner:' + a.id);
    need(status.status !== 'completed' || a.root !== 'media', 'mutable-shared-artifact-needs-snapshot:' + a.id);
    need(Number.isInteger(a.version) && a.version > 0 && (a.sha256 === null || sha256(a.sha256)), 'artifact-version:' + a.id);
    need(['executed', 'simulated', 'unverified'].includes(a.evidence_kind) && Array.isArray(a.depends_on), 'artifact-evidence:' + a.id);
    const root = a.root === 'change' ? changeRoot : resolve(changeRoot, '../..');
    localPath(root, a.path, false);
    const key = a.root + ':' + a.path;
    need(!paths.has(key), 'artifact-path-owned-twice:' + a.id); paths.add(key); byId.set(a.id, a);
  }
  const done = new Set();
  function visit(id, trail = new Set()) {
    need(!trail.has(id), 'artifact-dependency-cycle:' + id);
    if (done.has(id)) return;
    const a = byId.get(id), seen = new Set();
    for (const dep of a.depends_on) {
      keys(dep, ['id', 'version', 'sha256']);
      need(byId.has(dep.id) && !seen.has(dep.id), 'artifact-dependency:' + id); seen.add(dep.id);
      const source = byId.get(dep.id);
      need(Number.isInteger(dep.version) && dep.version > 0 && (dep.sha256 === null || sha256(dep.sha256)), 'dependency-version:' + id);
      if (a.sha256 !== null) need(dep.version === source.version && dep.sha256 !== null && dep.sha256 === source.sha256, 'dependency-stale:' + id);
      visit(dep.id, new Set([...trail, id]));
    }
    done.add(id);
  }
  for (const id of byId.keys()) visit(id);
  for (const a of manifest.artifacts) {
    const required = status.status === 'completed' || status.works_run.includes(a.owner);
    if (a.sha256 === null) { need(!required, 'artifact-not-produced:' + a.id); continue; }
    const root = a.root === 'change' ? changeRoot : resolve(changeRoot, '../..');
    let observed;
    try { observed = fingerprintArtifact(root, a.path); }
    catch (error) { throw new Error(`media:artifact-missing:${a.id}:${a.owner}: ${error.message}`); }
    need(observed.sha256 === a.sha256, 'artifact-drift:' + a.id + ':' + a.owner);
    if (required) need(a.evidence_kind === 'executed', 'artifact-not-executed:' + a.id);
    if (a.kind === 'image') {
      need(['media/video', 'media/hand-drawn'].includes(a.owner), 'image-owner:' + a.id);
      checkImage(root, a.path, a.id);
    }
    if (['video-preview', 'video-final'].includes(a.kind)) {
      need(a.owner === 'media/video' && /\.(mp4|webm|mov)$/.test(a.path) && observed.bytes > 0, 'video-file:' + a.id);
      const reports = a.depends_on.map(d => byId.get(d.id)).filter(d => d.owner === a.owner && d.kind === 'report' && d.root === a.root && basename(d.path) === 'render-report.json');
      need(reports.length === 1, 'video-report-required:' + a.id);
      const reportArtifact = reports[0];
      const report = readJSON(localPath(root, reportArtifact.path));
      need(report.evidence_kind === 'executed' && report.status === 'rendered-needs-review'
        && report.mode === (a.kind === 'video-final' ? 'final' : 'preview') && report.output_sha256 === a.sha256
        && report.schema_version === 2 && sha256(report.execution_digest) && object(report.execution_identity)
        && digest(report.execution_identity) === report.execution_digest, 'video-report-mismatch:' + a.id);
      let productionInputs;
      if (a.kind === 'video-final') {
        const reviewArtifact = reportArtifact.depends_on.map(d => byId.get(d.id)).find(d => d.owner === a.owner && d.kind === 'report' && d.sha256 === report.review?.sha256);
        need(reviewArtifact && object(report.review) && sha256(report.review.sha256) && sha256(report.review.preview_sha256)
          && sha256(report.input_digest) && report.review.input_digest === report.input_digest && report.review.execution_digest === report.execution_digest, 'final-review-required:' + a.id);
        productionInputs = renderInputs(report, reportArtifact, byId, changeRoot);
        const { brief, plan } = productionInputs;
        const reviewRoot = reviewArtifact.root === 'change' ? changeRoot : resolve(changeRoot, '../..');
        const reviewFile = localPath(reviewRoot, reviewArtifact.path), review = readJSON(reviewFile);
        need(review.preview?.sha256 === report.review.preview_sha256, 'final-review-mismatch:' + a.id);
        validateReviewEvidence(review, brief, plan, report.input_digest, report.execution_digest, dirname(reviewFile));
        for (const item of [review.preview, ...review.stills]) {
          const path = localPath(dirname(reviewFile), item.path), kind = item === review.preview ? 'video-preview' : 'image';
          need(reviewArtifact.depends_on.some(d => {
            const evidence = byId.get(d.id);
            return evidence.root === 'change' && evidence.owner === 'media/video' && evidence.kind === kind && evidence.sha256 === item.sha256
              && localPath(changeRoot, evidence.path) === path;
          }), 'review-evidence-dependency:' + item.path);
        }
      }
      const { brief } = productionInputs ?? renderInputs(report, reportArtifact, byId, changeRoot);
      need(report.width === brief.width && report.height === brief.height && report.fps === brief.fps
        && report.duration_seconds === (a.kind === 'video-final' ? brief.duration_seconds : Math.min(30, brief.duration_seconds)), 'video-spec-mismatch:' + a.id);
      checkEncodedVideo(localPath(root, a.path), brief, report.duration_seconds, a.id);
    }
    if (a.kind === 'local-draft') {
      need(a.owner === 'media/publish-draft' && basename(a.path) === 'package.json', 'draft-package:' + a.id);
      const pkg = readJSON(localPath(root, a.path));
      need(pkg.status === 'local-draft-ready' && pkg.publication_performed === false, 'draft-is-not-published:' + a.id);
      need(Array.isArray(pkg.media_manifest), 'draft-media-manifest:' + a.id);
      const folder = dirname(localPath(root, a.path));
      need(readFileSync(localPath(folder, 'draft.md'), 'utf8') === `# ${pkg.title}\n\n${pkg.body}\n\n---\nLocal draft only. No upload, login or publication was performed.\n`, 'draft-body-drift:' + a.id);
      for (const item of pkg.media_manifest) need(fingerprintArtifact(folder, item.path).sha256 === item.sha256, 'draft-copy-drift:' + a.id);
    }
  }
  for (const work of status.works_run) need(manifest.artifacts.some(a => a.owner === work), 'work-without-owned-artifact:' + work);
  return { valid: true, change: manifest.change, artifacts: manifest.artifacts.length, scope: 'owned file bytes, image signatures, declared dependency versions and completion promises; not human approval, visual quality or general semantic correctness' };
}

export function validateChangeArtifacts(changeRoot, status = readJSON(localPath(changeRoot, '.status.json'))) {
  const terminal = ['completed', 'cancelled'].includes(status.status);
  validateStatus({ schema_version: 1, workflow: 'media', active: terminal ? [] : [status.change], completed: terminal ? [status.change] : [] }, { [status.change]: status });
  return validateArtifactManifest(readJSON(localPath(changeRoot, 'artifacts.json')), changeRoot, status);
}
export function validateEvidence(claims, sources, final = false) {
  need(Array.isArray(claims) && Array.isArray(sources), 'evidence-arrays');
  need(sources.every(s => object(s) && ['id', 'locator', 'evidence'].every(k => text(s[k]))), 'source-incomplete');
  const ids = sources.map(s => s.id); need(new Set(ids).size === ids.length, 'duplicate-source');
  const claimIds = [];
  for (const c of claims) {
    need(object(c) && text(c.id) && text(c.text) && ['fact', 'opinion', 'hypothesis'].includes(c.kind), 'claim-incomplete');
    claimIds.push(c.id);
    need(['verified', 'pending', 'not-applicable'].includes(c.evidence_status) && unique(c.source_ids), 'claim-evidence');
    need(c.source_ids.every(id => ids.includes(id)), 'missing-source');
    if (c.kind === 'fact') {
      need(c.evidence_status !== 'not-applicable', 'fact-needs-evidence');
      if (c.evidence_status === 'verified') need(c.source_ids.length > 0, 'verified-without-source');
      if (final) need(c.evidence_status === 'verified', 'pending-fact');
    }
  }
  need(new Set(claimIds).size === claimIds.length, 'duplicate-claim');
}
export function validateBrief(b, final = false) {
  need(object(b) && b.schema_version === 1, 'brief-version');
  need(['content_id', 'topic', 'conclusion', 'audience'].every(k => text(b[k])), 'missing-input');
  need(ID.test(b.content_id), 'content-id');
  validateVideoFields(b, false);
  const kinds = ['result', 'pain', 'counterintuitive'];
  need(Array.isArray(b.hooks) && b.hooks.every(h => object(h) && text(h.text) && kinds.includes(h.kind)) && kinds.every(k => b.hooks.some(h => h.kind === k)), 'three-hooks');
  validateEvidence(b.claims, b.sources, final); return b;
}
function validateVideoFields(b, required) {
  const present = key => b[key] !== undefined && b[key] !== null;
  for (const key of ['platform', 'style', 'font']) if (required || present(key)) need(text(b[key]), 'missing-video-' + key);
  if (required || present('duration_seconds')) need(Number.isFinite(b.duration_seconds) && b.duration_seconds > 0 && b.duration_seconds <= 600, 'duration');
  for (const k of ['width', 'height']) if (required || present(k)) need(Number.isInteger(b[k]) && b[k] >= 128 && b[k] <= 3840 && b[k] % 2 === 0, 'dimensions');
  if (required || present('fps')) need(Number.isInteger(b.fps) && b.fps >= 1 && b.fps <= 60, 'fps');
  if (required || present('colors')) need(Array.isArray(b.colors) && b.colors.length > 0 && b.colors.every(text), 'colors');
  if (required || present('voice')) need(object(b.voice) && ['silent', 'provided'].includes(b.voice.mode), 'voice');
}
export function validateVideoBrief(b) { validateBrief(b, true); validateVideoFields(b, true); return b; }
export function validateVideo(b, p, root) {
  validateVideoBrief(b); need(object(p) && p.schema_version === 1 && text(p.narration), 'narration-first');
  if (p.font_files !== undefined) {
    need(unique(p.font_files) && p.font_files.length <= 16, 'font-files');
    for (const font of p.font_files) { need(root, 'font-root'); need(lstatSync(localPath(root, font)).isFile(), 'font-file'); }
  }
  need(Array.isArray(p.shots) && p.shots.length > 0 && p.shots.length <= 100, 'shots');
  if (b.voice.mode === 'silent') need(p.audio === null && p.transcript === null, 'silent-no-fake-transcript');
  else {
    need(root && text(p.audio) && lstatSync(localPath(root, p.audio)).isFile(), 'audio-first');
    need(Array.isArray(p.transcript) && p.transcript.length > 0, 'transcript-first');
    let end = 0;
    for (const line of p.transcript) {
      need(object(line) && Number.isFinite(line.start) && Number.isFinite(line.end) && line.start >= end && line.end > line.start && line.end <= b.duration_seconds && text(line.text), 'transcript-timing'); end = line.end;
    }
  }
  let end = 0; const ids = [];
  for (const s of p.shots) {
    need(object(s) && text(s.id) && ID.test(s.id), 'shot-id'); ids.push(s.id);
    need(Number.isFinite(s.start) && Number.isFinite(s.end) && Math.abs(s.start - end) < 1e-6 && s.end > s.start && s.end <= b.duration_seconds + 1e-6, 'shot-timeline');
    need(['message', 'narration', 'caption', 'visual'].every(k => text(s[k])) && unique(s.assets), 'shot-content');
    for (const path of s.assets) need(root && lstatSync(localPath(root, path)).isFile(), 'missing-asset'); end = s.end;
  }
  need(new Set(ids).size === ids.length && Math.abs(end - b.duration_seconds) < 1e-6, 'shot-coverage'); return p;
}
export function validateReview(r, b, p, inputDigest, executionDigest) {
  need(object(r) && r.schema_version === 2 && r.evidence_kind === 'executed' && text(r.reviewer), 'review-not-observed');
  need(sha256(inputDigest) && r.input_digest === inputDigest, 'stale-review');
  need(SHA256.test(executionDigest ?? '') && r.execution_digest === executionDigest, 'stale-execution-review');
  const asset = x => object(x) && text(x.path) && /^[a-f0-9]{64}$/.test(x.sha256 ?? '');
  need(asset(r.preview) && Number.isFinite(r.preview.duration_seconds), 'preview-evidence');
  const d = r.preview.duration_seconds;
  need(b.duration_seconds < 15 ? Math.abs(d - b.duration_seconds) <= 1 / b.fps : d >= 15 && d <= Math.min(30, b.duration_seconds) + 1 / b.fps, 'preview-duration');
  need(object(r.checks) && ['fonts', 'captions', 'aspect', 'rhythm', 'audio_sync', 'determinism'].every(k => r.checks[k] === true), 'review-checks');
  need(object(r.scores) && ['accuracy', 'readability', 'visual_consistency', 'rhythm', 'audio_visual'].every(k => Number.isFinite(r.scores[k]) && r.scores[k] >= 8 && r.scores[k] <= 10), 'review-score');
  need(Array.isArray(r.blockers) && r.blockers.length === 0, 'review-blockers');
  need(Array.isArray(r.stills) && r.stills.length === p.shots.length * 3 && p.shots.every(s => r.stills.filter(f => asset(f) && f.shot_id === s.id && f.accepted === true).length === 3), 'three-stills');
  need(new Set(r.stills.map(s => s.path)).size === r.stills.length, 'duplicate-still'); return r;
}

/** Consume the same review gate at final rendering and at delivery; declarations alone are insufficient. */
export function validateReviewEvidence(r, b, p, inputDigest, executionDigest, root) {
  validateReview(r, b, p, inputDigest, executionDigest);
  need(fingerprintArtifact(root, r.preview.path).sha256 === r.preview.sha256, 'review-preview-drift');
  checkEncodedVideo(localPath(root, r.preview.path), b, r.preview.duration_seconds, 'review-preview');
  for (const item of r.stills) {
    need(fingerprintArtifact(root, item.path).sha256 === item.sha256, 'review-still-drift:' + item.path);
    checkImage(root, item.path, item.path);
  }
  return r;
}
export const styleMenu = () => readJSON(join(workflow, 'media-h-hand-drawn/references/style-catalog.json')).styles;
export function selectStyle(value) {
  need(text(value), 'select-style'); const key = value.trim().toLowerCase();
  const s = styleMenu().find(s => [s.id, s.name, ...s.aliases].some(x => x.toLowerCase() === key)); need(s, 'unknown-style'); return s;
}
export function fingerprintPackage(root) {
  localPath(root, 'STYLES.md'); const rows = []; let total = 0;
  function walk(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      if (['.git', '__pycache__'].includes(name)) continue;
      const file = join(dir, name), stat = lstatSync(file), relative = prefix + name;
      need(!stat.isSymbolicLink(), 'skill-symlink');
      if (stat.isDirectory()) walk(file, relative + '/');
      else { total += stat.size; need(stat.isFile() && stat.size <= 4 * 1024 * 1024 && total <= 32 * 1024 * 1024, 'skill-size'); rows.push([relative, digest(readFileSync(file))]); }
    }
  }
  walk(root); return digest(rows);
}
export function renderPrompt({ skillRoot, reviewedDigest, style, variables = {}, subject, title, text: literal, aspect, python = 'python3' }) {
  const selected = selectStyle(style);
  need(/^[a-f0-9]{64}$/.test(reviewedDigest ?? '') && fingerprintPackage(skillRoot) === reviewedDigest, 'skill-review-required');
  for (const f of ['LICENSE', 'STYLES.md', 'PROTOCOL.md', 'PACKAGE-MANIFEST.json', 'scripts/render_prompt.py', 'scripts/hosted_images.py', 'assets/image-manifest.json']) localPath(skillRoot, f);
  if (selected.id === '20') localPath(skillRoot, 'scripts/validate_style_20_asset.py');
  const version = spawnSync(python, ['-I', '-B', '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], { encoding: 'utf8', timeout: 5000, shell: false });
  const match = version.stdout?.trim().match(/^(\d+)\.(\d+)$/);
  need(version.status === 0 && match && (Number(match[1]) > 3 || Number(match[1]) === 3 && Number(match[2]) >= 10), 'python-3.10-required');
  const args = ['-B', localPath(skillRoot, 'scripts/render_prompt.py'), '--style', selected.id];
  for (const [flag, value] of [['--subject', subject], ['--title', title], ['--text', literal], ['--aspect', aspect]]) if (value !== undefined) { need(text(value), 'empty-prompt-argument'); args.push(`${flag}=${value}`); }
  need(object(variables), 'prompt-variables');
  for (const [k, v] of Object.entries(variables)) { need(/^[\p{L}_][\p{L}\p{N}_]*$/u.test(k) && typeof v === 'string', 'prompt-variable'); args.push('--var', `${k}=${v}`); }
  if (selected.requires_references) args.push('--format', 'json');
  const env = Object.fromEntries(['PATH', 'HOME', 'USERPROFILE', 'SYSTEMROOT', 'TEMP', 'TMP', 'HAND_DRAWN_IMAGE_CACHE'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  Object.assign(env, { HAND_DRAWN_OFFLINE: '1', PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1', PYTHONUTF8: '1' });
  const out = spawnSync(python, args, { cwd: resolve(skillRoot), env, shell: false, timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
  need(out.status === 0 && !out.error && out.stdout?.length > 0, 'prompt-failed-offline');
  need(fingerprintPackage(skillRoot) === reviewedDigest, 'skill-changed'); return out.stdout;
}
export function detectDependencies() {
  const commands = { node: [process.execPath, ['--version']], python: ['python3', ['-I', '-c', 'import sys; print(sys.version.split()[0]); sys.exit(0 if sys.version_info >= (3,10) else 1)']], ffmpeg: ['ffmpeg', ['-version']], ffprobe: ['ffprobe', ['-version']], uv: ['uv', ['--version']], chromium: ['chromium', ['--version']], playwright: ['python3', ['-I', '-c', 'import importlib.util; print("present" if importlib.util.find_spec("playwright") else "missing")']] };
  return Object.fromEntries(Object.entries(commands).map(([k, [exe, args]]) => { const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 5000, maxBuffer: 16384, shell: false }); const detail = (r.stdout || r.stderr || '').trim().split('\n')[0]; return [k, { available: !r.error && r.status === 0 && detail.length > 0 && detail !== 'missing', detail: detail || r.error?.code || 'unavailable' }]; }));
}
export function draftFingerprint(r, sourceRoot) {
  need(object(r) && unique(r.media) && r.media.length <= 50, 'draft-media');
  const { approvals, ...payload } = r;
  const files = r.media.map(f => { need(sourceRoot, 'media-root'); const path = localPath(sourceRoot, f); need(lstatSync(path).isFile() && lstatSync(path).size <= 128 * 1024 * 1024, 'media-file'); return [f, digest(readFileSync(path))]; });
  return digest({ payload, files });
}
export function validateDraft(r, sourceRoot) {
  need(object(r) && r.schema_version === 1 && ID.test(r.content_id ?? '') && Number.isInteger(r.revision) && r.revision > 0, 'draft-identity');
  need(['channel', 'account', 'title', 'body'].every(k => text(r[k])), 'draft-inputs');
  need(r.action === undefined || r.action === 'local-draft', 'external-action-disabled');
  need(['not-authorized', 'external-human-handoff'].includes(r.publication_authorization), 'publication-disabled');
  validateEvidence(r.claims, r.sources, true); const fp = draftFingerprint(r, sourceRoot); need(Array.isArray(r.approvals), 'approvals');
  for (const gate of ['direction', 'platform', 'title', 'final']) {
    const a = r.approvals.filter(a => object(a) && a.gate === gate);
    need(a.length === 1 && a[0].approved === true && text(a[0].by) && text(a[0].at) && Number.isFinite(Date.parse(a[0].at)) && a[0].digest === fp, `approval-${gate}`);
  }
  return fp;
}
export function exportDraft(r, outputRoot, sourceRoot) {
  const fp = validateDraft(r, sourceRoot), name = `${r.content_id}-r${r.revision}-${fp.slice(0, 12)}`;
  const target = localPath(outputRoot, name, false);
  const media = r.media.map((f, i) => ({ source: f, path: `media/${i + 1}-${f.split('/').at(-1)}`, sha256: digest(readFileSync(localPath(sourceRoot, f))) }));
  const md = `# ${r.title}\n\n${r.body}\n\n---\nLocal draft only. No upload, login or publication was performed.\n`;
  const json = JSON.stringify({ ...r, media_manifest: media, input_digest: fp, status: 'local-draft-ready', publication_performed: false, side_effects: [] }, null, 2) + '\n';
  if (existsSync(target)) {
    need(readFileSync(localPath(target, 'draft.md'), 'utf8') === md && readFileSync(localPath(target, 'package.json'), 'utf8') === json, 'draft-drift');
    for (const f of media) need(digest(readFileSync(localPath(target, f.path))) === f.sha256, 'draft-media-drift');
    return { path: target, reused: true, digest: fp, side_effects: [] };
  }
  const lock = localPath(outputRoot, `${name}.lock`, false); mkdirSync(lock);
  const stage = join(outputRoot, `${name}.tmp-${randomUUID()}`);
  try {
    mkdirSync(stage); writeFileSync(join(stage, 'draft.md'), md, { flag: 'wx' }); writeFileSync(join(stage, 'package.json'), json, { flag: 'wx' });
    if (media.length) mkdirSync(join(stage, 'media'));
    for (const f of media) writeFileSync(join(stage, f.path), readFileSync(localPath(sourceRoot, f.source)), { flag: 'wx' });
    need(validateDraft(r, sourceRoot) === fp, 'source-drift');
    for (const f of media) need(digest(readFileSync(join(stage, f.path))) === f.sha256, 'copy-drift');
    need(!existsSync(target), 'concurrent-draft'); renameSync(stage, target);
    return { path: target, reused: false, digest: fp, side_effects: [] };
  } finally { if (existsSync(stage)) rmSync(stage, { recursive: true }); rmSync(lock, { recursive: true }); }
}
export function cli(args) {
  const [command, ...a] = args;
  if (command === 'detect' && !a.length) return detectDependencies();
  if (command === 'style-menu' && !a.length) return styleMenu();
  if (command === 'check-brief' && a.length === 1) { validateBrief(readJSON(a[0])); return { valid: true }; }
  if (command === 'check-video-brief' && a.length === 1) { validateVideoBrief(readJSON(a[0])); return { valid: true }; }
  if (command === 'check-video' && a.length === 3) { validateVideo(readJSON(a[0]), readJSON(a[1]), a[2]); return { valid: true }; }
  if (command === 'check-artifacts' && a.length === 1) return validateChangeArtifacts(resolve(a[0]));
  if (command === 'fingerprint-artifact' && a.length === 2) return fingerprintArtifact(a[0], a[1]);
  if (command === 'fingerprint-skill' && a.length === 1) return { digest: fingerprintPackage(a[0]), approved: false };
  if (command === 'render-prompt' && a.length === 1) { process.stdout.write(renderPrompt(readJSON(a[0]))); return; }
  if (command === 'fingerprint-draft' && a.length >= 1 && a.length <= 2) return { digest: draftFingerprint(readJSON(a[0]), a[1]), approved: false };
  if (command === 'export-draft' && a.length >= 2 && a.length <= 3) return exportDraft(readJSON(a[0]), a[1], a[2]);
  throw new Error('usage: media-tools.mjs detect | style-menu | check-brief FILE | check-video-brief FILE | check-video BRIEF PLAN SOURCE_ROOT | check-artifacts CHANGE_ROOT | fingerprint-artifact ROOT RELATIVE_FILE | fingerprint-skill DIR | render-prompt REQUEST | fingerprint-draft REQUEST [SOURCE_ROOT] | export-draft REQUEST EXISTING_OUTPUT_ROOT [SOURCE_ROOT]');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { const result = cli(process.argv.slice(2)); if (result !== undefined) console.log(JSON.stringify(result, null, 2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
