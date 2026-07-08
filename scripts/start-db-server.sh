#!/usr/bin/env bash
# Machine A — serveur PostgreSQL (+ migrations/seed optionnels)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ .env créé depuis .env.example"
fi

echo "→ Démarrage PostgreSQL (docker compose)..."
docker compose up -d db

echo "→ Attente du healthcheck PostgreSQL..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-gym_user}" -d "${POSTGRES_DB:-gym_sylla}" >/dev/null 2>&1; do
  sleep 1
done

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "192.168.x.x")"
echo ""
echo "PostgreSQL prêt."
echo "  URL locale  : postgresql://gym_user:***@localhost:5432/gym_sylla"
echo "  URL réseau  : postgresql://gym_user:***@${LAN_IP}:5432/gym_sylla"
echo ""
echo "Migrations + seed (optionnel) :"
echo "  cd backend && source .venv/bin/activate && alembic upgrade head && python scripts/seed.py"
