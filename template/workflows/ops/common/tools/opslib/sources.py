"""Explicit pinned Git acquisition into controller-owned immutable source snapshots."""
import os,re,subprocess
from pathlib import Path
from urllib.parse import urlsplit
from .core import *
from .model import load

def fetch_source(state:Path,project_id:str,repo:str,commit:str,allow_network:bool):
    load(state);identifier(project_id)
    u=urlsplit(repo)
    if not allow_network:raise OpsError("source-fetch requires explicit --allow-network")
    if u.scheme!="https" or not u.hostname or u.username or u.password:raise OpsError("use an explicit credential-free HTTPS repository URL; authentication belongs in an approved Git helper")
    if not re.fullmatch(r"[a-f0-9]{40}",commit):raise OpsError("Git source must be pinned by full 40-character commit SHA")
    dest=state/"sources"/project_id/commit;hooks=state/"sources/.empty-hooks";private_dir(hooks)
    with lock(state/".locks/source",{"project_id":project_id,"commit":commit}):
        env={**os.environ,"GIT_TERMINAL_PROMPT":"0","GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":os.devnull,"GIT_LFS_SKIP_SMUDGE":"1"}
        git=["git","-c","core.hooksPath="+str(hooks)]
        if not dest.exists():
            private_dir(dest.parent)
            subprocess.run(git+["clone","--no-checkout","--",repo,str(dest)],env=env,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=600)
            subprocess.run(git+["-C",str(dest),"checkout","--detach",commit],env=env,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=300)
        actual=subprocess.run(git+["-C",str(dest),"rev-parse","HEAD"],env=env,capture_output=True,text=True,check=True).stdout.strip()
        if actual!=commit:raise OpsError("source snapshot identity mismatch; do not overwrite existing checkout")
        from .cli import analyze
        result={"project_id":project_id,"repository":repo,"commit":commit,"path":str(dest),"at":now(),"analysis":analyze(dest),"submodules":"not initialized; each requires independent pinned review"}
        write_json(dest.parent/(commit+".source.json"),result)
    return result
