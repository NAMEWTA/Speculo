/** Shared domain examples for installer and standalone boundaries; no filesystem fixtures. */
import { emptyStatus } from "../tools/opslib/core.mjs";

export function resourceState() {
  const s = emptyStatus();
  s.hosts["node-a"] = { host_id: "node-a", display_name: "Node A", platform: "linux", transport: "local", root: "/srv/ops", identity: "a".repeat(64), connection: {} };
  s.projects["app-a"] = { project_id: "app-a", display_name: "APP A", kind: "app", service_type: null, source: { type: "local", location: "/source", revision: "v1" } };
  s.deployments["app-a-prod"] = {
    deployment_id: "app-a-prod", project_id: "app-a", host_id: "node-a", environment: "prod", instance: "main", layout: "flat", method: "native",
    version: "v1", observed_version: "v1", root: "/srv/ops/app-a", status: "completed", installed_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    run_id: "run-example", compose_name: null, storage: [{ component: "app", purpose: "storage", path: "/srv/ops/app-a/data/app/storage" }],
    commands: { start: [], stop: [], verify: [] }, credential_refs: [], backup: "project backup", recovery: "project recovery", notes: [], source: s.projects["app-a"].source, service: {},
  };
  return s;
}

export function resourceCases() {
  const cases = [{ name: "empty initialized schema", valid: true, value: emptyStatus() }, { name: "native deployment with owned storage", valid: true, value: resourceState() }];
  const add = (name, change, valid = false) => { const s = resourceState(); change(s); cases.push({ name, valid, value: s }); };
  add("explicit SSH connection", s => Object.assign(s.hosts["node-a"], { transport: "ssh", connection: { hostname: "server.example", username: "deploy", known_hosts: "/keys/known_hosts", node: "/usr/bin/node" } }), true);
  add("Windows owned storage", s => { Object.assign(s.hosts["node-a"], { platform: "windows", root: "C:\\Ops" }); const d = s.deployments["app-a-prod"]; d.root = "C:\\Ops\\app-a"; d.storage[0].path = d.root + "\\data\\storage"; }, true);
  add("unsupported state version", s => { s.schema_version = 2; });
  add("unknown state field", s => { s.foreign = true; });
  add("persistent path escapes project", s => { s.deployments["app-a-prod"].storage[0].path = "/tmp/unowned"; });
  add("deployment root override", s => { s.deployments["app-a-prod"].root = "/srv/ops/other"; });
  add("orphan deployment", s => { delete s.hosts["node-a"]; });
  add("index identity differs", s => { s.projects["app-a"].project_id = "other"; });
  add("duplicate physical root", s => { s.hosts["node-b"] = { ...s.hosts["node-a"], host_id: "node-b" }; });
  add("nested physical root", s => { s.hosts["node-b"] = { ...s.hosts["node-a"], host_id: "node-b", root: "/srv/ops/child" }; });
  add("host traversal", s => { s.hosts["node-a"].root = "/srv/ops/../other"; });
  add("system root", s => { s.hosts["node-a"].root = "/etc"; });
  add("Windows ADS", s => { Object.assign(s.hosts["node-a"], { platform: "windows", root: "C:\\Ops:stream" }); });
  add("local host with SSH arguments", s => { s.hosts["node-a"].connection = { hostname: "server.example" }; });
  add("SSH command instead of executable", s => { Object.assign(s.hosts["node-a"], { transport: "ssh", connection: { hostname: "server.example", username: "deploy", known_hosts: "/keys/known_hosts", node: "/usr/bin/node;echo" } }); });
  add("overlapping flat and instances roots", s => { const d = s.deployments["app-a-prod"]; s.deployments["app-a-test"] = { ...d, deployment_id: "app-a-test", layout: "instances", environment: "test", root: "/srv/ops/app-a/instances/test/main", storage: [] }; });
  add("strict persistence policy disabled", s => { s.policies.strict_docker_root = false; });
  add("shared service without type", s => { s.projects["app-a"].kind = "shared-service"; });
  add("foreign binding", s => { s.bindings["binding-a"] = { binding_id: "binding-a", consumer_deployment_id: "absent", mode: "external", provider_deployment_id: null, allocation_id: null, endpoint: "https://example.invalid", credential_ref: "app-secret@1", status: "active", component: "app", network: "external" }; });
  const shared = () => {
    const s = resourceState();
    s.projects["mysql-main"] = { project_id: "mysql-main", display_name: "MySQL", kind: "shared-service", service_type: "mysql", source: { type: "image", location: "mysql@sha256:" + "b".repeat(64), revision: "pinned" } };
    s.deployments["mysql-prod"] = { ...s.deployments["app-a-prod"], deployment_id: "mysql-prod", project_id: "mysql-main", method: "compose", root: "/srv/ops/mysql-main", storage: [], compose_name: "ops-mysql-prod", source: s.projects["mysql-main"].source };
    s.allocations["app-db"] = { allocation_id: "app-db", provider_deployment_id: "mysql-prod", owner_project_id: "app-a", environment: "prod", data_group: "app-a-prod", resource_kind: "database", resource_name: "app_a_prod", credential_ref: "app-auth@1", shared_owners: [], status: "active", recovery_scope: "logical", notes: "Explicit logical test allocation" };
    s.bindings["app-db-binding"] = { binding_id: "app-db-binding", consumer_deployment_id: "app-a-prod", mode: "shared", provider_deployment_id: "mysql-prod", allocation_id: "app-db", endpoint: "mysql-main:3306", credential_ref: "app-auth@1", status: "active", component: "mysql", network: "explicit-intranet" };
    return s;
  };
  const sharedCase = (name, change = () => {}, valid = false) => { const s = shared(); change(s); cases.push({ name, valid, value: s }); };
  sharedCase("shared database uses its owned logical allocation", undefined, true);
  sharedCase("binding does not own another application's database", s => { s.allocations["app-db"].owner_project_id = "mysql-main"; });
  sharedCase("binding provider differs from allocation", s => { s.bindings["app-db-binding"].provider_deployment_id = "app-a-prod"; });
  sharedCase("binding uses an application credential", s => { s.bindings["app-db-binding"].credential_ref = "mysql-admin@1"; });
  sharedCase("active consumer cannot use retired allocation", s => { s.allocations["app-db"].status = "retired"; });
  sharedCase("logical allocation cannot be silently duplicated", s => { s.allocations["duplicate"] = { ...s.allocations["app-db"], allocation_id: "duplicate" }; });
  sharedCase("external binding cannot claim local provider data", s => { s.bindings["app-db-binding"].mode = "external"; });
  sharedCase("service dependency cycle", s => {
    Object.assign(s.projects["app-a"], { kind: "shared-service", service_type: "other" });
    s.allocations["reverse"] = { ...s.allocations["app-db"], allocation_id: "reverse", owner_project_id: "mysql-main", provider_deployment_id: "app-a-prod", resource_name: "reverse" };
    s.bindings["reverse"] = { ...s.bindings["app-db-binding"], binding_id: "reverse", consumer_deployment_id: "mysql-prod", provider_deployment_id: "app-a-prod", allocation_id: "reverse" };
  });
  return cases;
}
