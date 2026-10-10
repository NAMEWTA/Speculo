import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
type RecordValue = Record<string, unknown>;
const namePattern = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const works = ['init-setup', 'brief', 'deconstruct', 'video', 'hand-drawn', 'publish-draft', 'retro'].map(x => `media/${x}`);
function need(ok: unknown, reason: string): asserts ok { if (!ok) throw new Error(`media-state: ${reason}; preserve existing state and resolve before refresh`); }
function keys(x: unknown, names: string[]): asserts x is RecordValue {
  need(x !== null && typeof x === 'object' && !Array.isArray(x), 'expected object');
  need(names.every(k => k in x) && Object.keys(x).every(k => names.includes(k)), 'unknown or missing fields');
}
function strings(x: unknown): asserts x is string[] { need(Array.isArray(x) && x.every(v => typeof v === 'string' && v.trim()) && new Set(x).size === x.length, 'expected unique strings'); }
async function json(path: string): Promise<unknown> {
  const stat = await lstat(path); need(stat.isFile() && !stat.isSymbolicLink(), 'state must be a regular file');
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}
/** Validate staged data using CLI-owned code, never execute installed scripts. */
export async function validateMediaState(stagedRoot: string): Promise<void> {
  const root = join(stagedRoot, '.speculo', 'media'); let s: unknown;
  try { s = await json(join(root, 'status.json')); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; throw e; }
  keys(s, ['schema_version', 'workflow', 'active', 'completed']); need(s.schema_version === 1 && s.workflow === 'media', 'unknown schema');
  strings(s.active); strings(s.completed); const names = [...s.active, ...s.completed];
  need(names.every(x => namePattern.test(x)) && new Set(names).size === names.length, 'invalid or overlapping index');
  for (const name of names) {
    const c = await json(join(root, 'changes', name, '.status.json'));
    keys(c, ['schema_version', 'change', 'status', 'current_work', 'works_run', 'revision', 'blockers', 'updated_at']);
    need(c.schema_version === 1 && c.change === name, 'identity');
    need(['active', 'blocked', 'completed', 'cancelled'].includes(String(c.status)), 'status');
    need(c.current_work === null || works.includes(String(c.current_work)), 'current Work');
    strings(c.works_run); strings(c.blockers); need(c.works_run.every(x => works.includes(x)), 'unknown Work');
    need(Number.isInteger(c.revision) && Number(c.revision) > 0, 'revision');
    need(typeof c.updated_at === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(c.updated_at) && Number.isFinite(Date.parse(c.updated_at)), 'updated_at');
    const terminal = c.status === 'completed' || c.status === 'cancelled';
    need(s.completed.includes(name) === terminal && (!terminal || c.current_work === null), 'terminal index');
    need(c.status !== 'completed' || !c.blockers.length, 'completion blocked');
    need(c.status !== 'blocked' || c.blockers.length > 0, 'missing blocker');
  }
}
