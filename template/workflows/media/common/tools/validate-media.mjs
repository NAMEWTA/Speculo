#!/usr/bin/env node
/** Read-only package/runtime validation; never initializes or repairs state. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, validateStateRoot, validateStatus } from './media-tools.mjs';
let workflow = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), state;
const args = process.argv.slice(2), errors = [];
const need = (ok, label) => { if (!ok) errors.push(label); };
try {
  for (let i = 0; i < args.length; i++) {
    if (!['--workflow-root', '--state-root'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('unknown/incomplete argument');
    const flag = args[i++]; if (flag === '--workflow-root') workflow = resolve(args[i]); else state = resolve(args[i]);
  }
  const index = readFileSync(join(workflow, 'INDEX.md'), 'utf8'), readme = readFileSync(join(workflow, 'README.md'), 'utf8');
  need(/^type: workflow\s*$/m.test(index) && /^workflow: media\s*$/m.test(index), 'INDEX identity');
  need(index.includes('永久知识') && index.includes('Work 激活') && !index.includes('AUTO-INDEX-START'), 'passive INDEX');
  need((readme.match(/AUTO-INDEX-START/g) || []).length === 1 && (readme.match(/AUTO-INDEX-END/g) || []).length === 1, 'README markers');
  for (const title of ['Work 条目', '运行时根', '持久化约定', '启动协议', '状态字段', '路径分配', '副作用边界']) need(readme.includes(`## ${title}`), `README ${title}`);
  const manifest = readJSON(join(workflow, 'manifest.json'));
  need(manifest.schema_version === 1 && manifest.id === 'media' && /^\d+\.\d+\.\d+$/.test(manifest.version), 'manifest identity');
  need(JSON.stringify(manifest.persistent_knowledge) === JSON.stringify(['<Path>{roots.state}/media/context/INDEX.md</Path>']), 'knowledge registration');
  const dirs = readdirSync(workflow, { withFileTypes: true }).filter(e => e.isDirectory() && /^[A-Z]-/.test(e.name)).map(e => e.name);
  need(dirs.length === 7 && manifest.stages?.length === 7, 'seven Works');
  const ids = [];
  for (const dir of dirs) {
    const content = readFileSync(join(workflow, dir, `${dir}.md`), 'utf8');
    ids.push(content.match(/^id: media\/(.+)$/m)?.[1].trim());
    need(content.includes('<Path>{roots.workflows}/media/README.md</Path>') && content.includes('common/rules/activation-and-memory.md'), `${dir} activation`);
    need(/^type: workflow-entry\s*$/m.test(content) && readme.includes(`**${dir}**`), `${dir} discovery`);
  }
  need(new Set(ids).size === 7 && manifest.stages.every(s => ids.includes(s.id) && ['read-only', 'local-reversible'].includes(s.risk) && Number.isInteger(s.context_budget) && s.context_budget > 0 && ['inputs', 'outputs', 'after'].every(k => Array.isArray(s[k])) && s.after.every(x => ids.includes(x))), 'stage contract');
  const menu = readJSON(join(workflow, 'H-hand-drawn/style-catalog.json'));
  need(menu.recipes_vendored === false && menu.styles.length === 21 && new Set(menu.styles.map(s => s.id)).size === 21, '21 styles metadata');
  const runtime = readJSON(join(workflow, 'runtime-contract.json'));
  need(runtime.schema_version === 1 && runtime.workflow === 'media' && runtime.opaque_default === 'preserve-byte-for-byte', 'runtime contract');
  for (const file of readdirSync(join(workflow, 'common/schemas'))) readJSON(join(workflow, 'common/schemas', file));
  validateStatus(readJSON(join(workflow, '_state/status.json')));
  const registry = readFileSync(join(workflow, 'common/rules/external-skills.md'), 'utf8');
  for (const name of ['Punk-Skill', 'video-talkcraft', 'yichen-skills', 'jianying-headless', 'jianying-editor-skill', 'content-boom-monitor', 'video-to-subtitle-summary-skill', 'baoyu-skills', 'HyperFrames', 'everything-claude-code', 'hand-drawn-styles', 'video-use', 'huashu-art-motion']) need(registry.includes(name), `registry: ${name}`);
  function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, e.name); if (e.isDirectory()) walk(file);
      else if (e.name.endsWith('.md')) {
        const text = readFileSync(file, 'utf8');
        need(!/\{roots\.workflows\}\/media\/_state/.test(text), `runtime points to seed: ${file}`);
        for (const match of text.matchAll(/<Path>\{roots\.workflows\}\/media\/([^<]*)<\/Path>/g)) if (!/[{}]/.test(match[1])) need(existsSync(join(workflow, match[1])), `missing reference: ${match[1]}`);
      }
    }
  }
  walk(workflow); if (state) validateStateRoot(state);
} catch (e) { errors.push(e.message); }
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`media validation: ok (${state ? 'package and runtime' : 'package only; no runtime read/write'})`);
