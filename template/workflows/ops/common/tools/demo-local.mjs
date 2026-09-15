#!/usr/bin/env node
/** Real disposable local deployment. No network, system installation, or existing-root writes. */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initialize } from "./opslib/cli.mjs";
import { writeJson, OpsError, readJson } from "./opslib/core.mjs";
import { register, putCredential } from "./opslib/model.mjs";
import { probeLocal } from "./opslib/transport.mjs";
import { compilePlan } from "./opslib/planner.mjs";
import { approval, apply } from "./opslib/execution.mjs";

export function run(output) {
  output = resolve(output);
  if (existsSync(output) && readdirSync(output).length) {
    throw new OpsError("demo output must be a new/empty directory, never your real state or target root");
  }
  mkdirSync(output, { recursive: true });
  const state = join(output, "controller");
  const target = join(output, "server");
  initialize(state, "demo-controller");
  const inventory = probeLocal();
  const platform = inventory.platform;
  if (!["linux", "darwin", "windows"].includes(platform)) throw new OpsError("unsupported platform");
  register(state, {
    hosts: [{
      host_id: "demo-local", display_name: "Disposable local demo", platform, transport: "local",
      connection: {}, root: target, identity: inventory.identity,
    }],
    projects: [{
      project_id: "app-a", display_name: "Demo APP A", kind: "app", service_type: null,
      source: { type: "local", location: join(output, "fixture-source"), revision: "demo-v1" },
    }],
  });
  const password = "DEMO-ONLY-$literal-quote\"-not-a-real-password";
  putCredential(state, {
    credential_id: "demo-auth", version: 1,
    purpose: "Disposable example only; never use in production",
    values: { username: "demo-admin", password },
  });
  const program = `import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = join(process.env.OPS_DATA_ROOT, "app", "storage");
mkdirSync(root, { recursive: true });
if (process.env.APP_USERNAME !== "demo-admin") throw new Error("username");
if (!process.env.APP_PASSWORD.startsWith("DEMO-ONLY-")) throw new Error("password");
writeFileSync(join(root, "record.json"), JSON.stringify({ version: "demo-v1", count: 1, environment_injected: true }));
`;
  const spec = {
    schema_version: 1, worker: "D", operation: "deploy",
    reason: "Explicit disposable local demo; only this new output tree is written. No network or system install.",
    rollback_note: "All files belong to the demo output. Keep evidence; no user data or shared service is touched.",
    deployments: [{
      deployment_id: "app-a-demo", project_id: "app-a", host_id: "demo-local", environment: "demo", instance: "main",
      layout: "flat", method: "native", version: "demo-v1",
      files: [{ path: "artifact/main.mjs", content: program }],
      native: { supervisor: "oneshot", argv: [process.execPath, "{{artifact}}/main.mjs"] },
      env: { "app.env": { APP_USERNAME: "{{credential:demo-auth@1:username}}", APP_PASSWORD: "{{credential:demo-auth@1:password}}" } },
      credential_refs: ["demo-auth@1"],
      health: [{ type: "file", path: "data/app/storage/record.json" }],
      backup: "The finite process exits before backup. Demo has no shared dependencies. Actual backup must be a separately approved action.",
      recovery: "Keep data/app/storage. Rerunning a different version requires a new approved plan.",
    }],
  };
  writeJson(join(output, "demo-spec.json"), spec);
  const plan = compilePlan(state, join(output, "demo-spec.json"));
  approval(state, plan.run_id, plan.plan_digest, "demo-user", "I authorize only this fresh disposable demo directory and the exact generated fixture plan.");
  const result = apply(state, plan.run_id);
  if (result.status !== "completed") throw new OpsError("demo did not fully complete: " + JSON.stringify(result));
  const local = join(state, "hosts", "demo-local", "deployments", "app-a-demo");
  const readme = readFileSync(join(target, "app-a", "README.md"), "utf8");
  if (readme.includes(password) || !readme.includes("demo-v1") || !readme.includes(join(target, "app-a", "data", "app", "storage"))) {
    throw new OpsError("demo README checks failed");
  }
  if (!readFileSync(join(local, "README.md"), "utf8").includes(password)) throw new OpsError("controller README missing password");
  if (!readFileSync(join(target, "app-a", "OPERATIONS.md"), "utf8").includes(password)) throw new OpsError("OPERATIONS.md missing password");
  if (readJson(join(local, "docs-receipt.json")).status !== "both-sides-verified") throw new OpsError("docs receipt incomplete");
  if (!readJson(join(target, "app-a", "data", "app", "storage", "record.json")).environment_injected) throw new OpsError("runtime data missing");
  const report = {
    ...result, output, target_readme: join(target, "app-a", "README.md"), controller_record: join(local, "README.md"),
    checks: {
      runtime_data_in_project: true, native_env_injection: true, server_readme_no_password: true,
      controller_plaintext_exact: true, server_operations_plaintext_exact: true, both_sides_verified: true,
    },
    scope: "real local filesystem and subprocess fixture; not a Docker/SSH/Windows-service production acceptance test",
  };
  writeJson(join(output, "DEMO-RESULT.json"), report);
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--output");
  try {
    if (i < 0 || !args[i + 1]) throw new OpsError("--output is required");
    process.stdout.write(JSON.stringify(run(args[i + 1]), null, 2) + "\n");
  } catch (exc) {
    process.stderr.write(String(exc.message || exc) + "\n");
    process.exit(2);
  }
}
