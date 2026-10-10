#!/usr/bin/env node
/** Read-only structure/reference gate. It does not certify learning, truth or test authenticity. */
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const problemId = /^P-\d{3,}$/;
const explorationId = /^EX-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const statuses = new Set(['open', 'exploring', 'resolved', 'needs_evidence', 'deferred']);
const evidenceStates = new Set(['unverified', 'supported', 'tested']);
const scope = 'structure, graph and supplied references only; not teaching quality, mastery or test authenticity';

export function safeRelative(value) {
  return text(value) && !isAbsolute(value) && !/^[A-Za-z]:/.test(value) &&
    !/[\\\x00-\x1f\x7f]/.test(value) && !value.split('/').some((p) => !p || p === '.' || p === '..');
}
function artifactPath(value) {
  return safeRelative(value) && /^inquiry\/(?:IQ-\d{3,}-[a-z0-9-]+|explorations\/EX-\d{3,}-[a-z0-9-]+)\.md$/.test(value);
}

export function validateQuestionMap(map) {
  const errors = [];
  if (!object(map) || map.schema_version !== 1 || !Array.isArray(map.questions)) {
    return { valid: false, errors: ['question map requires schema_version=1 and questions array'], scope };
  }
  const byId = new Map();
  for (const q of map.questions) {
    if (!object(q)) { errors.push('question must be an object'); continue; }
    const label = text(q.id) ? q.id : 'question';
    if (!problemId.test(q.id ?? '') || byId.has(q.id)) errors.push(`${label}: invalid or duplicate id`);
    else byId.set(q.id, q);
    if (!(q.parent_id === null || (typeof q.parent_id === 'string' && problemId.test(q.parent_id)))) errors.push(`${label}: invalid parent_id`);
    if (!new Set(['user', 'answer', 'material', 'inference']).has(q.origin)) errors.push(`${label}: invalid origin`);
    for (const key of ['trigger', 'dimension', 'why_it_matters', 'verification']) if (!text(q[key])) errors.push(`${label}: ${key} is required`);
    if (typeof q.conclusion !== 'string') errors.push(`${label}: conclusion must be a string`);
    if (!new Set(['potential', 'observed']).has(q.gap_kind)) errors.push(`${label}: invalid gap_kind`);
    if (!statuses.has(q.status)) errors.push(`${label}: invalid problem status (not mastery)`);
    if (!evidenceStates.has(q.evidence_status)) errors.push(`${label}: invalid evidence_status`);
    if (!Array.isArray(q.evidence) || q.evidence.some((e) => !text(e))) errors.push(`${label}: evidence must be an array of locators`);
    const hasEvidence = Array.isArray(q.evidence) && q.evidence.some(text);
    if ((q.gap_kind === 'observed' || q.evidence_status === 'supported' || q.evidence_status === 'tested') && !hasEvidence) errors.push(`${label}: evidence locators are required`);
    if (q.status === 'resolved' && (!text(q.conclusion) || q.evidence_status === 'unverified')) errors.push(`${label}: unresolved evidence cannot be marked resolved`);
    if (!artifactPath(q.artifact)) errors.push(`${label}: artifact must be an owned inquiry path`);
    if (q.revisit_reason !== undefined && !text(q.revisit_reason)) errors.push(`${label}: revisit_reason cannot be empty`);
    if (q.evidence_status === 'tested' && !(safeRelative(q.test_evidence) && q.test_evidence.startsWith('inquiry/evidence/'))) errors.push(`${label}: tested requires an inquiry/evidence/ record`);
    if (q.test_evidence !== undefined && !(safeRelative(q.test_evidence) && q.test_evidence.startsWith('inquiry/evidence/'))) errors.push(`${label}: unsafe test_evidence`);
    if (['mastered', 'mastery', 'retention_verified', 'verdict', 'Response', 'Submission'].some((key) => key in q)) errors.push(`${label}: learner assessment fields are not allowed`);
  }
  for (const [id, q] of byId) if (q.parent_id !== null && !byId.has(q.parent_id)) errors.push(`${id}: parent is missing`);
  // Iterative traversal avoids recursion/stack limits for long, valid histories.
  const visited = new Set();
  for (const id of byId.keys()) {
    const chain = new Set(); let current = id;
    while (current !== null && byId.has(current) && !visited.has(current)) {
      if (chain.has(current)) { errors.push(`${id}: parent cycle`); break; }
      chain.add(current); current = byId.get(current).parent_id;
    }
    for (const item of chain) visited.add(item);
  }
  return { valid: errors.length === 0, errors, scope };
}

