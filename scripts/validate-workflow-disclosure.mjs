#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
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
    requireText(relative, content, /读取范围/, 'read-scope section');
    requireText(relative, content, /common\/rules\/activation-and-memory\.md/, 'memory protocol pointer');
  }
}

const targetedForbidden = [
  ['template/workflows/ops/I-intake-and-assess/I-intake-and-assess.md', /读取所有既有|读取全部/],
  ['template/workflows/ops/P-plan-and-approve/P-plan-and-approve.md', /读取所有既有|读取全部/],
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

if (errors.length) {
  console.error(`workflow disclosure validation failed: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('workflow disclosure validation: ok');
