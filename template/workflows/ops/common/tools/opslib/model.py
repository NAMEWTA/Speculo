"""Strict resource contracts and atomic controller-side catalog operations."""
from __future__ import annotations
import copy, json, os, re
from pathlib import Path
from typing import Any
from .core import *

SCHEMAS = Path(__file__).resolve().parents[2] / "schemas"

def validate(value: Any, schema_name: str) -> None:
    schema = json.loads((SCHEMAS / (schema_name + ".schema.json")).read_text(encoding="utf-8"))
    def walk(v, s, label):
        if "$ref" in s:
            node = schema
            for k in s["$ref"].removeprefix("#/").split("/"): node = node[k]
            return walk(v, node, label)
        if "oneOf" in s:
            successes = 0
            for branch in s["oneOf"]:
                try: walk(v, branch, label); successes += 1
                except OpsError: pass
            if successes != 1: raise OpsError(f"{label}: oneOf contract not satisfied")
        kinds = {"object": lambda x: isinstance(x, dict), "array": lambda x: isinstance(x, list),
                 "string": lambda x: isinstance(x, str), "integer": lambda x: type(x) is int,
                 "boolean": lambda x: type(x) is bool, "null": lambda x: x is None,
                 "number": lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)}
        if "type" in s:
            types = s["type"] if isinstance(s["type"], list) else [s["type"]]
            if not any(kinds[t](v) for t in types): raise OpsError(f"{label}: wrong type")
        if "const" in s and v != s["const"]: raise OpsError(f"{label}: wrong constant")
        if "enum" in s and v not in s["enum"]: raise OpsError(f"{label}: invalid enum")
        if isinstance(v, str):
            if len(v) < s.get("minLength", 0) or len(v) > s.get("maxLength", 10000000): raise OpsError(f"{label}: string length")
            if "pattern" in s and not re.search(s["pattern"], v): raise OpsError(f"{label}: invalid pattern")
        if type(v) in (int, float):
            if v < s.get("minimum", -float("inf")) or v > s.get("maximum", float("inf")): raise OpsError(f"{label}: number out of range")
        if isinstance(v, dict):
            if set(s.get("required", [])) - set(v): raise OpsError(f"{label}: missing {sorted(set(s['required'])-set(v))}")
            props = s.get("properties", {})
            for k, item in v.items():
                if k in props: walk(item, props[k], label+"."+k)
                elif s.get("additionalProperties") is False: raise OpsError(f"{label}: unknown field {k}")
                elif isinstance(s.get("additionalProperties"), dict): walk(item, s["additionalProperties"], label+"."+k)
            if "propertyNames" in s:
                for k in v: walk(k, s["propertyNames"], label+".<key>")
        if isinstance(v, list):
            if len(v) < s.get("minItems", 0): raise OpsError(f"{label}: too few items")
            if s.get("uniqueItems") and len({canonical(x) for x in v}) != len(v): raise OpsError(f"{label}: duplicate items")
            for i, x in enumerate(v): walk(x, s.get("items", {}), f"{label}[{i}]")
    walk(value, schema, schema_name)

def deployment_root(host: dict, project_id: str, environment: str, instance: str, layout: str) -> str:
    for x in (project_id, environment, instance): identifier(x)
    if layout == "flat": return target_join(host, project_id)
    if layout == "instances": return target_join(host, project_id, f"instances/{environment}/{instance}")
    raise OpsError("unknown deployment layout")

def validate_host(host: dict) -> None:
    validate(host, "host")
    identifier(host["host_id"])
    if root_path(host["root"], host["platform"]) != host["root"]: raise OpsError("host root must be normalized")
    if host["transport"] == "local" and host["connection"]:
        raise OpsError("local host connection must be empty")
    if host["transport"] == "ssh":
        c = host["connection"]
        for k in ("hostname", "username", "known_hosts", "python"):
            if not c.get(k): raise OpsError("ssh connection missing " + k)
        if not re.fullmatch(r"[A-Za-z0-9_.:-]+", c["hostname"]) or c["hostname"].startswith("-"):
            raise OpsError("unsafe SSH hostname")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", c["username"]) or c["username"].startswith("-"):
            raise OpsError("unsafe SSH username")
        python_pattern = r"[A-Za-z0-9_./:\\ +-]+" if host["platform"] == "windows" else r"[/A-Za-z0-9_.+-]+"
        if not re.fullmatch(python_pattern, c["python"]) or c["python"].startswith("-"):
            raise OpsError("SSH Python must be a safe executable path, not a command")
        if c.get("shell", "posix") not in ("posix", "powershell"): raise OpsError("unsupported remote shell")
    if not re.fullmatch(r"[a-f0-9]{64}", host["identity"]): raise OpsError("host identity must be a probed machine digest")

