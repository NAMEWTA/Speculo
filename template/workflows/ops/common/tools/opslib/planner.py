"""Compile user-reviewed specifications into immutable, identity-bound execution plans."""
from __future__ import annotations
import base64, copy, datetime as dt, json, os, re, shlex
from pathlib import Path, PurePosixPath, PureWindowsPath
from .core import *
from .model import load, ledger_load, validate, validate_status, deployment_root
from .transport import call, host_transport_digest

MUTATING_OPERATIONS={"prepare","deploy","upgrade","rollback","uninstall","maintain","migrate"}

def run_dir(state: Path, plan: dict) -> Path:
    if plan["worker"] in ("I","H") and len(plan["hosts"])==1:
        return state/"hosts"/next(iter(plan["hosts"]))/"runs"/plan["run_id"]
    return state/"releases"/plan["run_id"]

def locate_plan(state: Path, value: str) -> Path:
    p=Path(value)
    if p.is_file():
        resolved=p.absolute();no_symlinks(resolved,allow_missing=False)
        if not resolved.is_relative_to(state.absolute()):raise OpsError("plan must belong to the selected controller state root")
        return resolved
    identifier(value,"run_id")
    matches=list((state/"hosts").glob(f"*/runs/{value}/plan.json"))
    direct=state/"releases"/value/"plan.json"
    if direct.exists():matches.append(direct)
    if len(matches)!=1:raise OpsError("run_id must resolve to exactly one stored plan")
    return matches[0]

def templates(value, ctx, status):
    if isinstance(value,str):
        for k,v in ctx.items():value=value.replace("{{"+k+"}}",v)
        def binding(m):
            kind,key,field=m.groups(); table=status["bindings" if kind=="binding" else "allocations"]
            if key not in table or field not in table[key] or not isinstance(table[key][field],str):raise OpsError("unknown binding/allocation substitution")
            return table[key][field]
        return re.sub(r"\{\{(binding|allocation):([a-z0-9-]+):([a-z_]+)\}\}",binding,value)
    if isinstance(value,list):return [templates(x,ctx,status) for x in value]
    if isinstance(value,dict):return {k:templates(v,ctx,status) for k,v in value.items()}
    return value

def project_path(host, root, rel):
    rel=relative(rel)
    cls=PureWindowsPath if host["platform"]=="windows" else PurePosixPath
    result=str(cls(root).joinpath(*rel.split("/")))
    if not within(result,root,host["platform"]):raise OpsError("project path escapes root")
    return result

def env_file(values: dict, *, systemd=False) -> str:
    lines=[]
    for k,v in sorted(values.items()):
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*",k) or not isinstance(v,str) or any(x in v for x in ("\r","\n","\x00")):
            raise OpsError("env files require valid keys and single-line strings; multiline values belong in mounted files")
        if systemd:v='"'+v.replace('\\','\\\\').replace('"','\\"')+'"'
        lines.append(k+"="+v)
    return "\n".join(lines)+"\n"

