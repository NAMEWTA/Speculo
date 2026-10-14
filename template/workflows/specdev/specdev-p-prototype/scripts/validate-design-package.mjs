#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { materialize } from './materialize-prototype.mjs';
import { assertSchema, readDesign, safePath, prototypeDigest, validateChangeDesign, DESIGN_LIBRARY } from '../../common/tools/design-artifacts.mjs';

async function localResources(root, locator, seen = new Set()) {
  if (seen.has(locator)) return;
  seen.add(locator);
  if (!/^(?:final|comparison)\//.test(locator)) throw new Error(`prototype runtime resource is outside digest coverage: ${locator}`);
  const file = await safePath(root, locator);
  if (!/\.(?:html|css|js)$/.test(locator)) return;
  const text = await readFile(file, 'utf8');
  // Prototype state is an in-memory mock. Disallow network APIs even when their
  // URL is assembled dynamically; user navigation links remain permitted.
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\s*\(/.test(text)) throw new Error(`prototype must use local mock state, not network APIs: ${locator}`);
  if (/(?:src|poster|srcset)\s*=\s*["'][^"']*(?:https?:)?\/\/|<link\b[^>]*href\s*=\s*["'](?:https?:)?\/\/|(?:@import|url\s*\()[^;\n]*(?:https?:)?\/\//i.test(text)) throw new Error(`remote prototype resource: ${locator}`);
  const refs = [...text.matchAll(/(?:src|href|poster)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)].map(match => match[1] || match[2]);
  const dependencies = [
    ...text.matchAll(/@import\s*["']([^"']+)["']/gi),
    ...text.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?["']([^"']+)["']/g),
    ...text.matchAll(/\b(?:import|Worker|SharedWorker)\s*\(\s*["']([^"']+)["']/g),
  ].map(match => match[1]);
  for (const ref of dependencies) {
    if (/^(?:[a-z]+:|\/\/)/i.test(ref)) throw new Error(`remote or unsupported module resource: ${ref}`);
    refs.push(ref);
  }
  if (/\b(?:import|Worker|SharedWorker)\s*\(\s*[^\s"']/.test(text)) throw new Error(`dynamic module path cannot establish offline closure: ${locator}`);
  for (const match of text.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) for (const item of match[1].split(',')) refs.push(item.trim().split(/\s+/)[0]);
  for (const value of refs) {
    const ref = value.split(/[?#]/)[0];
    if (!ref || /^(?:data:|https?:|mailto:|tel:)/i.test(ref)) continue;
    const target = relative(root, resolve(dirname(file), ref)).replaceAll('\\', '/');
    await localResources(root, target, seen);
  }
}

function substantiveHTML(html, label) {
  if (!/<main\b/i.test(html) || !/<(?:h1|h2)\b/i.test(html) || !/<(?:button|input|select|textarea|a)\b/i.test(html)) throw new Error(`${label}: candidate requires a task surface, heading and operable controls; title-only HTML is insufficient`);
  if (html.replace(/<[^>]*>/g, '').trim().length < 80) throw new Error(`${label}: candidate requires representative task content`);
}

// Reject recoloring the same page as distinct candidates. Human critique still
// decides whether different markup represents a meaningful task alternative.
function structure(html) {
  return (html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '').match(/<\/?(?:main|nav|aside|section|article|header|footer|form|table|thead|tbody|tr|td|ul|ol|li|button|input|select|textarea|a|h[1-6])\b[^>]*>/gi) ?? [])
    .map(tag => tag.replace(/\s[^>]*?(?=\/?>)/, '').toLowerCase()).join('');
}

async function browserEvidence(root, locator, digest, candidates) {
  const evidence = JSON.parse(await readFile(await safePath(root, locator), 'utf8'));
  assertSchema('browserEvidence', evidence);
  if (evidence.prototype_digest !== digest) throw new Error('browser evidence digest is stale');
  for (const required of ['final/index.html', ...candidates.map(c => c.entry)]) if (!evidence.inspected_files.includes(required)) throw new Error(`browser evidence did not inspect ${required}`);
  for (const file of evidence.inspected_files) await safePath(root, file);
  for (const entry of ['final/index.html', ...candidates.map(c => c.entry)]) for (const width of [390, 1440]) if (!evidence.cases.some(c => c.entry === entry && c.width === width)) throw new Error(`browser evidence requires ${entry} at ${width}px viewport`);
  for (const item of evidence.cases) {
    if (!evidence.inspected_files.includes(item.entry)) throw new Error(`browser case refers to uninspected entry: ${item.entry}`);
    const screenshot = await readFile(await safePath(root, item.screenshot));
    if (screenshot.length < 100 || screenshot.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`browser screenshot must be an actual PNG: ${item.screenshot}`);
    if (screenshot.readUInt32BE(16) < item.width || screenshot.readUInt32BE(20) < item.height) throw new Error(`browser screenshot dimensions do not cover recorded viewport: ${item.id}`);
  }
  for (const review of [evidence.design_review, evidence.technical_review]) if ((await readFile(await safePath(root, review), 'utf8')).trim().length < 80) throw new Error('browser/design review must describe actual findings and recheck');
  return evidence;
}

export async function validate(path, options = {}) {
  const { allowDraft = false, checkReady = false, checkPreview = false } = options;
  const designPath = resolve(path), root = dirname(designPath);
  await safePath(dirname(root), `${basename(root)}/${basename(designPath)}`);
  const { meta } = await readDesign(designPath);
  if (meta.schema_version !== 3) throw new Error('legacy design package is read-only; create a new v3 UI package and obtain fresh confirmation');
  assertSchema('designPackage', meta);
  if (meta.design_id !== basename(root) || meta.change !== basename(dirname(dirname(root)))) throw new Error('prototype identity does not match owning change/UI directory');
  const count = meta.candidates.length;
  if (meta.candidate_count_override ? count !== meta.candidate_count_override.count : count < 2 || count > 4) throw new Error('candidate count requires 2-4 candidates or the exact explicit user override');
  const ids = meta.candidates.map(c => c.id);
  if (new Set(ids).size !== count) throw new Error('duplicate candidate id');
  if (new Set(meta.candidates.map(c => c.task_id)).size !== 1) throw new Error('candidates must use the same user task');
  if (new Set(meta.candidates.map(c => c.structural_difference)).size !== count) throw new Error('candidates need distinct structural decisions');
  const catalog = JSON.parse(await readFile(join(DESIGN_LIBRARY, 'catalog.json'), 'utf8'));
  assertSchema('designCatalog', catalog);
  const templates = new Set(catalog.templates.map(t => t.id));
  const references = new Set([...catalog.references.map(r => r.id), ...meta.sources.map(s => s.id)]);
  for (const candidate of meta.candidates) {
    if (!templates.has(candidate.template_id) && !meta.sources.some(s => s.id === candidate.template_id)) throw new Error(`unknown template ${candidate.template_id}`);
    if (!references.has(candidate.primary_reference)) throw new Error(`unknown visual reference ${candidate.primary_reference}`);
    if (candidate.auxiliaries.length > 2 || candidate.auxiliaries.some(a => !references.has(a.reference_id))) throw new Error('composition needs at most two known auxiliary references with explicit dimensions');
    if (new Set([candidate.primary_reference, ...candidate.auxiliaries.map(a => a.reference_id)]).size !== candidate.auxiliaries.length + 1) throw new Error('composition references must have distinct roles, without repeated primary/auxiliary references');
  }
  if (!checkReady && !checkPreview && (meta.status !== 'ready' || allowDraft)) return meta;
  if (!ids.includes(meta.selected_candidate)) throw new Error('ready prototype requires selected_candidate');
  await materialize(designPath, { check: true });
  const index = await readFile(await safePath(root, 'comparison/index.html'), 'utf8');
  await localResources(root, 'comparison/index.html');
  const structures = new Set();
  for (const candidate of meta.candidates) {
    if (!candidate.entry.startsWith('comparison/variants/')) throw new Error('candidate entry must belong to comparison/variants');
    const file = await safePath(root, candidate.entry);
    if (!index.includes(candidate.entry.slice('comparison/'.length))) throw new Error(`comparison does not link candidate ${candidate.id}`);
    const html = await readFile(file, 'utf8');
    substantiveHTML(html, candidate.id);
    const outline = structure(html);
    if (structures.has(outline)) throw new Error('candidates repeat the same task structure; recoloring alone is insufficient');
    structures.add(outline);
    await localResources(root, candidate.entry);
  }
  substantiveHTML(await readFile(await safePath(root, 'final/index.html'), 'utf8'), 'final');
  await localResources(root, 'final/index.html');
  for (const file of meta.prototype_files) await safePath(root, file);
  const digest = await prototypeDigest(designPath);
  const change = await validateChangeDesign(join(dirname(dirname(root)), 'DESIGN.md'), { ...options, requireApproved: !checkPreview });
  if (change.meta.prototype_ref.id !== meta.design_id || change.meta.prototype_ref.digest !== digest || change.meta.selection.candidate_id !== meta.selected_candidate) throw new Error('change DESIGN does not approve this prototype/selection digest');
  if (!meta.browser_evidence) throw new Error('ready prototype requires browser evidence');
  const evidence = await browserEvidence(root, meta.browser_evidence, digest, meta.candidates);
  for (const page of change.meta.pages) for (const state of page.states) if (!evidence.cases.some(c => c.entry.startsWith('final/') && c.states.includes(`${page.id}:${state}`))) throw new Error(`browser evidence missing final page state ${page.id}:${state}`);
  return meta;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2), paths = [], options = {};
  for (let i=0;i<args.length;i++) {
    const arg=args[i], field={'--repo':'repoRoot','--method-root':'methodRoot','--state-root':'stateRoot','--snapshot-specdev':'snapshotSpecdev'}[arg];
    if (field) { if (!args[i+1] || args[i+1].startsWith('--') || field in options) throw new Error('invalid design context'); options[field]=args[++i]; }
    else if (arg === '--allow-draft') options.allowDraft=true;
    else if (arg === '--check-ready') options.checkReady=true;
    else if (arg === '--check-preview') options.checkPreview=true;
    else paths.push(arg);
  }
  if (paths.length !== 1) { console.error('usage: validate-design-package.mjs [--allow-draft|--check-ready|--check-preview] [--repo project --method-root method --state-root specdev] <design-system.md>'); process.exitCode = 2; }
  else validate(paths[0], options).then(() => console.log('design package: valid (browser evidence is recorded, not a host certification)')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