def validate_status(s: dict) -> None:
    if s.get("schema_version") != 3:
        raise OpsError("ops-legacy-state: preserve the old state; run import-legacy into a new empty state root")
    validate(s, "status")
    roots = set()
    physical_roots = []
    for hid, h in s["hosts"].items():
        validate_host(h)
        if hid != h["host_id"]: raise OpsError("host index identity mismatch")
        physical = (h["identity"], h["root"].casefold() if h["platform"] == "windows" else h["root"])
        if physical in roots: raise OpsError("duplicate physical host/root registered under different IDs")
        roots.add(physical)
        for identity, other, platform in physical_roots:
            if identity == h["identity"] and platform != h["platform"]: raise OpsError("same physical identity has inconsistent platform")
            if identity == h["identity"] and (within(h["root"], other, platform) or within(other, h["root"], platform)):
                raise OpsError("overlapping registered host roots")
        physical_roots.append((h["identity"],h["root"],h["platform"]))
    for pid, p in s["projects"].items():
        validate(p, "project"); identifier(pid)
        if pid != p["project_id"]: raise OpsError("project index identity mismatch")
        if p["kind"] == "shared-service" and not p.get("service_type"): raise OpsError("shared provider requires service_type")
    used = set()
    occupied = []
    for did, d in s["deployments"].items():
        validate(d, "deployment")
        if did != d["deployment_id"]: raise OpsError("deployment index mismatch")
        if d["host_id"] not in s["hosts"] or d["project_id"] not in s["projects"]: raise OpsError("orphan deployment")
        h = s["hosts"][d["host_id"]]
        expected = deployment_root(h, d["project_id"], d["environment"], d["instance"], d["layout"])
        if d["root"] != expected: raise OpsError("deployment root does not follow host/project policy")
        slot = (h["identity"], expected.casefold() if h["platform"] == "windows" else expected)
        if slot in used: raise OpsError("two deployments occupy the same directory; use explicit instances layout")
        used.add(slot)
        for identity, other, platform in occupied:
            if identity == h["identity"] and platform != h["platform"]: raise OpsError("same physical identity has inconsistent platform")
            if identity == h["identity"] and (within(expected, other, platform) or within(other, expected, platform)):
                raise OpsError("overlapping flat/instances deployment roots require an explicit migration")
        occupied.append((h["identity"], expected, h["platform"]))
        for item in d["storage"]:
            if not within(item["path"], d["root"], h["platform"]): raise OpsError("persistent path outside APP root")
    for aid, a in s["allocations"].items():
        validate(a, "allocation")
        if aid != a["allocation_id"] or a["provider_deployment_id"] not in s["deployments"]: raise OpsError("orphan allocation")
        pd = s["deployments"][a["provider_deployment_id"]]
        if s["projects"][pd["project_id"]]["kind"] != "shared-service": raise OpsError("allocation provider must be shared-service")
        if a["owner_project_id"] not in s["projects"]: raise OpsError("allocation owner missing")
    resources = set()
    for a in s["allocations"].values():
        if a["status"] == "retired": continue
        key = (a["provider_deployment_id"], a["resource_kind"], a["resource_name"])
        if key in resources: raise OpsError("duplicate logical allocation: use one allocation for replicas")
        resources.add(key)
    edges = {}
    for bid, b in s["bindings"].items():
        validate(b, "binding")
        if bid != b["binding_id"] or b["consumer_deployment_id"] not in s["deployments"]: raise OpsError("orphan binding")
        consumer = s["deployments"][b["consumer_deployment_id"]]
        if b["mode"] == "shared":
            if b["allocation_id"] not in s["allocations"]: raise OpsError("binding allocation missing")
            a = s["allocations"][b["allocation_id"]]
            if a["provider_deployment_id"] != b["provider_deployment_id"]: raise OpsError("binding provider disagrees with allocation")
            if a["owner_project_id"] != consumer["project_id"] or a["environment"] != consumer["environment"]:
                if consumer["project_id"] not in a.get("shared_owners", []): raise OpsError("cross-app/environment sharing requires explicit shared owners")
            if b["credential_ref"] != a["credential_ref"]: raise OpsError("binding must use allocation's application credential")
            if a["status"] == "retired" and b["status"] == "active": raise OpsError("active consumer uses retired allocation")
            edges.setdefault(b["consumer_deployment_id"], set()).add(b["provider_deployment_id"])
        elif b["mode"] == "external":
            if b["provider_deployment_id"] is not None or b["allocation_id"] is not None: raise OpsError("external binding cannot claim local provider data")
        elif b["mode"] == "dedicated":
            if b["allocation_id"] is not None or b["provider_deployment_id"] is not None: raise OpsError("dedicated component cannot reference shared provider/allocation")
        if b["status"] == "active" and consumer["status"] == "retired": raise OpsError("retired deployment retains active binding")
    def visit(node, trail, done):
        if node in trail: raise OpsError("cyclic service dependencies")
        if node in done: return
        for nxt in edges.get(node, []): visit(nxt, trail | {node}, done)
        done.add(node)
    done = set()
    for node in edges: visit(node, set(), done)

