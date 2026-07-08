#!/usr/bin/env bash
# Machine A — arrêt des services locaux (API, frontend, notifications, Docker)
# Usage : ./scripts/stop-machine-a.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.run"

kill_port() {
  local port="$1"
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "
      \$conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
      if (\$conns) {
        \$conns | ForEach-Object {
          Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
      }
    " >/dev/null 2>&1 || true
  fi
}

stop_pid_file() {
  local name="$1"
  local pid_file="$LOG_DIR/${name}.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    echo "→ $name arrêté (pid $pid)"
  fi
}

echo "→ Arrêt des services Machine A..."

stop_pid_file "backend"
stop_pid_file "frontend"
stop_pid_file "notifications"

# Secours : libérer les ports si les PID ne suffisent pas (Windows)
kill_port 8000
kill_port 4200
kill_port 3001

cd "$ROOT"
if docker info >/dev/null 2>&1; then
  docker compose stop db pgadmin
  echo "→ Docker (db, pgadmin) arrêté"
else
  echo "→ Docker non actif — rien à arrêter côté conteneurs"
fi

echo "✅ Machine A arrêtée"
