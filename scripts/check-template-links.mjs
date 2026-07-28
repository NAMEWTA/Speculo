#!/usr/bin/env node
/**
 * One-shot relative link checker for shipped template assets and repository skills.
 * Validates:
 *  1. [text](relative-path) markdown links to existing files
 *  2. <Path>{roots.xxx}/relative/path</Path> pointers that resolve under template/
 * Skips code fences for markdown links (but not Path tags — Path tags are real refs even in backticks).
 * Skips URLs, anchors, and books/ content corpora.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = join(packageRoot, "template");
const agentsRoot = join(packageRoot, ".agents");
const workspacePath = join(templateRoot, ".speculo", "workspace.json");

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const PATH_TAG_RE = /<Path>\{roots\.([a-zA-Z0-9_-]+)\}([^<]*)<\/Path>/g;
const SKIP_PREFIXES = ["http://", "https://", "mailto:", "#", "data:"];
const ALLOWED_ALIASES = new Set([
  "config",
  "speculo",
  "state",
  "commands",
  "skills",
  "workflows",
]);

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

function loadWorkspaceRoots() {
  try {
    const ws = JSON.parse(readFileSync(workspacePath, "utf8"));
    return ws.roots ?? {};
  } catch {
    return {};
  }
}

/**
 * Resolve a Path tag to a filesystem path under template/.
 * roots.workflows → template/workflows
 * roots.skills → template/skills
 * roots.commands → template/commands
 * roots.config → template (config.json lives at template/config.json conceptually; skip existence for runtime-only)
 * roots.speculo → template
 * roots.state → template/.speculo  (runtime; skip existence checks for dynamic {change} paths)
 */
function resolvePathTag(alias, rest, roots) {
  const base = roots[alias];
  if (!base) return { skip: true, reason: `unknown alias ${alias}` };

  // Dynamic placeholders cannot be resolved statically
  if (rest.includes("{") || rest.includes("}")) {
    return { skip: true, reason: "dynamic placeholder" };
  }

  // Runtime state paths are not present in template (created at init)
  if (alias === "state" || alias === "config") {
    return { skip: true, reason: "runtime root" };
  }

  // Map project-relative root (e.g. "speculo/workflows") to template/
  // workspace roots typically: workflows=speculo/workflows, skills=speculo/skills, etc.
  const mapped = base
    .replace(/^speculo\/?/, "")
    .replace(/\/$/, "");
  const rel = `${mapped}${rest}`.replace(/^\//, "");
  // Directory pointers (trailing /) — check dir exists
  const target = join(templateRoot, rel);
  return { skip: false, target, rel };
}

const broken = [];
const roots = [templateRoot, agentsRoot].filter((root) => {
  try {
    return statSync(root).isDirectory();
  } catch {
    return false;
  }
});
const workspaceRoots = loadWorkspaceRoots();

for (const file of roots.flatMap((root) => walk(root))) {
  const content = readFileSync(file, "utf8");
  // Skip legacy XML-container canonical files if any remain
  if (content.trim().startsWith("<canonical ")) continue;
  const base = dirname(file);
  const relFile = file.slice(packageRoot.length + 1);
  const underTemplate = file.startsWith(templateRoot + "/") || file.startsWith(templateRoot + "\\");

  for (const link of extractLinks(content)) {
    const target = resolve(base, link);
    try {
      statSync(target);
    } catch {
      broken.push({ file: relFile, link, kind: "md-link" });
    }
  }

  // Path tag existence checks only for shipped template assets.
  // .agents/ uses roots.skills/roots.agents as conceptual aliases that
  // don't map 1:1 onto template/ — still check escape hygiene everywhere.
  let pm;
  while ((pm = PATH_TAG_RE.exec(content)) !== null) {
    const alias = pm[1];
    const rest = pm[2] ?? "";
    // Documentation placeholders like {roots.xxx}, {roots.X}, or path/...
    if (alias === "xxx" || alias === "X" || rest.includes("xxx") || rest.includes("...")) continue;
    if (rest.includes("\\") || rest.split("/").includes("..")) {
      broken.push({
        file: relFile,
        link: pm[0],
        kind: "path-escape",
      });
      continue;
    }
    if (!underTemplate) continue;
    if (!ALLOWED_ALIASES.has(alias)) {
      broken.push({
        file: relFile,
        link: pm[0],
        kind: "path-alias",
      });
      continue;
    }
    const resolved = resolvePathTag(alias, rest, workspaceRoots);
    if (resolved.skip) continue;
    if (!existsSync(resolved.target)) {
      broken.push({
        file: relFile,
        link: pm[0],
        kind: "path-missing",
        target: resolved.rel,
      });
    }
  }
}

if (broken.length) {
  console.error(`Broken links: ${broken.length}`);
  for (const b of broken) {
    const extra = b.target ? ` (→ ${b.target})` : "";
    console.error(`  [${b.kind}] ${b.file} -> ${b.link}${extra}`);
  }
  process.exit(1);
}

console.log("framework link check: 0 broken markdown file links");
