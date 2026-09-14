# Read-only audit wrapper. Run with a trusted Python 3.10+ interpreter.
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AuditArgs)
$ErrorActionPreference = 'Stop'
$scriptFile = Join-Path $PSScriptRoot 'hygiene.py'
& python $scriptFile audit @AuditArgs
exit $LASTEXITCODE
