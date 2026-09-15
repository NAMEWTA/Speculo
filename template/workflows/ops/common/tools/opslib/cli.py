"""CLI for explicit local recording and approved target mutations."""
from __future__ import annotations
import argparse, copy, json, os, re, shutil, sys
from pathlib import Path
from .core import *
from .model import *
from .transport import call,probe_local
from .planner import compile_plan,locate_plan
from .execution import approval,apply,verify_journal,request_base


def initialize(state: Path,controller_id: str) -> dict:
    identifier(controller_id)
    if state.exists():
        no_symlinks(state)
        if (state/"status.json").exists():
            existing=read_json(state/"status.json")
            if existing.get("schema_version")==2 and existing.get("active")==[] and existing.get("archived")==[]:
                # Only an untouched template seed is convertible without a legacy import.
                extras=[p.name for p in state.iterdir() if p.name not in {"status.json","changes","archive"}]
                if extras or any(p.is_file() and p.name!=".gitkeep" for name in ("changes","archive") for p in (state/name).rglob("*")):
                    raise OpsError("legacy runtime contains evidence; use import-legacy into a new state root")
            else:
                validate_status(existing)
                if existing["controller"] is not None:
                    if existing["controller"]["controller_id"]!=controller_id:raise OpsError("controller identity already fixed")
                    return {"status":"already-initialized","controller_id":controller_id,"state_root":str(state)}
    private_dir(state)
    with lock(state/".locks/catalog",{"operation":"initialize"}):
        s=empty_status();s["controller"]={"controller_id":controller_id,"state_root":str(state),"created_at":now()}
        for rel in ("hosts","projects","releases","private","controller/inventory","docs/standards","knowledge"):
            private_dir(state/rel)
        save(state,s)
        write_json(state/"private/credentials.json",{"schema_version":1,"entries":{}})
        inv=probe_local();write_json(state/"controller/inventory"/(new_id("snapshot")+".json"),inv)
        atomic_write(state/".gitignore","*\n!.gitignore\n")
        from .docs import STANDARD
        atomic_write(state/"docs/standards/DEPLOYMENT-STANDARD.md",STANDARD)
        atomic_write(state/"README.md","# OPS 控制端\n\n资源事实：status.json；主机：hosts/；发布：releases/；明文账本：private/credentials.json。替换静态 workflow 时绝不能删除这里。首次部署后自动生成双边详细档案。\n")
    return {"status":"initialized","controller_id":controller_id,"state_root":str(state),"inventory_recorded":True}

def analyze(source: Path) -> dict:
    no_symlinks(source,allow_missing=False)
    if not source.is_dir():raise OpsError("source must be a project directory")
    skip={".git","node_modules",".venv","venv","data","backups",".speculo","dist","build","target"}
    evidence=[];detected=[]
    names={"pyproject.toml":"python","requirements.txt":"python","package.json":"node","pom.xml":"java","build.gradle":"java","Dockerfile":"docker","compose.yaml":"compose","docker-compose.yml":"compose","Cargo.toml":"rust","go.mod":"go"}
    for root,dirs,files in os.walk(source,followlinks=False):
        dirs[:]=[d for d in dirs if d not in skip and not Path(root,d).is_symlink()]
        for name in files:
            p=Path(root,name)
            if p.is_symlink() or name==".env" or name.endswith(".env"):continue
            if name in names:
                if p.stat().st_size>1024*1024:raise OpsError("manifest exceeds scan bound")
                evidence.append({"path":str(p.relative_to(source)),"sha256":digest(p.read_bytes()),"kind":names[name]});detected.append(names[name])
            if len(evidence)>2000:raise OpsError("source analysis bound exceeded")
    return {"source":str(source),"detected":sorted(set(detected)),"evidence":evidence,
            "side_effects":"read-only; no repository code executed, no network download", "next":"Create a deployment spec from actual project manifests; fix revision and storage/health/dependency mappings."}

def inspect_run(state,run):
    p=locate_plan(state,run);plan=read_json(p);ledger=ledger_load(state)
    results={}
    for hid,h in plan["hosts"].items():
        try:results[hid]=call(h,{**request_base(plan,hid,ledger),"action":"receipts"})
        except OpsError as e:results[hid]={"unavailable":str(e)}
    return {"run_id":plan["run_id"],"targets":results,"journal":verify_journal(p.parent/"journal.jsonl")}

