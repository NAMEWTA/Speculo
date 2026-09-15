"""OPS safety/contract tests. Adapter simulations are explicitly separate from real local subprocess tests."""
from __future__ import annotations
import base64,copy,importlib.util,json,os,re,stat,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
TOOLS=Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0,str(TOOLS))
from opslib import core,model,planner,execution,agent,transport,docs,services
from opslib.cli import initialize,analyze
from opslib.core import OpsError,UnknownResult,digest,write_json,read_json

PASSWORD='TEST-ONLY-$literal-quote"-slash\\-not-production'

def deployment(project='app-a',did='app-a-prod',root='/srv/ops',method='native',host=None):
 host=host or {'platform':'linux','root':root}
 dep_root=core.target_join(host,project)
 return {'deployment_id':did,'project_id':project,'host_id':'node-a','environment':'prod','instance':'main','layout':'flat','method':method,'version':'v1','observed_version':'v1','root':dep_root,'status':'completed','installed_at':'2026-01-01T00:00:00Z','updated_at':'2026-01-01T00:00:00Z','run_id':'run-old','compose_name':'ops-'+did if method=='compose' else None,'storage':[],'commands':{'start':[],'stop':[],'verify':[]},'credential_refs':[],'backup':'A project-specific backup is required.','recovery':'No automatic shared-database restore.','notes':[],'source':{'type':'local','location':'/source/'+project,'revision':'v1'},'service':{}}

def minimal_inventory(host,request,**kwargs):
 return {'identity':host['identity'],'observed_at':core.now(),'platform':host['platform'],'hostname':'fixture','architecture':'fixture','account':'fixture','uid':None,'python':sys.executable,'tools':{},'defaults':{},'diagnostics':{'memory':{},'issues':[],'disks':{}},'docker_control':{'status':'observed','context':'fixture-context','endpoint':'unix:///fixture/docker.sock','id':'fixture-docker-id','data_root':core.target_join(host,'_runtime/docker'),'compose_version':'2.30.0'},'snapshots':{p:(agent.tree_state(p) if p in request.get('deep_paths',[]) else agent.file_state(p)) for p in request.get('paths',[])}}

class Fixture(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='ops-tests-');self.base=Path(self.tmp.name);self.state=self.base/'controller';self.target=self.base/'server'
  with patch('opslib.cli.probe_local',return_value={'identity':agent.fingerprint(),'scope':'mock-initial-inventory-only'}):initialize(self.state,'control-a')
  self.platform='windows' if os.name=='nt' else 'linux'
  self.host={'host_id':'node-a','display_name':'Node A','platform':self.platform,'transport':'local','root':str(self.target),'identity':agent.fingerprint(),'connection':{}}
  self.project={'project_id':'app-a','display_name':'APP A','kind':'app','service_type':None,'source':{'type':'local','location':str(self.base/'source'),'revision':'v1'}}
  model.register(self.state,{'hosts':[self.host],'projects':[self.project]})
  model.put_credential(self.state,{'credential_id':'app-auth','version':1,'purpose':'Synthetic test only','values':{'username':'app-user','password':PASSWORD}})
 def tearDown(self):self.tmp.cleanup()
 def spec(self,version='v1',operation='deploy',program=None):
  if program is None:
   program="import os,json,pathlib\np=pathlib.Path(os.environ['OPS_DATA_ROOT'])/'app/storage/value.json'\nn=json.loads(p.read_text())['count']+1 if p.exists() else 1\nassert os.environ['APP_USERNAME']=='app-user'\nassert os.environ['APP_PASSWORD'].startswith('TEST-ONLY-')\np.write_text(json.dumps({'count':n,'version':"+repr(version)+"}))\n"
  return {'schema_version':1,'worker':'D','operation':operation,'reason':'Disposable isolated test only','rollback_note':'Retain old data; use a new explicitly approved recovery plan.', 'deployments':[{'deployment_id':'app-a-prod','project_id':'app-a','host_id':'node-a','environment':'prod','instance':'main','layout':'flat','method':'native','version':version,'files':[{'path':'artifact/main.py','content':program}],'env':{'app.env':{'APP_USERNAME':'{{credential:app-auth@1:username}}','APP_PASSWORD':'{{credential:app-auth@1:password}}'}},'native':{'supervisor':'oneshot','argv':[sys.executable,'{{artifact}}/main.py']},'credential_refs':['app-auth@1'],'health':[{'type':'file','path':'data/app/storage/value.json'}],'backup':'Back up only after process exit; this fixture has no shared data.','recovery':'A new matching-version plan preserves and verifies data.'}]}
 def plan(self,spec=None):
  f=self.base/'input.json';write_json(f,spec or self.spec())
  with patch('opslib.planner.call',side_effect=minimal_inventory):result=planner.compile_plan(self.state,f)
  return result,read_json(Path(result['plan_path']))
 def approve(self,info):return execution.approval(self.state,info['run_id'],info['plan_digest'],'test-admin','Approve only the exact isolated test plan and its fixture data.')
 def run_spec(self,spec=None):
  info,plan=self.plan(spec);self.approve(info);result=execution.apply(self.state,info['run_id']);return info,plan,result
 def graph(self):
  s=model.load(self.state);s['deployments']['app-a-prod']=deployment(host=self.host);s['deployments']['app-a-prod']['credential_refs']=['app-auth@1']
  p={'project_id':'mysql-main','display_name':'MySQL','kind':'shared-service','service_type':'mysql','source':{'type':'image','location':'mysql@sha256:'+'a'*64,'revision':'digest-pinned'}}
  s['projects']['mysql-main']=p
  d=deployment('mysql-main','mysql-prod',host=self.host,method='compose');d['credential_refs']=['mysql-admin@1'];d['service']={'compose_service':'mysql'};s['deployments']['mysql-prod']=d
  a={'allocation_id':'app-db','provider_deployment_id':'mysql-prod','owner_project_id':'app-a','environment':'prod','data_group':'app-a-prod','resource_kind':'database','resource_name':'app_a_prod','credential_ref':'app-auth@1','shared_owners':[],'status':'active','recovery_scope':'logical','notes':'Fixture logical resource'}
  s['allocations']['app-db']=a
  s['bindings']['app-db-binding']={'binding_id':'app-db-binding','consumer_deployment_id':'app-a-prod','mode':'shared','provider_deployment_id':'mysql-prod','allocation_id':'app-db','endpoint':'mysql-main:3306','credential_ref':'app-auth@1','status':'active','component':'mysql','network':'explicit-intranet'}
  return s

