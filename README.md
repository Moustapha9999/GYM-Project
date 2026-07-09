# 🏋️ GYM  — ERP de gestion de salle de sport

ERP complet pour la gestion d'une salle de sport : clients, abonnements, paiements (moyens locaux mauritaniens), présences avec carte QR, RH/salaires, notifications WhatsApp + SMS, et tableaux de bord décisionnels.

---

## 🧱 Stack technique

| Couche | Technologie | Déploiement |
|---|---|---|
| Frontend | Angular 20 | Netlify |
| Backend | Laravel (latest) — API REST | Render (Docker) |
| Notifications | Node.js + Baileys (WhatsApp) + SMS fallback | Render |
| Base de données | Supabase (PostgreSQL) | Supabase Cloud |

---

## 📁 Structure du dépôt (monorepo)

```
gym-sylla/
├── backend/               # API Laravel  → Render
├── frontend/              # App Angular  → Netlify
├── notification-service/  # Micro-service WhatsApp/SMS → Render
├── docs/                  # Documentation, UML, contrat d'API
└── README.md
```

> Chacun travaille dans son dossier : **backend/** (API) et **frontend/** (UI). Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour le workflow Git.

---

## 🚀 Démarrage rapide

### Prérequis

- PHP 8.3+, Composer
- Node.js 20+, npm
- Un projet Supabase (URL + clés API)

### 1. Cloner le dépôt

```bash
git clone https://github.com/<votre-org>/gym-sylla.git
cd gym-sylla
```

### 2. Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# → Renseigner les variables Supabase dans .env
php artisan migrate --seed
php artisan serve
# API disponible sur http://localhost:8000
```

### 3. Frontend (Angular)

```bash
cd frontend
npm install
# → Renseigner l'URL de l'API dans src/environments/environment.ts
ng serve
# App disponible sur http://localhost:4200
```

### 4. Notification Service (optionnel en dev)

```bash
cd notification-service
npm install
cp .env.example .env
npm run dev
# Scanner le QR WhatsApp affiché au premier démarrage
```

---

## 🔑 Variables d'environnement

Chaque sous-projet a son propre `.env.example`. **Ne jamais commiter de `.env` réel.**

| Sous-projet | Fichier |
|---|---|
| Docker (PostgreSQL) | `.env.example` → copier en `.env` à la racine |
| Backend | `backend/.env.example` |
| Postes clients (B/C) | `backend/.env.workstation.example` |
| Frontend (réseau local) | `frontend/src/environments/environment.lan.ts` |
| Notifications | `notification-service/.env.example` |

---

## 🖥️ Configuration multi-postes (réseau local)

Pour faire tourner l'application sur **3 machines** du même réseau (ex. réception, manager, serveur) avec **une seule base PostgreSQL partagée**.

### Architecture

```
Machine A (serveur)          Machines B / C (postes clients)
───────────────────          ─────────────────────────────
PostgreSQL (Docker)    ←──   Backend FastAPI
pgAdmin (optionnel)          Frontend Angular
Notification WhatsApp
```

| Machine | Rôle | Services |
|---|---|---|
| **A** | Serveur central | PostgreSQL, pgAdmin, notification-service |
| **B** | Poste client | Backend + Frontend |
| **C** | Poste client | Backend + Frontend |

### Prérequis (sur chaque machine)

- Git, Node.js 20+, npm
- Python 3.11+ (postes B/C et machine A pour migrations)
- Docker Desktop (machine A uniquement)
- Toutes les machines sur le **même réseau local** (Wi-Fi ou Ethernet)

---

### Étape 1 — Cloner le projet (toutes les machines)

```bash
git clone https://github.com/Moustapha9999/GYM-Project.git
cd GYM-Project
```

---

### Étape 2 — Machine A : serveur PostgreSQL

#### 2.1 Configurer Docker

```bash
cp .env.example .env
# Adapter POSTGRES_USER / POSTGRES_PASSWORD si besoin
```

Ou utiliser le script :

```bash
chmod +x scripts/start-db-server.sh
./scripts/start-db-server.sh
```

#### 2.2 Initialiser la base (une seule fois)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m scripts.seed
```

#### 2.3 Noter l'IP locale de la machine A

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

Exemple : `192.168.100.6`

#### 2.4 Démarrer le service WhatsApp (machine A)

```bash
cd notification-service
npm install
cp .env.example .env
# API_SECRET doit être identique à NOTIFICATION_API_SECRET du backend
npm run dev
```

#### 2.5 Ouvrir le pare-feu (machine A)

Autoriser les ports entrants depuis le réseau local :

- `5432` — PostgreSQL
- `3001` — notification-service (si utilisé depuis B/C)
- `5050` — pgAdmin (optionnel)

---

### Étape 3 — Machines B et C : postes clients

#### 3.1 Configuration automatique

Remplacer `192.168.100.6` par l'IP réelle de la machine A :

```bash
chmod +x scripts/start-workstation.sh
./scripts/start-workstation.sh 192.168.100.6
```

Ce script crée ou met à jour :

- `backend/.env` (connexion à la base distante)
- `frontend/src/environments/environment.lan.ts` (URL de l'API)

#### 3.2 Configuration manuelle (alternative)

```bash
cd backend
cp .env.workstation.example .env
```

Dans `backend/.env`, renseigner :

```env
DATABASE_URL=postgresql://gym_user:gym_password_dev_only@192.168.100.6:5432/gym_sylla
NOTIFICATION_SERVICE_URL=http://192.168.100.6:3001
SECRET_KEY=<même valeur que sur la machine A>
NOTIFICATION_API_SECRET=<même valeur que sur la machine A>
CORS_ALLOW_LAN=true
```

Dans `frontend/src/environments/environment.lan.ts` (backend lancé sur le même poste) :

```typescript
apiUrl: 'http://localhost:8000/api/v1'
```

Si le navigateur est sur **une autre machine** du réseau, utiliser l'IP du poste qui héberge le backend :

```typescript
apiUrl: 'http://192.168.1.11:8000/api/v1'  // IP du poste B ou C
```

#### 3.3 Installer les dépendances

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

#### 3.4 Démarrer les services

**Terminal 1 — API :**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Interface :**

```bash
cd frontend
npm start -- --configuration=lan --host 0.0.0.0
```

Accès depuis le poste : `http://localhost:4200`  
Accès depuis une autre machine du réseau : `http://<IP_DU_POSTE>:4200`

---

### Points importants

| Règle | Détail |
|---|---|
| **SECRET_KEY identique** | Obligatoire sur A, B et C — sinon les tokens JWT ne fonctionnent pas entre postes |
| **NOTIFICATION_API_SECRET** | Même valeur dans `backend/.env` et `notification-service/.env` |
| **Mot de passe PostgreSQL** | Aligné entre `.env` (racine), `docker-compose.yml` et `DATABASE_URL` du backend |
| **CORS** | `CORS_ALLOW_LAN=true` autorise les origines `http://192.168.x.x:port` en développement |
| **Migrations** | À lancer **une seule fois** sur la machine A (`alembic upgrade head`) |

### Dépannage rapide

| Problème | Solution |
|---|---|
| Connexion DB refusée depuis B/C | Vérifier IP machine A, port 5432 ouvert, mot de passe dans `DATABASE_URL` |
| Erreur CORS dans le navigateur | Vérifier `CORS_ALLOW_LAN=true` et redémarrer le backend |
| Token JWT invalide sur un autre poste | Copier la même `SECRET_KEY` depuis la machine A |
| Mot de passe DB incorrect | Recréer le volume : `docker compose down -v && docker compose up -d` (perte des données) |

### Compte admin (après seed)

| Email | Mot de passe |
|---|---|
| `admin@totalfitness.mr` | `@` |

---

## 📚 Documentation

- [Contrat d'API](./docs/api-contract.md) — format des réponses, auth, codes d'erreur
- [Contribuer (workflow Git)](./CONTRIBUTING.md)
- [Architecture & UML](./docs/)

---


