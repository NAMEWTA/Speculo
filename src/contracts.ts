/** Current shared data contracts. Domain lifecycles remain owned by each domain. */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { safeRelativePath } from "./paths.js";

export type WorkflowManifest = {
  schema_version: 2; id: string; version: string; entry: "SKILL.md";
  persistent_knowledge: string[]; works: string[]; work_stages: Record<string, string[]>;
  stages: Array<{ id: string; after: string[]; inputs: string[]; outputs: string[]; risk: string; context_budget: number }>;
};
type Validator = ((value: unknown) => boolean) & { errors?: unknown };
let validators: Record<string, Validator> | undefined;
function schema(name: string, value: unknown, label: string): void {
  if (!validators) {
    // Source checkout, compiled npm package, and installed portable runtime.
    const urls = ["./contract-validators.cjs", "../template/lib/contract-validators.cjs", "../../template/lib/contract-validators.cjs"];
    const path = urls.map(url => fileURLToPath(new URL(url, import.meta.url))).find(existsSync);
    if (!path) throw new Error("missing-contract-validators: regenerate the method package");
    validators = createRequire(import.meta.url)(path) as Record<string, Validator>;
  }
  const validate = validators[name];
  if (!validate || !validate(value)) throw new Error(`${label}: ${JSON.stringify(validate?.errors ?? "missing validator")}`);
}

export function validateWorkflowManifest(value: unknown, domain?: string): asserts value is WorkflowManifest {
  schema("workflowManifest", value, "invalid-domain-manifest");
  const manifest = value as WorkflowManifest;
  const invalid = (detail: string): never => { throw new Error(`invalid-domain-manifest: ${manifest.id}: ${detail}`); };
  if (domain !== undefined && manifest.id !== domain) invalid("id does not match directory");
  const registered = new Set(manifest.works);
  if (Object.keys(manifest.work_stages).length !== registered.size || Object.keys(manifest.work_stages).some(key => !registered.has(key))) invalid("work_stages must register exactly the declared Works");
  for (const entry of manifest.works) {
    if (!safeRelativePath(entry) || !entry.startsWith(`${manifest.id}-`)) invalid(`Work belongs to another domain: ${entry}`);
  }
  for (const path of manifest.persistent_knowledge) {
    const portable = path.slice("<Path>{roots.state}/".length, -"</Path>".length).replace(/\/$/, "");
    if (!safeRelativePath(portable) || !portable.startsWith(`${manifest.id}/`) || portable.split("/").some(part => ["changes", "archive", "_state"].includes(part))) invalid(`invalid knowledge scope: ${path}`);
  }
  const stages = new Map(manifest.stages.map(stage => [stage.id, stage]));
  if (stages.size !== manifest.stages.length) invalid("duplicate stage identity");
  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) invalid(`stage dependency cycle at ${id}`);
    const stage = stages.get(id);
    if (!stage) invalid(`missing stage dependency: ${id}`);
    visiting.add(id);
    for (const dependency of stage!.after) visit(dependency);
    visiting.delete(id); visited.add(id);
  }
  for (const id of stages.keys()) visit(id);
}

export function validateCapabilityProfile(value: unknown): void {
  schema("capabilityProfile", value, "invalid-capability-profile");
}
