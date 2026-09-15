"""Ephemeral local/SSH target agent. No third-party modules or target installation.
Receives the trusted code and a JSON request on stdin; never executes repository text implicitly.
"""
from __future__ import annotations
import base64, csv, datetime, hashlib, io, json, os, pathlib, platform, re, shutil, socket
import stat, subprocess, sys, tempfile, time, urllib.request, urllib.error, urllib.parse, signal

class Failure(Exception): pass

def stamp(): return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
def packed(v): return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
def sha(v): return hashlib.sha256(v if isinstance(v, bytes) else packed(v)).hexdigest()
def check_id(v):
    if not isinstance(v, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", v): raise Failure("invalid resource id")

def no_links(path):
    path = pathlib.Path(path).absolute()
    for q in [*reversed(path.parents), path]:
        try: s = q.lstat()
        except FileNotFoundError: continue
        if stat.S_ISLNK(s.st_mode) or getattr(s, "st_file_attributes", 0) & 0x400: raise Failure("symlink/reparse point: " + str(q))

def secure_file(path):
    if os.name != "nt": os.chmod(path, 0o600); return
    p = subprocess.run(["whoami", "/user", "/fo", "csv", "/nh"], capture_output=True, text=True, check=True)
    sid = next(csv.reader([p.stdout.strip()]))[1]
    subprocess.run(["icacls", str(path), "/inheritance:r", "/grant:r", f"*{sid}:F", "*S-1-5-18:F"],
                   capture_output=True, check=True)

def mkdir(path, mode=0o750):
    no_links(path)
    missing=[]; p=pathlib.Path(path)
    while not p.exists(): missing.append(p); p=p.parent
    for p in reversed(missing): p.mkdir(mode=mode)

def atomic(path, data, mode=0o600):
    no_links(path); mkdir(path.parent)
    fd, name = tempfile.mkstemp(prefix=".ops-", dir=path.parent)
    tmp = pathlib.Path(name)
    try:
        if hasattr(os, "fchmod"): os.fchmod(fd, mode)
        with os.fdopen(fd, "wb") as f: f.write(data); f.flush(); os.fsync(f.fileno())
        if os.name == "nt": secure_file(tmp)
        os.replace(tmp, path)
        if os.name != "nt": os.chmod(path, mode)
        if hasattr(os, "O_DIRECTORY"):
            d=os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try: os.fsync(d)
            finally: os.close(d)
    finally: tmp.unlink(missing_ok=True)

def wj(p, v): atomic(p, json.dumps(v, ensure_ascii=False, indent=2).encode()+b"\n")
def rj(p): no_links(p); return json.loads(p.read_text(encoding="utf-8"))
def fingerprint():
    stable = ""
    for p in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try: stable=pathlib.Path(p).read_text().strip(); break
        except OSError: pass
    if os.name == "nt":
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as k:
                stable=winreg.QueryValueEx(k,"MachineGuid")[0]
        except OSError: pass
    if platform.system() == "Darwin" and not stable:
        p=subprocess.run(["ioreg","-rd1","-c","IOPlatformExpertDevice"],capture_output=True,text=True,timeout=5)
        m=re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"',p.stdout)
        if m: stable=m.group(1)
    if not stable: raise Failure("stable machine identity unavailable; explicit identity adapter required")
    return sha({"machine":stable,"platform":platform.system()})

def file_state(path, limit=16*1024*1024):
    path=pathlib.Path(path); no_links(path)
    if not path.exists(): return {"kind":"absent"}
    s=path.stat()
    if path.is_file():
        if s.st_size>limit: raise Failure("snapshot exceeds bounded file size: " + str(path))
        result={"kind":"file","sha256":sha(path.read_bytes()),"size":s.st_size,"mode":stat.S_IMODE(s.st_mode)}
        if path.name in (".ops-project.json",".ops-host.json"):result["owner"]=rj(path)
        return result
    if path.is_dir():
        entries=sorted(p.name for p in path.iterdir())
        if len(entries)>10000: raise Failure("directory snapshot exceeds 10000 entries")
        return {"kind":"directory","entries_digest":sha(entries),"entry_count":len(entries)}
    raise Failure("unsupported file type: "+str(path))

def tree_state(path):
    root=pathlib.Path(path);no_links(root)
    if not root.exists():raise Failure("quarantine item no longer exists")
    rows=[];total=0
    for p in ([root] if root.is_file() else [root,*root.rglob("*")]):
        no_links(p)
        if len(rows)>=10000:raise Failure("purge manifest exceeds 10000 entries; split a reviewed cleanup")
        info=file_state(p)
        if info["kind"]=="file":total+=info["size"]
        if total>256*1024*1024:raise Failure("purge manifest exceeds 256 MiB; split or use a separately reviewed cleanup adapter")
        rows.append({"path":str(p.relative_to(root)),"state":info})
    return {"kind":"tree","manifest_sha256":sha(sorted(rows,key=lambda x:x["path"])),"logical_bytes":total,"entries":len(rows)}

def inventory(req):
    tools={}
    for name,args in (("python3",["--version"]),("python",["--version"]),("uv",["--version"]),
                      ("java",["-version"]),("node",["--version"]),("npm",["--version"]),
                      ("volta",["--version"]),("docker",["--version"]),("git",["--version"]),("ssh",["-V"])):
        path=shutil.which(name)
        item={"path":path,"status":"missing"}
        if path:
            try:
                p=subprocess.run([path,*args],capture_output=True,text=True,timeout=8)
                item.update(status="observed" if p.returncode==0 else "failed",version=(p.stdout+p.stderr).strip()[:2000])
            except (OSError,subprocess.TimeoutExpired): item["status"]="unavailable"
        tools[name]=item
    docker_control=None
    if req.get("include_docker"):
        try:
            context=subprocess.run(["docker","context","show"],capture_output=True,text=True,check=True,timeout=20).stdout.strip()
            endpoint=json.loads(subprocess.run(["docker","context","inspect",context,"--format","{{json .Endpoints.docker.Host}}"],capture_output=True,text=True,check=True,timeout=20).stdout.strip())
            info=json.loads(subprocess.run(["docker","--context",context,"info","--format","{{json .}}"],capture_output=True,text=True,check=True,timeout=30).stdout.strip())
            compose=subprocess.run(["docker","--context",context,"compose","version","--short"],capture_output=True,text=True,check=True,timeout=20).stdout.strip()
            docker_control={"status":"observed","context":context,"endpoint":endpoint,"id":info["ID"],"data_root":info["DockerRootDir"],"os_type":info.get("OSType"),"compose_version":compose}
        except (OSError,ValueError,KeyError,subprocess.SubprocessError):docker_control={"status":"unavailable"}
    diagnostics={"issues":[],"memory":{},"disks":{}}
    if pathlib.Path("/proc/meminfo").exists():
        mem={}
        for line in pathlib.Path("/proc/meminfo").read_text().splitlines():
            k,v=line.split(":",1);mem[k]=int(v.strip().split()[0])*1024
        diagnostics["memory"]={k:mem.get(k) for k in ("MemTotal","MemAvailable","Cached","SwapTotal","SwapFree")}
        if mem.get("MemTotal",0) and mem.get("MemAvailable",0)/mem["MemTotal"]<0.05:diagnostics["issues"].append("low-memory-available: diagnose pressure before any cleanup")
    for candidate in req.get("disk_roots",[str(pathlib.Path.home())]):
        p=pathlib.Path(candidate)
        while not p.exists() and p!=p.parent:p=p.parent
        usage=shutil.disk_usage(p);diagnostics["disks"][candidate]={"observed_path":str(p),"total":usage.total,"free":usage.free}
        if usage.free/max(usage.total,1)<0.1:diagnostics["issues"].append("low-disk-free:"+candidate)
    return {"identity":fingerprint(),"observed_at":stamp(),"diagnostics":diagnostics,"docker_control":docker_control,"platform":platform.system().lower(),
            "architecture":platform.machine(),"hostname":socket.gethostname(),"account":os.environ.get("USERNAME",os.environ.get("USER","unknown")),
            "uid":os.geteuid() if hasattr(os,"geteuid") else None,"python":sys.executable,
            "tools":tools,"defaults":{"JAVA_HOME":os.environ.get("JAVA_HOME"),"PATH":os.environ.get("PATH"),
            "SDKMAN_DIR":os.environ.get("SDKMAN_DIR"),"VOLTA_HOME":os.environ.get("VOLTA_HOME")},
            "snapshots":{p:(tree_state(p) if p in req.get("deep_paths",[]) else file_state(p)) for p in req.get("paths",[])}}

def under(path, root, allow_root=False):
    p=pathlib.Path(path); r=pathlib.Path(root)
    if not p.is_absolute() or ".." in p.parts: raise Failure("nonabsolute/traversing path")
    try: p.relative_to(r)
    except ValueError: raise Failure("path outside approved root: " + str(p))
    if p==r and not allow_root: raise Failure("operation may not target entire host root")
    no_links(p); return p

def checked_path(path, req, *, allow_root=False):
    if path in req.get("external_files",[]):
        if path not in ("/etc/docker/daemon.json",) and not re.fullmatch(r"/etc/systemd/system/ops-[a-z0-9-]+\.service",path):
            raise Failure("unrecognized external control file")
        p=pathlib.Path(path); no_links(p); return p
    return under(path,req["root"],allow_root)

def strip_secrets(text, values):
    for v in sorted(set(values),key=len,reverse=True):
        if v: text=text.replace(v,"[REDACTED]")
    return re.sub(r"(?i)(password|passwd|token|secret|access_key)(\s*[=:]\s*)[^\s,;]+",r"\1\2[REDACTED]",text)

def command(argv, *, cwd, env=None, stdin=None, timeout=300, secrets=None, success_codes=None):
    if not isinstance(argv,list) or not argv or not all(isinstance(x,str) and "\x00" not in x for x in argv): raise Failure("argv must be a nonempty string array")
    values=secrets or []
    # Temporary files bound output memory. They live under the approved run directory, not OS /tmp.
    run_tmp=pathlib.Path(cwd)/".ops-command-tmp"
    mkdir(run_tmp,0o700)
    out=tempfile.TemporaryFile(dir=run_tmp); err=tempfile.TemporaryFile(dir=run_tmp)
    try:
        p=subprocess.Popen(argv,cwd=cwd,env={**os.environ,**(env or {}),"TMPDIR":str(run_tmp),"TMP":str(run_tmp),"TEMP":str(run_tmp)},
                           stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,stdout=out,stderr=err)
        try: p.communicate(input=stdin.encode() if stdin is not None else None,timeout=timeout)
        except subprocess.TimeoutExpired:
            p.kill(); p.wait(); raise Failure("command timed out; side effects may have occurred, inspect before replanning")
        out.seek(0); err.seek(0)
        raw_out=out.read(2*1024*1024); raw_err=err.read(2*1024*1024)
        result={"exit_code":p.returncode,"stdout":strip_secrets(raw_out.decode("utf-8","replace"),values),
                "stderr":strip_secrets(raw_err.decode("utf-8","replace"),values),"output_sha256":sha(raw_out+raw_err)}
        if p.returncode not in (success_codes or [0]):
            raise Failure("command failed with exit="+str(p.returncode)+"; output_sha256="+result["output_sha256"])
        return result
    finally:
        out.close();err.close()
        try:run_tmp.rmdir()
        except OSError:pass

def docker_base(op):
    cmd=[op.get("docker","docker")]
    if op.get("context"): cmd += ["--context",op["context"]]
    return cmd

def compose_base(op):
    return docker_base(op)+["compose","--project-name",op["compose_name"],"--project-directory",op["project_root"],
                           "--file",str(pathlib.Path(op["project_root"])/"compose/compose.yaml")]

def compose_up(op,req):
    root=checked_path(op["project_root"],req); base=compose_base(op)
    docker=docker_base(op)
    info=command(docker+["info","--format","{{json .}}"],cwd=str(root),timeout=30,secrets=req.get("secrets",[]))
    daemon=json.loads(info["stdout"].strip())
    if daemon["ID"]!=op["expected_docker_id"]:raise Failure("Docker daemon identity changed since approval")
    actual=daemon["DockerRootDir"]
    if req.get("strict_docker_root",True):
        under(actual,req["root"])
        if pathlib.Path(actual)!=pathlib.Path(req["root"])/"_runtime/docker": raise Failure("Docker data-root must be registered host_root/_runtime/docker; existing engine migration needs a separate approved host plan")
    command(base+["config","--quiet"],cwd=str(root),timeout=30,secrets=req.get("secrets",[]))
    model=json.loads((root/"compose/compose.yaml").read_text(encoding="utf-8"))
    if any("build" in s for s in model["services"].values()):
        command(base+["build","--pull=false"],cwd=str(root),timeout=op.get("timeout",1200),secrets=req.get("secrets",[]))
    command(base+["pull","--ignore-buildable"],cwd=str(root),timeout=op.get("timeout",1200),secrets=req.get("secrets",[]))
    for name,service in model["services"].items():
        image=service.get("image",op["compose_name"]+"-"+name)
        conf=command(docker+["image","inspect",image,"--format","{{json .Config.Volumes}}"],cwd=str(root),timeout=30,secrets=req.get("secrets",[]))
        declared=json.loads(conf["stdout"].strip()) or {}
        mapped={v["target"] for v in service.get("volumes",[])} | set(service.get("tmpfs",[]))
        if set(declared)-mapped: raise Failure("image declares unmapped VOLUME(s), refusing anonymous persistence: "+str(sorted(set(declared)-mapped)))
    command(base+["up","--detach","--remove-orphans","--wait","--wait-timeout",str(op.get("wait_timeout",120))],cwd=str(root),timeout=op.get("timeout",1200),secrets=req.get("secrets",[]))
    ids=command(base+["ps","--all","--quiet"],cwd=str(root),timeout=30)["stdout"].split()
    if not ids: raise Failure("Compose returned no containers")
    for cid in ids:
        item=json.loads(command(docker+["inspect",cid],cwd=str(root),timeout=30,secrets=req.get("secrets",[]))["stdout"])[0]
        for mount in item.get("Mounts",[]):
            if mount["Type"]=="volume": raise Failure("anonymous/named persistence detected after start; stop and reconcile")
            if mount["Type"]=="bind": under(mount["Source"],str(root))
    return {"containers":ids,"docker_data_root":actual,"compose_name":op["compose_name"],"verified_at":stamp()}

def allocation(op,req):
    provider=checked_path(op["provider_root"],req)
    aid=op["allocation_id"];check_id(aid)
    marker=provider/"allocations"/(aid+".json")
    if op.get("compose_name"):
        info=json.loads(command(docker_base(op)+["info","--format","{{json .}}"],cwd=str(provider),timeout=30)["stdout"])
        if info["ID"]!=op["expected_docker_id"]:raise Failure("provider Docker daemon identity drift")
    ownership={"allocation_id":aid,"resource":op["resource"],"app_username":op["app_username"],
               "owner_project_id":op["owner_project_id"],"environment":op["environment"],"credential_ref":op["credential_ref"]}
    if marker.exists():
        if rj(marker)!=ownership:raise Failure("allocation ownership conflict")
        return {"allocation_id":aid,"status":"already-owned-no-password-reset"}
    if op["kind"]=="mysql-allocation":
        base=docker_base(op)+["compose","--project-name",op["compose_name"],"--project-directory",str(provider),"--file",str(provider/"compose/compose.yaml"),
              "exec","-T","-e","MYSQL_PWD",op["compose_service"],"mysql","--batch","--skip-column-names","--user",op["admin_username"]]
        env={"MYSQL_PWD":op["admin_password"]}
        def sql(q):return command(base,cwd=str(provider),env=env,stdin=q,timeout=120,secrets=req.get("secrets",[]))["stdout"].strip()
        db=op["resource"];user=op["app_username"]
        exists=sql("SELECT (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='"+db+"')+(SELECT COUNT(*) FROM mysql.user WHERE user='"+user+"');\n")
        if exists!="0":raise Failure("database/user already exists without allocation marker; verified adoption required")
        # A server-side hex literal plus QUOTE avoids SQL/argv injection by arbitrary passwords.
        hx=op["app_password"].encode().hex()
        q="CREATE DATABASE `"+db+"`;\nSET @p=CONVERT(0x"+hx+" USING utf8mb4);\nSET @s=CONCAT('CREATE USER ''"+user+"''@''%'' IDENTIFIED BY ',QUOTE(@p));\nPREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;\nGRANT "+",".join(op["privileges"])+" ON `"+db+"`.* TO '"+user+"'@'%';\n"
        sql(q)
        app=[*base[:-1],user,"--database",db]  # Replace the admin username, preserving --user.
        command(app,cwd=str(provider),env={"MYSQL_PWD":op["app_password"]},stdin="SELECT DATABASE();\n",timeout=30,secrets=req.get("secrets",[]))
    elif op["kind"]=="redis-allocation":
        base=docker_base(op)+["compose","--project-name",op["compose_name"],"--project-directory",str(provider),"--file",str(provider/"compose/compose.yaml"),
              "exec","-T","-e","REDISCLI_AUTH",op["compose_service"],"redis-cli","--user",op["admin_username"],"--raw"]
        env={"REDISCLI_AUTH":op["admin_password"]}
        old=command(base+["ACL","GETUSER",op["app_username"]],cwd=str(provider),env=env,secrets=req.get("secrets",[]))["stdout"].strip()
        if old:raise Failure("Redis user exists without allocation marker; verified adoption required")
        args=["ACL","SETUSER",op["app_username"],"reset","on",">"+op["app_password"],"~"+op["prefix"]+":*","resetchannels","-@all","+@read","+@write","-@dangerous","+ping"]
        resp="*"+str(len(args))+"\r\n"+"".join("$"+str(len(x.encode()))+"\r\n"+x+"\r\n" for x in args)
        reply=command(base+["--pipe"],cwd=str(provider),env=env,stdin=resp,secrets=req.get("secrets",[]))["stdout"]
        if "errors: 0" not in reply:raise Failure("Redis ACL pipe did not confirm zero errors")
        saved=command(base+["ACL","SAVE"],cwd=str(provider),env=env,secrets=req.get("secrets",[]))["stdout"].strip()
        if saved!="OK":raise Failure("Redis ACL persistence was not confirmed")
        app=[*base];app[app.index("--user")+1]=op["app_username"]
        pong=command(app+["PING"],cwd=str(provider),env={"REDISCLI_AUTH":op["app_password"]},secrets=req.get("secrets",[]))["stdout"].strip()
        if pong!="PONG":raise Failure("new Redis ACL could not authenticate")
    elif op["kind"]=="minio-allocation":
        import urllib.parse
        u=urllib.parse.urlsplit(op["endpoint"])
        if u.scheme not in ("http","https") or not u.hostname or u.username or u.password:raise Failure("invalid MinIO endpoint")
        auth=urllib.parse.quote(op["admin_username"],safe="")+":"+urllib.parse.quote(op["admin_password"],safe="")+"@"
        url=urllib.parse.urlunsplit((u.scheme,auth+u.netloc,u.path,u.query,u.fragment))
        env={"MC_HOST_ops":url};mc=[op["client_path"],"--config-dir",str(provider/"run/mc"),"--json"]
        mkdir(provider/"run/mc",0o700)
        # Listing is bounded to metadata; unknown existing bucket/user is not silently adopted.
        buckets=command(mc+["ls","ops"],cwd=str(provider),env=env,secrets=req.get("secrets",[]))["stdout"]
        if any(json.loads(line).get("key","").rstrip("/")==op["resource"] for line in buckets.splitlines() if line.strip()):raise Failure("MinIO bucket exists without allocation marker")
        users=command(mc+["admin","user","list","ops"],cwd=str(provider),env=env,secrets=req.get("secrets",[]))["stdout"]
        if op["app_username"] in users:raise Failure("MinIO user exists without allocation marker")
        command(mc+["mb","ops/"+op["resource"]],cwd=str(provider),env=env,secrets=req.get("secrets",[]))
        if not op.get("secret_argv_acknowledged"):raise Failure("MinIO secret argv exposure not approved")
        command(mc+["admin","user","add","ops",op["app_username"],op["app_password"]],cwd=str(provider),env=env,secrets=req.get("secrets",[]))
        policy={"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::"+op["resource"]]},
                {"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts"],"Resource":["arn:aws:s3:::"+op["resource"]+"/*"]}]}
        policy_path=provider/"config/minio/policies"/(aid+".json");wj(policy_path,policy)
        command(mc+["admin","policy","create","ops",aid,str(policy_path)],cwd=str(provider),env=env,secrets=req.get("secrets",[]))
        command(mc+["admin","policy","attach","ops",aid,"--user",op["app_username"]],cwd=str(provider),env=env,secrets=req.get("secrets",[]))
        appauth=urllib.parse.quote(op["app_username"],safe="")+":"+urllib.parse.quote(op["app_password"],safe="")+"@"
        appurl=urllib.parse.urlunsplit((u.scheme,appauth+u.netloc,u.path,u.query,u.fragment))
        command(mc+["ls","ops/"+op["resource"]],cwd=str(provider),env={"MC_HOST_ops":appurl},secrets=req.get("secrets",[]))
    else:raise Failure("unknown allocation adapter")
    wj(marker,ownership)
    return {"allocation_id":aid,"status":"provisioned-and-authenticated","ownership_path":str(marker)}

