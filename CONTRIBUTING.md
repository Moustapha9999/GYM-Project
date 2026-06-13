# 🤝 Guide de contribution — GYM SYLLA

Ce projet est un **monorepo** développé à deux. Ce guide définit les règles pour collaborer sans se marcher dessus.

---

## 🌿 Workflow Git

### Règle d'or : ne jamais pousser directement sur `main`

`main` = production (déployée automatiquement). Tout passe par une **branche** + **Pull Request**.

```
main                           ← protégée (prod)
  ├── feat/back-abonnements     ← backend
  ├── feat/back-paiements       ← backend
  ├── feat/front-clients        ← frontend
  └── fix/front-dashboard-kpi   ← frontend
```

### Cycle de travail quotidien

```bash
# 1. Se mettre à jour
git checkout main
git pull origin main

# 2. Créer sa branche
git checkout -b feat/back-abonnements

# 3. Travailler dans SON dossier puis commiter
git add backend/
git commit -m "feat: endpoint renouvellement abonnement"

# 4. Pousser
git push origin feat/back-abonnements

# 5. Ouvrir une Pull Request vers main sur GitHub
```

---

## 🏷️ Convention de nommage des branches

| Préfixe | Usage | Exemple |
|---|---|---|
| `feat/` | Nouvelle fonctionnalité | `feat/back-paiements` |
| `fix/` | Correction de bug | `fix/front-calcul-total` |
| `docs/` | Documentation | `docs/api-contract` |
| `refactor/` | Refactorisation | `refactor/back-services` |
| `chore/` | Config, dépendances | `chore/setup-docker` |

Préfixe `back-` ou `front-` pour identifier le périmètre rapidement.

---

## 💬 Convention de commits (Conventional Commits)

```
<type>: <description courte à l'impératif>

[corps optionnel]
```

Types : `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`

Exemples :
```
feat: ajout encaissement séance journalière
fix: correction date_fin lors du renouvellement anticipé
docs: documentation endpoint /api/v1/paiements
test: tests unitaires AbonnementService
```

---

## 🔒 Règles pour éviter les conflits

1. **Reste dans ton dossier** : backend → `backend/`, frontend → `frontend/`. Git ne créera pas de conflit entre vous.
2. **Fichiers partagés** (`README.md`, `docs/`) : préviens l'autre avant de modifier, ou fais-le dans une PR dédiée.
3. **Pull avant de commencer** chaque session de travail.
4. **PR petites et fréquentes** plutôt qu'une énorme PR en fin de semaine.

---

## ✅ Avant d'ouvrir une Pull Request

**Backend :**
```bash
cd backend
php artisan test          # les tests passent
./vendor/bin/pint         # code formaté (Laravel Pint)
```

**Frontend :**
```bash
cd frontend
ng build                  # le build passe
ng test --watch=false     # les tests passent
ng lint                   # pas d'erreurs de lint
```

---

## 📝 Checklist Pull Request

- [ ] La branche est à jour avec `main`
- [ ] Le code est dans le bon dossier (`backend/` ou `frontend/`)
- [ ] Les tests passent
- [ ] Le contrat d'API (`docs/api-contract.md`) est mis à jour si un endpoint change
- [ ] L'autre membre est assigné comme reviewer

---

*Une PR validée par l'autre membre = merge autorisé sur `main`.*
