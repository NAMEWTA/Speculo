param([switch]$Probe,[string]$Apply,[string]$Sha256,[string]$Approval)
$ErrorActionPreference='Stop'
if (-not $Apply) {
  Write-Output 'OPS bootstrap inventory (read-only; no extra runtime prerequisite beyond this probe)'
  Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,OSArchitecture,FreePhysicalMemory,TotalVisibleMemorySize
  'ssh','git','python','py','uv','node','npm','java','docker','volta' | ForEach-Object {
    $c=Get-Command $_ -ErrorAction SilentlyContinue
    [pscustomobject]@{Tool=$_;Path=if($c){$c.Source}else{'missing'}}
  }
  exit 0
}
if ($Approval -ne 'I-APPROVE-THIS-BOOTSTRAP') { throw 'Explicit bootstrap approval is required' }
$f=Get-Item -LiteralPath $Apply
if ($f.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse-point installer is not accepted' }
if ((Get-FileHash -LiteralPath $Apply -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256.ToLowerInvariant()) { throw 'Installer changed since review' }
& $f.FullName
if (-not $?) { throw 'Bootstrap installer failed' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node still unavailable; not completed' }
