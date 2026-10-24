#!/usr/bin/env node
/** Read-only, bounded Codex provenance. Log content is data, never executable input. */
import { createReadStream } from 'node:fs';
import { lstat, readdir, realpath } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const must = (value, message) => { if (!value) throw new Error(message); };
async function logFile(root, locator) {
  must(typeof locator === 'string' && /^(sessions|archived_sessions)\/.+\.jsonl$/.test(locator) && !/[\\:\x00-\x1f]/.test(locator) && locator.split('/').every(p => p && p !== '.' && p !== '..'), 'invalid host-relative session locator');
  let path = await realpath(root);
  for (const part of locator.split('/')) {
    path = join(path, part);
    must(!(await lstat(path)).isSymbolicLink(), 'session locator cannot follow symlinks');
  }
  must((await lstat(path)).isFile(), 'session locator is not a file');
  return path;
}
async function* records(path, lastLine = Infinity, maxLineBytes = 1024 * 1024) {
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: 16384 });
  let line = 0, pending = '';
  const decode = raw => {
    raw = raw.replace(/\r$/, '');
    line++;
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error(`invalid JSONL at line ${line}; capture may be incomplete`); }
    return { line, raw, value };
  };
  try {
    for await (const chunk of stream) {
      let start = 0, end;
      while ((end = chunk.indexOf('\n', start)) !== -1) {
        const raw = pending + chunk.slice(start, end);
        must(Buffer.byteLength(raw) <= maxLineBytes, `session line ${line + 1} exceeds read limit`);
        yield decode(raw);
        if (line >= lastLine) return;
        pending = ''; start = end + 1;
      }
      pending += chunk.slice(start);
      must(Buffer.byteLength(pending) <= maxLineBytes, `session line ${line + 1} exceeds read limit`);
    }
    if (pending) yield decode(pending);
  } finally { stream.destroy(); }
}
function identity(item, sessionId, projectRoot) {
  must(item?.type === 'session_meta' && item.payload?.id === sessionId, 'session metadata/ID mismatch');
  if (projectRoot) must(typeof item.payload.cwd === 'string' && resolve(item.payload.cwd) === resolve(projectRoot), 'session project mismatch');
  return { session_id: item.payload.id, host: 'codex', timestamp: item.timestamp, cli_version: item.payload.cli_version ?? null };
}
export async function locateCodexSessions({ logRoot, sessionId, projectRoot }) {
  must(typeof sessionId === 'string' && /^[a-zA-Z0-9-]+$/.test(sessionId), 'invalid session ID');
  const root = await realpath(logRoot), candidates = [], issues = [];
  async function walk(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith('.jsonl') && entry.name.includes(sessionId)) {
        const locator = relative(root, path).split(sep).join('/');
        try {
          let found = false;
          for await (const item of records(await logFile(root, locator))) { candidates.push({ ...identity(item.value, sessionId, projectRoot), locator }); found = true; break; }
          must(found, 'empty session log');
        } catch (e) { issues.push({ locator, error: e.message }); }
      }
    }
  }
  // Check the two top-level directories too; a symlink must not escape the chosen host root.
  for (const name of ['sessions', 'archived_sessions']) {
    try { must(!(await lstat(join(root, name))).isSymbolicLink(), 'session root cannot be a symlink'); await walk(join(root, name)); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return { candidates, issues, availability: candidates.length === 1 && !issues.length ? 'available' : candidates.length === 0 && !issues.length ? 'unavailable' : 'unknown' };
}
export async function readCodexSession({ logRoot, locator, sessionId, projectRoot, fromLine, toLine, cutoff, maxBytes = 65536 }) {
  must(Number.isInteger(fromLine) && fromLine >= 1 && Number.isInteger(toLine) && toLine >= fromLine, 'explicit positive line range required');
  must(Number.isInteger(maxBytes) && maxBytes >= 1 && maxBytes <= 1024 * 1024, 'invalid byte limit');
  must(typeof cutoff === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(cutoff) && Number.isFinite(Date.parse(cutoff)), 'explicit ISO capture cutoff required');
  const path = await logFile(logRoot, locator), selected = [];
  let meta, seen = 0, bytes = 0, truncated = false, excludedAfterCutoff = 0;
  for await (const item of records(path, toLine)) {
    seen = item.line;
    if (item.line === 1) meta = identity(item.value, sessionId, projectRoot);
    if (item.line < fromLine) continue;
    must(typeof item.value.timestamp === 'string' && Number.isFinite(Date.parse(item.value.timestamp)), `line ${item.line}: missing event timestamp`);
    if (Date.parse(item.value.timestamp) > Date.parse(cutoff)) { excludedAfterCutoff++; continue; }
    const size = Buffer.byteLength(item.raw + '\n');
    if (bytes + size > maxBytes) { truncated = true; break; }
    selected.push({ line: item.line, timestamp: item.value.timestamp, raw: item.raw }); bytes += size;
  }
  must(meta, 'empty session log');
  const snapshot = selected.map(item => item.raw + '\n').join('');
  return { ...meta, locator, captured_until: cutoff, requested: { from_line: fromLine, to_line: toLine },
    complete: !truncated && seen >= toLine, truncated, excluded_after_cutoff: excludedAfterCutoff,
    records: selected, sha256: createHash('sha256').update(snapshot).digest('hex') };
}
export async function sessionEvidenceCLI(args) {
  const [mode, ...rest] = args, names = { '--log-root': 'logRoot', '--session': 'sessionId', '--repo': 'projectRoot', '--locator': 'locator', '--from-line': 'fromLine', '--to-line': 'toLine', '--cutoff': 'cutoff', '--max-bytes': 'maxBytes' }, options = {};
  must(['locate', 'read'].includes(mode), 'use locate|read --log-root <host root> --session <id> [--repo <project>] [--locator <relative JSONL> --from-line <n> --to-line <n> --cutoff <ISO> --max-bytes <n>]');
  for (let i = 0; i < rest.length; i += 2) {
    const key = names[rest[i]], value = rest[i + 1];
    must(key && value && !value.startsWith('--') && !(key in options), 'unknown, duplicate or missing argument');
    options[key] = ['fromLine', 'toLine', 'maxBytes'].includes(key) ? Number(value) : value;
  }
  must(options.logRoot && options.sessionId, 'explicit log root and session ID required');
  if (mode === 'locate') must(Object.keys(options).every(k => ['logRoot', 'sessionId', 'projectRoot'].includes(k)), 'locate does not accept read options');
  const result = mode === 'locate' ? await locateCodexSessions(options) : await readCodexSession(options);
  console.log(JSON.stringify(result, null, 2));
  return mode === 'read' ? (result.complete ? 0 : 2) : (result.issues.length ? 2 : 0);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = await sessionEvidenceCLI(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
