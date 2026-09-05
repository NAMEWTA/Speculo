import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathExists } from "./utils.js";

export type DoctorResult = { target: string; healthy: boolean; checks: Array<{ id: string; ok: boolean; message: string }> };

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function checkJson(checks: DoctorResult["checks"], root: string, id: string, predicate: (value: Record<string, unknown>) => boolean, message: string): Promise<void> {
  try {
    const value = record(await json(join(root, id)));
    const ok = value !== null && predicate(value);
    checks.push({ id: id + "-contract", ok, message: ok ? message : "invalid contract" });
  } catch {
    checks.push({ id: id + "-contract", ok: false, message: "invalid JSON" });
  }
}

export async function doctorSpeculo(targetArg = "."): Promise<DoctorResult> {
  const target = resolve(targetArg);
  const root = join(target, "speculo");
  const checks: DoctorResult["checks"] = [];
  const required = [".speculo/workspace.json", ".speculo/install.json", ".speculo/managed.json", ".speculo/kernel.json", ".speculo/capabilities.json", "config.json"];
  for (const item of required) checks.push({ id: item, ok: await pathExists(join(root, item)), message: (await pathExists(join(root, item))) ? "present" : "missing" });
  const installCheck = checks.find((check) => check.id === ".speculo/install.json");
  if (installCheck?.ok) {
    try {
      const install = await json(join(root, ".speculo/install.json")) as Record<string, unknown>;
      const ok = install.schema_version === 3 && typeof install.package_version === "string" && String(install.package_version).startsWith("1.");
      checks.push({ id: "install-contract", ok, message: ok ? "Speculo 1.x manifest" : "legacy or invalid manifest" });
    } catch { checks.push({ id: "install-contract", ok: false, message: "invalid JSON" }); }
  }
  const managedCheck = checks.find((check) => check.id === ".speculo/managed.json");
  if (managedCheck?.ok) {
    try {
      const managed = await json(join(root, ".speculo/managed.json")) as Record<string, unknown>;
      const ok = managed.schema_version === 2 && Array.isArray(managed.files);
      checks.push({ id: "managed-contract", ok, message: ok ? "managed manifest valid" : "invalid managed manifest" });
    } catch { checks.push({ id: "managed-contract", ok: false, message: "invalid JSON" }); }
  }
  if (checks.find((check) => check.id === ".speculo/workspace.json")?.ok) {
    await checkJson(checks, root, ".speculo/workspace.json", (value) => value.schema_version === 1 && record(value.roots) !== null, "workspace contract valid");
  }
  if (checks.find((check) => check.id === ".speculo/kernel.json")?.ok) {
    await checkJson(checks, root, ".speculo/kernel.json", (value) => value.schema_version === 1 && Array.isArray(value.change_lifecycle) && Array.isArray(value.risk_classes), "runtime kernel contract valid");
  }
  if (checks.find((check) => check.id === ".speculo/capabilities.json")?.ok) {
    await checkJson(checks, root, ".speculo/capabilities.json", (value) => {
      const model = record(value.model);
      const tools = record(value.tools);
      return value.schema_version === 1 && model !== null && typeof model.id === "string" && Number.isFinite(model.context_window) && tools !== null && Array.isArray(tools.classes);
    }, "capability profile valid");
  }
  const checkpointRoot = join(root, ".speculo", "context");
  if (await pathExists(checkpointRoot)) {
    checks.push({ id: "context-checkpoints", ok: true, message: "context directory present" });
  }
  return { target, healthy: checks.every((check) => check.ok), checks };
}
