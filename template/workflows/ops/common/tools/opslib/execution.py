"""Digest-bound approval, target receipts, fail-closed resume and dual documentation delivery."""
from __future__ import annotations
import base64, copy, datetime as dt, json, os
from pathlib import Path
from .core import *
from .model import load, save, ledger_load, validate, validate_status
from .planner import locate_plan, env_file
from .transport import call, host_transport_digest
from .docs import delivery_bundle


def engine_digest() -> str:
    base=Path(__file__).resolve().parents[2]
    files=sorted(list((base/"tools/opslib").glob("*.py"))+list((base/"schemas").glob("*.json")))
    return digest({str(p.relative_to(base)):digest(p.read_bytes()) for p in files})

def approval(state: Path, run: str, expected: str, by: str, statement: str) -> dict:
    path=locate_plan(state,run);plan=read_json(path);validate(plan,"plan")
    if digest(plan)!=expected:raise OpsError("approval digest mismatch: reread the full plan report")
    if not by.strip() or len(statement.strip())<8:raise OpsError("approval needs identified approver and a meaningful explicit confirmation statement")
    if dt.datetime.now(dt.timezone.utc)>=dt.datetime.fromisoformat(plan["expires_at"].replace("Z","+00:00")):raise OpsError("plan expired; replan")
    value={"schema_version":1,"artifact":"ops-plan-approval","run_id":plan["run_id"],"plan_digest":expected,
           "approved_by":by,"approved_at":now(),"decision":"approved","statement":statement}
    validate(value,"approval")
    with lock(state/".locks/catalog",{"operation":"approve","run_id":plan["run_id"]}):
        if digest(load(state))!=plan["registry_digest"]:raise OpsError("catalog drift since plan; replan before approval")
        write_json(path.parent/"approval.json",value,exclusive=True)
    return {"run_id":plan["run_id"],"status":"approved","plan_digest":expected}

def journal(folder: Path, event: dict) -> None:
    path=folder/"journal.jsonl";no_symlinks(path);private_dir(path.parent)
    # Exclusive controller lock serializes append order; sequence hash makes truncation/tampering visible.
    previous="0"*64;seq=1
    if path.exists():
        with path.open("rb") as f:
            for line in f:
                old=json.loads(line);seq=old["sequence"]+1;previous=old["event_digest"]
    value={"sequence":seq,"at":now(),"previous_digest":previous,**event};value["event_digest"]=digest(value)
    fd=os.open(path,os.O_WRONLY|os.O_APPEND|os.O_CREAT,0o600)
    with os.fdopen(fd,"ab") as f:f.write(canonical(value)+b"\n");f.flush();os.fsync(f.fileno())
    secure(path)

def verify_journal(path: Path) -> dict:
    previous="0"*64;expected=1
    if not path.exists():return {"events":0}
    for line in path.read_text(encoding="utf8").splitlines():
        v=json.loads(line);claimed=v.pop("event_digest")
        if v["sequence"]!=expected or v["previous_digest"]!=previous or digest(v)!=claimed:raise OpsError("journal integrity mismatch")
        previous=claimed;expected+=1
    return {"events":expected-1,"last_digest":previous}

def request_base(plan,hid,ledger):
    values=[]
    for ref in plan["credential_versions"]:
        cid,v=ref.split("@");values.extend(ledger["entries"][cid][v]["values"].values())
    return {"host_id":hid,"root":plan["hosts"][hid]["root"],"controller_id":plan["controller_id"],"run_id":plan["run_id"],
            "plan_digest":digest(plan),"adopt_root":hid in plan["allow_adopt_roots"],"external_files":plan["external_files"].get(hid,[]),
            "strict_docker_root":plan["registry_after"]["policies"]["strict_docker_root"],"secrets":values}

def resolved_op(operation,ledger):
    op=resolve_secrets(copy.deepcopy(operation),ledger)
    if op["kind"]=="write":
        if "json_values" in operation:op["content"]=json.dumps(resolve_secrets(operation["json_values"],ledger),ensure_ascii=False,indent=2)+"\n"
        op.pop("json_values",None)
        if "env_values" in operation:
            op["content"]=env_file(resolve_secrets(operation["env_values"],ledger),systemd=operation.get("env_format")=="systemd")
        if "content" in op:op["content_b64"]=base64.b64encode(op.pop("content").encode()).decode()
        op.pop("env_values",None);op.pop("env_format",None)
    return op

