#!/usr/bin/env node
/** Read-only checks. Approval records document authority; they cannot grant it. */
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertChangeName, markdownBodyLines, parseFrontmatter, readUtf8ArtifactSync,
  resolveChangeSync, resolveWorkContextSync, safeWorkPathSync, validateSkill,
} from '../../../../lib/speculo-runtime.mjs';
import { checkSchema } from './delivery-artifacts.mjs';

const schemaRoot = fileURLToPath(new URL('../schemas/', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
const requireThat = (condition, message) => { if (!condition) fail(message); };
const portable = path => path.split(sep).join('/');
const unique = (values, label) => requireThat(new Set(values).size === values.length, `${label}: duplicate entry`);
const file = (root, path) => safeWorkPathSync(root, path, { mustExist: true, type: 'file' });
const digestFile = path => hash(readFileSync(path));

function schema(value, name) {
  const errors = [];
  checkSchema(value, JSON.parse(readFileSync(join(schemaRoot, `${name}.schema.json`), 'utf8')), name, errors);
  requireThat(!errors.length, errors.join('\n'));
  return value;
}
function json(root, path, name) {
  return schema(JSON.parse(readUtf8ArtifactSync(file(root, path))), name);
}
function headings(body, names) {
  const lines = markdownBodyLines(body, 'retro record');
  for (const name of names) {
    const found = lines.filter(line => line.text === `## ${name}`);
    requireThat(found.length === 1, `expected one ${name} section`);
    const end = lines.find(line => line.line > found[0].line && /^#{1,2} /.test(line.text))?.line;
    requireThat(body.split(/\r?\n/).slice(found[0].line, end ? end - 1 : undefined).join('\n').trim(), `empty ${name} section`);
  }
}
function object(context, id, kind) {
  assertChangeName(id);
  const active = safeWorkPathSync(context.specdevRoot, `retro/${id}`, { type: 'directory' });
  const archived = safeWorkPathSync(context.specdevRoot, `retro/archive/${id}`, { type: 'directory' });
  const present = [active, archived].filter(existsSync);
  requireThat(present.length === 1, `${id}: missing or duplicate retro identity`);
  const root = present[0], filename = kind === 'report' ? 'RETRO.md' : 'PLAN.md';
  requireThat(!existsSync(join(root, kind === 'report' ? 'PLAN.md' : 'RETRO.md')), `${id}: conflicting object kinds`);
  const path = file(root, filename), { fields: meta, body } = parseFrontmatter(readUtf8ArtifactSync(path));
  schema(meta, kind === 'report' ? 'retrospective' : 'retro-upgrade');
  requireThat(meta.id === id, `${id}: record identity mismatch`);
  headings(body, kind === 'report' ? ['Scope', 'Evidence', 'Findings', 'Acceptance', 'Routes'] : ['Scope', 'Decisions', 'Changes', 'Validation', 'Archive']);
  return { id, root, path, meta, body, archived: root === archived, sha256: digestFile(path) };
}
function snapshot(root, entry, prefix) {
  requireThat(entry.snapshot.startsWith(`${prefix}/`), `${entry.snapshot}: snapshot must be under ${prefix}/`);
  const path = file(root, entry.snapshot);
  requireThat(digestFile(path) === entry.sha256, `${entry.snapshot}: snapshot digest drift`);
  requireThat(readUtf8ArtifactSync(path).includes(entry.quote), `${entry.snapshot}: quote is not verbatim in snapshot`);
}
function report(context, id, warnings) {
  const record = object(context, id, 'report'), { meta, root } = record;
  unique(meta.sources.map(s => s.id), 'sources');
  unique(meta.sessions.map(s => s.id), 'session references');
  unique(meta.sessions.filter(s => s.session_id).map(s => `${s.host}:${s.session_id}`), 'session identities');
  const sessions = new Map(meta.sessions.map(s => [s.id, s]));
  for (const session of meta.sessions) {
    if (session.availability === 'available') requireThat(session.session_id?.trim() && session.locator?.trim(), `${session.id}: available session requires identity and locator`);
    if (session.locator !== null) {
      requireThat(!/[\x00-\x1f]/.test(session.locator), `${session.id}: unsafe session locator`);
      if (session.host === 'codex') requireThat(/^(?:sessions|archived_sessions)\/(?:[^/\\:]+\/)*[^/\\:]+\.jsonl$/.test(session.locator) && !session.locator.split('/').some(p => p === '.' || p === '..'), `${session.id}: expected host-relative Codex JSONL locator`);
    }
    if (session.availability !== 'available') warnings.push(`${session.id}: original session ${session.availability}; captured evidence only`);
    requireThat(Date.parse(session.captured_until) <= Date.parse(meta.updated_at), `${session.id}: capture cutoff is after report time`);
  }
  unique(meta.findings.map(f => f.id), 'findings');
  requireThat(meta.sources.length || meta.outcome === 'insufficient-evidence', `${id}: evidence is required`);
  requireThat((meta.outcome === 'findings') === (meta.findings.length > 0), `${id}: outcome/findings mismatch`);
  const sourceIds = new Set(meta.sources.map(s => s.id));
  for (const source of meta.sources) {
    snapshot(root, source, 'sources');
    if (source.session_ref !== undefined || source.kind === 'session') {
      const session = sessions.get(source.session_ref);
      requireThat(session?.session_id?.trim(), `${source.id}: missing actual session reference`);
      requireThat(source.anchor && source.anchor.start_line >= 1 && source.anchor.end_line >= source.anchor.start_line, `${source.id}: invalid session anchor`);
      requireThat(Date.parse(source.anchor.timestamp) <= Date.parse(session.captured_until), `${source.id}: evidence is after capture cutoff`);
      if (source.kind === 'session') requireThat(source.locator === `session:${session.host}:${session.session_id}`, `${source.id}: session locator/identity mismatch`);
    } else requireThat(source.anchor === undefined, `${source.id}: anchor requires session reference`);
    const visibleQuote = record.body.replace(/^> ?/gm, '');
    requireThat(visibleQuote.includes(source.quote) && record.body.includes(source.id), `${source.id}: body must display the original quote and source ID`);
    if (source.change !== null) requireThat(record.body.includes(source.change), `${source.id}: body must identify its source change`);
    requireThat(!/[\x00-\x1f]/.test(source.locator), `${source.id}: unsafe source locator`);
    if (source.kind === 'change') {
      requireThat(source.change !== null, `${source.id}: missing source change`);
      // A snapshot preserves historical bytes; current originals may legitimately evolve.
      const location = resolveChangeSync(context, source.change, { includeArchived: true });
      const original = safeWorkPathSync(location.root, source.locator.split('#')[0], { type: 'file' });
      if (!existsSync(original)) warnings.push(`${source.id}: original unavailable; only captured evidence was checked`);
    } else if (source.kind === 'project') {
      const original = safeWorkPathSync(context.projectRoot, source.locator.split('#')[0], { type: 'file' });
      if (!existsSync(original)) warnings.push(`${source.id}: original unavailable; recheck current project facts before adoption`);
    } else {
      requireThat(source.locator.startsWith('session:'), `${source.id}: expected actual session locator`);
      warnings.push(`${source.id}: session provenance requires observation; snapshot integrity alone is not proof`);
    }
    if (source.change !== null) assertChangeName(source.change);
  }
  for (const finding of meta.findings) {
    requireThat(finding.evidence.every(id => sourceIds.has(id)), `${finding.id}: unknown evidence`);
    headings(record.body, [finding.id]);
  }
  return record;
}
function owners(context, record) {
  const projected = new Set();
  const projection = safeWorkPathSync(context.stateRoot, 'projections.json', { type: 'file' });
  if (existsSync(projection)) {
    const value = JSON.parse(readUtf8ArtifactSync(projection));
    const businessId = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
    requireThat(value?.schema_version === 3 && typeof value.package_version === 'string' && Array.isArray(value.files) && Array.isArray(value.targets) && value.targets.every(h => ['agents', 'claude'].includes(h)) && Array.isArray(value.asset_ids) && value.asset_ids.every(id => typeof id === 'string' && businessId.test(id)) && (value.targets.length || !value.asset_ids.length), 'invalid Speculo projection manifest');
    unique(value.targets, 'projection hosts'); unique(value.asset_ids, 'projection assets');
    unique(value.files.map(f => f?.path), 'projection paths');
    for (const entry of value.files) {
      requireThat(entry && typeof entry.path === 'string' && /^\.(?:agents|claude)\/skills\/[a-z0-9-]+\/(?:SKILL\.md|agents\/openai\.yaml)$/.test(entry.path) && typeof entry.asset_id === 'string' && businessId.test(entry.asset_id) && typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256), 'invalid projection record');
      projected.add(entry.path.split('/').slice(0, 3).join('/'));
    }
  }
  return { projected };
}

function targetRoot(context, change) {
  return change.root === 'state' ? context.stateRoot : context.projectRoot;
}
function candidateLinks(context, record, change, candidates) {
  if (!change.path.endsWith('.md')) return;
  const text = readUtf8ArtifactSync(file(record.root, change.candidate));
  for (const match of text.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link)) continue;
    const part = decodeURIComponent(link.split('#')[0]);
    requireThat(part && !part.startsWith('/') && !part.includes('\\'), `${change.path}: invalid local link ${link}`);
    const base = targetRoot(context, change);
    const target = portable(relative(base, resolve(base, dirname(change.path), part)));
    safeWorkPathSync(base, target);
    requireThat((candidates.has(target) && candidates.get(target).root === change.root) || existsSync(safeWorkPathSync(base, target)), `${change.path}: broken local link ${link}`);
  }
}
function readExecution(record, targets) {
  const receipt = json(record.root, 'execution.json', 'retro-execution');
  requireThat(receipt.plan_sha256 === record.sha256 && receipt.approval_sha256 === record.approvalHash, 'execution is not bound to approved plan');
  unique(receipt.results.map(r => r.path), 'execution targets');
  requireThat(receipt.results.every(r => targets.has(r.path)), 'execution target set mismatch');
  return receipt;
}
function passedResult(record, result, change) {
  requireThat(result?.owner === change.owner, `${change.path}: execution owner mismatch`);
  requireThat(result?.result === 'passed' && result.sha256 === change.after_sha256, `${change.path}: unverified upgrade`);
  requireThat(result.evidence.startsWith('evidence/'), `${change.path}: evidence must be under evidence/`);
  requireThat(digestFile(file(record.root, result.evidence)) === result.evidence_sha256, `${change.path}: verification evidence drift`);
  requireThat(result.command === null ? result.exit === null : result.exit === 0, `${change.path}: verification command failed`);
}
function upgrade(context, id, warnings, { live = true, execution = false, approved = false } = {}) {
  const record = object(context, id, 'upgrade'), { meta, root } = record;
  unique(meta.inputs.map(i => i.report), 'input reports');
  unique(meta.changes.map(c => c.path), 'change targets');
  unique(meta.decisions.map(d => `${d.report}/${d.finding}`), 'decisions');
  const reports = new Map();
  for (const input of meta.inputs) {
    const source = report(context, input.report, warnings);
    requireThat(source.meta.status === 'completed', `${input.report}: incomplete report`);
    requireThat(source.sha256 === input.sha256, `${input.report}: input report digest drift`);
    requireThat(execution || approved || !source.archived, `${input.report}: new plans use unarchived reports`);
    reports.set(input.report, source);
  }
  const targets = new Set(meta.changes.map(c => c.path));
  for (const decision of meta.decisions) {
    requireThat(reports.get(decision.report)?.meta.findings.some(f => f.id === decision.finding), `${decision.report}/${decision.finding}: unknown finding`);
    requireThat(decision.disposition === 'adopt' ? decision.targets.length > 0 && decision.targets.every(p => targets.has(p)) : decision.targets.length === 0, `${decision.finding}: invalid disposition targets`);
  }
  for (const source of reports.values()) for (const finding of source.meta.findings) {
    requireThat(meta.decisions.some(d => d.report === source.id && d.finding === finding.id), `${source.id}/${finding.id}: missing disposition`);
  }
  for (const id of meta.archive_reports) {
    requireThat(reports.has(id), `${id}: archive report not in frozen inputs`);
    requireThat(!meta.decisions.some(d => d.report === id && d.disposition === 'defer'), `${id}: deferred findings cannot be archived`);
  }
  if (approved || execution) {
    const approval = json(root, 'approval.json', 'retro-approval');
    snapshot(root, approval, 'approval');
    requireThat(approval.plan_sha256 === record.sha256, 'approved plan digest drift');
    record.approval = approval;
    record.approvalHash = digestFile(file(root, 'approval.json'));
  }
  const previous = approved && existsSync(join(root, 'execution.json')) ? readExecution(record, targets) : null;
  const ownership = live ? owners(context, record) : null;
  const candidates = new Map(meta.changes.map(c => [c.path, c]));
  for (const change of meta.changes) {
    requireThat(meta.decisions.some(d => d.disposition === 'adopt' && d.targets.includes(change.path)), `${change.path}: target has no adopted finding`);
    const skillTarget = change.target_kind === 'skill';
    if (skillTarget) requireThat(change.root === 'project' && change.owner === 'project' && /^\.agents\/skills\/[a-z0-9]+(?:-[a-z0-9]+)*\/.+/.test(change.path), `${change.path}: target must be a project Skill file`);
    else requireThat(change.root === 'state' && change.owner === 'specdev/archive-and-consolidate' && new RegExp(`^specdev/${change.target_kind}/[a-zA-Z0-9][a-zA-Z0-9._-]*\\.md$`).test(change.path), `${change.path}: knowledge target/owner mismatch`);
    const target = live ? safeWorkPathSync(targetRoot(context, change), change.path, { type: 'file' }) : null;
    requireThat(change.candidate.startsWith('candidates/'), `${change.path}: candidate must be under candidates/`);
    const candidate = file(root, change.candidate);
    requireThat(digestFile(candidate) === change.after_sha256, `${change.path}: candidate digest drift`);
    requireThat((change.action === 'create') === (change.before_sha256 === null), `${change.path}: create/before mismatch`);
    if (change.action === 'retain') requireThat(change.before_sha256 === change.after_sha256, `${change.path}: retain must not change bytes`);
    if (change.action === 'update') requireThat(change.before_sha256 !== change.after_sha256, `${change.path}: unchanged target should be retain`);
    if (live) {
      const skill = change.path.split('/').slice(0, 3).join('/');
      if (skillTarget) requireThat(!ownership.projected.has(skill), `${skill}: managed Speculo projection; edit its source through its owner`);
      const current = existsSync(target) ? digestFile(target) : null;
      if (approved && current === change.after_sha256 && current !== change.before_sha256) {
        requireThat(previous, `${change.path}: landed target requires original execution evidence before resuming`);
        passedResult(record, previous.results.find(r => r.path === change.path), change);
      } else requireThat(current === (execution ? change.after_sha256 : change.before_sha256), `${change.path}: target digest drift`);
      candidateLinks(context, record, change, candidates);
    }
    if (skillTarget && basename(change.path) === 'SKILL.md') {
      // Existing host-specific extensions remain owned by the project; never strip them to pass a check.
      const prior = live && existsSync(target) ? parseFrontmatter(readFileSync(target)).fields : {};
      const fields = parseFrontmatter(readFileSync(candidate)).fields;
      const errors = validateSkill(readFileSync(candidate), dirname(change.path)).filter(error => {
        if (!error.startsWith('unsupported top-level field: ')) return true;
        const key = error.slice('unsupported top-level field: '.length);
        return live && JSON.stringify(prior[key]) !== JSON.stringify(fields[key]);
      });
      requireThat(!errors.length, `${change.path}: ${errors.join('; ')}`);
    }
    if (!skillTarget) {
      const content = readUtf8ArtifactSync(candidate);
      for (const decision of meta.decisions.filter(d => d.targets.includes(change.path))) requireThat(content.includes(decision.report) && content.includes(decision.finding), `${change.path}: knowledge candidate must preserve report/finding provenance`);
    }
    const skillRoot = change.path.split('/').slice(0, 3).join('/');
    if (live && skillTarget) requireThat(candidates.has(`${skillRoot}/SKILL.md`) || existsSync(safeWorkPathSync(context.projectRoot, `${skillRoot}/SKILL.md`, { type: 'file' })), `${skillRoot}: missing Skill entry`);
  }
  if (execution) {
    const receipt = readExecution(record, targets);
    requireThat(receipt.status === 'verified', 'upgrade execution is not verified');
    requireThat(receipt.results.length === targets.size, 'execution target set mismatch');
    for (const result of receipt.results) {
      passedResult(record, result, candidates.get(result.path));
    }
    record.execution = receipt;
  }
  return record;
}

