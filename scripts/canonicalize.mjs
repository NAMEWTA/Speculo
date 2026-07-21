#!/usr/bin/env node
/**
 * @deprecated 此脚本生成旧版 canonical 格式（<canonical> XML 容器 + <source-file> 标签）。
 * 新版格式使用纯 Markdown + 简单 XML 隔离标签，手动拼接即可。
 * 生成流程见 .agents/skills/speculo-write-canonical/SKILL.md。
 *
 * Usage (legacy):
 *   node scripts/canonicalize.mjs <dir> [--id <id>] [--type skill|command|workflow] [--output <file>]
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

// ── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.error("Usage: node scripts/canonicalize.mjs <capability-directory> [--id <id>] [--type skill|command|workflow] [--output <file>]");
  process.exit(args.length === 0 ? 1 : 0);
}

const inputDir = resolve(args[0]);
let capabilityId = null;
let capabilityType = null;
let outputFile = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--id" && i + 1 < args.length) capabilityId = args[++i];
  else if (args[i] === "--type" && i + 1 < args.length) capabilityType = args[++i];
  else if (args[i] === "--output" && i + 1 < args.length) outputFile = args[++i];
}

// Validate type
const VALID_TYPES = new Set(["skill", "command", "workflow"]);
if (capabilityType && !VALID_TYPES.has(capabilityType)) {
  console.error(`Invalid type: ${capabilityType}. Must be one of: skill, command, workflow`);
  process.exit(1);
}

// Validate input
let dirStat;
try { dirStat = statSync(inputDir); } catch { dirStat = null; }
if (!dirStat) {
  console.error(`Path not found: ${inputDir}`);
  process.exit(1);
}

// Single file: wrap it directly
if (dirStat.isFile()) {
  const content = readFileSync(inputDir, "utf8");
  const fm = parseFrontmatter(content);
  const id = capabilityId || (fm && (fm.id || fm.name)) || basename(inputDir, extname(inputDir));
  const type = capabilityType || (fm && fm.type) || "command";
  const relPath = basename(inputDir);
  const output = `<canonical id="${escapeXml(id)}" type="${escapeXml(type)}">\n  <source-file path="${escapeXml(relPath)}" order="1">\n${content.trimEnd()}\n  </source-file>\n</canonical>\n`;
  if (outputFile) {
    writeFileSync(outputFile, output, "utf8");
    console.error(`Wrote: ${outputFile} (1 source file)`);
  } else {
    process.stdout.write(output);
  }
  process.exit(0);
}

if (!dirStat.isDirectory()) {
  console.error(`Not a file or directory: ${inputDir}`);
  process.exit(1);
}

// ── Constants ───────────────────────────────────────────────────────────────

const EXCLUDE_DIRS = new Set(["_state", ".speculo"]);
const EXCLUDE_FILES = new Set([".gitkeep", ".DS_Store"]);
const ENTRY_CANDIDATES = ["SKILL.md", "WORKFLOW.md"];

const CONTENT_TYPE_MAP = {
  ".md":   "markdown",
  ".json": "json",
  ".mjs":  "javascript",
  ".js":   "javascript",
  ".sh":   "shell",
  ".bash": "shell",
  ".yml":  "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
};

// ── Auto-detect ─────────────────────────────────────────────────────────────

function detectIdAndType(dir) {
  // Try SKILL.md first
  const skillPath = join(dir, "SKILL.md");
  try {
    const content = readFileSync(skillPath, "utf8");
    const fm = parseFrontmatter(content);
    if (fm) {
      return { id: fm.id || fm.name || basename(dir), type: fm.type || "skill" };
    }
  } catch { /* not found */ }

  // Try WORKFLOW.md
  const wfPath = join(dir, "WORKFLOW.md");
  try {
    const content = readFileSync(wfPath, "utf8");
    const fm = parseFrontmatter(content);
    if (fm) {
      return { id: fm.id || fm.name || basename(dir), type: fm.type || "workflow" };
    }
  } catch { /* not found */ }

  // Assume command — use directory basename as id
  return { id: basename(dir), type: "command" };
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      let value = kv[2].trim();
      // Unquote if quoted
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      fm[key] = value;
    }
  }
  return fm;
}

// ── File discovery ──────────────────────────────────────────────────────────

function walk(dir, base) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      files.push(...walk(fullPath, base));
    } else {
      if (EXCLUDE_FILES.has(name)) continue;
      const relPath = relative(base, fullPath);
      files.push({ absPath: fullPath, relPath: relPath });
    }
  }
  return files;
}

function sortFiles(files, dirBase) {
  const dirName = basename(dirBase);
  const isEntry = (relPath) => {
    const name = basename(relPath);
    // Standard entry candidates (SKILL.md, WORKFLOW.md)
    if (ENTRY_CANDIDATES.includes(name)) return true;
    // Workflow-entry pattern: <DirName>.md at root level
    if (!relPath.includes("/") && name === `${dirName}.md`) return true;
    return false;
  };
  return files.sort((a, b) => {
    // Entry files first
    const aEntry = isEntry(a.relPath) ? 0 : 1;
    const bEntry = isEntry(b.relPath) ? 0 : 1;
    if (aEntry !== bEntry) return aEntry - bEntry;

    // Then by directory group: root > references > routes > atomic-skills > assets > scripts
    const groupOrder = (p) => {
      if (!p.includes("/")) return 0;               // root
      const top = p.split("/")[0];
      if (top === "references") return 1;
      if (top === "routes") return 2;
      if (top === "atomic-skills") return 3;
      if (top === "assets") return 4;
      if (top === "scripts") return 5;
      return 6;
    };
    const aGroup = groupOrder(a.relPath);
    const bGroup = groupOrder(b.relPath);
    if (aGroup !== bGroup) return aGroup - bGroup;

    // Alphabetical within group
    return a.relPath.localeCompare(b.relPath);
  });
}

function detectContentType(relPath) {
  const ext = extname(relPath).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "text";
}

// ── XML escaping ────────────────────────────────────────────────────────────

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Output ──────────────────────────────────────────────────────────────────

function buildCanonical(files, id, type) {
  const lines = [];
  lines.push(`<canonical id="${escapeXml(id)}" type="${escapeXml(type)}">`);

  files.forEach((file, index) => {
    const order = index + 1;
    const contentType = detectContentType(file.relPath);
    const content = readFileSync(file.absPath, "utf8");

    // Only omit content-type for default markdown
    const ctAttr = contentType === "markdown" ? "" : ` content-type="${escapeXml(contentType)}"`;

    lines.push(`  <source-file path="${escapeXml(file.relPath)}" order="${order}"${ctAttr}>`);
    // Preserve content verbatim — frontmatter and body together
    lines.push(content.trimEnd());
    lines.push(`  </source-file>`);
  });

  lines.push(`</canonical>`);
  return lines.join("\n") + "\n";
}

// ── Main ────────────────────────────────────────────────────────────────────

const detected = detectIdAndType(inputDir);
const id = capabilityId || detected.id;
const type = capabilityType || detected.type;

if (!type) {
  console.error("Could not detect type. Use --type skill|command|workflow.");
  process.exit(1);
}

const allFiles = walk(inputDir, inputDir);
if (allFiles.length === 0) {
  console.error(`No files found in: ${inputDir}`);
  process.exit(1);
}

const sorted = sortFiles(allFiles, inputDir);
const output = buildCanonical(sorted, id, type);

if (outputFile) {
  writeFileSync(outputFile, output, "utf8");
  console.error(`Wrote: ${outputFile} (${sorted.length} source files)`);
} else {
  process.stdout.write(output);
}
