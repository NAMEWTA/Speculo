#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const allowed = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
/** Validator for the deliberately small emitted YAML profile; unsupported YAML is rejected, not guessed. */
export function validateSkill(content, directory) {
  const errors = [], fields = Object.create(null);
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) return ["missing YAML frontmatter"];
  for (const line of match[1].split(/\r?\n/).filter((s) => s.trim())) {
    const m = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
    if (!m) { errors.push("use single-line fields and a JSON-flow metadata map in emitted Skills"); continue; }
    const [, key, raw] = m;
    if (!allowed.has(key)) errors.push("unexpected field: " + key);
    if (key in fields) errors.push("duplicate field: " + key);
    try { fields[key] = key === "metadata" || raw.startsWith('"') ? JSON.parse(raw) : raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1).replaceAll("''", "'") : raw; }
    catch { errors.push("invalid scalar or metadata JSON: " + key); }
  }
  if (typeof fields.name !== "string" || fields.name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name) || fields.name !== directory) errors.push("name must be a lowercase kebab identifier matching the directory (1..64)");
  if (typeof fields.description !== "string" || !fields.description.trim() || fields.description.length > 1024 || ["|", ">"].includes(fields.description)) errors.push("description must be a single-line string (1..1024)");
  if (fields.compatibility !== undefined && (typeof fields.compatibility !== "string" || !fields.compatibility || fields.compatibility.length > 500)) errors.push("invalid compatibility");
  if (fields.metadata !== undefined && (!fields.metadata || typeof fields.metadata !== "object" || Array.isArray(fields.metadata) || Object.values(fields.metadata).some((v) => typeof v !== "string"))) errors.push("metadata must map string keys to string values");
  return errors;
}
export async function validateSkills(root) {
  const errors = []; let checked = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) { errors.push(`${path}: unexpected symlink in skill source`); continue; }
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === "SKILL.md") {
        checked++;
        for (const error of validateSkill(await readFile(path, "utf8"), basename(dirname(path)))) errors.push(`${path}: ${error}`);
      }
    }
  }
  await walk(join(root, "template"));
  return { checked, errors };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await validateSkills(resolve(process.argv[2] ?? "."));
  if (result.errors.length) { console.error(result.errors.join("\n")); process.exitCode = 1; }
  else console.log(`Agent Skills emitted-profile validation: ${result.checked} passed (not a host behavior certification)`);
}
