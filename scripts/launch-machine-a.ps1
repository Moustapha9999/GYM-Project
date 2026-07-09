# GYM SYLLA — Lanceur Machine A (Windows)
# Démarre Docker Desktop puis exécute start-machine-a.sh
# Usage : double-clic sur le raccourci bureau ou :
#   powershell -ExecutionPolicy Bypass -File scripts\launch-machine-a.ps1

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$GitBash = 'C:\Program Files\Git\bin\bash.exe'
$StartScript = Join-Path $ProjectRoot 'scripts\start-machine-a.sh'

function Write-Step([string]$Message) {
    Write-Host "→ $Message" -ForegroundColor Cyan
}

function Test-DockerEngine {
    try {
        $null = docker version --format '{{.Server.Version}}' 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-PortListening([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$conn
}

function ConvertTo-BashPath([string]$Path) {
    $normalized = $Path -replace '\\', '/'
    if ($normalized -match '^([A-Za-z]):(.*)$') {
        return ('/{0}{1}' -f $Matches[1].ToLower(), $Matches[2])
    }
    return $normalized
}

Clear-Host
Write-Host '══════════════════════════════════════════' -ForegroundColor Green
Write-Host '  GYM SYLLA — Lancement Machine A' -ForegroundColor Green
Write-Host '══════════════════════════════════════════' -ForegroundColor Green
Write-Host ''

Set-Location $ProjectRoot

# ── 1. Docker Desktop ─────────────────────────────────────────
if (-not (Test-DockerEngine)) {
    if (-not (Test-Path $DockerExe)) {
        Write-Host '❌ Docker Desktop introuvable.' -ForegroundColor Red
        Write-Host "   Installez Docker Desktop : https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        Read-Host 'Appuyez sur Entrée pour fermer'
        exit 1
    }

    Write-Step 'Démarrage de Docker Desktop...'
    Start-Process -FilePath $DockerExe | Out-Null

    $ready = $false
    for ($i = 1; $i -le 72; $i++) {
        if (Test-DockerEngine) {
            $ready = $true
            break
        }
        Write-Host "   Attente moteur Docker... ($i/72)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
    }

    if (-not $ready) {
        Write-Host '❌ Docker n''a pas démarré à temps.' -ForegroundColor Red
        Write-Host '   Ouvrez Docker Desktop manuellement, attendez l''icône verte, puis relancez.' -ForegroundColor Yellow
        Read-Host 'Appuyez sur Entrée pour fermer'
        exit 1
    }
}

Write-Host '✅ Docker prêt' -ForegroundColor Green

# ── 2. Script principal (bash) ────────────────────────────────
if (-not (Test-Path $GitBash)) {
    Write-Host '❌ Git Bash introuvable.' -ForegroundColor Red
    Write-Host '   Installez Git for Windows : https://git-scm.com/download/win' -ForegroundColor Yellow
    Read-Host 'Appuyez sur Entrée pour fermer'
    exit 1
}

if (-not (Test-Path $StartScript)) {
    Write-Host "❌ Script introuvable : $StartScript" -ForegroundColor Red
    Read-Host 'Appuyez sur Entrée pour fermer'
    exit 1
}

Write-Step 'Lancement du projet (PostgreSQL, API, interface)...'
Write-Host ''

$bashRoot = ConvertTo-BashPath $ProjectRoot

& $GitBash -lc "cd '$bashRoot' && ./scripts/start-machine-a.sh"
$exitCode = $LASTEXITCODE

Write-Host ''
if ($exitCode -eq 0) {
    Write-Host '══════════════════════════════════════════' -ForegroundColor Green
    Write-Host '  ✅ Projet démarré' -ForegroundColor Green
    Write-Host '  Interface : http://localhost:4200' -ForegroundColor Green
    Write-Host '  API       : http://localhost:8000/docs' -ForegroundColor Green
    Write-Host '══════════════════════════════════════════' -ForegroundColor Green
} else {
    Write-Host "❌ Erreur au démarrage (code $exitCode). Consultez .run\*.log" -ForegroundColor Red
}

Write-Host ''
Read-Host 'Appuyez sur Entrée pour fermer'
