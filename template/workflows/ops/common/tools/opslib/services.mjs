/** Typed shared-service allocation contracts. No guessing unknown service products. */
import { identifier, OpsError } from "./core.mjs";

export function secret(ref, field) {
  return "{{credential:" + ref + ":" + field + "}}";
}

export function allocationOperation(status, dep, a, p) {
  const adapter = p.adapter;
  const project = status.projects[dep.project_id];
  if (project.service_type !== adapter) throw new OpsError("allocation adapter differs from registered provider service_type");
  if (!p.admin_credential_ref || p.admin_credential_ref === a.credential_ref) {
    throw new OpsError("application credential must differ from administrator credential");
  }
  if (!dep.credential_refs.includes(p.admin_credential_ref)) {
    throw new OpsError("admin credential must be registered on the provider deployment");
  }
  if (!p.app_username || !/^[A-Za-z][A-Za-z0-9_-]{1,47}$/.test(p.app_username)) {
    throw new OpsError("application username needs an explicit safe name");
  }
  const service = dep.service;
  const common = {
    kind: adapter + "-allocation",
    provider_root: dep.root,
    compose_name: dep.compose_name,
    resource: a.resource_name,
    app_username: p.app_username,
    app_password: secret(a.credential_ref, "password"),
    admin_username: secret(p.admin_credential_ref, "username"),
    admin_password: secret(p.admin_credential_ref, "password"),
    owner_project_id: a.owner_project_id,
    environment: a.environment,
    credential_ref: a.credential_ref,
  };
  if (adapter === "mysql" || adapter === "redis") {
    if (dep.method !== "compose" || !service.compose_service) {
      throw new OpsError("built-in MySQL/Redis allocator requires a managed Compose provider and explicit compose_service");
    }
    common.compose_service = identifier(service.compose_service);
  }
  if (adapter === "mysql") {
    if (a.resource_kind !== "database" || !/^[a-z][a-z0-9_]{1,47}$/.test(a.resource_name)) {
      throw new OpsError("MySQL requires a safe logical database name");
    }
    const privileges = p.privileges ?? ["SELECT", "INSERT", "UPDATE", "DELETE"];
    const allowed = new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "INDEX", "REFERENCES", "DROP", "CREATE TEMPORARY TABLES", "EXECUTE"]);
    if (!privileges.length || privileges.some((x) => !allowed.has(x))) {
      throw new OpsError("unsupported MySQL grants; administrative/global privileges are forbidden");
    }
    common.privileges = privileges;
  } else if (adapter === "redis") {
    if (a.resource_kind !== "redis-acl" || !/^[a-zA-Z][a-zA-Z0-9:_-]+$/.test(p.prefix ?? "")) {
      throw new OpsError("Redis shared allocation requires an explicit key prefix and redis-acl resource");
    }
    if (service.acl_persistence !== "data/redis/acl/users.acl") {
      throw new OpsError("Redis provider must persist ACLs at data/redis/acl/users.acl and configure aclfile");
    }
    if (!["provider-wide", "application-export", "unverified"].includes(a.recovery_scope)) {
      throw new OpsError("Redis prefix/ACL is not proof of independently restorable data");
    }
    common.prefix = p.prefix;
  } else if (adapter === "minio") {
    if (a.resource_kind !== "bucket" || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(a.resource_name)) {
      throw new OpsError("MinIO allocation needs a valid bucket name");
    }
    if (!service.endpoint) throw new OpsError("MinIO provider requires explicit administrative endpoint");
    if (p.allow_secret_argv !== true) {
      throw new OpsError("mc admin user add exposes the new password briefly to privileged local process inspection; explicitly review allow_secret_argv or use an existing verified allocation");
    }
    if (!p.client_path) throw new OpsError("MinIO needs a reviewed installed mc client_path");
    Object.assign(common, { endpoint: service.endpoint, client_path: p.client_path, secret_argv_acknowledged: true });
  } else {
    throw new OpsError("unknown provider adapter: use a version-verified explicit existing-resource probe, not guessed commands");
  }
  return common;
}