def commit_observations(state,current,plan,execution):
    result=copy.deepcopy(current);desired=plan["registry_after"];records=execution["steps"]
    # The desired registry is not treated as observed reality. Preserve the previous verified version on failure.
    result["policies"]=desired["policies"]
    result["hosts"]=copy.deepcopy(desired["hosts"])
    result["projects"]=copy.deepcopy(desired["projects"])
    for did in plan["document_targets"]:
        proposed=copy.deepcopy(desired["deployments"][did]);old=current["deployments"].get(did)
        ops=[o for o in plan["operations"] if o.get("deployment_id")==did]
        statuses=[records.get(o["step_id"],{}).get("status","not-started") for o in ops]
        changing=bool(ops)
        if changing and all(x=="succeeded" for x in statuses):
            proposed["status"]="retired" if proposed["status"]=="retired" else "docs_pending"
            proposed["observed_version"]=proposed["version"]
            proposed["installed_at"]=proposed["installed_at"] or now();proposed["updated_at"]=now()
        elif changing:
            proposed["status"]="unknown" if "unknown" in statuses else ("failed" if "failed" in statuses else "planned")
            proposed["observed_version"]=old.get("observed_version") if old else None
            proposed["notes"].append("本次发布未完成；配置/数据可能部分变更。计划版本不是已验证运行版本。不得盲目重跑。")
        elif old:proposed=copy.deepcopy(old)
        else:proposed["status"]="planned";proposed["observed_version"]=None
        result["deployments"][did]=proposed
    for aid,a in desired["allocations"].items():
        if aid in current["allocations"] and current["allocations"][aid]["status"]!="planned":result["allocations"][aid]=copy.deepcopy(current["allocations"][aid]);continue
        item=copy.deepcopy(a)
        provisioning=[o for o in plan["operations"] if o.get("allocation_id")==aid]
        item["status"]="active" if provisioning and all(records.get(o["step_id"],{}).get("status")=="succeeded" for o in provisioning) else "planned"
        result["allocations"][aid]=item
    for bid,b in desired["bindings"].items():
        item=copy.deepcopy(b);consumer=result["deployments"].get(b["consumer_deployment_id"])
        if item["status"]=="active" and (not consumer or consumer["status"] in ("planned","failed","unknown")):
            item["status"]="planned"
        if item["mode"]=="shared" and result["allocations"][item["allocation_id"]]["status"]!="active" and item["status"]=="active":item["status"]="planned"
        result["bindings"][bid]=item
    result["releases"][plan["run_id"]]={"run_id":plan["run_id"],"worker":plan["worker"],"status":execution["status"],
         "plan_path":str(Path(execution["plan_path"]).relative_to(state)),"host_ids":sorted(plan["hosts"]),"deployment_ids":plan["document_targets"],"updated_at":now(),
         "results":{sid:{"status":v["status"],"at":v.get("at")} for sid,v in records.items()}}
    save(state,result)
    execution["committed_registry_digest"]=digest(result)
    return result

def mirror_configuration(state,plan,execution,ledger):
    for original in plan["operations"]:
        if original["kind"]!="write" or not original.get("deployment_id") or execution["steps"].get(original["step_id"],{}).get("status")!="succeeded":continue
        dep=plan["registry_after"]["deployments"][original["deployment_id"]];h=plan["hosts"][dep["host_id"]]
        cls=PureWindowsPath if h["platform"]=="windows" else PurePosixPath
        try:rel=str(cls(original["path"]).relative_to(cls(dep["root"]))).replace("\\","/")
        except ValueError:continue # Control file also has an in-project copy.
        if rel.split("/")[0] not in {"env","compose","config","service","scripts"}:continue
        op=resolved_op(original,ledger)
        dest=state/"hosts"/dep["host_id"]/"deployments"/dep["deployment_id"]/"server-files"/relative(rel)
        atomic_write(dest,base64.b64decode(op["content_b64"]))
        if digest(dest.read_bytes())!=digest(base64.b64decode(op["content_b64"])):raise OpsError("local configuration mirror readback mismatch")

