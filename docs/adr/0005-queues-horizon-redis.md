# ADR 0005 · Colas con Redis + Horizon, aisladas por tenant

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Senda
- **Contexto de decisión:** FASE 0

---

## Contexto

Senda tiene muchas operaciones asíncronas: envío de emails, broadcasting, generación de PDFs, llamadas a IA, indexado de búsqueda, anonimización programada. Sin colas, la experiencia de usuario sufre (requests lentos) y un tenant podría bloquear a los demás (IA flood, reportes masivos).

Requisitos:
- Retry con backoff exponencial.
- Dead letter queue para debugging.
- Rate limiting por tenant.
- Visibilidad (dashboard con métricas por cola).
- Integración con Laravel sin fricción.

## Decisión

**Redis como backend de colas + Laravel Horizon como supervisor + nomenclatura de colas con prefijo `tenant-{id}:*` para aislamiento**.

Colas: `default`, `broadcasting`, `notifications`, `ai`, `reports`, `search`, `scheduled`. Cada una con `tries`, `backoff`, `timeout` declarados.

Rate limit por tenant implementado con Redis atomic ops (`RateLimiter::for('tenant-ai', ...)`) en jobs que salen a externos (Claude API, Resend).

## Consecuencias

**Positivas:**
- Integración Laravel zero-config.
- Horizon UI da visibilidad inmediata (depth, throughput, failures).
- Mismo Redis para cache + queue + broadcasting pub/sub en MVP. Separamos DBs lógicas (`REDIS_DB 0/1/2/3`) para aislamiento operativo.
- Escalado horizontal de workers controlado por Horizon (`balance: auto`).
- Failed jobs persisten en Postgres (`failed_jobs`) + Sentry; no se pierden en crash de Redis.

**Negativas:**
- Redis es single point of failure del backend async. Mitigado con Redis managed (Railway/Memorystore) con replicación.
- Si un tenant dispara 10k jobs súbitamente, llena memoria Redis. Mitigado con caps por cola y alertas.
- Horizon depende de Redis para su propio estado; si Redis se corrompe, perdemos histórico (no trabajo en curso).

## Alternativas consideradas

- **Amazon SQS + Lambda**: útil si fuéramos AWS-native; complica stack y desconecta del ecosistema Laravel.
- **RabbitMQ**: más features (routing complejo) pero más operaciones; overkill para MVP.
- **BullMQ (Node)**: requeriría sacar jobs de Laravel, dividiendo dominio entre runtimes.
- **Temporal/Inngest**: workflows durables excelentes, pero añaden un servicio SaaS más con pricing escalonado.
- **Database queue (tabla Postgres)**: simple pero ineficiente a volumen; sin backpressure adecuado.

## Referencias

- `docs/architecture/05-events.md`
- `docs/architecture/02-multi-tenancy.md` sección 7
- Laravel Horizon docs
