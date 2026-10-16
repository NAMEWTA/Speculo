import type { Asset } from "./assets.js";

export type RetainedWorkflow = { id: string; works: Array<{ id: string; stages: string[] }> };
export function validateRetainedWorkflows(value: unknown, installed: string[]): RetainedWorkflow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("invalid-retained-workflows");
  const ids = new Set<string>(), works = new Set<string>();
  for (const w of value) {
    if (!w || typeof w.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(w.id) || ids.has(w.id) || installed.includes(w.id) ||
        Object.keys(w).some(k => !["id", "works"].includes(k)) || !Array.isArray(w.works)) throw new Error("invalid-retained-workflow");
    ids.add(w.id);
    for (const work of w.works) {
      if (!work || typeof work.id !== "string" || !work.id.startsWith(w.id + "/") || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(work.id) || works.has(work.id) ||
          Object.keys(work).some(k => !["id", "stages"].includes(k)) || !Array.isArray(work.stages) ||
          work.stages.some((s: unknown) => typeof s !== "string" || !s.trim()) || new Set(work.stages).size !== work.stages.length) throw new Error("invalid-retained-work");
      works.add(work.id);
    }
  }
  return value;
}
export function retainedAssets(registry: RetainedWorkflow[]): Asset[] {
  return registry.flatMap(w => w.works.map(work => ({ id: work.id, stages: work.stages, kind: "work-skill" as const, domain: w.id, name: work.id.split("/")[1], entry: "", description: "inactive retained runtime registration" })));
}
