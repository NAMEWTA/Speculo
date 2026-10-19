/** Strict resource contracts and atomic controller-side catalog operations. */
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRootConfirmation, assertUniqueMachine } from "./onboarding.mjs";
import { readFileSync } from "node:fs";
import {
  OpsError, digest, emptyStatus, exact, identifier, now, readJson, withLock, writeJson,
} from "./core.mjs";

const SCHEMAS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "schemas");

import { validateResourceSchema, validateResourceState, validateHostFields } from "./resource-validation.mjs";
export { deploymentRoot } from "./resource-validation.mjs";

function schema(name) {
  return JSON.parse(readFileSync(join(SCHEMAS, `${name}.schema.json`), "utf8"));
}
export function validate(value, name) { validateResourceSchema(value, schema(name), name); }
export function validateHost(host) { validate(host, "host"); validateHostFields(host); }
export function validateStatus(state) { validateResourceState(state, schema("status")); }

export function load(state) {
  const s = readJson(join(state, "status.json"));
  validateStatus(s);
  return s;
}

export function save(state, s, { bump = true } = {}) {
  validateStatus(s);
  if (bump) s.revision += 1;
  s.updated_at = now();
  writeJson(join(state, "status.json"), s);
}

export function ledgerLoad(state) {
  const p = join(state, "private", "credentials.json");
  if (!existsSync(p)) return { schema_version: 1, entries: {} };
  if (process.platform !== "win32" && (statSync(p).mode & 0o077)) {
    throw new OpsError("plaintext ledger permissions too broad; run chmod 600 explicitly");
  }
  return readJson(p);
}

export function putCredential(state, value) {
  exact(value, new Set(["credential_id", "version", "values", "purpose"]), new Set(["credential_id", "version", "values", "purpose"]), "credential");
  identifier(value.credential_id);
  if (!Number.isInteger(value.version) || value.version < 1 || !value.values || !Object.keys(value.values).length) {
    throw new OpsError("credential version/values invalid");
  }
  for (const [k, v] of Object.entries(value.values)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || typeof v !== "string" || !v || v.includes("\x00")) {
      throw new OpsError("credential fields must be named nonempty strings");
    }
  }
  return withLock(join(state, ".locks", "catalog"), { operation: "credential-import" }, () => {
    load(state);
    const ledger = ledgerLoad(state);
    const entries = ledger.entries[value.credential_id] ??= {};
    const version = String(value.version);
    if (version in entries) {
      if (digest(entries[version].values) !== digest(value.values)) {
        throw new OpsError("immutable credential version: use a new explicit version");
      }
      return { credential_ref: `${value.credential_id}@${version}`, status: "unchanged" };
    }
    entries[version] = { values: value.values, purpose: value.purpose, created_at: now() };
    writeJson(join(state, "private", "credentials.json"), ledger);
    return { credential_ref: `${value.credential_id}@${version}`, status: "recorded-not-rotated-on-server" };
  });
}

export function register(state, request) {
  exact(request, new Set(["hosts", "projects"]), new Set(), "registration");
  return withLock(join(state, ".locks", "catalog"), { operation: "register" }, () => {
    const s = load(state);
    for (const [group, idkey] of [["hosts", "host_id"], ["projects", "project_id"]]) {
      for (const item of request[group] ?? []) {
        const key = item[idkey];
        if (key in s[group] && digest(s[group][key]) !== digest(item)) {
          throw new OpsError(`registered identity is immutable through register: ${group}/${key}; use a reviewed migration`);
        }
        if (group === "hosts" && !(key in s.hosts)) {
          validateHost(item);
          assertUniqueMachine(s, item);
          validateRootConfirmation(state, item, { require: true, checkEndpoint: true });
        }
        s[group][key] = item;
      }
    }
    save(state, s);
    return { revision: s.revision, hosts: Object.keys(s.hosts), projects: Object.keys(s.projects) };
  });
}

export { emptyStatus };
