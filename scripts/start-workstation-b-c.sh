#!/usr/bin/env bash
# Machines B/C — postes réception / manager (backend + frontend → base sur machine A)
# Usage :
#   ./scripts/start-workstation-b-c.sh              # IP fixe 192.168.100.6 (machine A)
#   ./scripts/start-workstation-b-c.sh <IP>         # autre IP si besoin
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=machine-a-ip.conf
source "$ROOT/scripts/machine-a-ip.conf" 2>/dev/null || MACHINE_A_IP="192.168.100.6"

LOG_DIR="$ROOT/.run"
IP_FILE="$LOG_DIR/machine-a-ip"
mkdir -p "$LOG_DIR"

DB_HOST="${1:-}"
if [[ -z "$DB_HOST" && -f "$IP_FILE" ]]; then
  DB_HOST="$(tr -d '\r\n' < "$IP_FILE")"
fi
if [[ -z "$DB_HOST" ]]; then
  DB_HOST="${MACHINE_A_IP:-192.168.100.6}"
fi

echo "$DB_HOST" > "$IP_FILE"

echo "══════════════════════════════════════════"
echo "  GYM SYLLA — Poste B/C (réception/manager)"
echo "══════════════════════════════════════════"
echo "  Serveur DB (machine A) : $DB_HOST"
echo ""

# ── Helpers ───────────────────────────────────────────────────
port_listening() {
  local port="$1"
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" \
      >/dev/null 2>&1
    return $?
  fi
  # --max-time évite de bloquer si un ancien processus occupe le port sans répondre
  curl -sf --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1 \
    || curl -sf --max-time 2 "http://127.0.0.1:${port}/docs" >/dev/null 2>&1
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

db_host_reachable() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "if (Test-NetConnection -ComputerName '$DB_HOST' -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded { exit 0 } else { exit 1 }" \
      >/dev/null 2>&1
    return $?
  fi
  (echo >/dev/tcp/"$DB_HOST"/5432) >/dev/null 2>&1
}

stop_pid_file() {
  local name="$1"
  local pid_file="$LOG_DIR/${name}.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
  fi
}

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

configure_workstation() {
  local backend_env="$ROOT/backend/.env"
  local lan_env="$ROOT/frontend/src/environments/environment.lan.ts"

  if [[ ! -f "$backend_env" ]]; then
    cp "$ROOT/backend/.env.workstation.example" "$backend_env"
    echo "→ backend/.env créé depuis .env.workstation.example"
  fi

  # Remplacer localhost, 127.0.0.1 ou toute IP 192.168.x.x par l'IP machine A
  sed -i.bak \
    -e "s|@localhost:5432|@${DB_HOST}:5432|g" \
    -e "s|@127\.0\.0\.1:5432|@${DB_HOST}:5432|g" \
    -e "s|@192\.168\.[0-9.]\+:5432|@${DB_HOST}:5432|g" \
    -e "s|http://localhost:3001|http://${DB_HOST}:3001|g" \
    -e "s|http://127\.0\.0\.1:3001|http://${DB_HOST}:3001|g" \
    -e "s|http://192\.168\.[0-9.]\+:3001|http://${DB_HOST}:3001|g" \
    -e "s|192\.168\.1\.10|${DB_HOST}|g" \
    "$backend_env"
  rm -f "${backend_env}.bak"
  echo "→ backend/.env : base distante → ${DB_HOST}:5432"

  if [[ -f "$lan_env" ]]; then
    sed -i.bak "s|apiUrl: 'http://[^']*'|apiUrl: 'http://localhost:8000/api/v1'|" "$lan_env"
    rm -f "${lan_env}.bak"
    echo "→ environment.lan.ts : apiUrl → http://localhost:8000/api/v1"
  fi

  if grep -q "CHANGE_ME" "$backend_env" 2>/dev/null; then
    echo ""
    echo "⚠️  Copiez SECRET_KEY et NOTIFICATION_API_SECRET depuis la machine A"
    echo "   dans backend/.env (obligatoire pour les tokens JWT)."
    echo ""
  fi
}

# ── 1. Vérifier la machine A (PostgreSQL) ─────────────────────
echo "→ Vérification connexion PostgreSQL sur ${DB_HOST}:5432..."
if ! db_host_reachable; then
  echo "❌ Impossible de joindre PostgreSQL sur ${DB_HOST}:5432"
  echo "   → Démarrez la machine A : ./scripts/start-machine-a.sh"
  echo "   → Vérifiez le pare-feu (port 5432) sur la machine A"
  exit 1
fi
echo "✅ Machine A accessible"

# ── 2. Configuration poste client ─────────────────────────────
configure_workstation

# ── 3. Backend Python ─────────────────────────────────────────
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

# Toujours redémarrer le backend pour prendre en compte backend/.env
stop_pid_file "backend"
kill_port 8000
sleep 1

echo "→ Démarrage API backend..."
(
  cd backend
  nohup "$UVICORN" app.main:app --reload --host 0.0.0.0 --port 8000 \
    > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$LOG_DIR/backend.pid"
)
sleep 3

# ── 4. Frontend Angular (config réseau local) ─────────────────
if [[ ! -d frontend/node_modules ]]; then
  echo "→ Installation frontend (première fois)..."
  (cd frontend && npm install)
fi

# Toujours redémarrer le frontend (évite un ancien ng serve bloqué sur localhost seul)
stop_pid_file "frontend"
kill_port 4200
sleep 1

echo "→ Démarrage interface Angular (config lan)..."
(
  cd frontend
  nohup npm start -- --configuration=lan --host 0.0.0.0 \
    > "$LOG_DIR/frontend.log" 2>&1 &
  echo $! > "$LOG_DIR/frontend.pid"
)

# ── 5. Attendre l'interface ───────────────────────────────────
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
LAN_IP="${LAN_IP:-${MACHINE_A_IP:-192.168.100.6}}"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Poste B/C démarré"
echo "══════════════════════════════════════════"
echo "  Interface  : http://localhost:4200"
echo "  Réseau     : http://${LAN_IP}:4200"
echo "  API        : http://localhost:8000/docs"
echo "  Base dist. : postgresql://***@${DB_HOST}:5432/gym_sylla"
echo ""
echo "  Connectez-vous avec votre compte réceptionniste ou manager."
echo ""
echo "  Logs : $LOG_DIR/"
echo "  Arrêt : ./scripts/stop-workstation-b-c.sh"
echo "══════════════════════════════════════════"

open_browser "http://localhost:4200"
