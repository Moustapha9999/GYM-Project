# Crée le raccourci bureau « GYM SYLLA - Machine A »
# Usage : powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LauncherBat = Join-Path $ProjectRoot 'scripts\launch-machine-a.bat'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'GYM SYLLA - Machine A.lnk'
$DockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

if (-not (Test-Path $LauncherBat)) {
    Write-Error "Fichier introuvable : $LauncherBat"
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $LauncherBat
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = 'Démarre Docker et lance GYM SYLLA (Machine A serveur)'
$Shortcut.WindowStyle = 1  # Normal window

if (Test-Path $DockerExe) {
    $Shortcut.IconLocation = "$DockerExe,0"
}

$Shortcut.Save()

Write-Host "✅ Raccourci créé : $ShortcutPath" -ForegroundColor Green
