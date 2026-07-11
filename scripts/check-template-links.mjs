#!/usr/bin/env node
/**
 * One-shot relative link checker for shipped template assets and repository skills.
 * Validates [text](relative-path) markdown links to existing files.
 * Skips code fences, inline code, placeholders, URLs, and anchors.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = join(packageRoot, "template");
const agentsRoot = join(packageRoot, ".agents");

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const SKIP_PREFIXES = ["http://", "https://", "mailto:", "#", "data:"];

function stripNonProse(content) {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "");
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "books" && p.includes("M-mao-zedong-cognitive-os")) continue;
      out.push(...walk(p));
    } else if (/\.md$/i.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function extractLinks(content) {
  const links = [];
  const prose = stripNonProse(content);
  let m;
  while ((m = MD_LINK_RE.exec(prose)) !== null) {
    const raw = m[2].trim();
    if (!raw || SKIP_PREFIXES.some((p) => raw.startsWith(p))) continue;
    if (raw.includes("<") || raw.includes(">")) continue;
    if (!/\.(md|json|html|mjs|sh)$/i.test(raw.split("#")[0])) continue;
    links.push(raw.split("#")[0]);
  }
  return links;
}

const broken = [];
const roots = [templateRoot, agentsRoot].filter((root) => {
  try {
    return statSync(root).isDirectory();
  } catch {
    return false;
  }
});
for (const file of roots.flatMap((root) => walk(root))) {
  const content = readFileSync(file, "utf8");
  const base = dirname(file);
  for (const link of extractLinks(content)) {
    const target = resolve(base, link);
    try {
      statSync(target);
    } catch {
      broken.push({ file: file.slice(packageRoot.length + 1), link });
    }
  }
}

if (broken.length) {
  console.error(`Broken links: ${broken.length}`);
  for (const b of broken) {
    console.error(`  ${b.file} -> ${b.link}`);
  }
  process.exit(1);
}

console.log("framework link check: 0 broken markdown file links");