/** Snapshot without following symlinks. The sole mutable move receipt is excluded. */
export function retroInventory(root) {
  const entries = [];
  function walk(directory, prefix = '') {
    for (const name of readdirSync(directory).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (path === 'archive.json') continue;
      const full = join(directory, name), stat = lstatSync(full), entry = { path, mode: stat.mode & 0o7777 };
      if (stat.isSymbolicLink()) entries.push({ ...entry, type: 'symlink', target: readlinkSync(full) });
      else if (stat.isDirectory()) { entries.push({ ...entry, type: 'directory' }); walk(full, path); }
      else { requireThat(stat.isFile(), `${path}: unsupported archive entry`); entries.push({ ...entry, type: 'file', sha256: digestFile(full) }); }
    }
  }
  walk(root);
  return entries;
}
function archive(context, record, plan, sealed) {
  requireThat(record.archived, `${record.id}: not in retro/archive`);
  const receipt = json(record.root, 'archive.json', 'retro-archive');
  requireThat(receipt.id === record.id && receipt.owner === record.meta.owner && receipt.upgrade === plan.id, 'archive identity/owner mismatch');
  requireThat(receipt.source === `retro/${record.id}` && receipt.target === `retro/archive/${record.id}`, 'archive source/target mismatch');
  requireThat(receipt.plan_sha256 === plan.sha256 && receipt.approval_sha256 === plan.approvalHash, 'archive approval mismatch');
  if (sealed) requireThat(receipt.result === 'verified', 'archive has not been sealed');
  unique(receipt.entries.map(e => e.path), 'archive inventory');
  const actual = new Map(retroInventory(record.root).map(e => [e.path, e]));
  requireThat(actual.size === receipt.entries.length, 'archive inventory coverage mismatch');
  for (const entry of receipt.entries) {
    const observed = actual.get(entry.path);
    requireThat(observed && entry.type === observed.type && entry.mode === observed.mode && entry.sha256 === observed.sha256 && entry.target === observed.target, `${entry.path}: archive integrity drift`);
  }
}
export function sourceEventKey(report, source) {
  const session = report.sessions.find(s => s.id === source.session_ref);
  if (!session || !source.anchor) return `${source.kind}:${source.change ?? ''}:${source.locator}:${source.sha256}`;
  const anchor = source.anchor.event_id || `${source.anchor.timestamp}:${source.anchor.start_line}-${source.anchor.end_line}`;
  return `session:${session.host}:${session.session_id}:${anchor}`;
}
export function listRetroReports(input) {
  const context = resolveWorkContextSync(input), root = safeWorkPathSync(context.specdevRoot, 'retro', { type: 'directory' });
  const result = { reports: [], issues: [] };
  if (!existsSync(root)) return result;
  for (const name of readdirSync(root).filter(name => name !== 'archive').sort()) {
    try {
      const path = safeWorkPathSync(root, name, { mustExist: true, type: 'directory' });
      if (!existsSync(join(path, 'RETRO.md'))) continue;
      object(context, name, 'report');
      result.reports.push(name);
    } catch (error) { result.issues.push({ id: name, error: String(error.message ?? error) }); }
  }
  return result;
}
export function validateRetro(input) {
  const errors = [], warnings = [];
  try {
    const context = resolveWorkContextSync(input), stage = input.stage ?? 'record';
    requireThat(['report', 'upgrade'].includes(input.kind), 'expected report or upgrade kind');
    requireThat(['record', 'apply', 'verified', 'archive-ready', 'archived'].includes(stage), 'invalid retro stage');
    requireThat(!input.sealed || stage === 'archived', '--sealed requires archived stage');
    requireThat(input.kind === 'upgrade' || !['apply', 'verified'].includes(stage), 'apply/verified stages require upgrade');
    const historical = stage === 'archived';
    const record = input.kind === 'report' ? report(context, input.id, warnings) : upgrade(context, input.id, warnings, { live: !historical, approved: stage === 'apply', execution: ['verified', 'archive-ready', 'archived'].includes(stage) });
    requireThat(historical === record.archived, historical ? 'object has not moved' : 'archived objects are read-only; use archived validation');
    if (stage === 'archive-ready' || historical) {
      const plan = input.kind === 'upgrade' ? record : upgrade(context, input.upgrade, warnings, { live: !historical, execution: true });
      if (input.kind === 'report') requireThat(plan.meta.archive_reports.includes(input.id), `${input.id}: not approved for archive`);
      if (input.kind === 'upgrade') for (const id of plan.meta.archive_reports) {
        const source = report(context, id, warnings);
        requireThat(source.archived, `${id}: report must be sealed before archiving its upgrade`);
        archive(context, source, plan, true);
      }
      if (historical) archive(context, record, plan, Boolean(input.sealed));
    }
  } catch (error) { errors.push(String(error.message ?? error)); }
  return { errors, warnings: [...new Set(warnings)], caveat: 'Read-only integrity checks do not authenticate approval, provenance, semantic quality or host invocation.' };
}
export function retroCLI(argv) {
  const options = {}, names = { '--repo': 'projectRoot', '--method-root': 'methodRoot', '--state-root': 'stateRoot', '--stage': 'stage', '--upgrade-plan': 'upgrade' };
  if (argv.includes('--help')) {
    console.log('Usage: node validate-retro.mjs (--list | --report <id> | --upgrade <id>) --repo <project> [--method-root <methods> --state-root <data-parent>] [--stage record|apply|verified|archive-ready|archived] [--upgrade-plan <id>] [--sealed]\nDefault record checks are read-only. Direct use requires all three roots. Example: --report 2026-10-15-ci --repo . --method-root ./template --state-root ./data');
    return 0;
  }
  try {
    let mode;
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (['--list', '--report', '--upgrade'].includes(arg)) {
        requireThat(!mode, 'choose exactly one mode'); mode = arg;
        if (arg !== '--list') { options.kind = arg.slice(2); options.id = argv[++i]; requireThat(options.id && !options.id.startsWith('--'), 'missing object ID'); }
      } else if (arg === '--sealed') { requireThat(!options.sealed, 'duplicate --sealed'); options.sealed = true; }
      else {
        const key = names[arg]; requireThat(key && !(key in options), `invalid or duplicate option: ${arg}`);
        const value = argv[++i]; requireThat(value && !value.startsWith('--'), `missing value: ${arg}`); options[key] = value;
      }
    }
    requireThat(mode, 'choose --list, --report or --upgrade');
    if (mode === '--list') {
      requireThat(!options.stage && !options.upgrade && !options.sealed, 'list does not accept validation stage options');
      const result = listRetroReports(options);
      console.log(JSON.stringify(result, null, 2)); return result.issues.length ? 1 : 0;
    }
    requireThat(!options.upgrade || options.kind === 'report' && ['archive-ready', 'archived'].includes(options.stage), '--upgrade-plan is for report archive validation');
    const result = validateRetro(options); console.log(JSON.stringify(result, null, 2)); return result.errors.length ? 1 : 0;
  } catch (error) { console.error(String(error.message ?? error)); return 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = retroCLI(process.argv.slice(2));
