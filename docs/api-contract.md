# 📡 Contrat d'API — GYM SYLLA

Ce document est la **référence partagée** entre le backend (Laravel) et le frontend (Angular). Toute modification d'un endpoint doit être répercutée ici dans la même Pull Request.

Base URL : `https://gym-sylla-api.onrender.com/api/v1` (prod) · `http://localhost:8000/api/v1` (dev)

---

## 🔐 Authentification

Authentification par **token Bearer (Laravel Sanctum)**.

```
Authorization: Bearer <token>
```

### Login

```
POST /auth/login
```

Requête :
```json
{
  "email": "reception@gymsylla.mr",
  "password": "motdepasse"
}
```

Réponse `200` :
```json
{
  "success": true,
  "data": {
    "token": "1|abc123...",
    "utilisateur": {
      "id": "uuid",
      "nom": "Ba",
      "prenom": "Aïssata",
      "email": "reception@gymsylla.mr",
      "role": {
        "nom": "receptionniste",
        "libelle": "Réceptionniste"
      },
      "permissions": ["clients.lecture", "clients.creation", "paiements.creation"]
    }
  },
  "message": "Connexion réussie"
}
```

### Logout

```
POST /auth/logout
```

---

## 📦 Format de réponse standardisé

**Toutes** les réponses suivent cette structure :

### Succès

```json
{
  "success": true,
  "data": { },
  "message": "Opération réussie"
}
```

### Succès avec pagination

```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 247,
    "last_page": 13
  },
  "message": null
}
```

### Erreur

```json
{
  "success": false,
  "data": null,
  "message": "Permission refusée",
  "errors": {
    "email": ["L'email est déjà utilisé."]
  }
}
```

---

## 🔢 Codes de statut HTTP

| Code | Signification |
|---|---|
| `200` | OK |
| `201` | Créé |
| `204` | Supprimé (pas de contenu) |
| `401` | Non authentifié (token manquant/invalide) |
| `403` | Non autorisé (permission RBAC manquante) |
| `404` | Ressource introuvable |
| `422` | Erreur de validation (voir `errors`) |
| `500` | Erreur serveur |

---

## 🗂️ Endpoints principaux

> Convention : tous les endpoints sont préfixés par `/api/v1`.
> Légende permissions : `module.action` (ex: `clients.creation`).

### Clients

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/clients` | `clients.lecture` | Liste paginée (filtres: `?search=`, `?sexe=`, `?actif=`) |
| POST | `/clients` | `clients.creation` | Créer un client |
| GET | `/clients/{id}` | `clients.lecture` | Détail + historique |
| PUT | `/clients/{id}` | `clients.modification` | Modifier |
| DELETE | `/clients/{id}` | `clients.suppression` | Désactiver |
| GET | `/clients/recherche?q=` | `clients.lecture` | Recherche par n° membre / nom / QR |
| GET | `/clients/{id}/abonnement-actuel` | `clients.lecture` | Abonnement actif/expiré |

### Abonnements

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/abonnements` | `abonnements.lecture` | Liste |
| POST | `/abonnements/renouveler` | `abonnements.creation` | Renouveler (voir détail ci-dessous) |
| PATCH | `/abonnements/{id}/suspendre` | `abonnements.modification` | Suspendre |
| PATCH | `/abonnements/{id}/resilier` | `abonnements.modification` | Résilier |
| GET | `/types-abonnements` | `abonnements.lecture` | Liste des formules + tarifs |

#### Renouveler un abonnement

```
POST /abonnements/renouveler
```

```json
{
  "client_id": "uuid",
  "type_abonnement_id": "uuid",
  "moyen_paiement_id": "uuid"
}
```

Réponse `201` : abonnement créé + carte QR régénérée + URLs PDF.

### Séances journalières

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/seances-journalieres` | `seances_journalieres.lecture` | Liste du jour |
| POST | `/seances-journalieres` | `seances_journalieres.creation` | Encaisser une séance (50 MRU) |

### Présences

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/presences/entree` | `presences.creation` | Pointer entrée (QR ou manuel) |
| PATCH | `/presences/{id}/sortie` | `presences.modification` | Pointer sortie |
| GET | `/presences` | `presences.lecture` | Historique (filtres date) |

### Paiements

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/paiements` | `paiements.lecture` | Liste paginée |
| POST | `/paiements` | `paiements.creation` | Nouveau paiement |
| GET | `/paiements/caisse-jour` | `paiements.lecture` | Caisse du jour |
| GET | `/paiements/{id}/recu-pdf` | `paiements.export` | Reçu PDF |
| GET | `/moyens-paiement` | `paiements.lecture` | Liste (Bankily, Masrivi, Sedad...) |

### RH & Salaires

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/employes` | `employes.lecture` | Liste |
| POST | `/employes` | `employes.creation` | Embaucher |
| GET | `/fiches-paie` | `salaires.lecture` | Fiches de paie |
| POST | `/fiches-paie/generer` | `salaires.creation` | Générer fiche (mois/année) |

### Coach

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/programmes-sportifs` | `programmes_sportifs.lecture` | Programmes |
| POST | `/programmes-sportifs` | `programmes_sportifs.creation` | Créer programme |
| GET | `/planning` | `planning.lecture` | Planning coach |

### Dashboards

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/dashboard/admin` | — | KPIs Super Admin / PDG |
| GET | `/dashboard/reception` | — | KPIs Réceptionniste |
| GET | `/dashboard/coach` | — | KPIs Coach |

### Administration (RBAC)

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/utilisateurs` | `utilisateurs.lecture` | Liste |
| POST | `/utilisateurs` | `utilisateurs.creation` | Créer |
| GET | `/roles` | `roles.lecture` | Liste des rôles |
| GET | `/permissions` | `roles.lecture` | Liste permissions (groupées par module) |
| PUT | `/roles/{id}/permissions` | `roles.modification` | Synchroniser permissions |
| GET | `/journal-audit` | `audit.lecture` | Journal d'audit (filtres) |

---

## 🌍 CORS

Le backend autorise les origines :
- `http://localhost:4200` (dev Angular)
- `https://gym-sylla.netlify.app` (prod)

`supports_credentials: true` (nécessaire pour Sanctum).

---

## 📌 Notes

- Les montants sont en **MRU** (Ouguiya mauritanienne), entiers ou décimaux.
- Les dates sont au format **ISO 8601** (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ssZ`).
- Les identifiants sont des **UUID v4**.
- Tous les endpoints d'écriture déclenchent un enregistrement dans `journal_audit`.

---

*Ce contrat est versionné. Toute évolution = PR mettant à jour ce fichier.*