def break_controller_lock(state,ack):
    if ack!="I-VERIFIED-NO-EXECUTION-IS-RUNNING":raise OpsError("explicit recovery acknowledgement required")
    p=state/".locks/catalog";no_symlinks(p)
    owner=read_json(p/"owner.json")
    if owner["machine"]!=socket.gethostname():raise OpsError("lock owner belongs to a different controller machine; verify there first")
    pid=owner["pid"]
    try:os.kill(pid,0)
    except ProcessLookupError:pass
    except PermissionError:raise OpsError("cannot prove owner process is stopped")
    else:raise OpsError("owner PID is still alive (or reused); refusing automatic lock removal")
    evidence=state/"controller/recovery"/(new_id("lock")+".json")
    write_json(evidence,{"owner":owner,"ack":ack,"recovered_at":now()})
    (p/"owner.json").unlink();p.rmdir()
    return {"status":"controller-lock-released","evidence":str(evidence),"target_locks":"not modified; inspect remote receipts before resume"}

def import_legacy(state,source,controller_id):
    no_symlinks(source,allow_missing=False)
    if state.exists() and any(state.iterdir()):raise OpsError("legacy import destination must be empty and separate")
    if source==state or state.is_relative_to(source) or source.is_relative_to(state):raise OpsError("legacy source/destination must be disjoint")
    for p in source.rglob("*"):
        if p.is_symlink():raise OpsError("legacy evidence contains symlinks; preserve manually without following them")
    result=initialize(state,controller_id)
    dest=state/"legacy"/new_id("import");private_dir(dest)
    manifest={}
    for p in sorted(source.rglob("*")):
        if p.is_file():
            rel=p.relative_to(source);data=p.read_bytes();atomic_write(dest/rel,data)
            manifest[str(rel)]={"sha256":digest(data),"source_mode":p.stat().st_mode&0o777}
    write_json(dest/"IMPORT-MANIFEST.json",{"source":str(source),"at":now(),"files":manifest,"approvals_reused":False})
    return {**result,"legacy_evidence":str(dest),"note":"source preserved, no hosts/deployments/passwords/approvals inferred"}

