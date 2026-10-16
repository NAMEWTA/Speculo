// Only called during an explicitly confirmed mutation, never doctor/plan.
// No probe grants protection against malicious same-UID or privileged processes.
import { readdir, stat, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { metadata } from './io.mjs';
export async function observeWriters(path) {
  const target = await metadata(path);
  if (!target.exists) return { state: 'clear', method: 'create-with-no-replace' };
  if (process.platform === 'linux') {
    let processes;
    try { processes = (await readdir('/proc')).filter(v => /^\d+$/.test(v)); }
    catch { return { state: 'unknown', method: 'proc-unavailable' }; }
    if (processes.length > 8192) return { state: 'unknown', method: 'process-limit' };
    const deadline = Date.now() + 5000;
    let incomplete = false, count = 0;
    for (const pid of processes) {
      if (Date.now() > deadline) { incomplete = true; break; }
      const root = '/proc/' + pid;
      try {
        if ((await stat(root)).uid !== process.getuid()) continue;
        const handles = await readdir(root + '/fd');
        if (handles.length > 16384) { incomplete = true; continue; }
        for (const fd of handles) {
          try {
            const opened = await stat(root + '/fd/' + fd);
            if (opened.dev !== target.dev || opened.ino !== target.ino) continue;
            const info = await readFile(root + '/fdinfo/' + fd, 'utf8');
            const flags = info.match(/^flags:\s*([0-7]+)/m);
            if (!flags) { incomplete = true; continue; }
            if ((parseInt(flags[1], 8) & 3) !== 0) count++;
          } catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) incomplete = true; }
        }
      } catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) incomplete = true; }
    }
    return { state: count ? 'busy' : incomplete ? 'unknown' : 'clear', method: 'same-uid-proc-fdinfo', count };
  }
  if (process.platform === 'darwin') {
    const result = spawnSync('/usr/sbin/lsof', ['-F', 'pfa', '--', path], {
      encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024,
      env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LC_ALL: 'C' },
    });
    if (result.error || ![0, 1].includes(result.status) || result.stderr?.trim()) return { state: 'unknown', method: 'lsof-failed' };
    return { state: /^a[wu]$/m.test(result.stdout) ? 'busy' : 'clear', method: 'system-lsof' };
  }
  return { state: 'unknown', method: 'replacement-observer-unsupported' };
}
