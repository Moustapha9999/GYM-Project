# 🏋️ GYM SYLLA — ERP de gestion de salle de sport

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
| Backend | `backend/.env.example` |
| Frontend | `frontend/src/environments/environment.ts` |
| Notifications | `notification-service/.env.example` |

---

## 👥 Équipe

| Rôle | Responsable | Dossier |
|---|---|---|
| Backend (API Laravel) | *(toi)* | `backend/` |
| Frontend (Angular) | *(ton ami)* | `frontend/` |

---

## 📚 Documentation

- [Contrat d'API](./docs/api-contract.md) — format des réponses, auth, codes d'erreur
- [Contribuer (workflow Git)](./CONTRIBUTING.md)
- [Architecture & UML](./docs/)

---

*GYM SYLLA — Projet de fin d'études · Master IAGE*
