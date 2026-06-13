# Backend — API Laravel

API REST du projet GYM SYLLA.

## Installation
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Voir le [contrat d'API](../docs/api-contract.md).
