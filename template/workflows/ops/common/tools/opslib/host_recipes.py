"""Pinned environment-management recipes. No latest-version guessing or implicit profile edits."""
from __future__ import annotations
import re,shlex
from pathlib import Path
from .core import *
from .model import load
from .transport import call

def environment_spec(state: Path,hid: str,request: dict) -> dict:
    exact(request,{"account","python_versions","uv_path","node_version","npm_version","volta_path","java_version","original_java_candidate","sdkman_init"},{"account"},"environment request")
    identifier(request["account"],"toolchain account")
    status=load(state);host=status["hosts"][hid]
    inventory=call(host,{"action":"probe","disk_roots":[host["root"]]},timeout=180)
    base=target_join(host,"_host/toolchains/"+request["account"])
    defaults={k:v for k,v in inventory["tools"].items() if k in ("java","python","python3","node","npm") and v["status"]=="observed"}
    actions=[]
    def mkdir(rel):actions.append({"host_id":hid,"kind":"mkdir","reason":"统一工具链与缓存根","path":rel})
    def command(argv,env,writes,verify,reason):
        actions.append({"host_id":hid,"kind":"install-toolchain","reason":reason,"argv":argv,"cwd":host["root"],"env":env,"writes":writes,
                        "timeout":3600,"expected_defaults":defaults,"verification":[{**verify,"env":env}]})
    def pinned(value,label):
        if not isinstance(value,str) or not re.fullmatch(r"[0-9][A-Za-z0-9.+_-]*",value):raise OpsError(label+" must be a concrete version/candidate, not latest or a range")
        return value
    if request.get("python_versions"):
        uv=request.get("uv_path") or inventory["tools"]["uv"].get("path")
        if not uv:raise OpsError("uv is missing: first stage a checksum-verified installer in a separate host/bootstrap plan")
        install=base+("\\uv-python" if host["platform"]=="windows" else "/uv-python")
        cache=target_join(host,"_host/cache/"+request["account"]+"/uv")
        mkdir("_host/toolchains/"+request["account"]+"/uv-python");mkdir("_host/cache/"+request["account"]+"/uv")
        for version in request["python_versions"]:
            pinned(version,"Python")
            command([uv,"python","install",version],{"UV_PYTHON_INSTALL_DIR":install,"UV_CACHE_DIR":cache},[install,cache],
                    {"type":"command","argv":[uv,"python","find",version],"stdout_pattern":re.escape(install)},"Install explicitly pinned Python; never replace OS Python or change the old PATH/default.")
    if request.get("node_version"):
        v=pinned(request["node_version"],"Node");volta=request.get("volta_path") or inventory["tools"]["volta"].get("path")
        if not volta:raise OpsError("Volta missing: install a reviewed pinned release before the managed environment recipe")
        home=base+("\\volta" if host["platform"]=="windows" else "/volta")
        mkdir("_host/toolchains/"+request["account"]+"/volta")
        old=inventory["tools"]["node"].get("version","").strip().removeprefix("v")
        if old and not re.fullmatch(r"\d+\.\d+\.\d+",old):raise OpsError("cannot confidently identify original Node default")
        # Fetch installs additional versions without changing Volta's default.
        command([volta,"fetch","node@"+v],{"VOLTA_HOME":home},[home],{"type":"command","argv":[volta,"list","all"]},"Populate the managed Volta store without changing the user's default Node.")
        if old:
            command([volta,"install","node@"+old],{"VOLTA_HOME":home},[home],{"type":"command","argv":[volta,"list","all"]},"Set the managed Volta default back to the exact observed Node version; no shell profile modification.")
        if request.get("npm_version"):
            npm=pinned(request["npm_version"],"npm")
            command([volta,"fetch","npm@"+npm],{"VOLTA_HOME":home},[home],{"type":"command","argv":[volta,"list","all"]},"Fetch explicit npm version without changing user default.")
            oldnpm=inventory["tools"]["npm"].get("version","").strip()
            if re.fullmatch(r"\d+\.\d+\.\d+",oldnpm):
                command([volta,"install","npm@"+oldnpm],{"VOLTA_HOME":home},[home],{"type":"command","argv":[volta,"list","all"]},"Restore the observed npm default inside the managed Volta home.")
    if request.get("java_version"):
        if host["platform"]=="windows":raise OpsError("SDKMAN is not a native Windows adapter; register WSL as a distinct Linux execution host or retain native JDK")
        version=pinned(request["java_version"],"JDK candidate");old=pinned(request.get("original_java_candidate"),"original SDKMAN JDK candidate")
        init=request.get("sdkman_init");sdkroot=base+"/sdkman"
        if not init or not within(init,sdkroot,host["platform"]):raise OpsError("SDKMAN initialization must be staged in the managed SDKMAN root; never silently migrate an existing ~/.sdkman")
        q=shlex.quote
        script="set -euo pipefail\nexport SDKMAN_DIR="+q(sdkroot)+"\nsource "+q(init)+"\nsdkman_auto_answer=true\nsdkman_selfupdate_enable=false\nsdk current java | grep -F -- "+q(old)+"\nsdk install java "+q(version)+"\nsdk default java "+q(old)+"\nsdk use java "+q(old)+"\njava -version\n"
        rel="_host/scripts/"+new_id("sdkman")+".sh"
        actions.append({"host_id":hid,"kind":"write-file","reason":"Version-pinned SDKMAN script with original-default restoration","path":rel,"content":script,"mode":0o700})
        command(["bash",target_join(host,rel)],{},[sdkroot],{"type":"command","argv":["java","-version"]},"Install approved JDK, then restore and verify original candidate. Old JDK is never deleted.")
    if not actions:raise OpsError("no explicit toolchain versions requested")
    consumers={d["deployment_id"] for d in status["deployments"].values() if d["host_id"]==hid and d["status"]!="retired"}
    for b in status["bindings"].values():
        if b["provider_deployment_id"] in consumers and b["status"]=="active":consumers.add(b["consumer_deployment_id"])
    return {"schema_version":1,"worker":"H","operation":"prepare","reason":"Managed toolchain preparation with observed-default preservation",
            "hosts":[hid],"host_actions":actions,"acknowledged_consumers":sorted(consumers),
            "rollback_note":"Do not remove old toolchains. A failed default check stops the run. The plan does not modify user shell profiles; adoption of the managed activation environment is a separate explicit change.","risk":"external-mutation"}
