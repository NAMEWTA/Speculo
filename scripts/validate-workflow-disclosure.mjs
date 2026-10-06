#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { buildDocumentGraph, graphReport, measureReadTrace } from './lib/workflow-document-graph.mjs';

const args = process.argv.slice(2);
let rootArg = '.', traceFile = null, profileFile = null, json = false;
const changed = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') json = true;
  else if (['--trace', '--profile', '--changed'].includes(args[i])) {
    const flag = args[i], value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
    if (flag === '--trace') traceFile = value;
    else if (flag === '--profile') profileFile = value;
    else changed.push(value);
  } else if (args[i].startsWith('--')) throw new Error(`unknown option ${args[i]}`);
  else if (i === 0) rootArg = args[i];
  else throw new Error(`unexpected argument ${args[i]}`);
}
if (profileFile && !traceFile) throw new Error('--profile requires --trace');
const root = path.resolve(rootArg);
const workflowsRoot = path.join(root, 'template', 'workflows');
const workflows = ['learning', 'specdev', 'ops', 'person'];
const errors = [];

async function read(relative) {
  try {
    return await readFile(path.join(root, relative), 'utf8');
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
    return '';
  }
}

function requireText(relative, content, pattern, label) {
  if (!pattern.test(content)) errors.push(`${relative}: missing ${label}`);
}

for (const workflow of workflows) {
  const indexPath = `template/workflows/${workflow}/INDEX.md`;
  const index = await read(indexPath);
  const memoryPath = `template/workflows/${workflow}/common/rules/activation-and-memory.md`;
  const memory = await read(memoryPath);
  requireText(indexPath, index, /激活后读取|用户明确激活|Work 后/, 'passive activation boundary');
  requireText(indexPath, index, new RegExp(`common/rules/activation-and-memory\\.md`), 'memory protocol pointer');
  requireText(memoryPath, memory, /Locate before read|定位.*entry/, 'locate-before-read rule');
  requireText(memoryPath, memory, /pending transaction.*lock.*recovery evidence/, 'memory write gate');

  const workflowRoot = path.join(workflowsRoot, workflow);
  let entries = [];
  try {
    entries = await readdir(workflowRoot, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'common' || entry.name === '_state') continue;
    const relative = `template/workflows/${workflow}/${entry.name}/${entry.name}.md`;
    const content = await read(relative);
    const rootPointer = workflow === 'person'
      ? /<Path>\{roots\.workflows\}\/person\/INDEX\.md<\/Path>/
      : new RegExp(`<Path>\\{roots\\.workflows\\}/${workflow}/README\\.md<\\/Path>`);
    requireText(relative, content, rootPointer, 'activation contract pointer');
    // A direct activation/memory pointer carries the shared read contract.
    // Do not require every Work to repeat the same paragraph or heading.
    requireText(relative, content, /common\/rules\/activation-and-memory\.md/, 'memory protocol pointer');
  }
}

const targetedForbidden = [
  ['template/workflows/ops/D-project-deploy/D-project-deploy.md', /读取所有既有|读取全部/],
  ['template/workflows/ops/I-initialize/I-initialize.md', /读取所有既有|读取全部/],
  ['template/workflows/ops/H-host-manage/H-host-manage.md', /读取所有既有|读取全部/],
  ['template/workflows/learning/L-lesson/L-lesson.md', /读取整个 context|读取全部 context/],
  ['template/workflows/learning/H-homework/H-homework.md', /读取整个 context|读取全部 context/],
  ['template/workflows/learning/R-review/R-review.md', /读取整个 context|读取全部 context/],
];
for (const [relative, pattern] of targetedForbidden) {
  const content = await read(relative);
  if (pattern.test(content)) errors.push(`${relative}: broad-read wording remains outside an evidence exception`);
}

const personRoot = await read('template/workflows/person/M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md');
if (personRoot.includes('template/workflows/person/README.md') || personRoot.includes('{roots.workflows}/person/README.md')) {
  errors.push('person/M-mao-zedong-cognitive-os: references a nonexistent README');
}

const graph = await buildDocumentGraph(root);
errors.push(...graph.errors);
const report = graphReport(graph, changed);
if (traceFile) {
  const trace = (await readFile(path.resolve(traceFile), 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  report.reads = measureReadTrace(graph, trace, profileFile ? JSON.parse(await readFile(path.resolve(profileFile), 'utf8')) : {});
  errors.push(...report.reads.errors);
}
report.errors = [...new Set(errors)];
if (json) console.log(JSON.stringify(report, null, 2));
else if (report.errors.length) {
  console.error(`workflow disclosure validation failed: ${report.errors.length}`);
  for (const error of report.errors) console.error(`- ${error}`);
} else {
  console.log(`workflow disclosure validation: ok (${graph.entries.length} Work entries, ${graph.edges.length} potential references)`);
  console.log(`Navigation audit: ${graph.cycles.length} reference cycles; ${graph.unlinked_candidates.length} unlinked candidates (not deletion authorization; use --json).`);
}
process.exitCode = report.errors.length ? 1 : 0;