def execute(op,req):
    kind=op["kind"]; secrets=req.get("secrets",[])
    if kind.endswith("-allocation"): return allocation(op,req)
    if kind=="grant-runtime":
        if os.name=="nt":raise Failure("POSIX runtime grant cannot be used on Windows")
        import pwd
        account=pwd.getpwnam(op["account"]);root=checked_path(op["project_root"],req)
        hostroot=pathlib.Path(req["root"]);os.chmod(hostroot,0o755)
        for p in [root,*[x for x in root.parents if x!=hostroot and hostroot in x.parents]]:
            no_links(p);os.chown(p,-1,account.pw_gid);os.chmod(p,0o750)
        for rel in op["directories"]:
            base=under(str(root/rel),str(root));mkdir(base)
            count=0
            for p in [base,*base.rglob("*")]:
                count+=1
                if count>10000:raise Failure("runtime permission grant exceeds scan bound")
                no_links(p);os.chown(p,-1,account.pw_gid)
                # Data ownership is application-specific; code/config remain deployment-owner controlled.
                if rel.split("/")[0] in ("data","logs","run"):os.chown(p,account.pw_uid,account.pw_gid)
                os.chmod(p,0o750 if p.is_dir() or p.stat().st_mode&0o111 else 0o640)
        return {"account":op["account"],"project_root":str(root),"directories":op["directories"]}
    if kind=="mkdir":
        p=checked_path(op["path"],req); mkdir(p,int(op.get("mode",488)))
        if os.name!="nt" and "mode" in op:os.chmod(p,op["mode"])
        if os.name!="nt" and ("uid" in op or "gid" in op): os.chown(p,op.get("uid",-1),op.get("gid",-1))
        return {"path":str(p),"state":file_state(p)}
    if kind=="write":
        p=checked_path(op["path"],req); data=base64.b64decode(op["content_b64"],validate=True)
        current=file_state(p); expected=op["expected"]
        if p.name==".ops-project.json" and current["kind"]=="file" and rj(p)!=json.loads(data):raise Failure("cannot overwrite another deployment ownership marker")
        if current["kind"]=="file" and current["sha256"]==sha(data):
            if os.name=="nt":secure_file(p)
            else:os.chmod(p,op.get("mode",0o600))
            return {"path":str(p),"sha256":sha(data),"unchanged":True,"state":file_state(p)}
        if current!=expected: raise Failure("file drift since plan: "+str(p))
        if current["kind"]=="file":
            backup=pathlib.Path(req["root"])/"_host/runs"/req["run_id"]/"before"/(sha(str(p).encode())+".bin")
            if not backup.exists(): atomic(backup,p.read_bytes())
        atomic(p,data,op.get("mode",384))
        return {"path":str(p),"sha256":sha(data),"state":file_state(p)}
    if kind in ("command","verify-command"):
        cwd=checked_path(op["cwd"],req,allow_root=True)
        r=command(op["argv"],cwd=str(cwd),env=op.get("env"),stdin=op.get("stdin"),timeout=op.get("timeout",300),secrets=secrets)
        if "expect_stdout" in op and r["stdout"].strip()!=op["expect_stdout"].strip(): raise Failure("verification stdout mismatch")
        if "stdout_pattern" in op and not re.search(op["stdout_pattern"],r["stdout"]): raise Failure("verification pattern mismatch")
        return r
    if kind=="compose-up":return compose_up(op,req)
    if kind=="compose-stop":
        root=checked_path(op["project_root"],req)
        # Never 'down --volumes'; preserve data and cross-project networks.
        return command(compose_base(op)+["stop"],cwd=str(root),timeout=120,secrets=secrets)
    if kind=="health":
        deadline=time.monotonic()+op.get("timeout",60);last=""
        while time.monotonic()<deadline:
            try:
                if op["type"]=="tcp":
                    with socket.create_connection((op["hostname"],op["port"]),timeout=3): pass
                elif op["type"]=="http":
                    u=urllib.parse.urlsplit(op["url"])
                    if u.scheme not in ("http","https") or u.username or u.password: raise Failure("invalid health URL")
                    with urllib.request.urlopen(op["url"],timeout=4) as r:
                        if r.status!=op.get("status",200):raise Failure("unexpected HTTP status")
                        if op.get("contains") and op["contains"] not in r.read(1048576).decode("utf8","replace"):raise Failure("health body mismatch")
                else:raise Failure("unsupported health type")
                return {"healthy":True,"at":stamp()}
            except (OSError,urllib.error.URLError,Failure) as e:last=str(e);time.sleep(1)
        raise Failure("health timeout: "+last)
    if kind=="assert-file":
        p=checked_path(op["path"],req);s=file_state(p)
        if s["kind"]!="file":raise Failure("expected persistent file missing")
        if op.get("sha256") and s["sha256"]!=op["sha256"]:raise Failure("persistent file hash mismatch")
        return s
    if kind=="purge-quarantine":
        src=checked_path(op["path"],req);qroot=pathlib.Path(req["root"])/"_host/quarantine"
        try:parts=src.relative_to(qroot).parts
        except ValueError:raise Failure("purge outside quarantine")
        if len(parts)!=2:raise Failure("purge must name one run/item, not a quarantine root")
        original_receipts=pathlib.Path(req["root"])/"_host/runs"/parts[0]/"receipts"
        owned=any(rj(p).get("result",{}).get("quarantine_path")==str(src) and rj(p).get("status")=="succeeded" for p in original_receipts.glob("*.json") if not p.name.endswith(".started.json"))
        if not owned:raise Failure("no successful isolation receipt owns this quarantine item")
        observed=tree_state(src)
        if observed!=op["expected"]:raise Failure("quarantine content changed after planning")
        before=shutil.disk_usage(src).free
        if src.is_dir():shutil.rmtree(src)
        else:src.unlink()
        after=shutil.disk_usage(qroot).free
        return {"deleted_quarantine":str(src),"logical_bytes":observed["logical_bytes"],"observed_free_space_delta":after-before,"irreversible":True}
    if kind=="quarantine":
        src=checked_path(op["path"],req);rel=src.relative_to(pathlib.Path(req["root"]))
        if not (str(rel).replace("\\","/").startswith("_host/cache/") or "logs" in rel.parts):
            raise Failure("cleanup only supports registered cache/log targets; data/env/backups/releases are protected")
        if any(p in ("data","env","backups","releases") for p in rel.parts):raise Failure("protected path")
        if file_state(src)!=op["expected"]:raise Failure("cleanup candidate drift")
        dst=pathlib.Path(req["root"])/"_host/quarantine"/req["run_id"]/op["item_id"]
        mkdir(dst.parent)
        if dst.exists():raise Failure("quarantine destination exists")
        os.rename(src,dst)
        return {"quarantine_path":str(dst),"released_bytes":0,"note":"same-volume isolation is not disk reclamation"}
    if kind=="defaults":
        current=inventory({})
        for name,expected in op["expected"].items():
            actual=current["tools"].get(name)
            if not actual or actual.get("version")!=expected.get("version"):
                raise Failure("default runtime not restored: "+name)
        return {"defaults_verified":list(op["expected"]),"at":stamp()}
    raise Failure("unsupported operation kind: "+kind)

