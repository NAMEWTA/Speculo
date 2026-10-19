#!/usr/bin/env node
/** Prepare a project-owned verification fragment. Does not execute the verifier or modify a target. */
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { digest, noSymlinks, relative, OpsError } from "./opslib/core.mjs";

export function verificationRecipe(request) {
  if (!request || request.schema_version !== 1 || typeof request.script !== "string" || !isAbsolute(request.script)) throw new OpsError("verification requires an explicit absolute project script");
  noSymlinks(request.script, { allowMissing: false });
  const stat = statSync(request.script);
  if (!stat.isFile() || stat.size > 16 * 1024 * 1024) throw new OpsError("verification script must be a regular file at most 16 MiB");
  const target = relative(request.target ?? "artifact/verify-business.mjs");
  if (!["artifact", "compose", "config", "scripts", "service", "data"].includes(target.split("/")[0])) throw new OpsError("verification target must use a deployment-owned files directory");
  const executable = target.startsWith("artifact/") ? "{{artifact}}/" + target.slice("artifact/".length) : "{{root}}/" + target;
  const args = request.args ?? [], inputs = request.inputs ?? [];
  if (!Array.isArray(args) || args.length > 40 || args.some(a => typeof a !== "string" || a.includes("\0") || a.includes("{{credential:"))) throw new OpsError("verification arguments must be explicit non-secret strings");
  if (!Array.isArray(inputs) || inputs.some(p => typeof p !== "string" || !isAbsolute(p))) throw new OpsError("verification inputs must be explicit absolute paths");
  for (const p of inputs) noSymlinks(p, { allowMissing: false });
  if (typeof request.success_pattern !== "string" || !request.success_pattern.length || request.success_pattern.length > 500) throw new OpsError("verification needs an explicit business success pattern");
  new RegExp(request.success_pattern);
  const timeout = request.timeout ?? 60;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 300) throw new OpsError("verification timeout must be 1..300 seconds");
  const node = request.node ?? "node";
  if (typeof node !== "string" || !node || /[\0\r\n]/.test(node) || node.startsWith("-")) throw new OpsError("verification Node executable required");
  return {
    schema_version: 1, artifact: "ops-project-verification-recipe", evidence_kind: "unverified",
    script_sha256: digest(readFileSync(request.script)),
    input_paths: [...new Set([request.script, ...inputs])],
    deployment_fragment: {
      files: [{ path: target, source: request.script, mode: 384 }],
      health: [{ type: "command", argv: [node, executable, ...args], timeout, stdout_pattern: request.success_pattern }],
    },
    note: "Merge into the existing D spec and frozen task. The project owner must test the real business path and a known-bad variant; this fragment is not authorization or execution evidence.",
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 3) throw new OpsError("Usage: business-verification.mjs PROJECT_RECIPE.json");
    console.log(JSON.stringify(verificationRecipe(JSON.parse(readFileSync(process.argv[2], "utf8"))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
