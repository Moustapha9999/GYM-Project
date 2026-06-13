# Frontend — Angular 20

Interface utilisateur du projet **GYM SYLLA** (ERP salle de sport).

## Installation

```bash
npm install
ng serve
```

Application disponible sur `http://localhost:4200`.

Configurer l'URL de l'API dans `src/environments/environment.ts`.

## Architecture

Le frontend suit une organisation **feature-based** avec lazy loading :

```
src/app/
├── core/           # Singleton : auth, guards, interceptors, modèles API
├── shared/         # Composants, pipes réutilisables
├── layout/         # Shell (sidebar, header, navigation)
├── features/       # Modules métier (1 dossier = 1 domaine)
│   ├── auth/
│   ├── dashboard/
│   ├── clients/
│   ├── abonnements/
│   ├── paiements/
│   ├── presences/
│   ├── seances/
│   ├── rh/
│   ├── coach/
│   └── admin/
├── app.config.ts
└── app.routes.ts
```

### Alias TypeScript

| Alias | Chemin |
|---|---|
| `@core/*` | `src/app/core/*` |
| `@shared/*` | `src/app/shared/*` |
| `@layout/*` | `src/app/layout/*` |
| `@features/*` | `src/app/features/*` |
| `@env/*` | `src/environments/*` |

### Conventions par feature

Chaque feature contient :

```
features/clients/
├── clients.routes.ts       # Routes lazy-loaded
├── services/
│   └── clients.service.ts  # Appels API du domaine
└── pages/
    └── clients-list/       # Pages (composants standalone)
```

## Scripts

```bash
ng serve          # Dev server
ng build          # Build production
ng test           # Tests unitaires
```

## Références

- [Contrat d'API](../docs/api-contract.md)
- [Guide de contribution](../CONTRIBUTING.md)
