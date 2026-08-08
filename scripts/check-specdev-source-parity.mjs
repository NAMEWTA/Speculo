#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const manifestPath = path.join(repositoryRoot, "scripts/specdev-source-map.json");
const classifications = new Set(["direct", "adapted", "excluded", "superseded"]);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function isRepositoryRelative(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]/).includes("..")
  );
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];
const changed = [];
const sources = new Set();
const targetPaths = new Set();
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];

if (manifest.schema_version !== 1) errors.push("schema_version must be 1");
if (entries.length !== 26) errors.push(`expected 26 source entries, found ${entries.length}`);

const sourceRootExists = await exists(path.join(repositoryRoot, "temp/skills"));
for (const [index, entry] of entries.entries()) {
  const label = `entries[${index}]`;
  if (!isRepositoryRelative(entry.source) || !entry.source.endsWith("/SKILL.md")) {
    errors.push(`${label}.source must be a repository-relative SKILL.md path`);
    continue;
  }
  if (sources.has(entry.source)) errors.push(`${label}.source is duplicated: ${entry.source}`);
  sources.add(entry.source);

  if (!classifications.has(entry.classification)) {
    errors.push(`${label}.classification is invalid: ${entry.classification}`);
  }
  if (!Array.isArray(entry.targets)) {
    errors.push(`${label}.targets must be an array`);
  } else {
    for (const target of entry.targets) {
      if (!isRepositoryRelative(target)) {
        errors.push(`${label}.targets contains an invalid path: ${target}`);
        continue;
      }
      targetPaths.add(target);
      if (!(await exists(path.join(repositoryRoot, target)))) {
        errors.push(`${label}.targets does not exist: ${target}`);
      }
    }
  }
  if (entry.classification === "adapted" && !entry.integration_deltas?.length) {
    errors.push(`${label}.integration_deltas is required for adapted sources`);
  }
  if (
    ["excluded", "superseded"].includes(entry.classification) &&
    !String(entry.rationale ?? "").trim()
  ) {
    errors.push(`${label}.rationale is required for ${entry.classification} sources`);
  }
  if (!/^[a-f0-9]{64}$/.test(String(entry.source_sha256 ?? ""))) {
    errors.push(`${label}.source_sha256 must be a SHA-256 digest`);
  }

  if (sourceRootExists) {
    const sourcePath = path.join(repositoryRoot, entry.source);
    if (!(await exists(sourcePath))) {
      errors.push(`${label}.source does not exist: ${entry.source}`);
    } else {
      const digest = createHash("sha256")
        .update(await readFile(sourcePath))
        .digest("hex");
      if (digest !== entry.source_sha256) changed.push(entry.source);
    }
  }
}

if (changed.length) {
  errors.push(
    `source drift detected; audit these targets before updating hashes:\n${changed
      .sort()
      .map((source) => `  - ${source}`)
      .join("\n")}`,
  );
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `source parity: ${entries.length} sources, ${targetPaths.size} targets, ` +
      `${sourceRootExists ? "hashes checked" : "source hashes skipped"}`,
  );
}
