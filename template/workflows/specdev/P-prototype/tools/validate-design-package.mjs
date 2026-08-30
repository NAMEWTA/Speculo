#!/usr/bin/env node

import { lstat, readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { extractPrototypeSources, materialize } from "./materialize-prototype.mjs";

const REQUIRED_HEADINGS = [
  "## Project Evidence",
  "## Style Decision",
  "## Foundation Tokens",
  "## Component and State Contract",
  "## Interaction Contract",
  "## Responsive Contract",
  "## Prototype Sources",
  "## Validation and Handoff",
];

function frontmatterValue(header, key) {
  const match = header.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  if (!match) return undefined;
  const value = match[1].trim();
  if (value === "null") return null;
  if (/^\d+$/.test(value)) return Number(value);
  return value.replace(/^['"]|['"]$/g, "");
}

function frontmatterArray(header, key) {
  const value = frontmatterValue(header, key);
  if (typeof value !== "string" || !value.startsWith("[") || !value.endsWith("]")) return [];
  return value.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function isSymlink(path) {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function validate(path, { allowDraft = false } = {}) {
  const designPath = resolve(path);
  if (await isSymlink(designPath)) throw new Error("design-system.md must not be a symlink");
  const markdown = await readFile(designPath, "utf8");
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const errors = [];
  if (!match) throw new Error("design-system.md requires YAML frontmatter");
  const [, header, body] = match;
  const meta = {
    schemaVersion: frontmatterValue(header, "schema_version"),
    artifact: frontmatterValue(header, "artifact"),
    change: frontmatterValue(header, "change"),
    designId: frontmatterValue(header, "design_id"),
    status: frontmatterValue(header, "status"),
    projectKind: frontmatterValue(header, "project_kind"),
    platforms: frontmatterArray(header, "platforms"),
    candidates: frontmatterArray(header, "style_candidates"),
    selectedStyle: frontmatterValue(header, "selected_style"),
    density: frontmatterValue(header, "density"),
    colorMode: frontmatterValue(header, "color_mode"),
    researchSnapshot: frontmatterValue(header, "research_snapshot"),
    prototypeFiles: frontmatterArray(header, "prototype_files"),
    updatedAt: frontmatterValue(header, "updated_at"),
  };

  const designRoot = dirname(designPath);
  const expectedDesignId = basename(designRoot);
  const expectedChange = basename(dirname(dirname(designRoot)));
  if (meta.schemaVersion !== 2 || meta.artifact !== "ui-design-system") errors.push("artifact/schema_version must be ui-design-system/2");
  if (!/^UI-\d{3,}$/.test(String(meta.designId ?? "")) || meta.designId !== expectedDesignId) errors.push("design_id must match the UI-NNN directory");
  if (meta.change !== expectedChange) errors.push("change must match the owning change directory");
  if (!new Set(["detecting", "selecting", "ready", "blocked"]).has(meta.status)) errors.push("invalid design status");
  if (!new Set(["existing", "new"]).has(meta.projectKind)) errors.push("project_kind must be existing or new");
  if (!meta.platforms.length || meta.platforms.some((value) => !new Set(["desktop", "web", "mobile"]).has(value))) errors.push("platforms must contain desktop, web, or mobile");
  if (meta.candidates.length < 2 || meta.candidates.length > 4 || new Set(meta.candidates).size !== meta.candidates.length) errors.push("style_candidates must contain 2-4 unique values");
  if (meta.researchSnapshot !== "49b5659") errors.push("research_snapshot must equal 49b5659");
  for (const required of ["final/index.html", "final/styles.css", "final/app.js"]) {
    if (!meta.prototypeFiles.includes(required)) errors.push(`prototype_files must include ${required}`);
  }
  if (typeof meta.updatedAt !== "string" || Number.isNaN(Date.parse(meta.updatedAt))) errors.push("updated_at must be ISO-8601");
  for (const heading of REQUIRED_HEADINGS) if (!body.includes(heading)) errors.push(`missing '${heading}'`);
  if (/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(markdown)) errors.push("design package contains a machine-specific absolute path");

  let sources;
  try {
    sources = extractPrototypeSources(markdown);
  } catch (error) {
    errors.push(error.message);
  }

  if (meta.status === "ready" && !allowDraft) {
    if (!meta.selectedStyle || !meta.candidates.includes(meta.selectedStyle)) errors.push("ready design requires selected_style from style_candidates");
    if (!new Set(["compact", "default", "comfortable", "touch"]).has(meta.density)) errors.push("ready design requires a density");
    if (!new Set(["light", "dark", "system", "both"]).has(meta.colorMode)) errors.push("ready design requires a color_mode");
    const comparisonIndex = join(designRoot, "comparison", "index.html");
    const variantsRoot = join(designRoot, "comparison", "variants");
    if (!(await isFile(comparisonIndex))) errors.push("ready design requires comparison/index.html");
    if (await isSymlink(comparisonIndex)) errors.push("comparison/index.html must not be a symlink");
    if (await isSymlink(join(designRoot, "comparison")) || await isSymlink(variantsRoot)) errors.push("comparison directories must not be symlinks");
    let variants = [];
    try {
      variants = (await readdir(variantsRoot)).filter((entry) => entry.endsWith(".html"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (variants.length < 2 || variants.length > 4) errors.push("ready design requires 2-4 comparison variant HTML files");
    for (const variant of variants) {
      if (await isSymlink(join(variantsRoot, variant))) errors.push(`comparison variant must not be a symlink: ${variant}`);
    }
    if (await isSymlink(join(designRoot, "final"))) errors.push("final directory must not be a symlink");
    if (sources) {
      try {
        await materialize(designPath, { check: true });
      } catch (error) {
        errors.push(error.message);
      }
      const html = sources.get("final/index.html") ?? "";
      const css = sources.get("final/styles.css") ?? "";
      const js = sources.get("final/app.js") ?? "";
      if (!/href=["']styles\.css["']/.test(html) || !/src=["']app\.js["']/.test(html)) errors.push("final HTML must reference relative styles.css and app.js");
      if (/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html)) errors.push("final HTML must not load remote scripts or styles");
      if (!css.includes(":focus-visible")) errors.push("final CSS must define :focus-visible");
      if (!css.includes("prefers-reduced-motion")) errors.push("final CSS must handle prefers-reduced-motion");
      if (!js.includes("addEventListener")) errors.push("final JS must implement an explicit interaction");
    }
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return meta;
}

const args = process.argv.slice(2);
const allowDraft = args.includes("--allow-draft");
const paths = args.filter((arg) => arg !== "--allow-draft");
if (paths.length !== 1) {
  console.error("usage: validate-design-package.mjs [--allow-draft] <design-system.md>");
  process.exitCode = 1;
} else {
  validate(paths[0], { allowDraft })
    .then((meta) => console.log(`valid ${meta.designId} (${meta.status})`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
