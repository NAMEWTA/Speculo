#!/usr/bin/env node
/** Read-only validation of the current inquiry batch, never historical migration.
 * A supplied before snapshot proves byte preservation, not who authored it.
 */
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function visible(text) {
  let fence = null;
  // Replace hidden characters with spaces, preserving exact source offsets.
  const blank = (value) => value.replace(/[^\r\n]/g, ' ');
  return text.replace(/<!--[\s\S]*?-->/g, blank).split('\n').map((line) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker && !fence) { fence = marker; return blank(line); }
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      return blank(line);
    }
    return line;
  }).join('\n');
}

function parse(text) {
  const errors = [];
  if (typeof text !== 'string') return { errors: ['inquiry must be text'] };
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!header) return { errors: ['frontmatter is required'] };
  const counts = [...header[1].matchAll(/^question_count:\s*(.*?)\s*$/gm)];
  const count = counts.length === 1 && /^[1-9]\d*$/.test(counts[0][1]) ? Number(counts[0][1]) : NaN;
  if (!Number.isSafeInteger(count)) errors.push('question_count must be one positive integer field');
  const body = visible(text.slice(header[0].length));
  const markers = [...body.matchAll(/^Response:[ \t]*(pending|ready|closed)[ \t\r]*$/gm)];
  if (markers.length !== 1) errors.push('exactly one Response: pending|ready|closed marker is required');
  const response = markers[0]?.[1];
  const q = [...body.matchAll(/^## Questions[ \t\r]*$/gm)];
  const a = [...body.matchAll(/^## Learner Answers[ \t\r]*$/gm)];
  const mark = markers[0]?.index ?? -1;
  if (q.length !== 1 || a.length !== 1 || !(q[0]?.index < a[0]?.index && a[0]?.index < mark)) {
    errors.push('Questions, Learner Answers and Response must occur once in order');
  } else {
    const qs = [...body.slice(q[0].index, a[0].index).matchAll(/^### Q(\d+)\b/gm)].map((m) => Number(m[1]));
    const as = [...body.slice(a[0].index, mark).matchAll(/^### A(\d+)\b/gm)].map((m) => Number(m[1]));
    for (const [kind, numbers] of [['Q', qs], ['A', as]]) {
      if (numbers.length !== count || numbers.some((n, i) => n !== i + 1)) errors.push(`${kind} numbering must be contiguous 1..question_count`);
    }
  }
  const teaching = [...body.matchAll(/^## Teaching[ \t\r]*$/gm)];
  const lesson = [...body.matchAll(/^## Inquiry Lesson[ \t\r]*$/gm)];
  if (response !== 'closed' && (teaching.length || lesson.length)) errors.push('pending/ready batch must not contain Teaching or Inquiry Lesson');
  if (response === 'closed' && !(teaching.length === 1 && lesson.length === 1 && teaching[0].index > mark && lesson[0].index > teaching[0].index)) {
    errors.push('closed batch requires appended Teaching then Inquiry Lesson');
  }
  if (response === 'closed' && !body.includes('Explain (English)')) errors.push('Teaching requires Explain (English)');
  if (/^Submission:|\bverdict\s*:/m.test(body)) errors.push('inquiry must not use Homework Submission or verdict fields');
  return { errors, count, response, frozen: mark >= 0 ? text.slice(0, header[0].length + mark) : null };
}

export function validateInquiry(text, { expectedCount, before } = {}) {
  const parsed = parse(text);
  const errors = [...parsed.errors];
  if (expectedCount !== undefined && (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || expectedCount !== parsed.count)) {
    errors.push('actual question_count differs from the requested count');
  }
  let frozenInputs = 'not-checked';
  if (parsed.response === 'closed' && before === undefined) errors.push('closing requires the original Response: ready snapshot');
  if (before !== undefined) {
    const previous = parse(before);
    if (previous.errors.length || previous.response !== 'ready') errors.push('before must be a valid original Response: ready batch');
    else if (parsed.response !== 'closed' || previous.frozen !== parsed.frozen) errors.push('closing must preserve original metadata, questions and answers byte-for-byte');
    else frozenInputs = 'verified-against-supplied-snapshot';
  }
  return { valid: errors.length === 0, question_count: parsed.count ?? null, response: parsed.response ?? null,
    frozen_inputs: frozenInputs, scope: 'current batch structure and supplied bytes; not human authorship or teaching-quality certification', errors };
}

function readWithin(root, value) {
  if (!value || value.split(/[\\/]/).includes('..')) throw new Error('unsafe inquiry path');
  const full = resolve(root, value), rel = relative(root, full);
  if (!rel || isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`) || !full.endsWith('.md')) throw new Error('inquiry path must be a Markdown file inside change-dir');
  if (realpathSync(root) !== root) throw new Error('change-dir must not traverse a symlink');
  let current = root;
  for (const part of rel.split(sep)) {
    current = resolve(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('inquiry symlink is not permitted');
  }
  if (!lstatSync(full).isFile()) throw new Error('inquiry must be a regular file');
  return readFileSync(full, 'utf8');
}

function main(argv) {
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!['--change-dir', '--file', '--before', '--expected-count'].includes(key) || flags.has(key) || !value || value.startsWith('--')) throw new Error('invalid, duplicate or missing option');
    flags.set(key, value);
  }
  if (!flags.has('--change-dir') || !flags.has('--file')) throw new Error('use --change-dir ABSOLUTE_CHANGE --file BATCH.md [--expected-count N] [--before READY.md]');
  if (!isAbsolute(flags.get('--change-dir'))) throw new Error('change-dir must be absolute');
  const root = resolve(flags.get('--change-dir'));
  const count = flags.has('--expected-count') ? Number(flags.get('--expected-count')) : undefined;
  const result = validateInquiry(readWithin(root, flags.get('--file')), {
    expectedCount: count,
    before: flags.has('--before') ? readWithin(root, flags.get('--before')) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
