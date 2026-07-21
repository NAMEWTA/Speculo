#!/usr/bin/env node

/**
 * generate-index.mjs — 自动生成或更新 workflow 的 INDEX.md 中 AUTO-INDEX 区块
 *
 * 用法: node generate-index.mjs <workflow-path>
 *
 * 扫描 <workflow-path> 下所有 <大写字母>-<work_name>/ 目录，
 * 读取各入口文件 frontmatter 的 name 和 description，
 * 更新 INDEX.md 中 <!-- AUTO-INDEX-START --> ... <!-- AUTO-INDEX-END --> 区块。
 *
 * 如果 INDEX.md 中不存在 AUTO-INDEX 标记，则在文件末尾追加带标记的 work 列表。
 * INDEX.md 其余内容（frontmatter、XML 块、其他章节）原样保留不修改。
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- 参数解析 ---
const workflowPath = process.argv[2];
if (!workflowPath) {
  console.error('用法: node generate-index.mjs <workflow-path>');
  process.exit(1);
}

// --- 目录扫描：匹配 <大写字母>-* 的目录 ---
const WORK_DIR_RE = /^[A-Z]-/;

async function discoverWorks(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && WORK_DIR_RE.test(e.name))
    .map((e) => e.name)
    .sort();
}

// --- 解析 YAML frontmatter（仅提取 name/description） ---
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;

function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return null;

  const body = match[1];
  const name = (body.match(/^name:\s*(.+)$/m) ?? [])[1]?.trim() ?? '';
  const description = (body.match(/^description:\s*(.+)$/m) ?? [])[1]?.trim() ?? '';

  return { name, description };
}

// --- 构建 work 列表内容 ---
function buildWorkList(works) {
  const lines = [];
  if (works.length === 0) {
    lines.push('暂无 work 条目。');
  } else {
    for (const w of works) {
      lines.push(`- **${w.dirName}** — ${w.name}：${w.description}`);
    }
  }
  return lines.join('\n');
}

// --- AUTO-INDEX 标记 ---
const INDEX_START = '<!-- AUTO-INDEX-START -->';
const INDEX_END = '<!-- AUTO-INDEX-END -->';

// --- 主流程 ---
async function main() {
  const resolved = join(process.cwd(), workflowPath);
  const workflowDirName = basename(resolved);

  console.log(`扫描 workflow: ${resolved}`);

  const workDirs = await discoverWorks(resolved);
  console.log(`发现 ${workDirs.length} 个 work 条目: ${workDirs.join(', ') || '(无)'}`);

  const works = [];
  for (const dirName of workDirs) {
    const entryFile = join(resolved, dirName, `${dirName}.md`);
    try {
      const raw = await readFile(entryFile, 'utf-8');
      const fm = parseFrontmatter(raw);
      if (fm && fm.name) {
        works.push({ dirName, ...fm });
        console.log(`  ✓ ${dirName} → ${fm.name}`);
      } else {
        console.warn(`  ⚠ ${dirName}: 入口文件缺少 name/description`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`  ⚠ ${dirName}: 缺少入口文件 ${entryFile}`);
      } else {
        console.warn(`  ⚠ ${dirName}: 读取失败 (${err.message})`);
      }
    }
  }

  const indexPath = join(resolved, 'INDEX.md');
  const newWorkList = buildWorkList(works);

  let existingContent = '';
  try {
    existingContent = await readFile(indexPath, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  let newContent;
  if (existingContent.includes(INDEX_START) && existingContent.includes(INDEX_END)) {
    // 替换 AUTO-INDEX 区块内容
    const startIdx = existingContent.indexOf(INDEX_START) + INDEX_START.length;
    const endIdx = existingContent.indexOf(INDEX_END);
    newContent =
      existingContent.slice(0, startIdx) +
      '\n\n' +
      newWorkList +
      '\n\n' +
      existingContent.slice(endIdx);
    console.log('已更新现有 AUTO-INDEX 区块');
  } else if (existingContent) {
    // 文件存在但没有标记——在末尾追加
    newContent =
      existingContent.trimEnd() +
      '\n\n' +
      INDEX_START +
      '\n\n' +
      newWorkList +
      '\n\n' +
      INDEX_END +
      '\n';
    console.log('已追加 AUTO-INDEX 区块到文件末尾');
  } else {
    // 文件不存在——创建新文件
    newContent =
      '---\n' +
      `id: ${workflowDirName}/index\n` +
      'type: workflow-index\n' +
      `workflow: ${workflowDirName}\n` +
      'auto_generated: true\n' +
      '---\n\n' +
      `# ${workflowDirName} — Work Index\n\n` +
      '> 本文件由 `generate-index.mjs` 自动生成，**禁止手动编辑**。\n\n' +
      newWorkList +
      '\n';
    console.log('已创建新 INDEX.md');
  }

  await writeFile(indexPath, newContent, 'utf-8');
  console.log(`INDEX.md 已更新: ${indexPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
