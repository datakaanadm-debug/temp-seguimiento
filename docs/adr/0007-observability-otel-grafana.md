# ADR 0007 · Observabilidad con OpenTelemetry + Grafana Cloud + Sentry

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Senda
- **Contexto de decisión:** FASE 0

---

## Contexto

Sin observabilidad decente, debug en producción es imposible. Para un SaaS multi-tenant, la observabilidad además debe correlacionar señales por `tenant_id` (quién está afectado, qué tenants consumen más recursos).

Requisitos:
- Errores con stacktrace, breadcrumbs, context (Sentry-like).
- Logs estructurados consultables.
- Métricas con dashboards (Grafana-like).
- Traces distribuidos para entender latencia por servicio.
- Costo controlado en MVP (<$50/mes ideal).
- Evitar vendor lock-in de agentes propietarios.

## Decisión

- **OpenTelemetry (OTel)** como estándar de instrumentación en Laravel y Next.js. Exportador OTLP.
- **Grafana Cloud free tier** como destino para logs (Loki), métricas (Prometheus), traces (Tempo). Límites: 50GB logs/mes, 10k series/mes, 50GB traces/mes — suficiente para MVP.
- **Sentry** (self-hosted deshabilitado; cloud plan Developer gratuito hasta 5k errores/mes) para errores, performance monitoring frontend y backend.

Atributos globales obligatorios en cada span/log/metric: `tenant.id`, `tenant.slug`, `user.id`, `deployment.environment`, `service.version`.

## Consecuencias

**Positivas:**
- OTel es estándar de industria; ningún exporter es propietario. Cambiar backend es cambiar env vars.
- Grafana Cloud es unificado (LGT+metrics). Dashboards portátiles.
- Sentry da triage de errores superior a logs puros (grouping, regression detection).
- Cardinalidad controlada (labels limitadas a `tenant_id` solo para métricas agregadas, no para cada request).

**Negativas:**
- OTel PHP SDK es menos maduro que el de Node/Go; riesgo de bugs puntuales.
- Grafana free tier limita retención (14 días logs). Archivado a R2 requiere script propio.
- Dos vendors (Grafana + Sentry) en lugar de uno. Justificado por specialización: Sentry es mejor en errors, Grafana es mejor en métricas.

## Alternativas consideradas

- **Datadog:** excelente producto, precio prohibitivo ($15-30/host/mes + additional $).
- **New Relic:** similar problema de precio a escala.
- **Self-hosted LGTM stack:** viable en fase 2; en MVP con 1 dev, operar Loki+Prom+Tempo+Grafana es un trabajo en sí.
- **Axiom:** interesante para logs, pero ecosistema más pequeño, menos dashboards.
- **Honeycomb:** excelente en traces, pero no cubre métricas y logs juntos.
- **Laravel Telescope para prod:** insuficiente (no es observabilidad seria, es dev tool).

## Referencias

- `docs/architecture/07-scalability.md` sección 8
- OpenTelemetry PHP: https://opentelemetry.io/docs/languages/php/
- Grafana Cloud free tier: https://grafana.com/pricing/
