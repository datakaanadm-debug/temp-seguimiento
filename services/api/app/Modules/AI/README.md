# Módulo AI

Capa transversal de IA. Claude (Anthropic) para summaries narrativos + detección de riesgos. Extensible vía `LlmClient` interface.

## Responsabilidades

- **Resumen diario** del reporte del practicante (async, disparado por `DailyReportSubmitted`).
- **Narrativa de evaluación**: borrador AI que el líder valida antes de firmar.
- **Detección de riesgos**: analiza actividad de 14 días de un user y devuelve hasta 3 insights accionables.
- **Guardrails**: feature flag por tenant, cuota diaria por plan, Redis cache por hash, logging estructurado, fail-soft.

## Estructura

```
app/Modules/AI/
├── Domain/
│   ├── Enums/                SummaryKind, InsightKind, InsightSeverity, LlmModel (con precios)
│   ├── Events/               SummaryGenerated, InsightDetected
│   ├── Exceptions/           AiQuotaExceeded, LlmCallFailed
│   ├── AiSummary.php         resumen persistido (approved_at para validación humana)
│   ├── AiInsight.php         insight con confidence + evidence + lifecycle (ack/dismiss/resolve)
│   └── AiRequestLog.php      append-only, bigserial — auditoría de cada call
├── Application/
│   ├── Contracts/
│   │   ├── LlmClient.php     interface (extensibilidad futura)
│   │   ├── LlmRequest.php    value object
│   │   └── LlmResponse.php
│   ├── Services/
│   │   ├── LlmGateway.php    cache + quota + log envolviendo al Client
│   │   ├── PromptLibrary.php prompts versionados (v1)
│   │   └── QuotaGuard.php    daily limit por TenantPlan
│   ├── Commands/
│   │   ├── SummarizeDailyReport          (+ Handler)
│   │   ├── GenerateEvaluationNarrative   (+ Handler) → también guarda en evaluations.ai_draft_narrative
│   │   └── DetectRiskInsights            (+ Handler) → JSON parseado + filtros de confidence
│   └── Jobs/
│       └── GenerateDailySummaryJob       async queue 'ai', QuotaExceeded absorbido silenciosamente
├── Infrastructure/
│   ├── Clients/
│   │   └── ClaudeLlmClient.php   HTTP directo a api.anthropic.com con prompt caching
│   └── Listeners/
│       └── TriggerDailySummary.php  (DailyReportSubmitted → dispatch job)
└── Http/
    ├── Controllers/          SummaryController, InsightController
    ├── Resources/            AiSummaryResource, AiInsightResource
    ├── Policies/             AiInsightPolicy (staff roles)
    └── routes.php
```

También:
- `config/ai.php` — provider, embedding dims, kill switch global, budget alert.
- `config/services.php` — `ANTHROPIC_API_KEY`.

## Endpoints

| Método | Ruta | Descripción | Rate limit |
|---|---|---|---|
| GET | `/ai/summaries?subject_type=&subject_id=` | Últimos 50 summaries |
| POST | `/ai/summaries/daily-report` | Sync: genera resumen de un daily report | 10/hora |
| POST | `/ai/summaries/evaluation-narrative` | Sync: borrador narrativo de evaluation | 10/hora |
| POST | `/ai/summaries/{id}/approve` | Marca summary como aprobado | — |
| GET | `/ai/insights?active_only=1&severity=` | Listado de insights |
| POST | `/ai/insights/detect` | Sync: corre detección para un user | 20/hora |
| POST | `/ai/insights/{id}/{acknowledge,dismiss,resolve}` | Lifecycle |

## Flujo principal: daily summary automático

```
Tracking.DailyReportSubmitted event
    ↓
TriggerDailySummary listener (con ProcessedEvent::guard)
    ↓
GenerateDailySummaryJob dispatch (queue 'ai')
    ↓
TenantContext::run() → SummarizeDailyReportHandler
    ↓ LlmGateway.call()
      - Cache check por hash(prompt + report data + updated_at)
      - QuotaGuard ensureAllowed (feature flag + daily limit)
      - ClaudeLlmClient HTTP → Anthropic API con prompt caching
      - Log en ai_request_log
    ↓
AiSummary persistido + daily_reports.ai_summary_id actualizado
    ↓
event(SummaryGenerated) → (futuro: realtime notification)
```