def compose_model(spec,host,root,name,envs,ctx):
    model=copy.deepcopy(spec["compose"])
    if model.get("name") not in (None,name):raise OpsError("Compose identity cannot override registered deployment identity")
    model["name"]=name
    if not model["services"]:raise OpsError("Compose deployment needs at least one service")
    mounts=[]
    allowed={"image","build","command","entrypoint","environment","env_file","volumes","ports","healthcheck","depends_on",
             "restart","user","read_only","tmpfs","labels","networks","cap_drop","security_opt","deploy","init","working_dir",
             "mem_limit","cpus","stop_grace_period","logging","profiles"}
    for service,s in model["services"].items():
        identifier(service,"compose service")
        if set(s)-allowed:raise OpsError("unsupported or unsafe Compose fields: "+str(sorted(set(s)-allowed)))
        if "image" not in s and "build" not in s:raise OpsError("service requires a pinned image or build")
        if "build" not in s and not re.fullmatch(r"[^\s]+@sha256:[a-f0-9]{64}",s["image"]):
            raise OpsError("production Compose images must be pinned by sha256 digest, not floating tags")
        if "build" in s:
            if not isinstance(s["build"],dict) or set(s["build"])-{"context","dockerfile","args","target"}:raise OpsError("build needs an explicit local context and Dockerfile")
            s["build"]["context"]=project_path(host,root,"compose/build")
            s["build"]["dockerfile"]=project_path(host,root,"compose/Dockerfile")
        if credentials_in(s.get("environment",{})):raise OpsError("credentials must be injected through env/ files, not inline Compose environment")
        s.setdefault("restart","unless-stopped")
        if s.get("read_only") is False:raise OpsError("writable container rootfs hides undeclared persistence; declare bind/tmpfs paths instead")
        s["read_only"]=True
        s.setdefault("tmpfs",["/tmp","/run"])
        labels=s.setdefault("labels",{})
        if not isinstance(labels,dict):raise OpsError("Compose labels must be a map")
        labels.update({"ops.managed":"true","ops.deployment":name})
        files=s.get("env_file",[])
        if isinstance(files,str):files=[files]
        if not files and len(envs)==1:files=list(envs)
        converted=[]
        for f in files:
            if not isinstance(f,str):raise OpsError("env_file input must name files from this project's env map")
            f=f.removeprefix("env/")
            if f not in envs:raise OpsError("Compose references an undeclared environment file: "+f)
            converted.append({"path":project_path(host,root,"env/"+f),"required":True,"format":"raw"})
        if converted:s["env_file"]=converted
        for mount in s.get("volumes",[]):
            if not isinstance(mount,dict) or set(mount)-{"type","source","target","read_only","bind","consistency"}:raise OpsError("volume must use explicit safe long syntax")
            if mount.get("type")!="bind":raise OpsError("named/anonymous volumes violate the fixed persistence-root contract")
            source=mount["source"]
            if not source.startswith(("/","\\")) and not re.match(r"^[A-Za-z]:",source):source=project_path(host,root,source)
            if not within(source,root,host["platform"]):raise OpsError("bind mount outside this project's root")
            cls=PureWindowsPath if host["platform"]=="windows" else PurePosixPath
            rel=str(cls(source).relative_to(cls(root))).replace("\\","/")
            area=rel.split("/")[0]
            if area not in {"data","logs","config","env","backups","run"}:raise OpsError("mount must be under data/logs/config/env/backups/run")
            if not mount.get("read_only") and area not in {"data","logs","backups","run"}:raise OpsError("config/env mounts must be read-only")
            if area=="data" and len(rel.split("/"))<3:raise OpsError("data needs component/purpose naming")
            if not isinstance(mount.get("target"),str) or not mount["target"].startswith("/"):raise OpsError("container target must be absolute")
            mount["source"]=source
            mount["bind"]={"create_host_path":False}
            mounts.append((source,area,mount.get("read_only",False)))
    # YAML accepts JSON; no YAML dependency or template interpolation parser is needed.
    # Escape literal dollars in the Compose model, not in raw env_file values.
    def dollars(v):
        if isinstance(v,str):return v.replace("$","$$")
        if isinstance(v,list):return [dollars(x) for x in v]
        if isinstance(v,dict):return {k:dollars(x) for k,x in v.items()}
        return v
    return dollars(model),mounts

