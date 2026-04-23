# Módulo Performance

Scorecards configurables, evaluaciones periódicas con FSM, KPIs automáticos y snapshots para dashboards.

## Responsabilidades

- **Scorecard**: plantilla reutilizable con N métricas (auto/manual/likert/rubric) y pesos.
- **Evaluation**: instancia del scorecard para un subject (practicante) con evaluator (lead/mentor). FSM estricta.
- **EvaluationResponse**: una fila por métrica evaluada. `auto_value` se calcula en el save si la métrica es tipo `auto`.
- **KpiSnapshot**: agregados pre-computados para dashboards (upsert por `(subject, metric, period, period_start)`).

## Estructura

```
app/Modules/Performance/
├── Domain/
│   ├── Enums/                EvaluationKind (30d/60d/90d/adhoc/360), EvaluationStatus (FSM), MetricType
│   ├── Events/               EvaluationScheduled, EvaluationSubmitted, EvaluationAcknowledged
│   ├── Exceptions/           InvalidEvaluationTransition
│   ├── Scorecard.php
│   ├── ScorecardMetric.php
│   ├── Evaluation.php
│   ├── EvaluationResponse.php
│   └── KpiSnapshot.php
├── Application/
│   ├── Services/
│   │   └── KpiComputation.php     5 métricas auto base + captureSnapshot upsert
│   └── Commands/
│       ├── CreateScorecard          (+ Handler)
│       ├── ScheduleEvaluation       (+ Handler)
│       ├── SaveEvaluationResponses  (+ Handler) → calcula auto_value inline
│       ├── SubmitEvaluation         (+ Handler) → FSM + no self-submit
│       └── AcknowledgeEvaluation    (+ Handler) → solo el subject
└── Http/
    ├── Controllers/          ScorecardController, EvaluationController
    ├── Requests/
    ├── Resources/            ScorecardResource, MetricResource, EvaluationResource, ResponseResource
    ├── Policies/             ScorecardPolicy, EvaluationPolicy
    └── routes.php
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PATCH/DELETE | `/scorecards[/{id}]` | CRUD scorecards (admin/HR) |
| GET | `/evaluations?mine=1&status=&kind=` | Listado filtrable |
| POST | `/evaluations` | Schedule (admin/HR/lead) |
| GET | `/evaluations/{id}` | Detalle con scorecard + responses |
| PUT | `/evaluations/{id}/responses` | Save (recalcula auto_value) |
| POST | `/evaluations/{id}/submit` | Submit (FSM) — no self |
| POST | `/evaluations/{id}/acknowledge` | Ack (solo subject) |

## FSM

```
SCHEDULED → IN_PROGRESS → SUBMITTED → ACKNOWLEDGED (terminal)
    ↓            ↓              ↓
CANCELLED   CANCELLED      DISPUTED → RESOLVED (terminal)
```

- **Save responses** auto-transiciona `SCHEDULED → IN_PROGRESS`.
- **Submit** exige que `evaluator_user_id ≠ subject_user_id` (no self-approval).
- **Acknowledge** exige que el acuser sea el subject (la verdad).
- DISPUTED/RESOLVED: flujo de disputa (UI en fase 2; estados ya están en enum).

## KpiComputation

Métricas auto del MVP y cómo se computan:

| Key | Cálculo |
|---|---|
| `tasks_on_time` | `% de tasks DONE con completed_at ≤ due_at`, sobre periodo |
| `avg_review_score` | promedio de `overall_score` de evaluations submitted del periodo |
| `hours_logged` | suma `duration_minutes` de time_entries cerrados → horas |
| `tasks_completed` | count de tasks `state=DONE` |
| `overdue_count` | count de tasks activas con due_at pasado |

Devuelve `{value: ?float, sample_size: int}`. Si no hay samples, value=null (se muestra "—" en UI).

### Periodo por evaluation

- `30d/60d/90d` → N días hacia atrás desde now.
- Otros (`adhoc`, `360`, etc.) → 90 días default.

Fase 2: campo explícito `period_from/period_to` en `evaluations` para control exacto.

## Eventos

| Evento | Consumidores |
|---|---|
| `EvaluationScheduled` | Notifications (subject + evaluator) |
| `EvaluationSubmitted` | Notifications (subject), AI (resumen narrativo para acuse), Analytics |
| `EvaluationAcknowledged` | AuditLog, Analytics |

## Tests

- `tests/Feature/PerformanceTest.php` — scorecard con metrics, happy path FSM (Schedule→Save→Submit→Ack), self-submit rechazado, acknowledge solo por subject, KpiComputation sin samples.

## TODO fase 2

- [ ] Feedback 360: invitar evaluadores adicionales (pares)
- [ ] Disputed flow en UI
- [ ] Cron `CaptureKpiSnapshotsJob` que crea snapshots weekly/monthly para todos los users activos
- [ ] Rubric editor JSON schema
- [ ] Comparativa histórica (gráfica de evaluations del subject a lo largo del tiempo)
