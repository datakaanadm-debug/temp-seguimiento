# ADR 0002 · Multi-tenancy con Row Level Security

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Interna
- **Contexto de decisión:** FASE 0 / transversal

---

## Contexto

Interna es multi-tenant desde el día 1. La elección del modelo de aislamiento es irreversible en la práctica (migrar de shared a dedicated database implica rewrites sustanciales). Tres opciones canónicas:

1. **Database-per-tenant** — máximo aislamiento, operativamente costoso (migraciones, backups, pools de conexión por tenant).
2. **Schema-per-tenant** — aislamiento razonable, pero ORM (Eloquent) no lo soporta idiomáticamente; hay que cambiar `search_path` en cada request.
3. **Shared schema con columna `tenant_id`** — escalable, eficiente. Riesgo de fuga si el código falla.

El producto necesita soportar de 10 a 10,000 tenants en pocos años con costo predecible. Data residency se promete solo a enterprise con migración.

## Decisión

**Shared schema con columna `tenant_id UUID NOT NULL` + Row Level Security (RLS) de PostgreSQL activado y `FORCE`**. Dos capas de defensa:

1. **App scope** (`TenantScope` global en Eloquent) — filtra queries normales.
2. **RLS en DB** — última barrera. Incluso con bug de app, Postgres bloquea.

La resolución del tenant se hace en middleware por subdomain del `Host` header. El tenant_id se escribe en `SET LOCAL app.tenant_id` y RLS lee de ahí.

## Consecuencias

**Positivas:**
- Una sola DB, un solo backup, un solo pool de conexiones.
- Migraciones corren una vez.
- Costo lineal bajo con número de tenants.
- Queries cross-tenant (ej. analytics internos de Datakaan) son posibles con rol DB especial.

**Negativas:**
- Compleja disciplina: cada tabla nueva requiere `tenant_id`, policy RLS, índice compuesto.
- RLS añade overhead medible (~5-10% en queries simples). Mitigado con índices compuestos.
- Un tenant enterprise que pida aislamiento físico requiere migración manual o schema-per-tenant como opción futura.
- Tests de aislamiento son mandatorios en CI; sin ellos el riesgo es real.

## Alternativas consideradas

- **Database-per-tenant:** descartado por costo operativo inviable con 1 dev.
- **Schema-per-tenant:** descartado por fricción con Eloquent y complicación en queries cross-tenant para ops.
- **Shared schema sin RLS (solo app scope):** descartado porque elimina la defensa en profundidad. Un solo bug expone todo.

## Referencias

- `docs/architecture/02-multi-tenancy.md`
- Postgres RLS docs: https://www.postgresql.org/docs/16/ddl-rowsecurity.html
- Citus sharding (plan futuro): https://www.citusdata.com