def deliver(state,folder,plan,status,execution,ledger):
    outbox=folder/"outbox.json"
    eligible=[did for did in plan["document_targets"] if status["deployments"][did]["status"] not in ("planned","failed","unknown")]
    if not outbox.exists():
        document_status=copy.deepcopy(status)
        for did in eligible:
            if document_status["deployments"][did]["status"]=="docs_pending":document_status["deployments"][did]["status"]="completed"
        write_json(outbox,delivery_bundle(state,plan,document_status,ledger,eligible),exclusive=True)
    bundle=read_json(outbox)
    if bundle["plan_digest"]!=digest(plan):raise OpsError("outbox does not belong to approved plan")
    # Local files are durable first. A later remote failure cannot erase the controller's record.
    for item in bundle["local"]:
        path=state/relative(item["path"])
        if item["path"]=="knowledge/INDEX.md" and path.exists():continue # Never overwrite user-owned permanent knowledge.
        atomic_write(path,item["content"])
        if digest(path.read_bytes())!=item["sha256"]:raise OpsError("local document readback mismatch")
        bundle["acks"]["local:"+item["path"]]={"sha256":item["sha256"],"verified_at":now()}
    write_json(outbox,bundle)
    mirror_configuration(state,plan,execution,ledger)
    for item in bundle["remote"]:
        hid=item["host_id"];base=request_base(plan,hid,ledger)
        step="docs-"+digest((hid+":"+item["path"]).encode())[:24]
        op={"step_id":step,"kind":"write","path":item["path"],"content_b64":base64.b64encode(item["content"].encode()).decode(),"mode":0o600,"expected":item["expected"]}
        result=call(plan["hosts"][hid],{**base,"action":"step","operation":op,"operation_digest":digest(op)})
        if result["status"]!="succeeded":raise OpsError("target document write did not complete: "+item["path"]+" / "+result["status"])
        observed=call(plan["hosts"][hid],{"action":"snapshot","paths":[item["path"]]})["paths"][item["path"]]
        if observed.get("sha256")!=item["sha256"]:raise OpsError("target document readback mismatch: "+item["path"])
        if plan["hosts"][hid]["platform"]!="windows" and observed["mode"]&0o077:raise OpsError("target plaintext documentation mode is too broad")
        bundle["acks"]["remote:"+hid+":"+item["path"]]={"sha256":item["sha256"],"verified_at":now()}
        write_json(outbox,bundle)
    receipt={"schema_version":1,"run_id":plan["run_id"],"plan_digest":digest(plan),"completed_at":now(),"documents":bundle["acks"],"status":"both-sides-verified"}
    write_json(folder/"docs-receipt.json",receipt)
    for did in eligible:
        dep=status["deployments"][did]
        write_json(state/"hosts"/dep["host_id"]/"deployments"/did/"docs-receipt.json",receipt)
    return receipt

