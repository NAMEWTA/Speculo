"""Native Windows Task Scheduler renderer; generated scripts are separately approved."""
import json
from .core import OpsError

def task_files(did,root,argv,env,native):
    if not native.get("account"):raise OpsError("Windows native task requires an explicit current service account")
    config={"name":"OPS-"+did,"root":root,"argv":argv,"environment":env,"account":native["account"],"run_level":native.get("run_level","Limited")}
    install=r'''$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'task.json') -Raw | ConvertFrom-Json
$current = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
if ($config.account -ne $current) { throw 'Cross-account task requires a separately reviewed credential/ACL adapter; do not guess passwords.' }
$runner = Join-Path $PSScriptRoot 'run-task.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -File "' + $runner + '"') -WorkingDirectory $config.root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $current
$principal = New-ScheduledTaskPrincipal -UserId $current -LogonType Interactive -RunLevel $config.run_level
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$old = Get-ScheduledTask -TaskName $config.name -ErrorAction SilentlyContinue
if ($old) { Stop-ScheduledTask -TaskName $config.name -ErrorAction SilentlyContinue }
Register-ScheduledTask -TaskName $config.name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $config.name
'''
    runner=r'''$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'task.json') -Raw | ConvertFrom-Json
$config.environment.PSObject.Properties | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, [string]$_.Value, 'Process') }
Set-Location -LiteralPath $config.root
$exe = [string]$config.argv[0]
$arguments = @($config.argv | Select-Object -Skip 1)
$log = Join-Path $config.root 'logs\app\task.log'
& $exe @arguments *>> $log
exit $LASTEXITCODE
'''
    return {"service/task.json":json.dumps(config,ensure_ascii=False,indent=2)+"\n","service/install-task.ps1":install,"service/run-task.ps1":runner}