def compile_plan(state: Path, spec_path: Path) -> dict:
    spec=read_json(spec_path);validate(spec,"spec")
    with lock(state/".locks/catalog",{"operation":"plan"}):
        current=load(state)
        if current["controller"] is None:raise OpsError("initialize the controller first")
        after=copy.deepcopy(current);ledger=ledger_load(state)
        revisions=spec.get("resource_updates",{})
        for group,idkey,fixed in (("hosts","host_id",("host_id","root","identity","platform")),("projects","project_id",("project_id","kind","service_type"))):
            for item in revisions.get(group,[]):
                previous=current[group].get(item[idkey])
                if previous is None or any(previous[k]!=item[k] for k in fixed):
                    raise OpsError("resource update cannot change identity/root/kind; create explicit migration resources")
                after[group][item[idkey]]=copy.deepcopy(item)
        rid=identifier(spec.get("run_id",new_id("run")))
        if rid in current["releases"]:raise OpsError("run ID already exists")
        for group,key in (("allocations","allocation_id"),("bindings","binding_id")):
            for item in spec.get(group,[]):
                if item[key] in after[group] and after[group][item[key]]!=item:
                    if group=="allocations":raise OpsError("allocation identity/ownership changes require new resource and migration")
                    if spec["operation"] not in ("migrate","upgrade","rollback"):raise OpsError("binding update requires migration/upgrade/rollback plan")
                after[group][item[key]]=copy.deepcopy(item)
        for bid in spec.get("retire_bindings",[]):
            if bid not in after["bindings"]:raise OpsError("unknown binding to retire")
            after["bindings"][bid]["status"]="retired"
        hosts=set(spec.get("hosts",[])) | {h["host_id"] for h in revisions.get("hosts",[])}
        ops=[];external={};source_digests={};specs={};doc_targets=[]
        def add(host_id,did,kind,**kw):
            hosts.add(host_id)
            op={"step_id":f"step-{len(ops)+1:04d}","host_id":host_id,"deployment_id":did,"kind":kind,**kw}
            ops.append(op);return op
        def file_op(host_id,did,path,content=None,binary=None,mode=0o600):
            data={"path":path,"mode":mode}
            if content is not None:data["content"]=content
            else:data["content_b64"]=base64.b64encode(binary).decode()
            return add(host_id,did,"write",**data)
        def health_op(host_id,did,item,ctx):
            h=templates(item,ctx,after);typ=h.pop("type")
            if typ=="command":
                if not h.get("argv"):raise OpsError("command health check needs argv")
                if credentials_in(h["argv"]):raise OpsError("do not put credentials in command argv")
                return add(host_id,did,"verify-command",argv=h["argv"],cwd=ctx["root"],timeout=h.get("timeout",60),env=h.get("env",{}),**({"stdout_pattern":h["stdout_pattern"]} if "stdout_pattern" in h else {}))
            if typ=="file":
                p=h["path"]
                if not within(p,ctx["root"],after["hosts"][host_id]["platform"]):p=project_path(after["hosts"][host_id],ctx["root"],p)
                return add(host_id,did,"assert-file",path=p,**({"sha256":h["sha256"]} if "sha256" in h else {}))
            return add(host_id,did,"health",type=typ,**h)
        # Catalog records are built before rendering binding substitutions.
        for d in spec.get("deployments",[]):
            did=d["deployment_id"]
            if did in specs:raise OpsError("duplicate deployment in specification")
            specs[did]=d;hid=d["host_id"];hosts.add(hid)
            if hid not in after["hosts"] or d["project_id"] not in after["projects"]:raise OpsError("register host and project before planning")
            host=after["hosts"][hid];p=after["projects"][d["project_id"]]
            root=deployment_root(host,d["project_id"],d["environment"],d["instance"],d["layout"])
            old=current["deployments"].get(did)
            if old and any(old[k]!=d[k] for k in ("project_id","host_id","environment","instance","layout")):
                raise OpsError("deployment identity/path change: create a new deployment and an explicit data-migration plan")
            if old and spec["operation"]=="deploy":raise OpsError("existing deployment requires upgrade/rollback/maintain, not fresh deploy")
            after["deployments"][did]={"deployment_id":did,"project_id":d["project_id"],"host_id":hid,"environment":d["environment"],
                "instance":d["instance"],"layout":d["layout"],"method":d["method"],"version":d["version"],"observed_version":old.get("observed_version") if old else None,"root":root,"status":"planned",
                "installed_at":old["installed_at"] if old else None,"updated_at":None,"run_id":rid,
                "compose_name":"ops-"+did if d["method"]=="compose" else None,"storage":[],"commands":{"start":[],"stop":[],"verify":[]},
                "credential_refs":d.get("credential_refs",[]),"backup":d["backup"],"recovery":d["recovery"],"notes":d.get("notes",[]),"source":p["source"],"service":d.get("service",{})}
            doc_targets.append(did)
        # Host maintenance also refreshes local/remote deployment documents after verification.
        affected=set()
        touched_provider=set(specs)|set(spec.get("retire_deployments",[]))
        touched_hosts={x["host_id"] for x in spec.get("host_actions",[])}
        for did,d in current["deployments"].items():
            if d["host_id"] in touched_hosts and d["status"]!="retired":affected.add(did);touched_provider.add(did);doc_targets.append(did)
        for b in current["bindings"].values():
            if b["status"]=="active" and b["provider_deployment_id"] in touched_provider:affected.add(b["consumer_deployment_id"])
        if affected-set(spec.get("acknowledged_consumers",[])):
            raise OpsError("maintenance impact must be acknowledged for consumers: "+", ".join(sorted(affected-set(spec.get("acknowledged_consumers",[])))))
        for item in spec.get("host_actions",[]):
            hid=item["host_id"]
            if hid not in after["hosts"]:raise OpsError("unknown host action target")
            host=after["hosts"][hid];kind=item["kind"];hostroot=host["root"]
            if kind in ("write-control","write-file"):
                if kind=="write-file":
                    path=target_join(host,relative(item["path"]))
                    if "content" in item:file_op(hid,None,path,content=item["content"],mode=item.get("mode",0o600))
                    elif "source" in item:
                        src=Path(item["source"]).absolute();no_symlinks(src,allow_missing=False)
                        if src.stat().st_size>16*1024*1024:raise OpsError("host file exceeds 16 MiB")
                        data=src.read_bytes();source_digests[str(src)]=digest(data);file_op(hid,None,path,binary=data,mode=item.get("mode",0o600))
                    else:raise OpsError("host write-file requires content/source")
                    continue
                path=item["path"]
                if path!="/etc/docker/daemon.json" and not re.fullmatch(r"/etc/systemd/system/ops-[a-z0-9-]+\.service",path):raise OpsError("unrecognized external control file; persistent data cannot be an exception")
                external.setdefault(hid,[]).append(path)
                file_op(hid,None,path,content=item["content"])
            elif kind=="mkdir":add(hid,None,"mkdir",path=target_join(host,relative(item["path"])),mode=item.get("mode",0o750))
            elif kind in ("quarantine","purge-quarantine"):
                path=item["path"]
                if not within(path,hostroot,host["platform"]):raise OpsError("cleanup must target a registered cache/log path under host_root")
                if kind=="purge-quarantine" and not within(path,target_join(host,"_host/quarantine"),host["platform"]):raise OpsError("purge can only target one previously isolated quarantine item")
                add(hid,None,kind,path=path,item_id=f"item-{len(ops)+1:04d}")
            elif kind=="defaults":add(hid,None,"defaults",expected=item["expected_defaults"])
            else:
                argv=item.get("argv")
                if not argv or credentials_in(argv):raise OpsError("host command needs argv without plaintext credential arguments")
                cwd=item.get("cwd",hostroot)
                if cwd!=hostroot and not within(cwd,hostroot,host["platform"]):raise OpsError("host action cwd outside root")
                if not item.get("writes"):raise OpsError("host command needs explicit write-set declaration")
                for path in item["writes"]:
                    if not within(path,hostroot,host["platform"]) and path not in external.get(hid,[]):
                        if kind!="install-toolchain":raise OpsError("host command persistent writes outside root")
                if kind=="install-toolchain" and not item.get("expected_defaults"):raise OpsError("toolchain migration requires explicit old default expectations")
                add(hid,None,"command",argv=argv,cwd=cwd,env=item.get("env",{}),timeout=item.get("timeout",1800),declared_writes=item["writes"],reason=item["reason"])
                if not item.get("verification"):raise OpsError("host mutations require explicit post-verification")
                for h in item["verification"]:health_op(hid,None,h,{"root":hostroot,"host_root":hostroot})
                if item.get("expected_defaults"):add(hid,None,"defaults",expected=item["expected_defaults"])
        provisions={}
        for p in spec.get("provision",[]):
            if p["allocation_id"] not in after["allocations"]:raise OpsError("provision references unknown allocation")
            a=after["allocations"][p["allocation_id"]]
            if a["status"]!="planned":raise OpsError("active allocations are reused, not reprovisioned or password-reset")
            provisions.setdefault(a["provider_deployment_id"],[]).append(p)
        def provision_for(provider):
            if provider not in after["deployments"]:raise OpsError("provider deployment not found")
            dep=after["deployments"][provider];host=after["hosts"][dep["host_id"]]
            for p in provisions.get(provider,[]):
                a=after["allocations"][p["allocation_id"]];adapter=p["adapter"]
                if adapter=="existing":
                    if "existing_verification" not in p:raise OpsError("adopted allocation requires actual verification")
                    h=health_op(dep["host_id"],provider,p["existing_verification"],{"root":dep["root"],"host_root":host["root"]})
                    h["allocation_id"]=a["allocation_id"]
                else:
                    from .services import allocation_operation
                    cid,version=a["credential_ref"].split("@")
                    try:account=ledger["entries"][cid][version]["values"]["username"]
                    except KeyError as e:raise OpsError("allocation credential must contain the actual username and password") from e
                    if account!=p.get("app_username"):raise OpsError("allocation username differs from plaintext ledger username")
                    op=allocation_operation(after,dep,a,p)
                    add(dep["host_id"],provider,op.pop("kind"),allocation_id=a["allocation_id"],**op)
        for provider in provisions:
            if provider not in specs:
                if after["deployments"][provider]["status"] not in ("completed","running","docs_pending"):raise OpsError("existing provider is not verified active")
                provision_for(provider);doc_targets.append(provider)
        # Dependencies determine deployment ordering, never alphabetical coincidence.
        ordered=[];visiting=set()
        def visit(did):
            if did in ordered:return
            if did in visiting:raise OpsError("dependency cycle")
            visiting.add(did)
            for b in after["bindings"].values():
                if b["status"]=="active" and b["consumer_deployment_id"]==did and b["provider_deployment_id"] in specs:visit(b["provider_deployment_id"])
            visiting.remove(did);ordered.append(did)
        for did in specs:visit(did)
        for did in ordered:
            d=specs[did];dep=after["deployments"][did];host=after["hosts"][dep["host_id"]];hid=host["host_id"];root=dep["root"]
            ctx={"root":root,"host_root":host["root"],"data":project_path(host,root,"data"),"env":project_path(host,root,"env"),
                 "logs":project_path(host,root,"logs"),"artifact":project_path(host,root,f"releases/{rid}/artifact"),"run_id":rid}
            d=templates(d,ctx,after)
            for path in (root,*[project_path(host,root,x) for x in ("env","data","config","logs","backups/owned","backups/dependencies","run",f"releases/{rid}/artifact")]):
                add(hid,did,"mkdir",path=path)
            marker={"deployment_id":did,"project_id":dep["project_id"],"host_id":hid,"environment":dep["environment"],"instance":dep["instance"]}
            file_op(hid,did,project_path(host,root,".ops-project.json"),content=json.dumps(marker,ensure_ascii=False,indent=2)+"\n")
            for item in d.get("storage",[]):
                area=item.get("area","data");rel=f"{area}/{item['component']}/{item['purpose']}";path=project_path(host,root,rel)
                add(hid,did,"mkdir",path=path,**{k:item[k] for k in ("uid","gid","mode") if k in item})
                dep["storage"].append({"component":item["component"],"purpose":item["purpose"],"path":path})
            for f in d.get("files",[]):
                rel=relative(f["path"])
                if rel in ("README.md","OPERATIONS.md","project.yaml",".ops-project.json") or rel.startswith(("run/","env/")):
                    raise OpsError("generated ownership/docs/env paths cannot be supplied as arbitrary files")
                if rel.startswith("artifact/"):rel=f"releases/{rid}/"+rel
                elif rel.split("/")[0] not in {"compose","config","scripts","service","data"}:raise OpsError("project files must use artifact/compose/config/scripts/service/data")
                dest=project_path(host,root,rel)
                if ("content" in f)==("source" in f):raise OpsError("file requires exactly one of content/source")
                if "content" in f:file_op(hid,did,dest,content=f["content"],mode=f.get("mode",0o600))
                else:
                    src=Path(f["source"])
                    if not src.is_absolute():src=spec_path.parent/src
                    no_symlinks(src,allow_missing=False)
                    if not src.is_file() or src.stat().st_size>16*1024*1024:raise OpsError("source must be a regular file <=16 MiB")
                    content=src.read_bytes();source_digests[str(src.absolute())]=digest(content)
                    file_op(hid,did,dest,binary=content,mode=f.get("mode",0o600))
            envs=d.get("env",{})
            for values in [*envs.values(),d.get("native",{}).get("environment",{})]:
                for key,value in values.items():
                    if re.search(r"(?:DATA|UPLOAD|CACHE|LOG|TMP|TEMP|HOME|DIR|STORAGE)",key,re.I) and key not in ("JAVA_HOME",):
                        if (value.startswith("/") or re.match(r"^[A-Za-z]:[\\/]",value)) and not within(value,root,host["platform"]):raise OpsError("persistent environment path outside project root: "+key)
                    if value.startswith("sqlite:///"):
                        sqlite_path=value[len("sqlite:///"):]
                        if sqlite_path.startswith("/") and not within(sqlite_path,root,host["platform"]):raise OpsError("SQLite URL escapes project persistence root")
            for filename,values in envs.items():
                if "/" in relative(filename) or not (filename==".env" or filename.endswith(".env")):raise OpsError("environment filenames must be .env or *.env")
                envop=file_op(hid,did,project_path(host,root,"env/"+filename),content=env_file(values))
                envop.update(env_values=values,env_format="raw")
            runtime_env={"OPS_PROJECT_ROOT":root,"OPS_DATA_ROOT":ctx["data"],"OPS_LOG_ROOT":ctx["logs"],"OPS_RUN_ROOT":project_path(host,root,"run"),
                         "XDG_DATA_HOME":project_path(host,root,"data/app/storage"),"XDG_CACHE_HOME":project_path(host,root,"run/cache"),
                         "HOME":project_path(host,root,"data/app/home"),"USERPROFILE":project_path(host,root,"data/app/home"),
                         "XDG_CONFIG_HOME":project_path(host,root,"data/app/settings"),"APPDATA":project_path(host,root,"data/app/settings"),"LOCALAPPDATA":project_path(host,root,"data/app/settings"),
                         "UV_CACHE_DIR":project_path(host,root,"run/cache/uv"),"PIP_CACHE_DIR":project_path(host,root,"run/cache/pip"),"npm_config_cache":project_path(host,root,"run/cache/npm"),
                         "TMPDIR":project_path(host,root,"run/tmp"),"TMP":project_path(host,root,"run/tmp"),"TEMP":project_path(host,root,"run/tmp")}
            if d["method"]=="compose":
                if "compose" not in d:raise OpsError("Compose method requires a model")
                model,mounts=compose_model(d,host,root,dep["compose_name"],envs,ctx)
                written={o.get("path") for o in ops if o["kind"]=="write"}
                for path,area,ro in mounts:
                    if path not in written:add(hid,did,"mkdir",path=path)
                    if area=="data" and not any(x["path"]==path for x in dep["storage"]):
                        parts=path.replace("\\","/").split("/");dep["storage"].append({"component":parts[-2],"purpose":parts[-1],"path":path})
                file_op(hid,did,project_path(host,root,"compose/compose.yaml"),content=json.dumps(model,ensure_ascii=False,indent=2)+"\n")
                file_op(hid,did,project_path(host,root,"compose/build/.dockerignore"),content=".git\n.env\n*.env\ndata/\nbackups/\nOPERATIONS.md\nprivate/\n")
                add(hid,did,"compose-up",project_root=root,compose_name=dep["compose_name"])
                base=["docker","compose","--project-name",dep["compose_name"],"--project-directory",root,"--file",project_path(host,root,"compose/compose.yaml")]
                dep["commands"]["start"]=[base+["up","-d","--wait"]];dep["commands"]["stop"]=[base+["stop"]];dep["commands"]["verify"]=[base+["ps"]]
            else:
                if "native" not in d:raise OpsError("native method requires supervisor and argv")
                n=d["native"];argv=n["argv"]
                if credentials_in(argv):raise OpsError("native credentials belong in env files, not argv")
                if any(x in ("-c","-e","--eval") for x in argv[1:]):raise OpsError("native application code must be a fixed artifact, not inline eval")
                for arg in argv[1:]:
                    candidate=arg.split("=",1)[-1]
                    if (candidate.startswith("/") or re.match(r"^[A-Za-z]:[\\/]",candidate)) and not within(candidate,root,host["platform"]):
                        raise OpsError("native argument references a path outside the project root: "+candidate)
                if not within(argv[0],root,host["platform"]) and not (argv[0] in {"python3","python","java","node","bash","sh","dotnet"} or os.path.isabs(argv[0])):
                    raise OpsError("native executable must be explicit or a recognized runtime")
                if set(n.get("environment",{}))&set(runtime_env):raise OpsError("native environment cannot override persistence roots")
                selected_envs=n.get("env_files", list(envs) if len(envs)==1 else [])
                if len(envs)>1 and "env_files" not in n:raise OpsError("native deployment with multiple env files requires explicit env_files order")
                combined={}
                for filename in selected_envs:
                    if filename not in envs:raise OpsError("native references an undeclared env file")
                    for key,value in envs[filename].items():
                        if key in combined and combined[key]!=value:raise OpsError("conflicting native environment values; reconcile explicitly")
                        combined[key]=value
                combined.update(n.get("environment",{}))
                if set(combined)&set(runtime_env):raise OpsError("native env files cannot override reserved persistence roots")
                runtime_env.update(combined)
                for rel in ("run/tmp","run/cache","data/app/storage","data/app/home","data/app/settings","logs/app"):
                    add(hid,did,"mkdir",path=project_path(host,root,rel))
                if not any(x["path"]==runtime_env["XDG_DATA_HOME"] for x in dep["storage"]):
                    dep["storage"].append({"component":"app","purpose":"storage","path":runtime_env["XDG_DATA_HOME"]})
                supervisor=n["supervisor"]
                if supervisor=="systemd":
                    if host["platform"]!="linux":raise OpsError("systemd is a Linux adapter")
                    if any("\n" in x or "\r" in x for x in argv):raise OpsError("newline in systemd argv")
                    unit="ops-"+did+".service";unitpath="/etc/systemd/system/"+unit
                    account=n.get("account")
                    if not account or not re.fullmatch(r"[a-z_][a-z0-9_-]*[$]?",account):raise OpsError("native systemd requires an explicit service account")
                    envpath=project_path(host,root,"env/service.env")
                    envop=file_op(hid,did,envpath,content=env_file(runtime_env,systemd=True))
                    envop.update(env_values=runtime_env,env_format="systemd")
                    quote=lambda s:'"'+s.replace('\\','\\\\').replace('"','\\"').replace('%','%%')+'"'
                    content="[Unit]\nDescription=OPS "+did+"\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser="+account+"\nWorkingDirectory="+quote(ctx["artifact"])+"\nEnvironmentFile="+quote(envpath)+"\nExecStart=:"+" ".join(quote(x) for x in argv)+"\nRestart=on-failure\nUMask=0027\nNoNewPrivileges=true\nProtectSystem=strict\nProtectHome=read-only\nReadWritePaths="+" ".join(quote(project_path(host,root,x)) for x in ("data","logs","run","backups"))+"\nStandardOutput=append:"+project_path(host,root,"logs/app/stdout.log")+"\nStandardError=append:"+project_path(host,root,"logs/app/stderr.log")+"\n\n[Install]\nWantedBy=multi-user.target\n"
                    file_op(hid,did,project_path(host,root,"service/"+unit),content=content,mode=0o644)
                    external.setdefault(hid,[]).append(unitpath);file_op(hid,did,unitpath,content=content,mode=0o644)
                    add(hid,did,"grant-runtime",project_root=root,account=account,directories=[f"releases/{rid}/artifact","config","scripts","data","logs","run"])
                    for a in (["systemctl","daemon-reload"],["systemctl","enable",unit],["systemctl","restart",unit],["systemctl","is-active","--quiet",unit]):add(hid,did,"command" if a[1]!="is-active" else "verify-command",argv=a,cwd=root)
                    dep["commands"]={"start":[["systemctl","start",unit]],"stop":[["systemctl","stop",unit]],"verify":[["systemctl","status",unit]]}
                elif supervisor=="windows-task":
                    if host["platform"]!="windows":raise OpsError("Windows task adapter requires a native Windows host")
                    from .native_windows import task_files
                    for rel,content in task_files(did,root,argv,runtime_env,n).items():
                        taskop=file_op(hid,did,project_path(host,root,rel),content=content)
                        if rel.endswith("task.json"):taskop["json_values"]=json.loads(content)
                    a=["powershell","-NoProfile","-NonInteractive","-File",project_path(host,root,"service/install-task.ps1")]
                    add(hid,did,"command",argv=a,cwd=root)
                    dep["commands"]={"start":[["schtasks","/Run","/TN","OPS-"+did]],"stop":[["schtasks","/End","/TN","OPS-"+did]],"verify":[["schtasks","/Query","/TN","OPS-"+did,"/V"]]}
                else:
                    add(hid,did,"command",argv=argv,cwd=root,env=runtime_env,timeout=n.get("timeout",300),declared_writes=[ctx["data"],ctx["logs"],project_path(host,root,"run")])
                    dep["commands"]={"start":[argv],"stop":[],"verify":[]}
                    dep["notes"].append("Native oneshot: successful finite application run, not a resident daemon.")
            for h in d["health"]:health_op(hid,did,h,ctx)
            snapshot={"run_id":rid,"version":dep["version"],"source":dep["source"],"planned_at":now(),"method":dep["method"]}
            file_op(hid,did,project_path(host,root,f"releases/{rid}/release.json"),content=json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n")
            provision_for(did)
        # A retirement stops only the explicitly named deployment and preserves all bytes.
        for did in spec.get("retire_deployments",[]):
            if did not in after["deployments"]:raise OpsError("unknown deployment to retire")
            dep=after["deployments"][did];hid=dep["host_id"];hosts.add(hid)
            consumers=[b["consumer_deployment_id"] for b in after["bindings"].values() if b["status"]=="active" and b["provider_deployment_id"]==did]
            if consumers:raise OpsError("cannot retire shared service with active consumers: "+",".join(consumers))
            for b in after["bindings"].values():
                if b["consumer_deployment_id"]==did:b["status"]="retired"
            if dep["method"]=="compose":add(hid,did,"compose-stop",project_root=dep["root"],compose_name=dep["compose_name"])
            else:
                for a in dep["commands"]["stop"]:add(hid,did,"command",argv=a,cwd=dep["root"])
            marker={k:dep[k] for k in ("deployment_id","project_id","host_id","environment","instance")}
            add(hid,did,"assert-file",path=project_path(after["hosts"][hid],dep["root"],".ops-project.json"),sha256=digest((json.dumps(marker,ensure_ascii=False,indent=2)+"\n").encode()))
            dep["status"]="retired";dep["run_id"]=rid;doc_targets.append(did)
        # Do not fake a newly allocated service without a provision/adoption action.
        provision_ids={x["allocation_id"] for x in spec.get("provision",[])}
        for a in spec.get("allocations",[]):
            if a["allocation_id"] not in current["allocations"] and a["allocation_id"] not in provision_ids:
                raise OpsError("new allocation requires a typed provisioning action or verified adoption")
        doc_targets.extend(affected)
        for b in after["bindings"].values():
            if b["status"]=="active" and b["consumer_deployment_id"] in doc_targets and b["provider_deployment_id"]:
                doc_targets.append(b["provider_deployment_id"])
        doc_targets=sorted(set(doc_targets))
        for did in doc_targets:hosts.add(after["deployments"][did]["host_id"])
        if not hosts:raise OpsError("plan requires at least one registered host")
        if set(hosts)-set(after["hosts"]):raise OpsError("unregistered target host")
        validate_status(after)
        if len(ops)>2000 or len(canonical(ops))>64*1024*1024:raise OpsError("plan exceeds bounded 2000 operations/64 MiB; split into reviewed releases")
        selected={hid:after["hosts"][hid] for hid in sorted(hosts)}
        inventories={};snapshots={};doc_preconditions={}
        from .docs import remote_paths
        for hid,host in selected.items():
            paths={o["path"] for o in ops if o["host_id"]==hid and o["kind"] in ("write","quarantine","purge-quarantine")}
            for did in doc_targets:
                if after["deployments"][did]["host_id"]==hid:paths.update(remote_paths(after,after["deployments"][did]))
            paths.update([target_join(host,"knowledge/INDEX.md"),target_join(host,"README.md"),target_join(host,"DEPLOYMENTS.md"),target_join(host,"docs/standards/DEPLOYMENT-STANDARD.md")])
            for did in specs:
                dep=after["deployments"][did]
                if dep["host_id"]==hid:paths.add(dep["root"])
            needs_docker=any(after["deployments"][did]["host_id"]==hid and after["deployments"][did]["method"]=="compose" for did in doc_targets)
            inv=call(host,{"action":"probe","paths":sorted(paths),"disk_roots":[host["root"]],"include_docker":needs_docker,"deep_paths":[o["path"] for o in ops if o["host_id"]==hid and o["kind"]=="purge-quarantine"]},timeout=180)
            if needs_docker:
                control=inv.get("docker_control")
                if not control or control.get("status")!="observed":raise OpsError("Docker/Compose preparation is not verified; finish an approved H plan before D")
                if not control["endpoint"].startswith(("unix://","npipe://")):raise OpsError("Docker context points to a different machine; register that machine as the target host")
                wanted=target_join(host,"_runtime/docker")
                if after["policies"]["strict_docker_root"] and control["data_root"]!=wanted:raise OpsError("existing Docker data-root differs from unified root; explicit H migration required, never silently move it")
                version=tuple(int(x) for x in re.findall(r"\d+",control["compose_version"])[:3])
                if version<(2,30,0):raise OpsError("generated raw env_file contract requires Docker Compose >=2.30")
                for op in ops:
                    if op["host_id"]==hid and op.get("compose_name"):
                        op["context"]=control["context"];op["expected_docker_id"]=control["id"]
                for did in doc_targets:
                    dep=after["deployments"][did]
                    if dep["host_id"]==hid and dep["method"]=="compose":
                        dep["service"].update(docker_context=control["context"],docker_id=control["id"])
                        for commands in dep["commands"].values():
                            for argv in commands:
                                if argv[:2]==["docker","compose"]:argv[1:1]=["--context",control["context"]]
            inventories[hid]=inv;snapshots[hid]=inv["snapshots"]
            doc_preconditions[hid]={p:v for p,v in inv["snapshots"].items() if p not in {o.get("path") for o in ops if o["host_id"]==hid}}
        for did,d in specs.items():
            dep=after["deployments"][did];snap=snapshots[dep["host_id"]][dep["root"]]
            if did not in current["deployments"] and snap["kind"]!="absent" and not d.get("adopt_existing"):
                raise OpsError("project directory exists: explicit verified adoption is required for "+did)
        seen=set()
        for op in ops:
            if op["kind"] in ("write","quarantine","purge-quarantine"):
                op["expected"]=snapshots[op["host_id"]][op["path"]]
                if op["path"].endswith(".ops-project.json") and op["expected"].get("owner") not in (None,json.loads(op["content"])):
                    raise OpsError("project root is owned by a different deployment")
                if op["kind"]=="write":
                    key=(op["host_id"],op["path"])
                    if key in seen:raise OpsError("two writes to the same file in one plan: "+op["path"])
                    seen.add(key)
                    if op["expected"]["kind"] not in ("file","absent"):raise OpsError("file destination is not a regular file")
        refs=credentials_in(ops)
        from .docs import credential_refs
        for d in after["deployments"].values():refs.update(credential_refs(after,d))
        for a in after["allocations"].values():
            if a["provider_deployment_id"] in doc_targets:refs.add(a["credential_ref"])
        for b in after["bindings"].values():
            if b["consumer_deployment_id"] in doc_targets:refs.add(b["credential_ref"])
        cv={}
        for ref in sorted(refs):
            cid,version=ref.split("@")
            try:value=ledger["entries"][cid][version]
            except KeyError as e:raise OpsError("missing plaintext credential version: "+ref) from e
            cv[ref]=digest(value)
        created=now();expires=(dt.datetime.now(dt.timezone.utc)+dt.timedelta(hours=spec.get("expires_hours",24))).isoformat(timespec="seconds").replace("+00:00","Z")
        plan={"schema_version":1,"artifact":"ops-resource-plan","run_id":rid,"worker":spec["worker"],"operation":spec["operation"],"reason":spec["reason"],
              "created_at":created,"expires_at":expires,"controller_id":current["controller"]["controller_id"],"registry_digest":digest(current),"registry_revision":current["revision"],
              "hosts":selected,"transport_digests":{hid:host_transport_digest(h) for hid,h in selected.items()},"inventories":inventories,"operations":ops,
              "registry_after":after,"credential_versions":cv,"document_targets":doc_targets,"document_preconditions":doc_preconditions,
              "allow_adopt_roots":spec.get("allow_adopt_roots",[]),"external_files":external,"affected_consumers":sorted(affected),"rollback_note":spec["rollback_note"],
              "risk":spec.get("risk","production-critical" if spec["worker"]=="D" else "external-mutation"),"source_digests":source_digests}
        from .execution import engine_digest
        plan["engine_digest"]=engine_digest()
        validate(plan,"plan")
        path=run_dir(state,plan)
        write_json(path/"plan.json",plan,exclusive=True)
        from .docs import plan_report
        atomic_write(path/"PLAN.md",plan_report(plan),exclusive=True)
        for hid in selected:
            link=state/"hosts"/hid/"runs"/rid/"reference.json"
            write_json(link,{"run_id":rid,"plan_path":str((path/"plan.json").relative_to(state)),"plan_digest":digest(plan)},exclusive=True)
        return {"run_id":rid,"plan_path":str(path/"plan.json"),"report":str(path/"PLAN.md"),"plan_digest":digest(plan),"steps":len(ops),"status":"awaiting-approval"}
