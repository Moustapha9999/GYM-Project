#!/usr/bin/env bash
# Machines B/C — backend + frontend vers la base partagée (machine A)
set -euo pipefail

DB_HOST="${1:-}"
if [[ -z "$DB_HOST" ]]; then
  echo "Usage: $0 <IP_MACHINE_A>"
  echo "Exemple: $0 192.168.1.10"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ENV="$ROOT/backend/.env"

if [[ ! -f "$BACKEND_ENV" ]]; then
  cp "$ROOT/backend/.env.workstation.example" "$BACKEND_ENV"
  echo "→ backend/.env créé depuis .env.workstation.example"
fi

# Met à jour l'hôte DB et le service notifications si encore sur placeholder
if grep -q "192.168.1.10" "$BACKEND_ENV"; then
  sed -i.bak "s/192.168.1.10/${DB_HOST}/g" "$BACKEND_ENV"
  rm -f "${BACKEND_ENV}.bak"
  echo "→ backend/.env : IP ${DB_HOST} appliquée"
fi

LAN_ENV="$ROOT/frontend/src/environments/environment.lan.ts"
if grep -q "192.168.1.10" "$LAN_ENV"; then
  sed -i.bak "s/192.168.1.10/${DB_HOST}/g" "$LAN_ENV"
  rm -f "${LAN_ENV}.bak"
  echo "→ environment.lan.ts : apiUrl → http://${DB_HOST}:8000/api/v1"
fi

echo ""
echo "Poste client configuré. Démarrer :"
echo "  Terminal 1 — cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "  Terminal 2 — cd frontend && npm start -- --configuration=lan --host 0.0.0.0"
echo ""
echo "Vérifier que SECRET_KEY dans backend/.env est identique à celle de la machine A."