def benchmark_mirrors(req):
    import statistics
    candidates=req.get("candidates",[])
    if not 1<=len(candidates)<=6:raise Failure("mirror test requires 1..6 explicitly approved candidates")
    rounds=req.get("rounds",3)
    if rounds not in (1,2,3):raise Failure("mirror rounds must be 1..3")
    limit=262144;results=[]
    class SameOrigin(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,request,fp,code,msg,headers,newurl):
            old=urllib.parse.urlsplit(request.full_url);new=urllib.parse.urlsplit(newurl)
            if (old.scheme,old.netloc)!=(new.scheme,new.netloc):raise Failure("cross-origin mirror redirect rejected")
            return super().redirect_request(request,fp,code,msg,headers,newurl)
    opener=urllib.request.build_opener(SameOrigin())
    for item in candidates:
        if set(item)!={"id","ecosystem","url","expected_sha256","trust","approved"}:raise Failure("mirror candidate contract mismatch")
        check_id(item["id"])
        url=urllib.parse.urlsplit(item["url"])
        if url.scheme!="https" or not url.hostname or url.username or url.password:raise Failure("mirror samples require credential-free HTTPS with certificate verification")
        if not item["approved"] or item["trust"] not in ("official","intranet","approved-third-party"):raise Failure("unapproved mirror candidate")
        if not re.fullmatch(r"[a-f0-9]{64}",item["expected_sha256"]):raise Failure("mirror sample needs a preverified SHA-256")
        times=[];error=None
        for _ in range(rounds):
            try:
                started=time.monotonic()
                with opener.open(urllib.request.Request(item["url"],headers={"User-Agent":"Speculo-OPS/2.2 mirror-probe"}),timeout=5) as r:
                    data=r.read(limit+1)
                elapsed=time.monotonic()-started
                if len(data)>limit:raise Failure("sample exceeds 256 KiB bound")
                if sha(data)!=item["expected_sha256"]:raise Failure("sample integrity mismatch")
                times.append(elapsed)
            except (OSError,Failure,urllib.error.URLError) as e:error=str(e);break
        results.append({"id":item["id"],"ecosystem":item["ecosystem"],"url":item["url"],"verified":len(times)==rounds,"median_seconds":statistics.median(times) if times else None,"error":error})
    best={}
    for row in results:
        if row["verified"] and (row["ecosystem"] not in best or row["median_seconds"]<best[row["ecosystem"]]["median_seconds"]):best[row["ecosystem"]]=row
    return {"identity":fingerprint(),"observed_at":stamp(),"candidates":results,"best_by_ecosystem":best,
            "configuration_changed":False,"note":"Candidate trust and sample digest are supplied by the administrator. Measured latency is not a guarantee of future download speed. A separate approved plan changes configuration."}

