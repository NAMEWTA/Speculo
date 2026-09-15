"""Strict host-key SSH and subprocess local transport. No passwords in argv."""
from __future__ import annotations
import base64, json, shlex, subprocess, sys
from pathlib import Path
from .core import *

AGENT=Path(__file__).with_name("agent.py")

def host_transport_digest(host: dict) -> str:
    c=host["connection"]
    kh=None
    if host["transport"]=="ssh":
        p=Path(c["known_hosts"])
        no_symlinks(p,allow_missing=False)
        kh=digest(p.read_bytes())
    return digest({"host":host,"known_hosts_digest":kh})

def call(host: dict, request: dict, *, timeout: int=1800) -> dict:
    request={"identity":host["identity"],**request}
    content="import base64,json\nOPS_REQUEST=json.loads(base64.b64decode("+repr(base64.b64encode(canonical(request)).decode())+"))\n"+AGENT.read_text(encoding="utf-8").replace("from __future__ import annotations\n", "")
    code="import sys;exec(compile(sys.stdin.buffer.read(),'<ops-target-agent>','exec'))"
    if host["transport"]=="local":
        argv=[sys.executable,"-c",code]
    else:
        c=host["connection"];kh=Path(c["known_hosts"]).absolute();no_symlinks(kh,allow_missing=False)
        argv=["ssh","-T","-o","BatchMode=yes","-o","StrictHostKeyChecking=yes","-o",f"UserKnownHostsFile={kh}",
              "-o","ConnectTimeout=15","-o","ServerAliveInterval=15","-o","ServerAliveCountMax=3","-p",str(c.get("port",22))]
        if c.get("identity_file"):argv += ["-i",c["identity_file"],"-o","IdentitiesOnly=yes"]
        remote=[c["python"],"-c",code]
        if c.get("sudo"):remote=["sudo","-n","--",*remote]
        if c.get("shell","posix")=="powershell":
            if c.get("sudo"):raise OpsError("sudo not valid for PowerShell transport")
            remote_command="& "+" ".join("'"+x.replace("'","''")+"'" for x in remote)
            ps=base64.b64encode(remote_command.encode("utf-16le")).decode()
            remote_command="powershell -NoProfile -NonInteractive -EncodedCommand "+ps
        else:remote_command=shlex.join(remote)
        argv += ["--",c["username"]+"@"+c["hostname"],remote_command]
    try:
        p=subprocess.run(argv,input=content.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
    except (OSError,subprocess.TimeoutExpired) as e:
        if request["action"] in ("step","lock","unlock"):raise UnknownResult("target transport interrupted; inspect receipts before retry") from e
        raise OpsError("target read unavailable: "+str(e)) from e
    if p.returncode!=0:
        text=redact(p.stderr.decode("utf8","replace"),request.get("secrets",[]))[-2000:]
        if request["action"] in ("step","lock","unlock"):raise UnknownResult("target transport failed: "+text)
        raise OpsError("target read failed: "+text)
    try:value=json.loads(p.stdout)
    except ValueError as e:raise UnknownResult("invalid target response; stdout noise or interrupted operation") from e
    if not value.get("ok"):raise OpsError("target blocked: "+value.get("error","unknown"))
    return value["result"]

def probe_local() -> dict:
    from .agent import fingerprint
    host={"host_id":"probe-local","platform":"windows" if os.name=="nt" else "linux","transport":"local","connection":{},"identity":fingerprint()}
    return call(host,{"action":"probe"},timeout=120)
