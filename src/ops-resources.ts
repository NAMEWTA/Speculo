/** OPS v3 resource state validation. Legacy workflows keep their change-based contracts. */
import { posix, win32 } from "node:path";
import type { JsonObject } from "./config.js";

export function validateOpsResourceSchema(value: unknown, schema: JsonObject): void {
  function walk(v: any, s: any, label: string): void {
    if (s.$ref) {
      let node: any = schema;
      for (const part of String(s.$ref).replace(/^#\//, "").split("/")) node = node[part];
      walk(v, node, label); return;
    }
    if (s.oneOf) {
      let passed = 0;
      for (const branch of s.oneOf) { try { walk(v, branch, label); passed++; } catch {} }
      if (passed !== 1) throw new Error(`${label}: oneOf contract`);
    }
    const types: Record<string, (x: any) => boolean> = {
      object: x => x !== null && typeof x === "object" && !Array.isArray(x), array: Array.isArray,
      string: x => typeof x === "string", integer: Number.isInteger, boolean: x => typeof x === "boolean",
      null: x => x === null, number: x => typeof x === "number" && Number.isFinite(x),
    };
    if (s.type && !(Array.isArray(s.type) ? s.type : [s.type]).some((t: string) => types[t](v))) throw new Error(`${label}: invalid type`);
    if ("const" in s && v !== s.const) throw new Error(`${label}: invalid constant`);
    if (s.enum && !s.enum.includes(v)) throw new Error(`${label}: invalid enum`);
    if (typeof v === "string") {
      if (s.pattern && !new RegExp(s.pattern).test(v)) throw new Error(`${label}: invalid pattern`);
      if (v.length < (s.minLength ?? 0) || v.length > (s.maxLength ?? Infinity)) throw new Error(`${label}: length`);
    }
    if (typeof v === "number" && (v < (s.minimum ?? -Infinity) || v > (s.maximum ?? Infinity))) throw new Error(`${label}: range`);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const k of s.required ?? []) if (!(k in v)) throw new Error(`${label}: missing ${k}`);
      for (const [k, item] of Object.entries(v)) {
        if (s.propertyNames) walk(k, s.propertyNames, `${label}.<key>`);
        if (s.properties && k in s.properties) walk(item, s.properties[k], `${label}.${k}`);
        else if (s.additionalProperties === false) throw new Error(`${label}: unknown ${k}`);
        else if (typeof s.additionalProperties === "object") walk(item, s.additionalProperties, `${label}.${k}`);
      }
    }
    if (Array.isArray(v)) {
      if (v.length < (s.minItems ?? 0)) throw new Error(`${label}: minItems`);
      if (s.uniqueItems && new Set(v.map(x => JSON.stringify(x))).size !== v.length) throw new Error(`${label}: duplicate`);
      v.forEach((item, i) => walk(item, s.items ?? {}, `${label}[${i}]`));
    }
  }
  walk(value, schema, "Ops resource state");
}

