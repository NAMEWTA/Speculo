/** Explicit controller/server/project routing and bounded workspace paths. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative as pathRelative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, exact, identifier, noSymlinks, OpsError, readJson } from "./core.mjs";

export const WORKS = Object.freeze({
  controller: "I-initialize", access: "S-server-connect", server: "H-host-manage",
  project: "D-project-deploy", inventory: "V-inventory-view",
});
const WORKFLOW = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const MAX_JSON_BYTES = 16 * 1024 * 1024;

export function statePath(value) {
  if (typeof value !== "string" || !isAbsolute(value) || value.includes("\0") || value.split(/[\\/]/).includes("..")) {
    throw new OpsError("--state must be an explicit absolute path without traversal; never inferred from cwd");
  }
  const state = resolve(value);
  const rel = pathRelative(WORKFLOW, state);
  if (dirname(state) === state || rel === "" || (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel))) {
    throw new OpsError("state must be a dedicated runtime directory outside static workflow assets");
  }
  noSymlinks(state, { allowMissing: false });
  if (!statSync(state).isDirectory()) throw new OpsError("state is not a directory");
  return state;
}

export function readBoundedJson(path) {
  noSymlinks(path, { allowMissing: false });
  const st = statSync(path);
  if (!st.isFile() || st.size > MAX_JSON_BYTES) throw new OpsError("JSON file is not regular or exceeds 16 MiB");
  return readJson(path);
}

export function readRegistry(state) {
  statePath(state);
  const value = readBoundedJson(join(state, "status.json"));
  if (value.schema_version !== 3 || value.workflow !== "ops" || !Number.isSafeInteger(value.revision) || value.revision < 0) {
    throw new OpsError("workspace requires OPS status schema v3; legacy state must be imported, not overwritten");
  }
  if (!value.controller || !value.controller.controller_id) throw new OpsError("initialize the controller first");
  identifier(value.controller.controller_id, "controller_id");
  if (typeof value.controller.state_root !== "string" || resolve(value.controller.state_root) !== resolve(state)) throw new OpsError("controller state_root mismatch; do not silently adopt another workspace");
  for (const key of ["hosts", "projects", "deployments", "bindings", "allocations", "releases"]) {
    if (!value[key] || typeof value[key] !== "object" || Array.isArray(value[key])) throw new OpsError(`invalid registry map: ${key}`);
    if (Object.keys(value[key]).length > 10000) throw new OpsError(`registry map exceeds workspace bound: ${key}`);
    for (const id of Object.keys(value[key])) identifier(id, key);
  }
  for (const [id, h] of Object.entries(value.hosts)) {
    if (!h || h.host_id !== id || !["local", "ssh"].includes(h.transport)) throw new OpsError(`invalid host record: ${id}`);
  }
  for (const [id, p] of Object.entries(value.projects)) {
    if (!p || p.project_id !== id) throw new OpsError(`invalid project record: ${id}`);
  }
  for (const [id, d] of Object.entries(value.deployments)) {
    if (!d || d.deployment_id !== id || !Object.hasOwn(value.hosts, d.host_id) || !Object.hasOwn(value.projects, d.project_id)) {
      throw new OpsError(`orphan or invalid deployment: ${id}`);
    }
  }
  return value;
}

export function ids(value, label) {
  if (!Array.isArray(value) || new Set(value).size !== value.length) throw new OpsError(`${label} must be an array of distinct IDs`);
  return value.map((id) => identifier(id, label));
}

export function route(registry, context) {
  exact(context, new Set(["scope", "server_ids", "project_ids"]), new Set(["scope", "server_ids", "project_ids"]), "context");
  if (!Object.hasOwn(WORKS, context.scope)) throw new OpsError("scope must be controller, access, server, project or inventory");
  const servers = ids(context.server_ids, "server_ids");
  const projects = ids(context.project_ids, "project_ids");
  if (context.scope === "controller" && (servers.length || projects.length)) throw new OpsError("controller scope cannot target a server or project; use S/H/D");
  if (["access", "server"].includes(context.scope) && (servers.length !== 1 || projects.length)) throw new OpsError("S/H require exactly one explicit server and no project");
  if (context.scope === "project" && (!servers.length || projects.length !== 1)) throw new OpsError("D requires explicit server(s) and exactly one project; no last-used/cwd fallback");
  for (const id of servers) if (context.scope !== "access" && !Object.hasOwn(registry.hosts, id)) throw new OpsError(`unknown server: ${id}; enroll via S first`);
  for (const id of projects) if (!Object.hasOwn(registry.projects, id)) throw new OpsError(`unknown project: ${id}; explicitly register the project first`);
  return { scope: context.scope, work: WORKS[context.scope], controller_id: registry.controller.controller_id,
    server_ids: servers, project_ids: projects, host_ids: servers, registration_required: servers.filter((id) => !Object.hasOwn(registry.hosts, id)), note: "server maps to Host.host_id; controller is never an implicit local server" };
}

export function catalogUnlocked(state) {
  noSymlinks(join(state, ".locks", "catalog"));
  if (existsSync(join(state, ".locks", "catalog"))) throw new OpsError("catalog lock held; inspect the owner before generating a new snapshot");
}

export function fileDigest(path) {
  noSymlinks(path, { allowMissing: false });
  if (!statSync(path).isFile() || statSync(path).size > MAX_JSON_BYTES) throw new OpsError("file exceeds snapshot bound");
  return digest(readFileSync(path));
}

/** Pin identity and transport, not changeable host_services annotations. */
export function targetDigest(host) {
  if (!host) throw new OpsError("missing target host");
  const { host_id, root, identity, platform, transport, connection } = host;
  const known_hosts_digest = transport === "ssh" ? fileDigest(connection.known_hosts) : null;
  return digest({ host_id, root, identity, platform, transport, connection, known_hosts_digest });
}

export function containedPath(root, path) {
  if (typeof path !== "string" || !isAbsolute(path) || path.split(/[\\/]/).includes("..")) throw new OpsError("expected an absolute contained artifact path");
  const rel = pathRelative(resolve(root), resolve(path));
  if (!rel || rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) throw new OpsError("artifact path outside workspace");
  noSymlinks(path, { allowMissing: false });
  return resolve(path);
}
