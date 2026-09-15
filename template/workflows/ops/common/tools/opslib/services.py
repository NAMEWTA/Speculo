"""Typed shared-service allocation contracts. No guessing unknown service products."""
from __future__ import annotations
import re
from .core import *

def secret(ref,field):return "{{credential:"+ref+":"+field+"}}"

def allocation_operation(status,dep,a,p):
    adapter=p["adapter"]
    project=status["projects"][dep["project_id"]]
    if project["service_type"]!=adapter:raise OpsError("allocation adapter differs from registered provider service_type")
    if not p.get("admin_credential_ref") or p["admin_credential_ref"]==a["credential_ref"]:
        raise OpsError("application credential must differ from administrator credential")
    if p["admin_credential_ref"] not in dep["credential_refs"]:
        raise OpsError("admin credential must be registered on the provider deployment")
    if not p.get("app_username") or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{1,47}",p["app_username"]):
        raise OpsError("application username needs an explicit safe name")
    service=dep["service"]
    common={"kind":adapter+"-allocation","provider_root":dep["root"],"compose_name":dep["compose_name"],
            "resource":a["resource_name"],"app_username":p["app_username"],"app_password":secret(a["credential_ref"],"password"),
            "admin_username":secret(p["admin_credential_ref"],"username"),"admin_password":secret(p["admin_credential_ref"],"password"),
            "owner_project_id":a["owner_project_id"],"environment":a["environment"],"credential_ref":a["credential_ref"]}
    if adapter in ("mysql","redis"):
        if dep["method"]!="compose" or not service.get("compose_service"):raise OpsError("built-in MySQL/Redis allocator requires a managed Compose provider and explicit compose_service")
        common["compose_service"]=identifier(service["compose_service"])
    if adapter=="mysql":
        if a["resource_kind"]!="database" or not re.fullmatch(r"[a-z][a-z0-9_]{1,47}",a["resource_name"]):raise OpsError("MySQL requires a safe logical database name")
        privileges=p.get("privileges",["SELECT","INSERT","UPDATE","DELETE"])
        allowed={"SELECT","INSERT","UPDATE","DELETE","CREATE","ALTER","INDEX","REFERENCES","DROP","CREATE TEMPORARY TABLES","EXECUTE"}
        if not privileges or set(privileges)-allowed:raise OpsError("unsupported MySQL grants; administrative/global privileges are forbidden")
        common["privileges"]=privileges
    elif adapter=="redis":
        if a["resource_kind"]!="redis-acl" or not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9:_-]+",p.get("prefix","")):
            raise OpsError("Redis shared allocation requires an explicit key prefix and redis-acl resource")
        if service.get("acl_persistence")!="data/redis/acl/users.acl":raise OpsError("Redis provider must persist ACLs at data/redis/acl/users.acl and configure aclfile")
        if a["recovery_scope"] not in ("provider-wide","application-export","unverified"):
            raise OpsError("Redis prefix/ACL is not proof of independently restorable data")
        common["prefix"]=p["prefix"]
    elif adapter=="minio":
        if a["resource_kind"]!="bucket" or not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]",a["resource_name"]):raise OpsError("MinIO allocation needs a valid bucket name")
        if not service.get("endpoint"):raise OpsError("MinIO provider requires explicit administrative endpoint")
        if p.get("allow_secret_argv") is not True:
            raise OpsError("mc admin user add exposes the new password briefly to privileged local process inspection; explicitly review allow_secret_argv or use an existing verified allocation")
        if not p.get("client_path"):raise OpsError("MinIO needs a reviewed installed mc client_path")
        common.update(endpoint=service["endpoint"],client_path=p["client_path"],secret_argv_acknowledged=True)
    else:raise OpsError("unknown provider adapter: use a version-verified explicit existing-resource probe, not guessed commands")
    return common
