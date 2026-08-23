#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const template = join(root, "template");
const failures = [];

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`${label}: invalid JSON: ${error.message}`);
    return {};
  }
}

function safeRelative(path, label) {
  if (!path || typeof path !== "string" || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) {
    failures.push(`${label}: unsafe relative path ${String(path)}`);
    return false;
  }
  return true;
}

const corePath = join(template, ".speculo", "refresh-contract.json");
const core = readJson(corePath, "refresh contract");
if (core.schema_version !== 1 || core.runtime_root !== ".speculo") failures.push("refresh contract: expected schema v1 and .speculo runtime root");
for (const key of ["managed_roots", "managed_metadata", "reserved_runtime"]) {
  if (!Array.isArray(core[key])) failures.push(`refresh contract: ${key} must be an array`);
  else for (const path of core[key]) safeRelative(path, `refresh contract ${key}`);
}
for (const path of core.managed_roots ?? []) {
  if (path === ".speculo" || path.startsWith(".speculo/")) failures.push(`refresh contract: managed root overlaps runtime: ${path}`);
}
for (const path of core.managed_metadata ?? []) {
  if (!path.startsWith(".speculo/") || !(core.reserved_runtime ?? []).includes(path.slice(".speculo/".length))) {
    failures.push(`refresh contract: managed metadata is not reserved runtime: ${path}`);
  }
}

const workflowsRoot = join(template, "workflows");
for (const entry of readdirSync(workflowsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith("_") || !existsSync(join(workflowsRoot, entry.name, "INDEX.md"))) continue;
  const label = `workflow ${entry.name} runtime contract`;
  const contractPath = join(workflowsRoot, entry.name, "runtime-contract.json");
  if (!existsSync(contractPath)) {
    failures.push(`${label}: missing runtime-contract.json`);
    continue;
  }
  const contract = readJson(contractPath, label);
  if (contract.schema_version !== 1 || contract.workflow !== entry.name || contract.opaque_default !== "preserve-byte-for-byte") {
    failures.push(`${label}: invalid identity or opaque default`);
  }
  for (const path of contract.structured_state ?? []) {
    if (safeRelative(String(path).replaceAll("*", "segment"), label) && !path.startsWith(`.speculo/${entry.name}/`)) {
      failures.push(`${label}: structured state crosses ownership boundary: ${path}`);
    }
  }
  if (contract.config) {
    for (const key of ["path", "template", "baseline"]) safeRelative(contract.config[key], `${label} config.${key}`);
    if (!contract.config.path?.startsWith(`.speculo/${entry.name}/`) || !contract.config.baseline?.startsWith(".speculo/baselines/")) {
      failures.push(`${label}: config crosses ownership boundary`);
    }
    if (!existsSync(join(template, contract.config.template ?? ""))) failures.push(`${label}: config template is missing`);
  }
}

if (existsSync(join(template, "commands", "migrate-runtime-state.md")) || existsSync(join(template, "skills", "migrate-runtime-state"))) {
  failures.push("new installations must not ship migrate-runtime-state assets");
}

if (failures.length > 0) {
  console.error(`refresh contract validation failed (${failures.length})`);
  for (const failure of failures) console.error("  " + failure);
  process.exit(1);
}

console.log("refresh contract validation: OK");