export function validateOpsResources(value: JsonObject, schema: JsonObject): void {
  validateOpsResourceSchema(value, schema);
  const s = value as Record<string, any>;
  const physical = new Set<string>();
  const slots = new Set<string>();
  const hostRoots: Array<{identity: string; root: string; platform: string}> = [];
  const occupied: Array<{identity: string; path: string; windows: boolean}> = [];
  for (const [id, h] of Object.entries(s.hosts) as [string, any][]) {
    if (id !== h.host_id) throw new Error("Ops host index identity mismatch");
    const p = h.platform === "windows" ? win32 : posix;
    if (!p.isAbsolute(h.root) || h.root.split(/[\\/]/).includes("..") || p.normalize(h.root) !== h.root) throw new Error("Ops unsafe host root");
    if (["/", "/etc", "/usr", "/var", "/home", "/root", "/tmp", "/srv", "/opt", "/mnt"].includes(h.root)) throw new Error("Ops root must be a dedicated child");
    if (h.platform === "windows" && (h.root.startsWith("\\\\") || win32.parse(h.root).root === h.root)) throw new Error("Ops UNC/drive root rejected");
    if (h.platform === "windows" && (h.root.slice(2).includes(":") || ["c:\\windows", "c:\\program files", "c:\\users", "c:\\programdata"].includes(h.root.toLowerCase()))) throw new Error("Ops system/ADS host root rejected");
    if (h.transport === "local" && Object.keys(h.connection).length !== 0) throw new Error("Ops local connection must be empty");
    if (h.transport === "ssh" && ["hostname", "username", "known_hosts", "python"].some(k => !h.connection[k])) throw new Error("Ops SSH connection incomplete");
    const key = h.identity + ":" + (h.platform === "windows" ? h.root.toLowerCase() : h.root);
    if (physical.has(key)) throw new Error("Ops duplicate physical host/root"); physical.add(key);
    for (const other of hostRoots) {
      if (other.identity !== h.identity) continue;
      if (other.platform !== h.platform) throw new Error("Ops same identity has inconsistent platform");
      const a = h.platform === "windows" ? h.root.toLowerCase() : h.root;
      const b = h.platform === "windows" ? other.root.toLowerCase() : other.root;
      const sep = h.platform === "windows" ? "\\" : "/";
      if (a.startsWith(b + sep) || b.startsWith(a + sep)) throw new Error("Ops overlapping registered host roots");
    }
    hostRoots.push({identity:h.identity,root:h.root,platform:h.platform});
  }
  for (const [id, project] of Object.entries(s.projects) as [string, any][]) {
    if (id !== project.project_id) throw new Error("Ops project index identity mismatch");
    if (project.kind === "shared-service" && !project.service_type) throw new Error("Ops provider type missing");
  }
  for (const [id, d] of Object.entries(s.deployments) as [string, any][]) {
    const h = s.hosts[d.host_id];
    if (!h || !s.projects[d.project_id] || id !== d.deployment_id) throw new Error("Ops orphan deployment");
    const p = h.platform === "windows" ? win32 : posix;
    const expected = d.layout === "flat" ? p.join(h.root, d.project_id) : p.join(h.root, d.project_id, "instances", d.environment, d.instance);
    if (d.root !== expected) throw new Error("Ops deployment root violates project persistence policy");
    const slot = h.identity + ":" + (h.platform === "windows" ? expected.toLowerCase() : expected);
    if (slots.has(slot)) throw new Error("Ops deployments overlap directories"); slots.add(slot);
    for (const other of occupied) {
      if (other.identity !== h.identity) continue;
      const a = h.platform === "windows" ? expected.toLowerCase() : expected;
      const b = other.windows ? other.path.toLowerCase() : other.path;
      const sep = h.platform === "windows" ? "\\" : "/";
      if (a.startsWith(b + sep) || b.startsWith(a + sep)) throw new Error("Ops overlapping flat/instances roots");
    }
    occupied.push({identity:h.identity,path:expected,windows:h.platform==="windows"});
    for (const item of d.storage) {
      const relative = p.relative(d.root, item.path);
      if (!relative || relative.startsWith("..") || p.isAbsolute(relative) || item.path.split(/[\\/]/).includes("..")) throw new Error("Ops persistence escapes project root");
    }
  }
  const logical = new Set<string>();
  for (const [id, a] of Object.entries(s.allocations) as [string, any][]) {
    const provider = s.deployments[a.provider_deployment_id];
    if (id !== a.allocation_id || !provider || !s.projects[a.owner_project_id] || s.projects[provider.project_id].kind !== "shared-service") throw new Error("Ops orphan/non-provider allocation");
    const key = `${a.provider_deployment_id}:${a.resource_kind}:${a.resource_name}`;
    if (a.status !== "retired" && logical.has(key)) throw new Error("Ops duplicate logical allocation");
    if (a.status !== "retired") logical.add(key);
  }
  const edges = new Map<string, Set<string>>();
  for (const [id, b] of Object.entries(s.bindings) as [string, any][]) {
    const d = s.deployments[b.consumer_deployment_id];
    if (id !== b.binding_id || !d) throw new Error("Ops orphan binding");
    if (b.mode === "shared") {
      const a = s.allocations[b.allocation_id];
      if (!a || a.provider_deployment_id !== b.provider_deployment_id || a.credential_ref !== b.credential_ref) throw new Error("Ops binding allocation mismatch");
      if ((a.owner_project_id !== d.project_id || a.environment !== d.environment) && !a.shared_owners.includes(d.project_id)) throw new Error("Ops cross-owner sharing not authorized");
      if (a.status === "retired" && b.status === "active") throw new Error("Ops active binding references retired allocation");
      if (!edges.has(b.consumer_deployment_id)) edges.set(b.consumer_deployment_id, new Set());
      edges.get(b.consumer_deployment_id)!.add(b.provider_deployment_id);
    } else if ((b.mode === "external" || b.mode === "dedicated") && (b.allocation_id !== null || b.provider_deployment_id !== null)) throw new Error("Ops external/dedicated binding claims shared provider data");
    if (d.status === "retired" && b.status === "active") throw new Error("Ops retired consumer has active binding");
  }
  const done = new Set<string>();
  function visit(id: string, trail: Set<string>): void {
    if (trail.has(id)) throw new Error("Ops dependency cycle");
    if (done.has(id)) return;
    for (const next of edges.get(id) ?? []) visit(next, new Set([...trail, id]));
    done.add(id);
  }
  for (const id of edges.keys()) visit(id, new Set());
}
