# Creates a Windows shortcut in the project folder for the one-click launcher.
$ErrorActionPreference = 'Stop'

$proj  = Split-Path -Parent $PSScriptRoot   # scripts\ -> project root
$bat   = Join-Path $proj 'Launch Personal Intel.bat'
$lnk   = Join-Path $proj 'Personal Intel.lnk'

if (-not (Test-Path $bat)) { throw "Launcher not found: $bat" }

$node = Join-Path $env:ProgramFiles 'nodejs\node.exe'
$icon = if (Test-Path $node) { "$node,0" } else { '%SystemRoot%\System32\SHELL32.dll,13' }

$ws  = New-Object -ComObject WScript.Shell
$sc  = $ws.CreateShortcut($lnk)
$sc.TargetPath       = $bat
$sc.WorkingDirectory = $proj
$sc.Description      = 'Personal Intel - start server, scheduler, and open the app'
$sc.IconLocation     = $icon
$sc.Save()

(Get-Item $lnk).FullName + ' created'