class CoreTests(unittest.TestCase):
 def test_canonical_order(self):self.assertEqual(digest({'b':1,'a':2}),digest({'a':2,'b':1}))
 def test_nonfinite_rejected(self):
  with self.assertRaises(ValueError):core.canonical(float('nan'))
 def test_duplicate_json_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'x.json';p.write_text('{"x":1,"x":2}')
   with self.assertRaises(OpsError):read_json(p)
 def test_exclusive_artifact(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'a.json';write_json(p,{'x':1},exclusive=True)
   with self.assertRaises(OpsError):write_json(p,{'x':2},exclusive=True)
   self.assertEqual(read_json(p),{'x':1})
 def test_lock_is_not_autobroken(self):
  with tempfile.TemporaryDirectory() as d:
   with core.lock(Path(d)/'lock',{'why':'test'}):
    with self.assertRaises(OpsError):
     with core.lock(Path(d)/'lock',{}):pass
 def test_symlink_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);(p/'real').mkdir()
   try:(p/'link').symlink_to(p/'real',target_is_directory=True)
   except OSError as exc:
    if os.name=='nt':self.skipTest('Windows symlink privilege is not available')
    raise
   with self.assertRaises(OpsError):core.atomic_write(p/'link/a.txt','x')
 def test_file_permissions(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'secret';core.atomic_write(p,PASSWORD)
   if os.name!='nt':self.assertEqual(p.stat().st_mode&0o777,0o600)
 def test_credential_raw_values(self):
  ledger={'entries':{'x':{'1':{'values':{'password':PASSWORD}}}}}
  self.assertEqual(core.resolve_secrets('{{credential:x@1:password}}',ledger),PASSWORD)
 def test_credential_missing(self):
  with self.assertRaises(OpsError):core.resolve_secrets('{{credential:x@1:password}}',{'entries':{}})
 def test_redaction(self):self.assertNotIn(PASSWORD,core.redact('pw '+PASSWORD,[PASSWORD]))
 def test_env_dollar_literal(self):self.assertEqual(planner.env_file({'P':'a$$"z'}),'P=a$$"z\n')
 def test_env_newline_rejected(self):
  with self.assertRaises(OpsError):planner.env_file({'P':'a\nb'})
 def test_env_key_rejected(self):
  with self.assertRaises(OpsError):planner.env_file({'P-INVALID':'a'})
 def test_systemd_env_quote(self):self.assertEqual(planner.env_file({'P':'a"\\b'},systemd=True),'P="a\\"\\\\b"\n')
 def test_markdown_secret_backticks(self):
  l={'entries':{'x':{'1':{'purpose':'test','values':{'password':'a```b|c$"'}}}}}
  self.assertIn('a```b|c$"',docs.credentials_text(['x@1'],l))
 def test_windows_native_json_secret(self):
  from opslib.native_windows import task_files
  vals=task_files('app-a',r'C:\Ops\app-a',['python',r'C:\Ops\app-a\main.py'],{'P':'{{credential:x@1:password}}'},{'account':'X\\User'})
  original={'kind':'write','json_values':json.loads(vals['service/task.json']),'content':vals['service/task.json']}
  actual=execution.resolved_op(original,{'entries':{'x':{'1':{'values':{'password':PASSWORD}}}}})
  self.assertEqual(json.loads(base64.b64decode(actual['content_b64']))['environment']['P'],PASSWORD)

# Each generated case is a named unittest, not an inflated subtest count.
for index,value in enumerate(['','../a','a/../b','a//b','/a','a\\b','C:a','a/','./a','a\x00b']):
 def reject(self,value=value):
  with self.assertRaises(OpsError):core.relative(value)
 setattr(CoreTests,f'test_relative_reject_{index:02d}',reject)
for index,value in enumerate(['app-a','mysql-main','a1','host-22']):
 def valid(self,value=value):self.assertEqual(core.identifier(value),value)
 setattr(CoreTests,f'test_identifier_valid_{index:02d}',valid)
for index,value in enumerate(['','App','a_b','-a','a-','a/b','con','com1','lpt9','a'*81]):
 def reject(self,value=value):
  with self.assertRaises(OpsError):core.identifier(value)
 setattr(CoreTests,f'test_identifier_reject_{index:02d}',reject)
for index,value in enumerate(['/','/etc','/var','/tmp','/srv','relative','/srv/../etc']):
 def reject(self,value=value):
  with self.assertRaises(OpsError):core.root_path(value,'linux')
 setattr(CoreTests,f'test_posix_root_reject_{index:02d}',reject)
for index,value in enumerate(['C:\\','C:\\Windows','C:\\Users',r'\\server\share\ops',r'C:\Ops\..\data',r'C:\Ops:stream']):
 def reject(self,value=value):
  with self.assertRaises(OpsError):core.root_path(value,'windows')
 setattr(CoreTests,f'test_windows_root_reject_{index:02d}',reject)

class ResourceTests(Fixture):
 def test_empty_v3_valid(self):model.validate_status(core.empty_status())
 def test_unknown_schema_field(self):
  s=model.load(self.state);s['secret']='bad'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_legacy_blocked(self):
  with self.assertRaises(OpsError):model.validate_status({'schema_version':2,'active':[],'archived':[]})
 def test_credential_version_immutable(self):
  with self.assertRaises(OpsError):model.put_credential(self.state,{'credential_id':'app-auth','version':1,'purpose':'x','values':{'username':'u','password':'changed'}})
 def test_credential_permissions_rejected(self):
  if os.name=='nt':self.skipTest('POSIX mode test')
  p=self.state/'private/credentials.json';p.chmod(0o644)
  with self.assertRaises(OpsError):model.ledger_load(self.state)
 def test_valid_shared_graph(self):model.validate_status(self.graph())
 def test_duplicate_physical_host(self):
  s=model.load(self.state);s['hosts']['node-b']={**self.host,'host_id':'node-b'}
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_host_root_nested(self):
  s=model.load(self.state);s['hosts']['node-b']={**self.host,'host_id':'node-b','root':str(self.target/'nested')}
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_identity_platform_mismatch(self):
  other='linux' if self.platform=='windows' else 'windows'
  other_root='/srv/ops' if other=='linux' else r'C:\Ops'
  s=model.load(self.state);s['hosts']['node-b']={**self.host,'host_id':'node-b','platform':other,'root':other_root}
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_dedicated_cannot_claim_shared_provider(self):
  s=self.graph();b=s['bindings']['app-db-binding'];b.update(mode='dedicated',allocation_id=None)
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_project_root_cannot_override(self):
  s=self.graph();s['deployments']['app-a-prod']['root']=str(self.target/'elsewhere')
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_native_data_outside_root(self):
  s=self.graph();s['deployments']['app-a-prod']['storage']=[{'component':'app','purpose':'data','path':'/tmp/data'}]
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_flat_instances_overlap(self):
  s=self.graph();d=copy.deepcopy(s['deployments']['app-a-prod']);d.update(deployment_id='app-a-test',layout='instances',environment='test',root=str(self.target/'app-a/instances/test/main'));s['deployments'][d['deployment_id']]=d
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_orphan_provider(self):
  s=self.graph();s['allocations']['app-db']['provider_deployment_id']='missing'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_duplicate_allocation(self):
  s=self.graph();s['allocations']['app-db-copy']={**s['allocations']['app-db'],'allocation_id':'app-db-copy'}
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_wrong_binding_password_version(self):
  s=self.graph();s['bindings']['app-db-binding']['credential_ref']='app-auth@2'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_external_cannot_claim_managed_data(self):
  s=self.graph();s['bindings']['app-db-binding']['mode']='external'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_retired_provider_allocation(self):
  s=self.graph();s['allocations']['app-db']['status']='retired'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_cross_environment_not_implicit(self):
  s=self.graph();s['allocations']['app-db']['environment']='test'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_unknown_project_kind(self):
  s=self.graph();s['projects']['mysql-main']['kind']='other'
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_strict_docker_cannot_be_disabled(self):
  s=self.graph();s['policies']['strict_docker_root']=False
  with self.assertRaises(OpsError):model.validate_status(s)
 def test_provider_admin_app_separation(self):
  s=self.graph();dep=s['deployments']['mysql-prod'];a=s['allocations']['app-db'];p={'adapter':'mysql','admin_credential_ref':'app-auth@1','app_username':'app-user'}
  with self.assertRaises(OpsError):services.allocation_operation(s,dep,a,p)
 def test_mysql_no_global_admin_grants(self):
  s=self.graph();p={'adapter':'mysql','admin_credential_ref':'mysql-admin@1','app_username':'app-user','privileges':['SUPER']}
  with self.assertRaises(OpsError):services.allocation_operation(s,s['deployments']['mysql-prod'],s['allocations']['app-db'],p)
 def test_mysql_explicit_scoped_grants(self):
  s=self.graph();p={'adapter':'mysql','admin_credential_ref':'mysql-admin@1','app_username':'app-user','privileges':['SELECT']}
  op=services.allocation_operation(s,s['deployments']['mysql-prod'],s['allocations']['app-db'],p)
  self.assertEqual(op['privileges'],['SELECT']);self.assertEqual(op['kind'],'mysql-allocation')
 def test_source_docs_preserve_deployment_revision(self):
  s=self.graph();s['projects']['app-a']['source']['revision']='newer-project-source';text=docs.deployment_readme(s,s['deployments']['app-a-prod'],'run-test',core.now())
  self.assertNotIn('newer-project-source',text);self.assertIn('v1',text)

class PlannerTests(Fixture):
 def test_plan_writes_no_target(self):
  info,plan=self.plan();self.assertFalse(self.target.exists());self.assertNotIn(PASSWORD,Path(info['report']).read_text());self.assertEqual(plan['registry_digest'],digest(model.load(self.state)))
 def test_missing_health_rejected(self):
  s=self.spec();s['deployments'][0]['health']=[]
  with self.assertRaises(OpsError):self.plan(s)
 def test_unknown_spec_field_rejected(self):
  s=self.spec();s['do_anything']=True
  with self.assertRaises(OpsError):self.plan(s)
 def test_inline_native_code_rejected(self):
  s=self.spec();s['deployments'][0]['native']['argv']=[sys.executable,'-c','print(1)']
  with self.assertRaises(OpsError):self.plan(s)
 def test_native_outside_arg_rejected(self):
  s=self.spec();s['deployments'][0]['native']['argv']=[sys.executable,'/tmp/other.py']
  with self.assertRaises(OpsError):self.plan(s)
 def test_env_path_escape_rejected(self):
  s=self.spec();s['deployments'][0]['env']['app.env']['APP_DATA_DIR']='/tmp/app-data'
  with self.assertRaises(OpsError):self.plan(s)
 def test_env_reserved_root_rejected(self):
  s=self.spec();s['deployments'][0]['env']['app.env']['OPS_DATA_ROOT']='{{data}}'
  with self.assertRaises(OpsError):self.plan(s)
 def test_native_multiple_env_requires_order(self):
  s=self.spec();s['deployments'][0]['env']['extra.env']={'EXTRA':'1'}
  with self.assertRaises(OpsError):self.plan(s)
 def test_unknown_env_file_rejected(self):
  s=self.spec();s['deployments'][0]['native']['env_files']=['missing.env']
  with self.assertRaises(OpsError):self.plan(s)
 def test_env_vars_reach_native_command(self):
  info,p=self.plan();commands=[x for x in p['operations'] if x['kind']=='command'];self.assertIn('APP_PASSWORD',commands[0]['env']);self.assertTrue(commands[0]['env']['HOME'].startswith(str(self.target/'app-a')))
 def test_host_command_requires_writes(self):
  s={'schema_version':1,'worker':'H','operation':'prepare','reason':'test','rollback_note':'test','host_actions':[{'host_id':'node-a','kind':'command','reason':'test','argv':['echo','safe']} ]}
  with self.assertRaises(OpsError):self.plan(s)
 def test_host_command_requires_verification(self):
  s={'schema_version':1,'worker':'H','operation':'prepare','reason':'test','rollback_note':'test','host_actions':[{'host_id':'node-a','kind':'command','reason':'test','argv':['echo','safe'],'writes':[str(self.target/'_host/x')]}]}
  with self.assertRaises(OpsError):self.plan(s)
 def test_project_file_traversal(self):
  s=self.spec();s['deployments'][0]['files'][0]['path']='../else.py'
  with self.assertRaises(OpsError):self.plan(s)
 def test_plaintext_readme_cannot_be_arbitrary_file(self):
  s=self.spec();s['deployments'][0]['files'].append({'path':'README.md','content':'fake success'})
  with self.assertRaises(OpsError):self.plan(s)
 def test_resource_update_root_fixed(self):
  s=self.spec();s['resource_updates']={'hosts':[{**self.host,'root':str(self.base/'else')}]}
  with self.assertRaises(OpsError):self.plan(s)
 def test_resource_source_update_planned(self):
  s=self.spec();p=copy.deepcopy(self.project);p['source']['revision']='v2';s['resource_updates']={'projects':[p]};info,plan=self.plan(s)
  self.assertEqual(plan['registry_after']['deployments']['app-a-prod']['source']['revision'],'v2');self.assertEqual(model.load(self.state)['projects']['app-a']['source']['revision'],'v1')
 def test_wrong_approval_digest(self):
  info,p=self.plan()
  with self.assertRaises(OpsError):execution.approval(self.state,info['run_id'],'0'*64,'test','explicit statement')
 def test_state_drift_blocks_approval(self):
  info,p=self.plan();model.register(self.state,{})
  with self.assertRaises(OpsError):self.approve(info)
 def test_approval_is_immutable(self):
  info,p=self.plan();self.approve(info)
  with self.assertRaises(OpsError):self.approve(info)
 def test_plan_tamper_blocks_apply(self):
  info,p=self.plan();self.approve(info);p['reason']='changed';write_json(Path(info['plan_path']),p)
  with self.assertRaises(OpsError):execution.apply(self.state,info['run_id'])
 def test_engine_drift_blocks_apply(self):
  info,p=self.plan();self.approve(info)
  with patch('opslib.execution.engine_digest',return_value='0'*64):
   with self.assertRaises(OpsError):execution.apply(self.state,info['run_id'])
 def test_credential_drift_blocks_apply(self):
  info,p=self.plan();self.approve(info);l=model.ledger_load(self.state);l['entries']['app-auth']['1']['values']['password']='changed';write_json(self.state/'private/credentials.json',l)
  with self.assertRaises(OpsError):execution.apply(self.state,info['run_id'])
 def test_existing_unowned_project_not_overwritten(self):
  (self.target/'app-a').mkdir(parents=True)
  with self.assertRaises(OpsError):self.plan()
 def test_compose_requires_digest(self):
  with self.assertRaises(OpsError):planner.compose_model({'compose':{'services':{'app':{'image':'example:latest'}}}},self.host,str(self.target/'app-a'),'ops-app-a',{}, {})
 def test_compose_rejects_named_volume(self):
  with self.assertRaises(OpsError):planner.compose_model({'compose':{'services':{'app':{'image':'example@sha256:'+'a'*64,'volumes':[{'type':'volume','source':'named','target':'/data'}]}}}},self.host,str(self.target/'app-a'),'ops-app-a',{}, {})
 def test_compose_rejects_cross_app_data(self):
  with self.assertRaises(OpsError):planner.compose_model({'compose':{'services':{'app':{'image':'example@sha256:'+'a'*64,'volumes':[{'type':'bind','source':str(self.target/'app-b/data/a/b'),'target':'/data'}]}}}},self.host,str(self.target/'app-a'),'ops-app-a',{}, {})
 def test_compose_rejects_writable_root(self):
  with self.assertRaises(OpsError):planner.compose_model({'compose':{'services':{'app':{'image':'example@sha256:'+'a'*64,'read_only':False}}}},self.host,str(self.target/'app-a'),'ops-app-a',{}, {})
 def test_compose_safe_persistence_model(self):
  value,mounts=planner.compose_model({'compose':{'services':{'app':{'image':'example@sha256:'+'a'*64,'volumes':[{'type':'bind','source':'data/app/storage','target':'/data'}]}}}},self.host,str(self.target/'app-a'),'ops-app-a',{'app.env':{}},{})
  self.assertTrue(value['services']['app']['read_only']);self.assertFalse(value['services']['app']['volumes'][0]['bind']['create_host_path']);self.assertEqual(value['services']['app']['env_file'][0]['format'],'raw')

class LocalExecutionTests(Fixture):
 """Real local target-agent subprocesses and disk writes. Planning inventory only is simulated to keep tests bounded."""
 def test_real_native_and_dual_docs(self):
  info,p,result=self.run_spec();self.assertEqual(result['status'],'completed',result)
  dep=model.load(self.state)['deployments']['app-a-prod'];self.assertEqual(dep['observed_version'],'v1')
  remote=self.target/'app-a';local=self.state/'hosts/node-a/deployments/app-a-prod'
  self.assertNotIn(PASSWORD,(remote/'README.md').read_text());self.assertIn(PASSWORD,(remote/'OPERATIONS.md').read_text());self.assertIn(PASSWORD,(local/'README.md').read_text())
  self.assertEqual(read_json(local/'docs-receipt.json')['status'],'both-sides-verified');self.assertEqual((remote/'env/app.env').read_bytes(),(local/'server-files/env/app.env').read_bytes())
  self.assertEqual(read_json(remote/'data/app/storage/value.json')['count'],1)
  for f in (Path(info['plan_path']).parent/'journal.jsonl',Path(info['plan_path']).parent/'execution.json'):self.assertNotIn(PASSWORD,f.read_text())
 def test_upgrade_and_rollback_preserve_data(self):
  _,_,r=self.run_spec();self.assertEqual(r['status'],'completed')
  _,_,r=self.run_spec(self.spec('v2','upgrade'));self.assertEqual(r['status'],'completed',r)
  _,_,r=self.run_spec(self.spec('v1','rollback'));self.assertEqual(r['status'],'completed',r)
  value=read_json(self.target/'app-a/data/app/storage/value.json');self.assertEqual(value,{'count':3,'version':'v1'});self.assertEqual(len(list((self.target/'app-a/releases').iterdir())),3)
 def test_retirement_preserves_data_and_credentials(self):
  _,_,r=self.run_spec();self.assertEqual(r['status'],'completed')
  _,p,r=self.run_spec({'schema_version':1,'worker':'D','operation':'uninstall','reason':'Stop only the disposable app','retire_deployments':['app-a-prod'],'rollback_note':'All data and credentials retained.'})
  self.assertEqual(r['status'],'completed',r);self.assertEqual(model.load(self.state)['deployments']['app-a-prod']['status'],'retired');self.assertTrue((self.target/'app-a/data/app/storage/value.json').exists());self.assertTrue((self.target/'app-a/env/app.env').exists())
  self.assertFalse(any(o['kind'] in ('quarantine','purge-quarantine') for o in p['operations']))
 def test_second_apply_blocked_resume_completed_no_repeat(self):
  info,p,r=self.run_spec();self.assertEqual(r['status'],'completed')
  with self.assertRaises(OpsError):execution.apply(self.state,info['run_id'])
  r=execution.apply(self.state,info['run_id'],resume=True);self.assertTrue(r['unchanged']);self.assertEqual(read_json(self.target/'app-a/data/app/storage/value.json')['count'],1)
 def test_docs_retry_does_not_repeat_native_command(self):
  info,p=self.plan();self.approve(info);real=transport.call;failed=False
  def interrupted(host,request,**kw):
   nonlocal failed
   if request.get('action')=='step' and request.get('operation',{}).get('step_id','').startswith('docs-') and not failed:
    failed=True;raise UnknownResult('simulated document transport interruption before dispatch')
   return real(host,request,**kw)
  with patch('opslib.execution.call',side_effect=interrupted):r=execution.apply(self.state,info['run_id'])
  self.assertEqual(r['status'],'docs_pending',r);self.assertTrue((self.state/'hosts/node-a/deployments/app-a-prod/README.md').exists())
  r=execution.apply(self.state,info['run_id'],docs_only=True);self.assertEqual(r['status'],'completed',r);self.assertEqual(read_json(self.target/'app-a/data/app/storage/value.json')['count'],1)
 def test_actual_failed_command_not_replayed(self):
  info,p,r=self.run_spec(self.spec(program='raise SystemExit(7)\n'));self.assertEqual(r['status'],'partial',r)
  dep=model.load(self.state)['deployments']['app-a-prod'];self.assertEqual(dep['status'],'failed');self.assertIsNone(dep['observed_version'])
  again=execution.apply(self.state,info['run_id'],resume=True);self.assertEqual(again['status'],'failed');self.assertIn('not replayed',json.dumps(again))
 def test_unknown_identity_blocks_target_before_data(self):
  info,p=self.plan();self.approve(info)
  # Identity mismatch occurs in real target agent; this simulates an incorrectly registered machine, not SSH execution.
  wrong={**self.host,'identity':'0'*64}
  with self.assertRaises(OpsError):transport.call(wrong,{'action':'probe'})
  self.assertFalse(self.target.exists())
 def test_remote_file_drift_stops_before_overwrite(self):
  info,p=self.plan();self.approve(info);dest=self.target/'app-a/env/app.env';dest.parent.mkdir(parents=True);dest.write_text('UNAPPROVED=1\n')
  # Claiming an unowned root is not silently allowed. The first target lock must block before file mutation.
  r=execution.apply(self.state,info['run_id']);self.assertEqual(r['status'],'failed');self.assertEqual(dest.read_text(),'UNAPPROVED=1\n')
 def test_journal_tamper_detected(self):
  info,p,r=self.run_spec();j=Path(info['plan_path']).parent/'journal.jsonl';rows=j.read_text().splitlines();value=json.loads(rows[0]);value['kind']='tampered';rows[0]=json.dumps(value);j.write_text('\n'.join(rows)+'\n')
  with self.assertRaises(OpsError):execution.verify_journal(j)
 def test_quarantine_then_separate_purge(self):
  hspec={'schema_version':1,'worker':'H','operation':'maintain','hosts':['node-a'],'reason':'Disposable cache fixture','rollback_note':'Keep isolated cache until separate purge is approved.', 'host_actions':[{'host_id':'node-a','kind':'write-file','reason':'Create only fixture cache','path':'_host/cache/demo/cache.txt','content':'Disposable cache'}]}
  _,_,r=self.run_spec(hspec);self.assertEqual(r['status'],'completed',r)
  hspec['host_actions']=[{'host_id':'node-a','kind':'quarantine','reason':'Explicit isolate','path':str(self.target/'_host/cache/demo/cache.txt')}]
  info,plan,r=self.run_spec(hspec);self.assertEqual(r['status'],'completed',r)
  q=self.target/'_host/quarantine'/info['run_id']/'item-0001';self.assertTrue(q.exists())
  hspec['host_actions']=[{'host_id':'node-a','kind':'purge-quarantine','reason':'Separate irreversible deletion of this one approved cache fixture','path':str(q)}]
  _,_,r=self.run_spec(hspec);self.assertEqual(r['status'],'completed',r);self.assertFalse(q.exists())

class TargetAgentTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory(prefix='ops-agent-test-');self.root=Path(self.t.name)/'target';self.req={'action':'lock','root':str(self.root),'identity':agent.fingerprint(),'host_id':'node-a','run_id':'run-test','controller_id':'control-a','plan_digest':'a'*64,'external_files':[]};agent.main(self.req)
 def tearDown(self):self.t.cleanup()
 def step(self,op):return agent.main({**self.req,'action':'step','operation':op,'operation_digest':digest(op)})
 def test_same_receipt_is_not_reexecuted(self):
  op={'step_id':'step-1','kind':'write','path':str(self.root/'a.txt'),'content_b64':base64.b64encode(b'A').decode(),'expected':{'kind':'absent'}}
  one=self.step(op);two=self.step(op);self.assertEqual(one,two)
 def test_started_only_is_unknown(self):
  p=self.root/'_host/runs/run-test/receipts';p.mkdir(parents=True);(p/'step-1.started.json').write_text('{}')
  result=self.step({'step_id':'step-1','kind':'mkdir','path':str(self.root/'x')});self.assertEqual(result['status'],'unknown');self.assertFalse((self.root/'x').exists())
 def test_target_lock_other_owner_rejected(self):
  with self.assertRaises(agent.Failure):agent.main({**self.req,'run_id':'run-other'})
 def test_write_beyond_root_fails(self):
  result=self.step({'step_id':'step-1','kind':'write','path':str(self.root.parent/'outside'),'content_b64':'WA==','expected':{'kind':'absent'}});self.assertEqual(result['status'],'failed')
 def test_identical_bytes_still_secure_permissions(self):
  p=self.root/'secret';p.write_text('X');p.chmod(0o644)
  result=self.step({'step_id':'step-1','kind':'write','path':str(p),'content_b64':'WA==','expected':agent.file_state(p),'mode':0o600});self.assertEqual(result['status'],'succeeded')
  if os.name!='nt':self.assertEqual(p.stat().st_mode&0o777,0o600)
 def test_quarantine_data_forbidden(self):
  p=self.root/'app-a/data/logs/a';p.parent.mkdir(parents=True);p.write_text('business')
  result=self.step({'step_id':'step-1','kind':'quarantine','path':str(p),'item_id':'item-1','expected':agent.file_state(p)});self.assertEqual(result['status'],'failed');self.assertTrue(p.exists())
 def test_purge_needs_isolation_receipt(self):
  p=self.root/'_host/quarantine/run-old/item-1';p.parent.mkdir(parents=True);p.write_text('unknown')
  result=self.step({'step_id':'step-1','kind':'purge-quarantine','path':str(p),'expected':agent.tree_state(p)});self.assertEqual(result['status'],'failed')
 def test_mirror_requires_https(self):
  with self.assertRaises(agent.Failure):agent.benchmark_mirrors({'candidates':[{'id':'x','ecosystem':'python','url':'http://example.invalid/a','expected_sha256':'0'*64,'trust':'official','approved':True}]})
 def test_mirror_requires_approval(self):
  with self.assertRaises(agent.Failure):agent.benchmark_mirrors({'candidates':[{'id':'x','ecosystem':'python','url':'https://example.invalid/a','expected_sha256':'0'*64,'trust':'official','approved':False}]})
 def test_analyze_does_not_run_repo(self):
  source=self.root/'source';source.mkdir();(source/'package.json').write_text('{"scripts":{"postinstall":"NEVER-RUN"}}');(source/'.env').write_text(PASSWORD)
  result=analyze(source);self.assertEqual(result['detected'],['node']);self.assertNotIn(PASSWORD,json.dumps(result));self.assertEqual(len(result['evidence']),1)

class SSHContractTests(unittest.TestCase):
 """Transport argv/request construction simulation, not a live SSH acceptance test."""
 def test_strict_hostkey_no_secrets_in_argv(self):
  with tempfile.TemporaryDirectory() as d:
   kh=Path(d)/'known_hosts';kh.write_text('fixture pinned key\n')
   h={'host_id':'node-a','platform':'linux','transport':'ssh','identity':'a'*64,'connection':{'hostname':'host.invalid','username':'ops','known_hosts':str(kh),'python':'python3'}}
   captured={}
   def fake(argv,**kw):
    captured.update(argv=argv,**kw)
    return type('Result',(),{'returncode':0,'stdout':b'{"ok":true,"result":{"scope":"simulated"}}','stderr':b''})()
   with patch('opslib.transport.subprocess.run',side_effect=fake):transport.call(h,{'action':'step','secrets':[PASSWORD]})
   self.assertIn('StrictHostKeyChecking=yes',captured['argv']);self.assertIn('BatchMode=yes',captured['argv']);self.assertNotIn(PASSWORD,' '.join(captured['argv']));self.assertIn('UserKnownHostsFile='+str(kh),captured['argv'])
 def test_knownhosts_digest_drift(self):
  with tempfile.TemporaryDirectory() as d:
   kh=Path(d)/'known_hosts';kh.write_text('first')
   h={'transport':'ssh','connection':{'known_hosts':str(kh)}};before=transport.host_transport_digest(h);kh.write_text('second');self.assertNotEqual(before,transport.host_transport_digest(h))

if __name__=='__main__':unittest.main(verbosity=2)
