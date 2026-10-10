#!/usr/bin/env node
/** Compile owned semantic blocks plus an explicit web-runtime adapter. No second business source. */
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = 'template/workflows/learning';
const shared = (name, block) => ({ path: `${workflow}/common/rules/${name}.md`, block });
const runtime = (block) => shared('portable-learning-runtime', block);
const core = [shared('inquiry-depth-policy', 'depth'), shared('production-inquiry', 'production')];
export const documents = [
  {
    capability: 'lesson', title: '完整课程与主动盲区发现',
    entry: `${workflow}/L-lesson/L-lesson.md`,
    output: 'template/canonical/canonical-learning-lesson.md',
    sources: [runtime('runtime'), shared('lesson-contract', 'lesson'), ...core, runtime('lesson-runtime')],
  },
  {
    capability: 'question', title: '主动探究与苏格拉底问答',
    entry: `${workflow}/Q-question/Q-question.md`,
    output: 'template/canonical/canonical-learning-question.md',
    sources: [runtime('runtime'), { path: `${workflow}/Q-question/Q-question.md`, block: 'question' }, ...core,
      shared('questioning-policy', 'recipes'), shared('questioning-policy', 'teaching'),
      { path: `${workflow}/Q-question/references/exploration-mode.md`, block: 'explore' },
      shared('question-map-contract', 'map'), runtime('question-runtime')],
  },
];
const projectUrl = 'https://github.com/NAMEWTA/Speculo';

export function extractBlock(source, name) {
  const start = `<!-- portable:${name}:start -->`, end = `<!-- portable:${name}:end -->`;
  if (source.split(start).length !== 2 || source.split(end).length !== 2 || source.indexOf(end) < source.indexOf(start)) {
    throw new Error(`missing, duplicate or reversed portable block: ${name}`);
  }
  const block = source.slice(source.indexOf(start) + start.length, source.indexOf(end)).trim();
  if (!block || /<!--\s*portable:|<Path>|\{roots\./.test(block)) throw new Error(`unclosed static dependency in portable block: ${name}`);
  return block;
}

export function auditCanonical(content) {
  const errors = [];
  if (!/^# [^\n]+\n/.test(content)) errors.push('first line must be a title, without frontmatter');
  const urls = content.match(/https?:\/\/[^\s<>"`]+/g) ?? [];
  if (urls.length !== 1 || urls[0] !== projectUrl) errors.push('requires exactly the project URL and no other definition URLs');
  const isolated = content.replace(projectUrl, '');
  if (/Speculo|SpecDev|(?:SKILL|INDEX)\.md\b|\bsha-?256\b|\.agents\/|\.speculo\/|\btemplate\/|\bskills\/|\{roots\.|<Path>|<!--|\{\{|\b[LGQ]-[a-z]+\b|\[TODO\]/i.test(isolated)) errors.push('source implementation or unfinished marker leaked');
  if (/^---\s*$/m.test(content.split('\n').slice(0, 2).join('\n'))) errors.push('document frontmatter is forbidden');
  for (const marker of ['ai-workspace/status.json', 'ai-workspace/changes/{change}/.status.json', 'source.md', 'LOG.md', 'FILE:', '需要保存', '恢复', '自动校验未执行']) {
    if (!content.includes(marker)) errors.push(`missing persistence rule: ${marker}`);
  }
  for (const found of content.matchAll(/ai-workspace\/[^\s`"<>]*/g)) {
    if (found[0].includes('..') || found[0].includes('\\') || found[0].includes('//')) errors.push('unsafe portable path');
  }
  return errors;
}

async function regularSource(root, relative) {
  // The registry is static and repository-relative; reject symlinked sources rather than overwriting them.
  let current = root;
  for (const segment of relative.split('/')) {
    current = join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`symlinked source: ${relative}`);
  }
  if (!(await lstat(current)).isFile()) throw new Error(`not a source file: ${relative}`);
  return (await readFile(current, 'utf8')).replace(/\r\n?/g, '\n');
}

export async function compileLearning(root = repositoryRoot) {
  const outputs = new Map();
  for (const document of documents) {
    const entry = await regularSource(root, document.entry);
    if (!entry.includes('portable-learning-runtime.md')) throw new Error(`entry lost its explicit web adapter: ${document.entry}`);
    const blocks = [];
    for (const item of document.sources) blocks.push(extractBlock(await regularSource(root, item.path), item.block));
    const content = [`# ${document.title}`, `项目地址：${projectUrl}`, ...blocks].join('\n\n').replaceAll('{{capability}}', document.capability) + '\n';
    const errors = auditCanonical(content);
    if (errors.length) throw new Error(`${document.output}: ${errors.join('; ')}`);
    outputs.set(document.output, content);
  }
  return outputs;
}

async function safeOutput(root, relative) {
  if (await realpath(root) !== resolve(root)) throw new Error('output root must not traverse a symlink');
  let current = root;
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try { stat = await lstat(current); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`refusing generated symlink: ${relative}`);
    if (i < parts.length - 1 && !stat.isDirectory()) throw new Error(`output parent is not a directory: ${relative}`);
    if (i === parts.length - 1 && !stat.isFile()) throw new Error(`output is not a regular file: ${relative}`);
  }
}

export async function generateLearning({ root = repositoryRoot, check = false } = {}) {
  // Compile and audit both candidates before any generated file is replaced.
  const outputs = await compileLearning(root);
  for (const relative of outputs.keys()) await safeOutput(root, relative);
  for (const [relative, content] of outputs) {
    const file = join(root, relative);
    if (check) {
      if (await readFile(file, 'utf8') !== content) throw new Error(`${relative} is stale; run pnpm generate-canonical`);
    } else {
      await mkdir(dirname(file), { recursive: true });
      try { if ((await lstat(file)).isSymbolicLink()) throw new Error(`refusing generated symlink: ${relative}`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const temp = `${file}.tmp-${process.pid}`;
      let created = false;
      try {
        await writeFile(temp, content, { encoding: 'utf8', flag: 'wx' }); created = true;
        await rename(temp, file);
      } finally { if (created) await rm(temp, { force: true }); }
    }
  }
  return [...outputs.keys()];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === '--check')) { console.error('usage: generate-learning-canonical.mjs [--check]'); process.exitCode = 1; }
  else generateLearning({ check: args.includes('--check') }).then((files) => {
    for (const file of files) console.log(`${args.length ? 'checked' : 'generated'} ${file}`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
