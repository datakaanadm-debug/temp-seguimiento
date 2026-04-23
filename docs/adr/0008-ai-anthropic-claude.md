# ADR 0008 · IA con Anthropic Claude API + pgvector + RAG + abstracción

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Interna
- **Contexto de decisión:** FASE 0

---

## Contexto

El producto usa IA como capa transversal (ver doc producto sección 17): resúmenes diarios, detección de bloqueo, auto-categorización, coaching, narrativa de evaluaciones. Consideraciones:

- **Costo:** con RAG sobre datos del tenant, un tenant con 50 practicantes puede costar $50-150/mes en tokens.
- **Latencia:** resúmenes interactivos necesitan <5s; no se puede esperar 20s.
- **Privacidad:** datos del tenant nunca deben usarse para entrenar modelos externos.
- **Calidad:** resúmenes en español LATAM de calidad consistente.
- **Futuro:** posibilidad de self-hosting si costos escalan mal.

## Decisión

**Anthropic Claude API exclusivo en MVP**, con:
- **Claude Sonnet** para resúmenes y narrativa (balance calidad/costo).
- **Claude Haiku** para clasificación y auto-categorización (rápido, barato).
- **Prompt caching** de Anthropic para prompts system estables (reduce costo ~90% en llamadas recurrentes).
- **pgvector** en la misma DB Postgres para embeddings (RAG sobre datos del tenant) — evita vector DB separada en MVP.
- **Capa de abstracción** (`App\Shared\Ai\LlmClient` interface) que hoy implementa `ClaudeLlmClient` pero mañana podría implementar `OpenAiLlmClient` o self-hosted.
- **Rate limits por tenant** (Starter: 100 calls/día, Growth: 1000, Business: 5000, Enterprise: ilimitado configurable).
- **Redis cache** para respuestas determinísticas (mismo input → mismo output) con TTL según caso.
- **Opt-out** por tenant: flag `settings.ai_enabled` en `tenants`.

## Consecuencias

**Positivas:**
- Anthropic **no entrena con API data** (política pública). Cumple requisito de privacidad.
- Claude Sonnet tiene buen rendimiento en español sin fine-tuning.
- Prompt caching es feature nativo; no requiere arquitectura propia.
- pgvector mantiene el stack DB único; aprendizaje bajo.
- Capa de abstracción facilita cambio futuro sin refactor en dominio.

**Negativas:**
- Single-vendor risk (Anthropic). Mitigado con capa de abstracción y ADR explícita para cambiar.
- Costo variable con uso; tenant abusivo puede impactar margen si sobrepasa cuota antes de alerta. Mitigado con hard rate limits.
- pgvector escala bien a millones de embeddings por tenant pero no a cientos de millones (fase 3 migrar a vector DB dedicada si hace falta).
- Latencia red Anthropic → São Paulo: ~150-400ms. Aceptable con spinners; no ideal para interactividad <1s.

## Alternativas consideradas

- **OpenAI exclusive:** similar calidad pero policy histórica menos favorable para privacidad (actualmente también no entrena con API v2, pero Anthropic ha sido más consistente).
- **OpenAI + Anthropic en paralelo (A/B):** descartado por complejidad; hacer cuando haya datos de uso.
- **Self-hosted Llama/Mistral:** requiere GPU ($300-800/mes mínimo), MLOps skills, y la calidad en español de modelos open-weight 70B aún es inferior a Claude Sonnet en tareas específicas (evaluaciones narrativas).
- **Pinecone/Weaviate para vectores:** overhead operativo y costo adicional ($70+/mes desde tier básico). pgvector basta hasta 10M de embeddings.
- **Cohere:** excelente en embeddings multilingües pero ecosistema más pequeño y precios no superiores.

## Referencias

- `docs/architecture/03-security.md` sección 12
- Anthropic privacy policy: https://www.anthropic.com/legal/privacy
- pgvector benchmarks: https://github.com/pgvector/pgvector
- Memoria `interna_stack.md`
