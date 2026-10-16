#!/usr/bin/env node
// Node >=22.16.0. Host JSON on stdin; one ASCII line on stdout; exit 0.
// No account, transcript or configuration reads; no network, subprocess or cache.
import { pathToFileURL } from 'node:url';

const INPUT_LIMIT = 256 * 1024;
const INPUT_DEADLINE_MS = 1000;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const percentage = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const displayNumber = value => Number(value.toFixed(1)).toString();
const text = value => typeof value === 'string'
  ? value.replace(/\x1b(?:\][^\x07]*(?:\x07|$)|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/[^\x20-\x7e]/g, '').replace(/[|]/g, '/').trim().slice(0, 28)
  : '';

export function metric(value, resetsAt, now = Date.now()) {
  if (value === undefined || value === null) return { state: 'unavailable', used: null, remaining: null, resets_at: null };
  if (!percentage(value)) return { state: 'invalid', used: null, remaining: null, resets_at: null };
  const reset = typeof resetsAt === 'number' && Number.isSafeInteger(resetsAt)
    && resetsAt > 0 && resetsAt <= 253402300799 ? resetsAt : null;
  if (resetsAt !== undefined && resetsAt !== null && reset === null) return { state: 'invalid', used: null, remaining: null, resets_at: null };
  if (reset !== null && reset * 1000 <= now) return { state: 'stale', used: null, remaining: null, resets_at: reset };
  return { state: 'reported', used: value, remaining: 100 - value, resets_at: reset };
}

export function normalize(data, now = Date.now()) {
  if (!object(data)) data = {};
  const current = data.context_window;
  // After compaction a null current_usage invalidates an old percentage.
  const ctxValue = object(current) && current.current_usage !== null ? current.used_percentage : null;
  return {
    model: text(data.model?.display_name) || text(data.model?.id) || 'Model',
    effort: text(data.effort?.level),
    context: metric(ctxValue, undefined, now),
    five_hour: metric(data.rate_limits?.five_hour?.used_percentage, data.rate_limits?.five_hour?.resets_at, now),
    seven_day: metric(data.rate_limits?.seven_day?.used_percentage, data.rate_limits?.seven_day?.resets_at, now),
  };
}

function label(metricValue, remaining) {
  if (metricValue.state !== 'reported') return metricValue.state === 'unavailable' ? '--' : metricValue.state;
  return displayNumber(remaining ? metricValue.remaining : metricValue.used) + '%';
}

export function render(data, { width = 120, now = Date.now() } = {}) {
  width = Number.isSafeInteger(width) && width > 0 ? Math.min(width, 240) : 120;
  const m = normalize(data, now);
  const core = [`CTX used ${label(m.context, false)}`, `5h left ${label(m.five_hour, true)}`, `7d left ${label(m.seven_day, true)}`];
  const resets = [['5h', m.five_hour], ['7d', m.seven_day]]
    .filter(([, item]) => item.state === 'reported' && item.resets_at !== null)
    .map(([name, item]) => {
      const time = new Date(item.resets_at * 1000);
      const date = `${time.getMonth() + 1}/${time.getDate()}`;
      const clock = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      return `${name} reset ${date} ${clock}`;
    });
  const heading = m.model + (m.effort ? ` (${m.effort})` : '');
  const candidates = [
    [heading, ...core, ...resets].join(' | '),
    [heading, ...core].join(' | '),
    [m.model.slice(0, 16), ...core].join(' | '),
    core.join(' | '),
    `CTX:${label(m.context, false)}u 5h:${label(m.five_hour, true)}l 7d:${label(m.seven_day, true)}l`,
  ];
  return candidates.find(value => value.length <= width) ?? candidates.at(-1).slice(0, width);
}

export function run(input = process.stdin, output = process.stdout) {
  let chunks = [];
  let bytes = 0;
  let done = false;
  const rawWidth = Number(process.env.COLUMNS);
  const finish = invalid => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    let data = {};
    try { if (!invalid) data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* unavailable */ }
    chunks = [];
    output.write(render(data, { width: rawWidth }) + '\n');
    input.destroy();
  };
  const timer = setTimeout(() => finish(true), INPUT_DEADLINE_MS);
  input.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > INPUT_LIMIT) return finish(true);
    chunks.push(Buffer.from(chunk));
  });
  input.once('end', () => finish(false));
  input.once('error', () => finish(true));
  output.on('error', () => { input.destroy(); clearTimeout(timer); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
