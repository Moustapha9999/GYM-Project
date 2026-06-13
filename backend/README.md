# Backend — API FastAPI

API REST du projet GYM SYLLA.

## Prérequis

- Python 3.11+
- Docker (pour PostgreSQL local) ou un projet Supabase

## Installation

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # puis adapter DATABASE_URL si besoin
```

## Base de données

### Option A — PostgreSQL local (Docker, recommandé en dev)

Depuis la racine du monorepo :

```bash
docker compose up -d
cd backend
source .venv/bin/activate
alembic upgrade head
python -m scripts.seed
```

**Interface pgAdmin (navigateur) :** `http://localhost:5050`

| Champ | Valeur |
|---|---|
| Email pgAdmin | `admin@gym.sylla` |
| Mot de passe pgAdmin | `admin` |
| Mot de passe serveur PostgreSQL (`gym_user`) | `gym_password` |

Le serveur **GYM SYLLA — PostgreSQL** est préconfiguré (tables, données, requêtes SQL).

### Option B — Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier la connection string PostgreSQL dans `backend/.env` → `DATABASE_URL`
3. Lancer `alembic upgrade head` puis `python -m scripts.seed`

## Démarrer l'API

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

→ API : `http://localhost:8000`  
→ Docs : `http://localhost:8000/docs`

## Compte admin (après seed)

| Email | Mot de passe |
|---|---|
| `admin@totalfitness.mr` | `@` |

Voir le [contrat d'API](../docs/api-contract.md).
