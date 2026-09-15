#!/usr/bin/env python3
"""Real disposable local deployment. No network, system installation, or existing-root writes."""
from __future__ import annotations
import argparse,json,os,sys
from pathlib import Path
from opslib.cli import initialize
from opslib.core import write_json,OpsError,read_json
from opslib.model import register,put_credential,load
from opslib.transport import probe_local
from opslib.planner import compile_plan
from opslib.execution import approval,apply

def run(output:Path)->dict:
    output=output.absolute()
    if output.exists() and any(output.iterdir()):raise OpsError("demo output must be a new/empty directory, never your real state or target root")
    output.mkdir(parents=True,exist_ok=True)
    state=output/'controller';target=output/'server'
    initialize(state,'demo-controller')
    inventory=probe_local()
    platform=inventory['platform']
    if platform not in ('linux','darwin','windows'):raise OpsError('unsupported platform')
    register(state,{'hosts':[{'host_id':'demo-local','display_name':'Disposable local demo','platform':platform,'transport':'local','connection':{},'root':str(target),'identity':inventory['identity']}],
                    'projects':[{'project_id':'app-a','display_name':'Demo APP A','kind':'app','service_type':None,'source':{'type':'local','location':str(output/'fixture-source'),'revision':'demo-v1'}}]})
    password='DEMO-ONLY-$literal-quote\"-not-a-real-password'
    put_credential(state,{'credential_id':'demo-auth','version':1,'purpose':'Disposable example only; never use in production','values':{'username':'demo-admin','password':password}})
    program="""import os,json,pathlib
root=pathlib.Path(os.environ['OPS_DATA_ROOT'])/'app/storage'
root.mkdir(parents=True,exist_ok=True)
assert os.environ['APP_USERNAME']=='demo-admin'
assert os.environ['APP_PASSWORD'].startswith('DEMO-ONLY-')
p=root/'record.json'
p.write_text(json.dumps({'version':'demo-v1','count':1,'environment_injected':True}))
"""
    spec={'schema_version':1,'worker':'D','operation':'deploy','reason':'Explicit disposable local demo; only this new output tree is written. No network or system install.',
          'rollback_note':'All files belong to the demo output. Keep evidence; no user data or shared service is touched.',
          'deployments':[{'deployment_id':'app-a-demo','project_id':'app-a','host_id':'demo-local','environment':'demo','instance':'main','layout':'flat','method':'native','version':'demo-v1',
          'files':[{'path':'artifact/main.py','content':program}], 'native':{'supervisor':'oneshot','argv':[sys.executable,'{{artifact}}/main.py']},
          'env':{'app.env':{'APP_USERNAME':'{{credential:demo-auth@1:username}}','APP_PASSWORD':'{{credential:demo-auth@1:password}}'}},'credential_refs':['demo-auth@1'],
          'health':[{'type':'file','path':'data/app/storage/record.json'}],
          'backup':'The finite process exits before backup. Demo has no shared dependencies. Actual backup must be a separately approved action.',
          'recovery':'Keep data/app/storage. Rerunning a different version requires a new approved plan.'}]}
    write_json(output/'demo-spec.json',spec)
    plan=compile_plan(state,output/'demo-spec.json')
    # This script is an explicit opt-in demo limited to a fresh user-designated directory, not production approval automation.
    approval(state,plan['run_id'],plan['plan_digest'],'demo-user','I authorize only this fresh disposable demo directory and the exact generated fixture plan.')
    result=apply(state,plan['run_id'])
    if result['status']!='completed':raise OpsError('demo did not fully complete: '+json.dumps(result))
    local=state/'hosts/demo-local/deployments/app-a-demo'
    readme=(target/'app-a/README.md').read_text()
    assert password not in readme and 'demo-v1' in readme and str(target/'app-a/data/app/storage') in readme
    assert password in (local/'README.md').read_text()
    assert password in (target/'app-a/OPERATIONS.md').read_text()
    assert read_json(local/'docs-receipt.json')['status']=='both-sides-verified'
    assert read_json(target/'app-a/data/app/storage/record.json')['environment_injected']
    report={**result,'output':str(output),'target_readme':str(target/'app-a/README.md'),'controller_record':str(local/'README.md'),
            'checks':{'runtime_data_in_project':True,'native_env_injection':True,'server_readme_no_password':True,'controller_plaintext_exact':True,'server_operations_plaintext_exact':True,'both_sides_verified':True},
            'scope':'real local filesystem and subprocess fixture; not a Docker/SSH/Windows-service production acceptance test'}
    write_json(output/'DEMO-RESULT.json',report)
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True)
    try:print(json.dumps(run(Path(parser.parse_args().output)),ensure_ascii=False,indent=2))
    except (OpsError,OSError,AssertionError) as exc:print(str(exc),file=sys.stderr);sys.exit(2)
