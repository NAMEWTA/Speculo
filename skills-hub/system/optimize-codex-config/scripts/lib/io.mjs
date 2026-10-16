// Bounded, no-follow local I/O. Does not read credentials, run a CLI, or use a network.
import { constants } from 'node:fs';
import { lstat, open, mkdir, rmdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, isAbsolute, parse, join, relative, sep, dirname } from 'node:path';
import { ConfigError } from './document.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function absolute(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || /[\x00-\x1f\x7f]/.test(path)) throw new ConfigError('absolute_path_required');
  return resolve(path);
}
export function within(root, path) {
  const part = relative(root, path);
  if (part === '..' || part.startsWith('..' + sep) || isAbsolute(part)) throw new ConfigError('path_escape');
  return path;
}
export async function metadata(path) {
  try {
    const s = await lstat(path);
    return { exists: true, type: s.isSymbolicLink() ? 'symlink' : s.isFile() ? 'file' : s.isDirectory() ? 'directory' : 'other',
      bytes: s.size, mode: s.mode & 0o777, mtime: s.mtimeMs, dev: s.dev, ino: s.ino };
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false };
    throw new ConfigError('metadata_unavailable');
  }
}
export async function safePath(path, { privateWrite = false } = {}) {
  path = absolute(path);
  let current = parse(path).root;
  for (const component of path.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, component);
    const meta = await metadata(current);
    if (!meta.exists) continue;
    if (meta.type === 'symlink' || (current !== path && meta.type !== 'directory')) throw new ConfigError('unsafe_path');
    if (privateWrite && process.platform !== 'win32') {
      const stat = await lstat(current);
      // Sticky system temp parents are acceptable; private state itself is checked separately.
      if (stat.isDirectory() && (stat.mode & 0o022) && !(stat.mode & 0o1000)) throw new ConfigError('shared_writable_parent');
      if (current === path && process.getuid && stat.uid !== process.getuid()) throw new ConfigError('owner_mismatch');
    }
  }
  return path;
}
export async function readBounded(path, limit = 1024 * 1024) {
  await safePath(path);
  const before = await metadata(path);
  if (!before.exists) return { ...before, text: '' };
  if (before.type !== 'file' || before.bytes > limit) throw new ConfigError('unsafe_or_oversize_file');
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const stat = await handle.stat();
    if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino || stat.size > limit) throw new ConfigError('read_race');
    const buffer = Buffer.alloc(Math.min(limit + 1, stat.size + 1));
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
      if (!bytesRead) break;
      total += bytesRead;
    }
    if (total !== stat.size || total > limit) throw new ConfigError('read_race');
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, total));
    if (!same(before, await metadata(path))) throw new ConfigError('read_race');
    return { ...before, sha256: sha256(buffer.subarray(0, total)), text };
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError('read_failed');
  } finally { await handle?.close(); }
}
export function fingerprint(value) {
  return Object.fromEntries(['exists', 'type', 'bytes', 'mode', 'mtime', 'dev', 'ino', 'sha256'].filter(k => Object.hasOwn(value, k)).map(k => [k, value[k]]));
}
export async function makePrivateDirs(path, made = []) {
  await safePath(path, { privateWrite: true });
  const meta = await metadata(path);
  if (meta.exists) {
    if (meta.type !== 'directory') throw new ConfigError('directory_required');
    return made;
  }
  await makePrivateDirs(dirname(path), made);
  await mkdir(path, { mode: 0o700 });
  made.push(path);
  return made;
}
export async function newPrivateFile(path, content) {
  await safePath(path, { privateWrite: true });
  const h = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
  try { await h.writeFile(content, 'utf8'); await h.sync(); }
  finally { await h.close(); }
}
export async function cleanCreatedDirs(dirs) {
  for (const directory of [...dirs].reverse()) {
    try { await rmdir(directory); } catch (error) {
      if (!['ENOTEMPTY', 'ENOENT', 'EEXIST'].includes(error.code)) throw new ConfigError('directory_cleanup_failed');
    }
  }
}
