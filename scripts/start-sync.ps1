param(
    [switch]$Foreground,
    [int]$DebounceSeconds = 60
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Foreground) {
    $ms = [Math]::Max(1, $DebounceSeconds) * 1000
    Write-Host "Starting Sathya Birthday Auto-Sync in foreground (Ctrl+C to stop)..." -ForegroundColor Cyan
    & node (Join-Path $ScriptDir "auto-sync.js") "--debounce=$ms"
} else {
    $ms = [Math]::Max(1, $DebounceSeconds) * 1000
    & node (Join-Path $ScriptDir "sync-cli.js") "start" "--debounce=$ms"
}

