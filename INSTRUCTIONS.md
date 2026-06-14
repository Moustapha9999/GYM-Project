# Étape 12 — Finalisation : PDF, Cron, Notifications, Déploiement

## 1. PDF / Exports (backend)
Placer dans `backend/app/` :
- `backend/services/pdf_service.py`    → `app/services/pdf_service.py`
- `backend/services/export_service.py` → `app/services/export_service.py`
- `backend/routers/rapports.py`        → `app/routers/rapports.py`
- `backend/routers/__init__.py`        → `app/routers/__init__.py` (REMPLACE — ajoute rapports)

Endpoints :
- `GET /rapports/paiements/{id}/recu-pdf`
- `GET /rapports/fiches-paie/{id}/pdf`
- `GET /rapports/export/paiements-excel`
- `GET /rapports/export/clients-excel`

## 2. Tâches Cron (backend)
- `backend/tasks/__init__.py`  → `app/tasks/__init__.py`
- `backend/tasks/jobs.py`      → `app/tasks/jobs.py`
- `backend/scripts/run_cron.py`→ `scripts/run_cron.py`

Tester :
```bash
python -m scripts.run_cron expirer   # expire abonnements + cartes
python -m scripts.run_cron rappels   # rappels J-7/J-3/J-0
```

## 3. Déploiement backend
- `backend/Dockerfile`        → `backend/Dockerfile`
- `backend/.dockerignore`     → `backend/.dockerignore`
- `backend/requirements.txt`  → `backend/requirements.txt` (mis à jour)
- `render.yaml`               → racine du monorepo

## 4. Micro-service Notifications (Node.js)
Tout le dossier `notification-service/` → `notification-service/` à la racine du monorepo.
```bash
cd notification-service
npm install
cp .env.example .env
npm run dev        # scanner le QR WhatsApp au 1er lancement
```

## Déploiement Render
1. Pousser le monorepo sur GitHub
2. Sur Render : New → Blueprint → sélectionner le repo (détecte render.yaml)
3. Renseigner les variables `sync: false` (DATABASE_URL, API_SECRET) dans le dashboard
4. Les 4 services se déploient : API, notifications, 2 crons