def main(argv=None):
    parser=argparse.ArgumentParser(description="OPS 2.2 resource workflow: explicit plan -> approve -> apply -> dual docs")
    parser.add_argument("--state",help="Persistent controller state root; never the static workflow directory")
    parser.add_argument("--version",action="version",version=VERSION)
    sub=parser.add_subparsers(dest="command",required=True)
    p=sub.add_parser("init");p.add_argument("--controller-id",required=True)
    p=sub.add_parser("probe");p.add_argument("--host");p.add_argument("--connection-file");p.add_argument("--output")
    p=sub.add_parser("register");p.add_argument("--file",required=True)
    p=sub.add_parser("mirror-probe");p.add_argument("--host",required=True);p.add_argument("--file",required=True);p.add_argument("--allow-network",action="store_true")
    p=sub.add_parser("credential-put");p.add_argument("--file",required=True)
    p=sub.add_parser("analyze");p.add_argument("--source",required=True)
    p=sub.add_parser("environment-spec");p.add_argument("--host",required=True);p.add_argument("--file",required=True);p.add_argument("--output",required=True)
    p=sub.add_parser("source-fetch");p.add_argument("--project",required=True);p.add_argument("--repository",required=True);p.add_argument("--commit",required=True);p.add_argument("--allow-network",action="store_true")
    p=sub.add_parser("plan");p.add_argument("--file",required=True)
    p=sub.add_parser("approve");p.add_argument("--run",required=True);p.add_argument("--digest",required=True);p.add_argument("--by",required=True);p.add_argument("--statement",required=True)
    for c in ("apply","resume","docs-sync","inspect-run"):
        p=sub.add_parser(c);p.add_argument("--run",required=True)
    p=sub.add_parser("validate");p.add_argument("--file");p.add_argument("--schema",choices=["host","project","deployment","allocation","binding","spec","plan","status","approval"])
    p=sub.add_parser("status")
    p=sub.add_parser("recover-controller-lock");p.add_argument("--ack",required=True)
    p=sub.add_parser("import-legacy");p.add_argument("--source",required=True);p.add_argument("--controller-id",required=True)
    args=parser.parse_args(argv)
    if not args.state and args.command not in ("analyze","probe","validate"):parser.error("--state is required; it is never guessed from cwd")
    state=Path(args.state).absolute() if args.state else None
    try:
        cmd=args.command
        if cmd=="init":result=initialize(state,args.controller_id)
        elif cmd=="probe":
            if args.host:
                if state is None:raise OpsError("--host needs --state")
                s=load(state);result=call(s["hosts"][args.host],{"action":"probe"},timeout=180)
                write_json(state/"hosts"/args.host/"inventory"/(new_id("snapshot")+".json"),result)
            elif args.connection_file:
                h=read_json(Path(args.connection_file))
                discovery=h.get("identity")=="discover"
                if discovery:h["identity"]="0"*64
                validate_host(h)
                result=call(h,{"action":"probe",**({"identity":None} if discovery else {})},timeout=180)
                if discovery:result["registration_note"]="Read-only discovery over your pinned known_hosts. Review identity and store it explicitly; discover is never valid for register/apply."
            else:result=probe_local()
            if args.output:write_json(Path(args.output).absolute(),result)
        elif cmd=="register":result=register(state,read_json(Path(args.file)))
        elif cmd=="mirror-probe":
            if not args.allow_network:raise OpsError("mirror benchmarking requires explicit --allow-network")
            s=load(state);data=read_json(Path(args.file));result=call(s["hosts"][args.host],{"action":"mirror-probe","candidates":data["candidates"],"rounds":data.get("rounds",3)},timeout=180)
            path=state/"hosts"/args.host/"mirrors"/(new_id("probe")+".json");write_json(path,result);result["local_report"]=str(path)
        elif cmd=="credential-put":result=put_credential(state,read_json(Path(args.file)))
        elif cmd=="analyze":result=analyze(Path(args.source).absolute())
        elif cmd=="environment-spec":
            from .host_recipes import environment_spec
            spec=environment_spec(state,args.host,read_json(Path(args.file)));write_json(Path(args.output).absolute(),spec);result={"spec_path":str(Path(args.output).absolute()),"status":"generated-not-executed","next":"plan --file this-spec"}
        elif cmd=="source-fetch":
            from .sources import fetch_source
            result=fetch_source(state,args.project,args.repository,args.commit,args.allow_network)
        elif cmd=="plan":result=compile_plan(state,Path(args.file).absolute())
        elif cmd=="approve":result=approval(state,args.run,args.digest,args.by,args.statement)
        elif cmd in ("apply","resume","docs-sync"):result=apply(state,args.run,resume=cmd=="resume",docs_only=cmd=="docs-sync")
        elif cmd=="inspect-run":result=inspect_run(state,args.run)
        elif cmd=="validate":
            if not args.file and state is None:raise OpsError("validate requires --state or --file --schema")
            if args.file:
                if not args.schema:raise OpsError("--file requires --schema")
                value=read_json(Path(args.file));validate(value,args.schema)
                if args.schema=="status":validate_status(value)
                result={"valid":True,"schema":args.schema}
            else:result={"valid":True,"revision":load(state)["revision"]}
        elif cmd=="status":
            s=load(state);result={"controller":s["controller"],"revision":s["revision"],"hosts":list(s["hosts"]),"deployments":[{"deployment_id":d["deployment_id"],"host_id":d["host_id"],"project_id":d["project_id"],"status":d["status"],"version":d["version"],"observed_version":d.get("observed_version")} for d in s["deployments"].values()]}
        elif cmd=="recover-controller-lock":result=break_controller_lock(state,args.ack)
        elif cmd=="import-legacy":result=import_legacy(state,Path(args.source).absolute(),args.controller_id)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 2 if result.get("status") in ("failed","partial","unknown","docs_pending") else 0
    except (OpsError,OSError,ValueError,KeyError) as e:
        print(json.dumps({"status":"blocked","error":str(e)},ensure_ascii=False),file=sys.stderr);return 2