## Decisiones técnicas

### 1. HTTP directo, no SDK

`ClaudeLlmClient` usa `Illuminate\Http\Client\Http` en lugar del SDK oficial de Anthropic. Razón: la API de Anthropic es estable y HTTP directo evita coordinar upgrades de SDK. Cambiar a SDK más adelante es trivial con la interface `LlmClient`.

### 2. Prompt caching nativo de Anthropic

`cache_control: ephemeral` en el bloque `system`. Para prompts estables (daily summary es el mismo texto cada día), reduce **90%** el costo de input tokens tras el primer call de 5 minutos. El gateway expone `cacheHit` en el response.

### 3. Cache Redis por hash de payload

Además del prompt caching server-side, guardamos respuesta completa en Redis con TTL configurable. Para daily reports: 30 días (el reporte es inmutable una vez submitted). Para insights: 6h. Cuando la UI pide el mismo resumen N veces (ej. refresh), solo el primero llama al LLM.

### 4. Cuota por tenant plan

`TenantPlan::aiCallsPerDay()`:
- Starter: 100/día
- Growth: 1,000/día  
- Business: 5,000/día
- Enterprise: ilimitado

Solo calls con `status in (success, error)` cuentan; `cached` y `rate_limited` son gratis. El contador se cachea 60s.

### 5. Fail-soft en jobs async

`AiQuotaExceeded` en un job async se absorbe silenciosamente (delete + log). No queremos acumular reintentos de una cuota ya agotada. Errores de red (`LlmCallFailed`) sí re-intentan con backoff.

### 6. Self-approval explícita

Todo output IA debe ser **aprobado por humano** antes de usarse en contextos formales (ej. evaluation narrative firmada). `AiSummary.approved_at` registra quién y cuándo. No self-approval implícita.

### 7. Insight idempotence

Antes de crear un insight nuevo, verificamos que no haya uno activo del mismo `kind` para el mismo subject en las últimas 48h. Evita spam cuando el detector corre múltiples veces al día.

### 8. JSON robusto en DetectRiskInsights

El LLM puede envolver el JSON en ```` ```json ```` o añadir texto antes/después. El parser hace strip de fences y valida con `tryFrom` en enums. Si el JSON es inválido, retorna `[]` sin romper.

## Eventos emitidos

| Evento | Consumidores futuros |
|---|---|
| `SummaryGenerated` | Notifications al subject/actor, Broadcasting al panel realtime |
| `InsightDetected` | Notifications (severity critical → lead + HR), Dashboard alert feed |

## Tests

`tests/Feature/AiTest.php` con `FakeLlmClient` inyectado:
- Summarize persiste + actualiza referencia
- No re-genera si ya existe
- QuotaGuard rechaza cuando `ai_enabled=false`
- QuotaGuard respeta límite del plan
- DetectInsights sin signals no llama al LLM
- DetectInsights persiste con JSON válido + confidence >= 0.6
- DetectInsights ignora confidence < 0.6

Los tests NO pegan a la API real — `$this->app->instance(LlmClient::class, $fake)` inyecta un stub.

## TODO fase 2

- [ ] **Embeddings con pgvector**: `VectorizeContent` job que genera embeddings de tasks/reports y los guarda en `embeddings`. RAG en insights.
- [ ] **Voice transcription** para reporte diario por voz (Whisper API).
- [ ] **Streaming responses** para el chat estilo "Interna Assistant" (fase 2 chat feature).
- [ ] **Fine-tuning** con datos del tenant (opt-in, enterprise).
- [ ] **Automation engine** que dispara detección periódica (cron por tenant).
- [ ] **Weekly summaries** con digest multi-usuario.
- [ ] **Cost budget enforcement** a nivel tenant ($/mes) además del count limit.
