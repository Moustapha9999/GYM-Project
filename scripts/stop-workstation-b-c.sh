#!/usr/bin/env bash
# Machines B/C — arrêt backend + frontend (postes réception / manager)
# Usage : ./scripts/stop-workstation-b-c.sh
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
    return
  fi
  local pids
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
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

echo "→ Arrêt du poste B/C..."

stop_pid_file "backend"
stop_pid_file "frontend"

kill_port 8000
kill_port 4200

echo "✅ Poste B/C arrêté"
