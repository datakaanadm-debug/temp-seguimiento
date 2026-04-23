# ADR 0003 · Realtime con Laravel Reverb (no servicio Node dedicado en MVP)

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Interna
- **Contexto de decisión:** FASE 0

---

## Contexto

El producto Interna depende fuertemente de realtime para la experiencia estilo Linear/Notion: Kanban colaborativo, comentarios instantáneos, notificaciones en vivo, presencia. Sin embargo, **se descartó CRDT (Yjs)** en MVP — optimistic updates y "última escritura gana" son suficientes (decisión del usuario en FASE 0).

Opciones para el servidor WebSocket:

1. **Laravel Reverb** (oficial Laravel 11+, PHP, compatible con Pusher protocol).
2. **Servicio Node dedicado** (Fastify + `ws` + Redis adapter, escalable a decenas de miles de conexiones).
3. **Soketi** (Pusher-compatible, proyecto con actividad reducida).
4. **Pusher gestionado** (SaaS, costo rápido).

Con 1 dev, la superficie operativa de un segundo codebase (Node) es significativa.

## Decisión

**Laravel Reverb** como WebSocket server en MVP. Corre como servicio Laravel separado en Railway (`reverb` service), comparte codebase con API, usa Redis pub/sub para broadcasting horizontal.

Diseño preparado para migrar a servicio Node dedicado (cuando lleguemos a >3k conexiones por tenant o introduzcamos CRDT), manteniendo el dominio de broadcasting abstraído detrás de Laravel `ShouldBroadcast`.

## Consecuencias

**Positivas:**
- Cero codebases nuevos. 1 dev mantiene todo en Laravel.
- Pusher protocol compatible → cliente `laravel-echo` + `pusher-js` funciona sin cambios si migramos.
- Reverb es oficialmente mantenido por Laravel.
- Escalado horizontal nativo vía Redis.

**Negativas:**
- Reverb es relativamente nuevo (v1.x 2024); menos battle-tested que alternativas.
- PHP + FFI (ext-swoole / FrankenPHP si se usa) tienen techo de ~5-25k conexiones por proceso según tuning, inferior a Node puro.
- No soporta CRDT out-of-the-box; si lo agregamos en fase 2, hay que migrar.

## Alternativas consideradas

- **Servicio Node dedicado:** descartado en MVP por costo de mantener segundo codebase. Ruta clara para fase 2.
- **Soketi:** proyecto con actividad irregular; preferible apoyarse en soporte Laravel oficial.
- **Pusher gestionado:** ~$49/mes desde 500 conexiones, escala linealmente con precio. Vendor lock-in.
- **Supabase Realtime:** integración con Postgres nativa, pero fuerza usar Supabase como DB; no cabe en stack actual.
- **Ably/Centrifugo cloud:** similar problema de costo y lock-in.

## Referencias

- `docs/architecture/04-realtime.md`
- Laravel Reverb: https://laravel.com/docs/reverb
- Memoria `interna_stack.md`
