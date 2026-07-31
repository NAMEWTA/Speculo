#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const START = '<!-- AUTO-INDEX-START -->';
const END = '<!-- AUTO-INDEX-END -->';

function usage(code = 0) {
  const out = code === 0 ? console.log : console.error;
  out(`Usage: node generate-index.mjs <workflow-path> [--check]\n\nRebuilds the unique AUTO-INDEX block from <Letter>-<slug> work directories.\n--check  Exit non-zero when INDEX.md would change.`);
  process.exit(code);
}

function parseArgs(argv) {
  let workflowPath;
  let check = false;
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--check') check = true;
    else if (!workflowPath) workflowPath = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!workflowPath) usage(2);
  return { workflowPath: path.resolve(workflowPath), check };
}

function extractFrontmatter(text, file) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error(`${file}: missing YAML frontmatter`);
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`${file}: unterminated YAML frontmatter`);
  return normalized.slice(4, end);
}

function parseSimpleYaml(block, file) {
  const result = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;
    const [, key, raw = ''] = match;
    if (raw === '>' || raw === '|') {
      const parts = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || !lines[i + 1].trim())) {
        i += 1;
        parts.push(lines[i].trim());
      }
      result[key] = raw === '>' ? parts.filter(Boolean).join(' ') : parts.join('\n').trim();
    } else {
      result[key] = raw.trim().replace(/^['"]|['"]$/g, '');
    }
  }
  if (!result.name || !result.description) {
    throw new Error(`${file}: frontmatter must contain non-empty name and description`);
  }
  return result;
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

async function collectWorks(workflowPath) {
  const entries = await fs.readdir(workflowPath, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory() && /^[A-Z]-[a-z0-9][a-z0-9-]*$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  const works = [];
  for (const dir of dirs) {
    const entryPath = path.join(workflowPath, dir, `${dir}.md`);
    let text;
    try {
      text = await fs.readFile(entryPath, 'utf8');
    } catch (error) {
      throw new Error(`${entryPath}: work directory requires same-named entry file`);
    }
    const fm = parseSimpleYaml(extractFrontmatter(text, entryPath), entryPath);
    works.push({ dir, name: fm.name.trim(), description: fm.description.replace(/\s+/g, ' ').trim() });
  }
  return works;
}

function render(works) {
  if (works.length === 0) return '';
  return works.map(({ dir, name, description }) => `- **${dir}** — ${name}：${description}`).join('\n');
}

async function main() {
  const { workflowPath, check } = parseArgs(process.argv.slice(2));
  const indexPath = path.join(workflowPath, 'INDEX.md');
  const original = (await fs.readFile(indexPath, 'utf8')).replace(/\r\n/g, '\n');
  if (count(original, START) !== 1 || count(original, END) !== 1) {
    throw new Error(`${indexPath}: requires exactly one ${START} and one ${END}`);
  }
  const start = original.indexOf(START);
  const end = original.indexOf(END);
  if (end < start) throw new Error(`${indexPath}: AUTO-INDEX markers are reversed`);

  const works = await collectWorks(workflowPath);
  const block = render(works);
  const next = `${original.slice(0, start)}${START}\n\n${block}${block ? '\n\n' : ''}${END}${original.slice(end + END.length)}`;

  if (next === original) {
    console.log(`AUTO-INDEX is current: ${path.relative(process.cwd(), indexPath) || indexPath} (${works.length} works)`);
    return;
  }
  if (check) {
    console.error(`AUTO-INDEX is stale: ${path.relative(process.cwd(), indexPath) || indexPath}`);
    process.exitCode = 1;
    return;
  }
  const tmp = `${indexPath}.tmp-${process.pid}`;
  await fs.writeFile(tmp, next, 'utf8');
  await fs.rename(tmp, indexPath);
  console.log(`Updated ${path.relative(process.cwd(), indexPath) || indexPath} (${works.length} works)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
