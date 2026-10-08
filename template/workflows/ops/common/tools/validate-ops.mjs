#!/usr/bin/env node
/** Static/semantic validation bridge; no target connections or mutations. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateStatus } from "./opslib/model.mjs";
import { WORKS } from "./opslib/workspace.mjs";

const tools = dirname(fileURLToPath(import.meta.url));
const root = resolve(tools, "../..");
const args = process.argv.slice(2);

try {
  if (args.length === 1 && args[0] === "--self-check") {
    const works = readdirSync(root, { withFileTypes: true })
      .filter((x) => x.isDirectory() && !["common", "_state", "__pycache__"].includes(x.name))
      .map((x) => x.name).sort();
    const expected = Object.values(WORKS).sort();
    if (JSON.stringify(works) !== JSON.stringify(expected)) throw new Error("OPS Work directories differ from explicit scope router");
    const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
    const stages = manifest.stages.map((s) => s.id).sort();
    if (new Set(stages).size !== stages.length || JSON.stringify(stages) !== JSON.stringify(works.map((w) => w.slice(2)).sort())) throw new Error("manifest stages differ from Work entries");
    for (const stage of manifest.stages) for (const id of stage.after) if (!stages.includes(id)) throw new Error("unknown manifest prerequisite " + id);
    for (const id of works) {
      const text = readFileSync(join(root, id, id + ".md"), "utf8");
      if (!text.includes("type: workflow-entry") || !text.includes("读取范围") || !text.includes("id: ops/" + id.slice(2))) throw new Error("invalid work " + id);
    }
    for (const file of ["INDEX.md", "README.md", "manifest.json", "runtime-contract.json", "common/USAGE.md", "common/WORKSPACE-USAGE.md", "common/CAPABILITIES.md", "common/templates/FLEET.html", "common/schemas/fleet-view.schema.json", "common/schemas/task-request.schema.json", "common/schemas/server-check.schema.json", "common/tools/opslib/execution.mjs", "common/tools/opslib/tasks.mjs", "common/tools/opslib/fleet.mjs", "common/tools/opslib/onboarding.mjs", "common/tools/server-discover.sh", "common/schemas/server-discovery.schema.json", "common/schemas/root-confirmation.schema.json", "common/rules/host-root-and-onboarding.md"]) {
      if (!existsSync(join(root, file))) throw new Error("missing " + file);
    }
    for (const name of readdirSync(join(root, "common/schemas")).filter((x) => x.endsWith(".json"))) {
      JSON.parse(readFileSync(join(root, "common/schemas", name), "utf8"));
    }
    JSON.parse(readFileSync(join(root, "common/toolchains/volta-linux.json"), "utf8"));
    validateStatus(JSON.parse(readFileSync(join(root, "_state/status.json"), "utf8")));
    console.log("resource schema valid");
    console.log(JSON.stringify({ valid: true, version: manifest.version, workers: works, schema_version: 3,
      scope: "static and empty-resource-schema check; not live target acceptance" }, null, 2));
  } else if (args.length === 2 && ["--state-root", "--state"].includes(args[0])) {
    const p = spawnSync(process.execPath, [join(tools, "ops.mjs"), "--state", resolve(args[1]), "validate"], { encoding: "utf8", timeout: 30000 });
    if (p.status !== 0) throw new Error(p.stdout + p.stderr);
    console.log(p.stdout.trim());
  } else {
    throw new Error("Usage: validate-ops.mjs --self-check | --state-root ABSOLUTE_STATE. Legacy change flags are not supported.");
  }
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