def main(req):
    identity=fingerprint()
    if req.get("identity") and identity!=req["identity"]:raise Failure("target identity drift")
    action=req["action"]
    if action=="probe":return inventory(req)
    if action=="mirror-probe":return benchmark_mirrors(req)
    if action=="snapshot":return {"identity":identity,"paths":{p:file_state(p) for p in req.get("paths",[])},"at":stamp()}
    root=pathlib.Path(req["root"])
    if not root.is_absolute() or len(root.parts)<(2 if os.name=="nt" else 3) or ".." in root.parts:raise Failure("unsafe host root")
    no_links(root)
    for key in ("host_id","run_id","controller_id"):check_id(req[key])
    owner={k:req[k] for k in ("host_id","run_id","controller_id","plan_digest")}
    marker=root/".ops-host.json"
    lockdir=root/"_host/execution.lock"
    if action=="lock":
        if root.exists() and not marker.exists() and any(root.iterdir()) and not req.get("adopt_root"):
            raise Failure("nonempty unowned host root; explicit adoption plan required")
        mkdir(root,0o755)
        if os.name!="nt" and root.stat().st_mode&0o022:raise Failure("host root is group/world writable; secure it in an explicit host preparation step before deployment")
        if os.name=="nt":
            who=subprocess.run(["whoami","/user","/fo","csv","/nh"],capture_output=True,text=True,check=True)
            sid=next(csv.reader([who.stdout.strip()]))[1]
            subprocess.run(["icacls",str(root),"/inheritance:r","/grant:r",f"*{sid}:(OI)(CI)F","*S-1-5-18:(OI)(CI)F"],capture_output=True,check=True)
        if marker.exists():
            if rj(marker)!={"host_id":req["host_id"],"identity":identity}:raise Failure("host root ownership conflict")
        else:wj(marker,{"host_id":req["host_id"],"identity":identity})
        mkdir(lockdir.parent)
        try:lockdir.mkdir(mode=0o700);wj(lockdir/"owner.json",owner)
        except FileExistsError:
            if not (lockdir/"owner.json").exists() or rj(lockdir/"owner.json")!=owner:raise Failure("target lock held by another operation")
        return {"locked":True,"owner":owner}
    if not marker.exists() or rj(marker)!={"host_id":req["host_id"],"identity":identity}:raise Failure("target root marker missing/conflicting")
    if action=="receipts":
        folder=root/"_host/runs"/req["run_id"]/"receipts"
        return {"receipts":{p.stem:rj(p) for p in sorted(folder.glob("*.json"))} if folder.exists() else {}}
    if not lockdir.exists() or rj(lockdir/"owner.json")!=owner:raise Failure("target lock not owned")
    if action=="unlock":
        (lockdir/"owner.json").unlink();lockdir.rmdir();return {"unlocked":True}
    if action!="step":raise Failure("unknown agent action")
    op=req["operation"];check_id(op["step_id"])
    receipts=root/"_host/runs"/req["run_id"]/"receipts";mkdir(receipts,0o700)
    receipt=receipts/(op["step_id"]+".json");started=receipts/(op["step_id"]+".started.json")
    op_digest=req["operation_digest"]
    if receipt.exists():
        r=rj(receipt)
        if r["operation_digest"]!=op_digest:raise Failure("operation digest mismatch")
        return r
    if started.exists():return {"status":"unknown","step_id":op["step_id"],"reason":"started without terminal receipt; do not replay blindly"}
    call_lock=lockdir/"active-call"
    try:call_lock.mkdir(mode=0o700)
    except FileExistsError:raise Failure("another target call is executing or crashed; inspect before manual recovery")
    try:
        wj(started,{"operation_digest":op_digest,"at":stamp(),"pid":os.getpid()})
        try:
            result=execute(op,req)
            if isinstance(result,dict): result={k:v for k,v in result.items() if k not in ("stdout","stderr")}
            record={"status":"succeeded","step_id":op["step_id"],"operation_digest":op_digest,"at":stamp(),"result":result}
        except Exception as e:
            record={"status":"failed","step_id":op["step_id"],"operation_digest":op_digest,"at":stamp(),
                    "error":strip_secrets(str(e),req.get("secrets",[])),"side_effects_possible":op["kind"] not in ("health","assert-file","defaults","verify-command")}
        wj(receipt,record);return record
    finally:call_lock.rmdir()

if __name__=="__main__":
    try:
        req=globals().get("OPS_REQUEST")
        if req is None:req=json.load(sys.stdin)
        response={"ok":True,"result":main(req)}
    except Exception as e:
        response={"ok":False,"error":strip_secrets(str(e),(globals().get("OPS_REQUEST") or {}).get("secrets",[]))}
    sys.stdout.write(json.dumps(response,ensure_ascii=False)+"\n")