function visible(markdown) {
  let fence = null;
  return markdown.replace(/<!--[\s\S]*?(?:-->|$)/g, '').split(/\r?\n/).map((line) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (!fence && marker) { fence = marker; return ''; }
    if (fence) { if (/^\s*(`{3,}|~{3,})[ \t]*$/.test(line) && marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null; return ''; }
    return line;
  }).join('\n');
}

export function validateExploration(markdown, map, { artifact, expectedCount } = {}) {
  const result = validateQuestionMap(map), errors = [...result.errors];
  const fail = (message) => { errors.push(message); };
  if (typeof markdown !== 'string') return { valid: false, errors: [...errors, 'exploration must be Markdown text'], scope };
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) return { valid: false, errors: [...errors, 'exploration frontmatter is required'], scope };
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const field = /^([a-z][a-z0-9_]*):[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!field || fields.has(field[1])) { fail('invalid or duplicate exploration metadata'); continue; }
    fields.set(field[1], field[2]);
  }
  const id = fields.get('exploration_id'), status = fields.get('status');
  if (!explorationId.test(id ?? '')) fail('invalid exploration_id');
  if (fields.get('mode') !== 'explore') fail('mode must be explore');
  if (!new Set(['active', 'blocked', 'closed']).has(status)) fail('invalid exploration status');
  const idsValue = fields.get('question_ids') ?? '';
  const ids = /^\[.*\]$/.test(idsValue) ? idsValue.slice(1, -1).split(',').map((s) => s.trim()) : [];
  if (!ids.length || ids.some((i) => !problemId.test(i)) || new Set(ids).size !== ids.length) fail('question_ids must be a nonempty unique problem ID list');
  if (expectedCount !== undefined && (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || ids.length !== expectedCount)) fail('question count differs from user request');
  const target = artifact ?? `inquiry/explorations/${id}.md`;
  if (!artifactPath(target) || target !== `inquiry/explorations/${id}.md`) fail('artifact must match exploration_id');
  const byId = new Map((Array.isArray(map?.questions) ? map.questions : []).filter(object).map((q) => [q.id, q]));
  for (const problem of ids) {
    const q = byId.get(problem);
    if (!q || q.artifact !== target) fail(`${problem}: focus question must belong to this exploration`);
    if (status === 'closed' && q && !new Set(['resolved', 'needs_evidence', 'deferred']).has(q.status)) fail(`${problem}: closing must dispose of the active focus explicitly`);
  }
  const body = visible(markdown.slice(match[0].length));
  if (/^(?:Response|Submission|mastered|mastery|verdict)\s*:|\bverdict\s*:|^#{1,6}\s+[QA]\d+\b/im.test(body)) fail('explore must not contain learner answer/assessment protocol');
  const headings = [...body.matchAll(/^## ([^\n]+)\s*$/gm)];
  const expected = ['Scope', 'Discovery', 'Deep Dive', 'Verification', 'Next'];
  if (headings.length !== expected.length || headings.some((h, i) => h[1].trim() !== expected[i])) fail('requires ordered Scope, Discovery, Deep Dive, Verification, Next sections');
  else for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index + headings[i][0].length, end = headings[i + 1]?.index ?? body.length;
    if (!text(body.slice(start, end))) fail(`${expected[i]} must not be empty`);
  }
  return { valid: errors.length === 0, exploration_id: id ?? null, status: status ?? null, question_count: ids.length, errors, scope };
}

function inspectWithin(root, value, allowMissing = false) {
  if (!safeRelative(value) || !value.startsWith('inquiry/')) throw new Error('path must be relative and inside inquiry/');
  const full = resolve(root, value), rel = relative(root, full);
  if (!rel || isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('path escapes change-dir');
  if (realpathSync(root) !== root) throw new Error('change-dir must not traverse a symlink');
  let current = root, stat;
  const parts = rel.split(sep);
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]);
    try { stat = lstatSync(current); }
    catch (error) { if (allowMissing && error.code === 'ENOENT') return { full, exists: false }; throw error; }
    if (stat.isSymbolicLink()) throw new Error('inquiry symlinks are not permitted');
    if (i < parts.length - 1 && !stat.isDirectory()) throw new Error('inquiry parent must be a directory');
  }
  if (!stat?.isFile()) throw new Error('inquiry reference must be a regular file');
  return { full, exists: true };
}
function readWithin(root, value) {
  return readFileSync(inspectWithin(root, value).full, 'utf8');
}
function protectPublished(root, target, candidate) {
  const destination = inspectWithin(root, target, true);
  if (!destination.exists) return;
  const before = readFileSync(destination.full, 'utf8');
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(before)?.[1];
  const fields = new Map();
  for (const line of (header ?? '').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const field = /^([a-z][a-z0-9_]*):[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!field || fields.has(field[1])) throw new Error('published exploration metadata conflict; recover before replacing');
    fields.set(field[1], field[2]);
  }
  if (!header || !new Set(['active', 'blocked', 'closed']).has(fields.get('status')) || fields.get('mode') !== 'explore' ||
      `inquiry/explorations/${fields.get('exploration_id')}.md` !== target) throw new Error('published exploration metadata conflict; recover before replacing');
  if (fields.get('status') === 'closed' && before !== candidate) throw new Error('closed exploration is read-only; create a linked new record');
}

export function run(args) {
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!['--change-dir', '--file', '--map', '--artifact', '--expected-count'].includes(key) || flags.has(key) || !value || value.startsWith('--')) throw new Error('invalid, duplicate or missing option');
    flags.set(key, value);
  }
  if (!flags.has('--change-dir') || !isAbsolute(flags.get('--change-dir')) || !flags.has('--map')) throw new Error('requires --change-dir ABSOLUTE_CHANGE --map RELATIVE_JSON [--file RELATIVE_MD --artifact FINAL_MD --expected-count N]');
  if (!flags.has('--file') && (flags.has('--artifact') || flags.has('--expected-count'))) throw new Error('artifact/count require --file');
  const root = resolve(flags.get('--change-dir'));
  const mapPath = flags.get('--map');
  if (!mapPath.endsWith('.json')) throw new Error('map must be JSON');
  const map = JSON.parse(readWithin(root, mapPath));
  const countValue = flags.get('--expected-count');
  if (countValue !== undefined && !/^[1-9]\d*$/.test(countValue)) throw new Error('expected-count must be a positive integer');
  const file = flags.get('--file');
  if (file && !file.endsWith('.md')) throw new Error('exploration must be Markdown');
  const candidate = file ? readWithin(root, file) : null;
  const result = file ? validateExploration(candidate, map, {
    artifact: flags.get('--artifact'), expectedCount: countValue === undefined ? undefined : Number(countValue),
  }) : validateQuestionMap(map);
  if (result.valid) {
    const current = file ? (flags.get('--artifact') ?? `inquiry/explorations/${result.exploration_id}.md`) : null;
    if (current) protectPublished(root, current, candidate);
    for (const q of map.questions) {
      if (q.artifact !== current) readWithin(root, q.artifact);
      if (q.test_evidence && !readWithin(root, q.test_evidence).trim()) throw new Error('test evidence record is empty');
    }
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = run(process.argv.slice(2)); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.valid ? 0 : 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
