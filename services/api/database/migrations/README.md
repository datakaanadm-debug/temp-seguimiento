# Migrations

Schema PostgreSQL del MVP. Fuente de verdad del ERD en `docs/architecture/08-erd.md`.

## Reglas

- **Todas** las tablas de dominio llevan `tenant_id UUID NOT NULL` + FK + RLS + policy + índice compuesto.
- Orden de archivos determina orden de ejecución (timestamps).
- FKs con ON DELETE intencional y documentado.
- Nunca borrar una migration aceptada en `main`. Cambios se hacen con migration nueva (expand/contract).

## Cómo correr

```bash
cd services/api
php artisan migrate              # prod
php artisan migrate --seed       # dev con demo data
php artisan migrate:fresh --seed # reset local (NUNCA en prod)
```

## Cómo validar

```bash
php artisan test --filter=TenantIsolationTest
```

Si falla, **no mergear**.

## Orden

Ver `docs/architecture/08-erd.md` sección 6.
