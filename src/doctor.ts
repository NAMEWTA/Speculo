import { readAssetCatalog } from "./assets.js";
import { readProjectCoordination } from "./coordination.js";
import { locateProject, DEFAULT_ROOTS, INSTALL_ROOT } from "./paths.js";
import { pathExists } from "./utils.js";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256File } from "./manifest.js";
import { containedPath, safeRelativePath, validateWorkspace } from "./paths.js";
import { readTransaction, LOCK_NAME } from "./transaction.js";
import { inspectProjectedSkills } from "./agent-skills.js";

export type DoctorResult = {
  target: string; healthy: boolean; scope: "installation-integrity";
  notChecked: string[];
  checks: Array<{ id: string; ok: boolean; message: string }>;
};
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function nonempty(value: unknown): value is string { return typeof value === "string" && !!value.trim(); }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(nonempty); }
function version(value: unknown): value is string { return typeof value === "string" && /^2\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value); }

export async function doctorSpeculo(targetArg = "."): Promise<DoctorResult> {
  let target = resolve(targetArg);
  const checks: DoctorResult["checks"] = [];
  try { target = await locateProject(targetArg); } catch(error) { checks.push({id:"workspace",ok:false,message:String(error)}); }
  const add = (id: string, ok: boolean, message: string) => checks.push({ id, ok, message });
  async function json(path: string): Promise<Record<string, unknown> | null> {
    try {
      const absolute = await containedPath(target, INSTALL_ROOT + "/" + path);
      const value: unknown = JSON.parse(await readFile(absolute, "utf8"));
      if (!record(value)) throw new Error("expected JSON object");
      return value;
    } catch (error) { add(path, false, String(error)); return null; }
  }
  const config = await json("config.json");
  if (config) {
    const ok = config.schema_version === 1 && nonempty(config.language) && record(config.persistence) &&
      (config.persistence.root_override === null || safeRelativePath(config.persistence.root_override)) && record(config.defaults) &&
      typeof config.defaults.confirm_before_external_write === "boolean" && nonempty(config.defaults.report_language);
    add("config-contract", ok, ok ? "project config schema v1 valid" : "invalid project config fields");
  }
  const workspace = await json(".speculo/workspace.json");
  if (workspace) {
    try {
      validateWorkspace(workspace);
      for (const path of Object.values(workspace.roots)) await containedPath(target, path);

      add("workspace-contract", true, "roots are complete, contained and match the installed layout");
    } catch (error) { add("workspace-contract", false, String(error)); }
  }
  const kernel = await json(".speculo/kernel.json");
  if (kernel) {
    const ok = kernel.schema_version === 1 && kernel.runtime === "speculo-kernel" && strings(kernel.change_lifecycle) &&
      ["draft", "active", "blocked", "awaiting_user", "completed", "archived", "cancelled"].every((s) => (kernel.change_lifecycle as string[]).includes(s)) &&
      strings(kernel.risk_classes) && ["read-only", "local-reversible", "local-destructive", "external-mutation", "production-critical"].every((s) => (kernel.risk_classes as string[]).includes(s));
    add("kernel-contract", ok, ok ? "kernel lifecycle and risk contract valid" : "invalid kernel contract");
  }
  const capabilities = await json(".speculo/capabilities.json");
  if (capabilities) {
    const m = capabilities.model, t = capabilities.tools, e = capabilities.execution, mem = capabilities.memory;
    const ok = capabilities.schema_version === 1 && record(m) && nonempty(m.id) &&
      Number.isSafeInteger(m.context_window) && Number(m.context_window) >= (m.id === "unknown" ? 0 : 1) && Number.isSafeInteger(m.max_output) && Number(m.max_output) >= (m.id === "unknown" ? 0 : 1) &&
      strings(m.modalities) && strings(m.reasoning_levels) && record(t) && strings(t.classes) && typeof t.parallel === "boolean" && typeof t.programmatic === "boolean" &&
      record(e) && typeof e.sandbox === "boolean" && typeof e.network === "boolean" && strings(e.filesystem_roots) && ["none", "session", "persistent"].includes(String(e.data_retention)) &&
      record(mem) && ["compaction", "persistent", "cache"].every((key) => typeof mem[key] === "boolean");
    add("capability-contract", ok, ok ? "declared capability profile structurally valid (not a live probe)" : "invalid capability profile");
  }
  const install = await json(".speculo/install.json");
  let workflows: string[] = [];
  if (install) {
    const ok = install.schema_version === 4 && version(install.package_version) && strings(install.workflows) &&
      install.workflows.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) && new Set(install.workflows).size === install.workflows.length &&
      install.managed_manifest === ".speculo/managed.json" && install.config_baseline_schema === 1;
    add("install-contract", ok, ok ? "Speculo 2.x installation manifest valid" : "invalid installation manifest");
    if (ok) workflows = install.workflows as string[];
  }
  const managed = await json(".speculo/managed.json");
  if (managed) {
    const ok = managed.schema_version === 2 && version(managed.package_version) && managed.package_version === install?.package_version && Array.isArray(managed.files) && managed.files.length > 0;
    add("managed-contract", ok, ok ? "managed manifest schema v2 valid" : "invalid/empty managed manifest or package mismatch");
    if (ok) {
      const seen = new Set<string>();
      for (const file of managed.files as unknown[]) {
        if (!record(file) || !safeRelativePath(file.path) || seen.has(file.path) || !/^[a-f0-9]{64}$/.test(String(file.sha256)) ||
            !Number.isSafeInteger(file.bytes) || Number(file.bytes) < 0 || !nonempty(file.owner) || !["static", "baseline", "contract"].includes(String(file.kind)) || !version(file.package_version)) {
          add("managed-entry", false, "invalid or duplicate managed file record"); continue;
        }
        seen.add(file.path);
        try {
          const actual = await sha256File(await containedPath(target, INSTALL_ROOT + "/" + file.path));
          if (actual.bytes !== file.bytes || actual.sha256 !== file.sha256) throw new Error("managed content differs from recorded digest; init replaces managed edits");
        } catch (error) { add("managed-file:" + file.path, false, String(error)); }
      }
      for (const required of ["commands/status/COMMAND.md", ".speculo/workspace.json", ".speculo/kernel.json", ".speculo/AGENTS.md", "catalog.json"]) {
        add("managed-required:" + required, seen.has(required), seen.has(required) ? "recorded" : "missing managed entry; refresh the installation");
      }
      add("managed-integrity", !checks.some((c) => !c.ok && /^(managed-entry|managed-file:|managed-required:)/.test(c.id)), `verified ${seen.size} declared files; runtime evidence is not overwritten`);
    }
  }
  for (const workflow of workflows) {
    const manifest = await json(`workflows/${workflow}/manifest.json`), contract = await json(`workflows/${workflow}/runtime-contract.json`);
    try {
      await readFile(await containedPath(target, `${INSTALL_ROOT}/workflows/${workflow}/SKILL.md`));
      const ok = manifest?.schema_version === 2 && manifest.id === workflow && Array.isArray(manifest.stages) && contract?.schema_version === 1 && contract.workflow === workflow;
      add("workflow:" + workflow, ok, ok ? "entry, manifest and runtime contract present" : "workflow contract mismatch");
    } catch (error) { add("workflow:" + workflow, false, String(error)); }
  }
  try {
    const catalog=await readAssetCatalog(join(target, INSTALL_ROOT));
    add("catalog", true, "registered sources are valid");
    await readProjectCoordination(join(target, INSTALL_ROOT, '.speculo'),catalog);
    add("coordination",true,"optional project choices validated; no tools probed");
  } catch(error) { add("catalog-and-coordination", false, String(error)); }
  for (const check of await inspectProjectedSkills(target, workflows)) add(check.id, check.ok, check.message);
  try {
    if (await pathExists(join(target, LOCK_NAME))) {
      let detail = "unidentified lock; inspect owner.json, do not automatically delete it";
      try { const j = await readTransaction(target); detail = `transaction ${j.id}, phase ${j.phase}; after confirming its owner stopped: speculo recover ${JSON.stringify(target)} --transaction ${j.id}`; }
      catch (error) { detail += "; " + String(error); }
      add("refresh-transaction", false, detail);
    }
    for (const directory of ["", ".agents", ".agents/.speculo-transactions"]) {
      const path = directory ? await containedPath(target, directory) : target;
      const entries = await readdir(path).catch((error: NodeJS.ErrnoException) => { if(error.code === "ENOENT") return []; throw error; });
      for (const name of entries.filter(name => directory.endsWith("transactions") || name.startsWith(".speculo-file-")))
        add("refresh-residue:" + directory + "/" + name, false, "preserve residue; inspect transaction evidence before cleanup");
    }
  } catch (error) { add("project-directory", false, String(error)); }
  return { target, healthy: checks.every((c) => c.ok), scope: "installation-integrity", notChecked: ["domain-state-transitions", "live-service-health", "agent-behavior", "host-skill-invocation"], checks };
}
