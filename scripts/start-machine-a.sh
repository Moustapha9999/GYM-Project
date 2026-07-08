#!/usr/bin/env bash
# Machine A — redémarrage complet (DB + API + interface + notifications)
# Usage : ./scripts/start-machine-a.sh
# Prérequis : Docker Desktop ouvert, Git Bash (Windows) ou bash (Linux/macOS)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.run"
mkdir -p "$LOG_DIR"

echo "══════════════════════════════════════════"
echo "  GYM SYLLA — Démarrage Machine A"
echo "══════════════════════════════════════════"

# ── Helpers ───────────────────────────────────────────────────
port_listening() {
  local port="$1"
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" \
      >/dev/null 2>&1
    return $?
  fi
  curl -sf "http://localhost:${port}/" >/dev/null 2>&1 \
    || curl -sf "http://localhost:${port}/docs" >/dev/null 2>&1
}

resolve_uvicorn() {
  if [[ -f "$ROOT/backend/.venv/Scripts/uvicorn.exe" ]]; then
    echo "$ROOT/backend/.venv/Scripts/uvicorn.exe"
  elif [[ -f "$ROOT/backend/.venv/bin/uvicorn" ]]; then
    echo "$ROOT/backend/.venv/bin/uvicorn"
  else
    echo ""
  fi
}

resolve_pip() {
  if [[ -f "$ROOT/backend/.venv/Scripts/pip.exe" ]]; then
    echo "$ROOT/backend/.venv/Scripts/pip.exe"
  elif [[ -f "$ROOT/backend/.venv/bin/pip" ]]; then
    echo "$ROOT/backend/.venv/bin/pip"
  else
    echo ""
  fi
}

resolve_python() {
  if [[ -f "$ROOT/backend/.venv/Scripts/python.exe" ]]; then
    echo "$ROOT/backend/.venv/Scripts/python.exe"
  elif [[ -f "$ROOT/backend/.venv/bin/python" ]]; then
    echo "$ROOT/backend/.venv/bin/python"
  else
    echo "python"
  fi
}

open_browser() {
  local url="$1"
  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe //c start "" "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  fi
}

get_lan_ip() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -like '192.168.*' } | Select-Object -First 1 -ExpandProperty IPAddress)" \
      2>/dev/null | tr -d '\r' || true
    return
  fi
  ipconfig getifaddr en0 2>/dev/null \
    || hostname -I 2>/dev/null | awk '{print $1}' \
    || echo "192.168.x.x"
}

# ── 1. Vérifier Docker ────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker n'est pas démarré."
  echo "   → Ouvrez Docker Desktop, puis relancez ce script."
  exit 1
fi

# ── 2. Fichiers .env (première fois seulement) ────────────────
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ .env racine créé depuis .env.example"
fi
if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "→ backend/.env créé depuis backend/.env.example"
fi
if [[ ! -f notification-service/.env ]]; then
  cp notification-service/.env.example notification-service/.env
  echo "→ notification-service/.env créé depuis .env.example"
fi

# ── 3. PostgreSQL + pgAdmin ───────────────────────────────────
echo "→ Démarrage PostgreSQL et pgAdmin..."
docker compose up -d db pgadmin

echo "→ Attente PostgreSQL..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-gym_user}" -d "${POSTGRES_DB:-gym_sylla}" >/dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL prêt"

# ── 4. Backend Python ───────────────────────────────────────
if [[ ! -d backend/.venv ]]; then
  echo "→ Création venv backend (première fois)..."
  PYTHON="$(command -v python3 || command -v python)"
  "$PYTHON" -m venv backend/.venv
  PIP="$(resolve_pip)"
  "$PIP" install -r backend/requirements.txt
fi

UVICORN="$(resolve_uvicorn)"
if [[ -z "$UVICORN" ]]; then
  echo "❌ uvicorn introuvable dans backend/.venv"
  exit 1
fi

if ! port_listening 8000; then
  echo "→ Démarrage API backend..."
  (
    cd backend
    nohup "$UVICORN" app.main:app --reload --host 0.0.0.0 --port 8000 \
      > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$LOG_DIR/backend.pid"
  )
  sleep 3
else
  echo "✅ Backend déjà actif (port 8000)"
fi

# ── 5. Frontend Angular ─────────────────────────────────────
if [[ ! -d frontend/node_modules ]]; then
  echo "→ Installation frontend (première fois)..."
  (cd frontend && npm install)
fi

if ! port_listening 4200; then
  echo "→ Démarrage interface Angular..."
  (
    cd frontend
    nohup npm start -- --host 0.0.0.0 \
      > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$LOG_DIR/frontend.pid"
  )
else
  echo "✅ Frontend déjà actif (port 4200)"
fi

# ── 6. Notifications WhatsApp ─────────────────────────────────
if [[ ! -d notification-service/node_modules ]]; then
  echo "→ Installation notification-service (première fois)..."
  (cd notification-service && npm install)
fi

if ! port_listening 3001; then
  echo "→ Démarrage notification-service..."
  (
    cd notification-service
    nohup npm run dev > "$LOG_DIR/notifications.log" 2>&1 &
    echo $! > "$LOG_DIR/notifications.pid"
  )
else
  echo "✅ Notification-service déjà actif (port 3001)"
fi

# ── 7. Attendre l'interface ───────────────────────────────────
if ! port_listening 4200; then
  echo "→ Attente compilation Angular (peut prendre 1-2 min)..."
  for _ in $(seq 1 90); do
    if port_listening 4200; then
      break
    fi
    sleep 2
  done
fi

LAN_IP="$(get_lan_ip)"
LAN_IP="${LAN_IP:-192.168.x.x}"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Machine A démarrée"
echo "══════════════════════════════════════════"
echo "  Interface  : http://localhost:4200"
echo "  Réseau     : http://${LAN_IP}:4200"
echo "  API        : http://localhost:8000/docs"
echo "  pgAdmin    : http://localhost:5050"
echo ""
echo "  Compte admin : admin@totalfitness.mr / Admin@2025"
echo ""
echo "  Logs : $LOG_DIR/"
echo "  Arrêt : ./scripts/stop-machine-a.sh"
echo "══════════════════════════════════════════"

open_browser "http://localhost:4200"
