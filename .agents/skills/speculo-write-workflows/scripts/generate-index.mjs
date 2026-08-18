#!/usr/bin/env node

import { readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const START = '<!-- AUTO-INDEX-START -->';
const END = '<!-- AUTO-INDEX-END -->';
const WORK_DIRECTORY = /^[A-Z]-[a-z0-9][a-z0-9-]*$/;

function usage() {
  console.error('Usage: node generate-index.mjs <workflow-path> [--check]');
}

function parseArgs(argv) {
  let check = false;
  let workflowPath = null;

  for (const arg of argv) {
    if (arg === '--check') {
      check = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`unknown option: ${arg}`);
    }
    if (workflowPath) {
      throw new Error('only one workflow path may be provided');
    }
    workflowPath = arg;
  }

  if (!workflowPath) {
    usage();
    throw new Error('workflow path is required');
  }
  return { workflowPath: path.resolve(workflowPath), check };
}

function normalize(value) {
  return value.replace(/\r\n?/g, '\n');
}

function stripScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  return trimmed;
}

function parseFrontmatter(markdown, filePath) {
  const lines = normalize(markdown).split('\n');
  if (lines[0] !== '---') {
    throw new Error(`${filePath}: missing opening frontmatter delimiter`);
  }
  const closing = lines.indexOf('---', 1);
  if (closing === -1) {
    throw new Error(`${filePath}: missing closing frontmatter delimiter`);
  }

  const frontmatter = {};
  for (const rawLine of lines.slice(1, closing)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      throw new Error(`${filePath}: unsupported frontmatter line: ${rawLine}`);
    }
    frontmatter[match[1]] = stripScalar(match[2]);
  }
  return frontmatter;
}

function requireString(frontmatter, field, filePath) {
  const value = frontmatter[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${filePath}: frontmatter ${field} must be a non-empty string`);
  }
  return value.trim();
}

async function collectWorks(workflowPath) {
  const entries = await readdir(workflowPath, { withFileTypes: true });
  const directoryNames = entries
    .filter((entry) => entry.isDirectory() && WORK_DIRECTORY.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));

  const works = [];
  for (const directoryName of directoryNames) {
    const entryPath = path.join(workflowPath, directoryName, `${directoryName}.md`);
    let markdown;
    try {
      markdown = await readFile(entryPath, 'utf8');
    } catch (error) {
      throw new Error(`${entryPath}: cannot read work entry (${error.message})`);
    }
    const frontmatter = parseFrontmatter(markdown, entryPath);
    const name = requireString(frontmatter, 'name', entryPath);
    const description = requireString(frontmatter, 'description', entryPath);
    works.push({ directoryName, name, description });
  }
  return works;
}

function renderWorkList(works) {
  return works
    .map(({ directoryName, name, description }) => `- **${directoryName}** — ${name}：${description}`)
    .join('\n');
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function renderMarkerIndex(original, indexPath, works) {
  if (count(original, START) !== 1 || count(original, END) !== 1) {
    throw new Error(`${indexPath}: marker mode requires exactly one ${START} and one ${END}`);
  }
  const start = original.indexOf(START);
  const end = original.indexOf(END);
  if (end < start) {
    throw new Error(`${indexPath}: AUTO-INDEX markers are reversed`);
  }
  const block = renderWorkList(works);
  return `${original.slice(0, start)}${START}\n\n${block}${block ? '\n\n' : ''}${END}${original.slice(end + END.length)}`;
}

function renderWholeFileIndex(workflowName, works) {
  const block = renderWorkList(works);
  return `---\nid: ${workflowName}/index\ntype: workflow-index\nworkflow: ${workflowName}\nauto_generated: true\n---\n\n# ${workflowName} — Work Index\n\n> 本文件由 \`generate-index.mjs\` 自动生成，**禁止手动编辑**。\n\n${block}${block ? '\n' : ''}`;
}

function chooseMode(frontmatter, indexPath) {
  if (frontmatter.type === 'workflow') return 'markers';
  if (frontmatter.type === 'workflow-index' || frontmatter.auto_generated === true) return 'whole-file';
  throw new Error(
    `${indexPath}: unsupported INDEX mode; expected type=workflow, or type=workflow-index/auto_generated=true`,
  );
}

async function writeAtomically(filePath, content) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tempPath, content, 'utf8');
    await rename(tempPath, filePath);
  } finally {
    await rm(tempPath, { force: true });
  }
}

async function main() {
  const { workflowPath, check } = parseArgs(process.argv.slice(2));
  const workflowName = path.basename(workflowPath);
  const indexPath = path.join(workflowPath, 'INDEX.md');
  const original = normalize(await readFile(indexPath, 'utf8'));
  const frontmatter = parseFrontmatter(original, indexPath);
  const mode = chooseMode(frontmatter, indexPath);

  if (frontmatter.workflow !== workflowName) {
    throw new Error(
      `${indexPath}: frontmatter workflow must match directory ${JSON.stringify(workflowName)}; got ${JSON.stringify(frontmatter.workflow)}`,
    );
  }

  const works = await collectWorks(workflowPath);
  let next;
  if (mode === 'markers') {
    next = renderMarkerIndex(original, indexPath, works);
  } else {
    if (count(original, START) !== 0 || count(original, END) !== 0) {
      throw new Error(`${indexPath}: whole-file mode must not contain AUTO-INDEX markers`);
    }
    next = renderWholeFileIndex(workflowName, works);
  }

  if (next === original) {
    console.log(`INDEX is current: ${indexPath} (${works.length} works, ${mode})`);
    return;
  }

  if (check) {
    console.error(`STALE INDEX: ${indexPath} (${works.length} works, ${mode})`);
    process.exitCode = 1;
    return;
  }

  await writeAtomically(indexPath, next);
  console.log(`Updated INDEX: ${indexPath} (${works.length} works, ${mode})`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