def apply(state: Path,run: str,*,resume=False,docs_only=False) -> dict:
    path=locate_plan(state,run);folder=path.parent;plan=read_json(path);validate(plan,"plan")
    approved=read_json(folder/"approval.json");validate(approved,"approval")
    if approved["plan_digest"]!=digest(plan) or approved["run_id"]!=plan["run_id"]:raise OpsError("plan differs from approval")
    if plan.get("engine_digest")!=engine_digest():raise OpsError("executor/schema code changed after planning; replan with this implementation")
    exec_path=folder/"execution.json"
    if exec_path.exists() and not (resume or docs_only):raise OpsError("run already started; use resume or docs-sync, never a blind second apply")
    if not exec_path.exists() and dt.datetime.now(dt.timezone.utc)>=dt.datetime.fromisoformat(plan["expires_at"].replace("Z","+00:00")):raise OpsError("approved plan expired before first execution")
    with lock(state/".locks/catalog",{"operation":"apply","run_id":plan["run_id"]}):
        current=load(state);ledger=ledger_load(state)
        execution=read_json(exec_path) if exec_path.exists() else {"schema_version":1,"run_id":plan["run_id"],"plan_path":str(path),"status":"executing","started_at":now(),"steps":{},"errors":[],"committed_registry_digest":None}
        expected=execution["committed_registry_digest"] or plan["registry_digest"]
        if digest(current)!=expected:raise OpsError("controller registry changed since this approved run; compile a new plan")
        if execution["status"]=="completed":return {"run_id":plan["run_id"],"status":"completed","unchanged":True,"report":str(folder/"RESULT.md")}
        verify_journal(folder/"journal.jsonl")
        for hid,h in plan["hosts"].items():
            if host_transport_digest(h)!=plan["transport_digests"][hid]:raise OpsError("SSH connection/known_hosts changed since approval")
        for ref,wanted in plan["credential_versions"].items():
            cid,v=ref.split("@")
            if digest(ledger["entries"].get(cid,{}).get(v))!=wanted:raise OpsError("credential version changed/missing since approval: "+ref)
        locked=[];unknown=False;operation_failed=False;doc_error=None
        write_json(exec_path,execution)
        journal(folder,{"kind":"attempt-start","run_id":plan["run_id"],"resume":resume,"docs_only":docs_only})
        try:
            for hid,h in plan["hosts"].items():
                call(h,{**request_base(plan,hid,ledger),"action":"lock"});locked.append(hid)
            if not docs_only:
                for original in plan["operations"]:
                    sid=original["step_id"]
                    previous=execution["steps"].get(sid)
                    if previous and previous["status"]=="succeeded":continue
                    if previous and previous["status"]=="failed":raise OpsError("a terminal failed action needs a new recovery plan; failed actions are not replayed")
                    hid=original["host_id"];op=resolved_op(original,ledger)
                    journal(folder,{"kind":"step-dispatch","step_id":sid,"host_id":hid,"operation_digest":digest(original)})
                    result=call(plan["hosts"][hid],{**request_base(plan,hid,ledger),"action":"step","operation":op,"operation_digest":digest(original)},timeout=max(1800,op.get("timeout",300)+120))
                    execution["steps"][sid]=result;write_json(exec_path,execution)
                    journal(folder,{"kind":"step-result","step_id":sid,"status":result["status"],"receipt_digest":digest(result)})
                    if result["status"]!="succeeded":
                        unknown=result["status"]=="unknown";operation_failed=True;break
            elif any(execution["steps"].get(o["step_id"],{}).get("status")!="succeeded" for o in plan["operations"]):
                raise OpsError("docs-sync only retries documentation after all operation receipts succeeded")
            complete_ops=all(execution["steps"].get(o["step_id"],{}).get("status")=="succeeded" for o in plan["operations"])
            execution["status"]="unknown" if unknown else ("docs_pending" if complete_ops else "partial")
            if not docs_only or not execution["committed_registry_digest"]:
                current=commit_observations(state,current,plan,execution);write_json(exec_path,execution)
            if complete_ops:
                try:
                    deliver(state,folder,plan,current,execution,ledger)
                    for did in plan["document_targets"]:
                        if current["deployments"][did]["status"]=="docs_pending":current["deployments"][did]["status"]="completed"
                    execution["status"]="completed"
                    current["releases"][plan["run_id"]]["status"]="completed";current["releases"][plan["run_id"]]["updated_at"]=now()
                    save(state,current);execution["committed_registry_digest"]=digest(current)
                except (OpsError,OSError,ValueError) as e:
                    execution["status"]="docs_pending";doc_error=str(e)
                    execution["errors"].append({"phase":"documentation","at":now(),"error":str(e)})
            else:
                # A durable controller record survives partial remote deployment even when server docs cannot be published.
                for did in plan["document_targets"]:
                    dep=current["deployments"][did]
                    write_json(state/"hosts"/dep["host_id"]/"deployments"/did/"deployment.json",dep)
        except UnknownResult as e:
            unknown=True;execution["status"]="unknown";execution["errors"].append({"phase":"transport","error":str(e),"at":now()})
            if not execution["committed_registry_digest"]:
                # Record a dispatched step as unknown, not not-started.
                if 'original' in locals() and original["step_id"] not in execution["steps"]:
                    execution["steps"][original["step_id"]]={"status":"unknown","at":now(),"reason":"transport interrupted"}
                current=commit_observations(state,current,plan,execution)
        except (OpsError,OSError,ValueError) as e:
            execution["status"]="failed";execution["errors"].append({"phase":"execution","error":str(e),"at":now()})
            if not execution["committed_registry_digest"]:current=commit_observations(state,current,plan,execution)
        finally:
            # Unknown results keep target reservations, preventing another controller from racing recovery.
            if not unknown:
                for hid in reversed(locked):
                    try:call(plan["hosts"][hid],{**request_base(plan,hid,ledger),"action":"unlock"})
                    except (OpsError,UnknownResult) as e:
                        execution["errors"].append({"phase":"unlock","host_id":hid,"error":str(e),"at":now()})
                        if execution["status"]=="completed":execution["status"]="unknown"
            execution["updated_at"]=now()
            if plan["run_id"] in current["releases"] and current["releases"][plan["run_id"]]["status"]!=execution["status"]:
                current["releases"][plan["run_id"]]["status"]=execution["status"];save(state,current);execution["committed_registry_digest"]=digest(current)
            write_json(exec_path,execution)
            journal(folder,{"kind":"attempt-end","status":execution["status"],"errors":len(execution["errors"])})
            result_md="# 执行结果 "+plan["run_id"]+"\n\n状态："+execution["status"]+"\n\n"+"\n".join(f"- {sid}: {v['status']}" for sid,v in execution["steps"].items())+"\n\n错误/未完成项：\n"+json.dumps(execution["errors"],ensure_ascii=False,indent=2)+"\n\n双边文档验证仅在 docs-receipt.json 存在且内容为 both-sides-verified 时完成。业务数据不自动镜像到部署机。\n"
            atomic_write(folder/"RESULT.md",result_md)
        return {"run_id":plan["run_id"],"status":execution["status"],"report":str(folder/"RESULT.md"),"documentation_error":doc_error,"errors":execution["errors"]}