def load(state: Path) -> dict:
    s = read_json(state / "status.json"); validate_status(s); return s

def save(state: Path, s: dict, *, bump: bool = True) -> None:
    validate_status(s)
    if bump: s["revision"] += 1
    s["updated_at"] = now(); write_json(state / "status.json", s)

def ledger_load(state: Path) -> dict:
    p = state / "private/credentials.json"
    if not p.exists(): return {"schema_version": 1, "entries": {}}
    if os.name != "nt" and p.stat().st_mode & 0o077: raise OpsError("plaintext ledger permissions too broad; run chmod 600 explicitly")
    return read_json(p)

def put_credential(state: Path, value: dict) -> dict:
    exact(value, {"credential_id", "version", "values", "purpose"}, {"credential_id", "version", "values", "purpose"}, "credential")
    identifier(value["credential_id"])
    if type(value["version"]) is not int or value["version"] < 1 or not value["values"]: raise OpsError("credential version/values invalid")
    for k, v in value["values"].items():
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", k) or not isinstance(v, str) or not v or "\x00" in v: raise OpsError("credential fields must be named nonempty strings")
    with lock(state / ".locks/catalog", {"operation": "credential-import"}):
        load(state)
        ledger = ledger_load(state); entries = ledger["entries"].setdefault(value["credential_id"], {})
        version = str(value["version"])
        if version in entries:
            if entries[version]["values"] != value["values"]: raise OpsError("immutable credential version: use a new explicit version")
            return {"credential_ref": value["credential_id"]+"@"+version, "status": "unchanged"}
        entries[version] = {"values": value["values"], "purpose": value["purpose"], "created_at": now()}
        write_json(state / "private/credentials.json", ledger)
    return {"credential_ref": value["credential_id"]+"@"+version, "status": "recorded-not-rotated-on-server"}

def register(state: Path, request: dict) -> dict:
    exact(request, {"hosts", "projects"}, set(), "registration")
    with lock(state / ".locks/catalog", {"operation": "register"}):
        s = load(state)
        for group, idkey in (("hosts", "host_id"), ("projects", "project_id")):
            for item in request.get(group, []):
                key = item[idkey]
                if key in s[group] and s[group][key] != item:
                    raise OpsError(f"registered identity is immutable through register: {group}/{key}; use a reviewed migration")
                s[group][key] = item
        save(state, s)
    return {"revision": s["revision"], "hosts": list(s["hosts"]), "projects": list(s["projects"])}
