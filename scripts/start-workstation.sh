#!/usr/bin/env bash
# Machines B/C — backend + frontend vers la base partagée (machine A)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=machine-a-ip.conf
source "$ROOT/scripts/machine-a-ip.conf" 2>/dev/null || MACHINE_A_IP="192.168.100.6"

DB_HOST="${1:-${MACHINE_A_IP:-192.168.100.6}}"
if [[ -z "$DB_HOST" ]]; then
  echo "Usage: $0 [IP_MACHINE_A]"
  echo "Exemple: $0 192.168.100.6"
  exit 1
fi

BACKEND_ENV="$ROOT/backend/.env"

if [[ ! -f "$BACKEND_ENV" ]]; then
  cp "$ROOT/backend/.env.workstation.example" "$BACKEND_ENV"
  echo "→ backend/.env créé depuis .env.workstation.example"
fi

sed -i.bak \
  -e "s|@localhost:5432|@${DB_HOST}:5432|g" \
  -e "s|@127\.0\.0\.1:5432|@${DB_HOST}:5432|g" \
  -e "s|@192\.168\.[0-9.]\+:5432|@${DB_HOST}:5432|g" \
  -e "s|http://localhost:3001|http://${DB_HOST}:3001|g" \
  -e "s|http://127\.0\.0\.1:3001|http://${DB_HOST}:3001|g" \
  -e "s|http://192\.168\.[0-9.]\+:3001|http://${DB_HOST}:3001|g" \
  -e "s|192\.168\.1\.10|${DB_HOST}|g" \
  "$BACKEND_ENV"
rm -f "${BACKEND_ENV}.bak"
echo "→ backend/.env : base distante → ${DB_HOST}:5432"

LAN_ENV="$ROOT/frontend/src/environments/environment.lan.ts"
if [[ -f "$LAN_ENV" ]]; then
  sed -i.bak "s|apiUrl: 'http://[^']*'|apiUrl: 'http://localhost:8000/api/v1'|" "$LAN_ENV"
  rm -f "${LAN_ENV}.bak"
  echo "→ environment.lan.ts : apiUrl → http://localhost:8000/api/v1"
fi

echo ""
echo "Poste client configuré. Démarrer :"
echo "  Terminal 1 — cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "  Terminal 2 — cd frontend && npm start -- --configuration=lan --host 0.0.0.0"
echo ""
echo "Vérifier que SECRET_KEY dans backend/.env est identique à celle de la machine A."
