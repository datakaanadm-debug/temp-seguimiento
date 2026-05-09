# ADR 0001 · Stack baseline del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Senda
- **Contexto de decisión:** FASE 0

---

## Contexto

Senda es un SaaS multi-tenant enterprise con 9 dominios MVP y 3 dominios diferidos. Equipo: 1 dev fullstack. Target: LATAM con escalado a US. Budget inicial: low-hundreds USD/mes. Timeline MVP realista: 14-18 semanas.

Las decisiones de stack afectan directamente:
- Velocidad de desarrollo (ecosistemas maduros vs. bleeding edge).
- Superficie operativa (cuántos servicios/runtimes mantener).
- Costo inicial y marginal.
- Facilidad de contratar devs futuros.

## Decisión

Monorepo Turborepo con: **Next.js 15 (web, App Router) + Laravel 12 con Octane (API) + PostgreSQL 16 con RLS + pgvector + Redis 7 + Laravel Reverb (realtime) + Cloudflare R2 (storage) + Anthropic Claude API (IA) + Railway (infra MVP)**.

Packages base: TanStack Query, Zustand, nuqs, shadcn/ui, Tailwind, Sanctum, spatie/laravel-permission, Horizon, Pest, Vitest, Playwright.

## Consecuencias

**Positivas:**
- Dos lenguajes (TS + PHP), no tres. Un dev fullstack puede mantenerlos.
- Ecosistema Laravel aporta Horizon, Reverb, Octane, Sanctum con integración testeada.
- Next.js 15 con RSC baja bundle y mejora TTFB.
- Railway reduce ops a casi cero en MVP.
- Migración futura a GCP es un refactor de Dockerfiles y env, no de código.

**Negativas:**
- Laravel Reverb es joven (v1.x). Riesgo si necesitamos CRDT o >5k conexiones.
- Octane + workers persistentes requiere disciplina con estado global (ya previsto en middleware de tenant).
- Dos ORMs distintos si algún día agregamos servicio Node con Drizzle — ahora evitado.

**Costo:** ~$80-150/mes en MVP. ~$500 al alcanzar 50 tenants.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Stack todo-Node (Next + NestJS + Prisma) | Dev requiere aprender NestJS a fondo; ecosistema menos rico en partes (notifications, PDF, auth enterprise). |
| Rails 8 | Menos devs LATAM. Hotwire vs. Next.js debate perdido para roles complejos del producto. |
| Django + DRF | Similar a Rails; async story débil, realtime requiere Channels extra. |
| Elixir + Phoenix LiveView | Realtime nativo brillante, pero curva alta y comunidad LATAM pequeña. |
| Inertia.js en lugar de Next separado | Mezclaría web y api en un deploy. El doc producto exige web y mobile separados; Inertia solo escala a una UI. |
| tRPC sobre Laravel | Laravel no lo habla nativamente. OpenAPI es estándar industrial. |

## Referencias

- `docs/architecture/01-overview.md`
- Memoria: `interna_stack.md`
- Laravel Reverb benchmarks: https://laravel.com/docs/reverb
