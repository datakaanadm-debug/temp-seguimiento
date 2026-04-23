# Módulo Tracking

Reporte diario del practicante y bloqueos estructurados.

## Responsabilidades

- **Daily report**: un registro diario por (tenant, user, fecha) con avances, bloqueos, plan, mood y horas.
- **Blockers**: cosas que frenan al practicante, estructurados (severity, status, resolución). Pueden asociarse a una task o a un daily report.
- **Review flow**: líder/mentor/HR puede marcar un reporte como revisado.

## Estructura

```
app/Modules/Tracking/
├── Domain/
│   ├── Enums/                DailyReportStatus, Mood, BlockerSeverity, BlockerStatus
│   ├── Events/               DailyReportSubmitted, DailyReportReviewed, BlockerRaised, BlockerResolved
│   ├── DailyReport.php       UNIQUE(tenant, user, report_date)
│   └── Blocker.php
├── Application/Commands/     UpsertDailyReport, ReviewDailyReport, RaiseBlocker, ResolveBlocker
└── Http/
    ├── Controllers/          DailyReportController, BlockerController
    ├── Requests/
    ├── Resources/
    ├── Policies/             DailyReportPolicy (self/mentor asignado/lead del team/HR/admin), BlockerPolicy
    └── routes.php
```

## Endpoints

| Método | Ruta | Quién |
|---|---|---|
| GET | `/daily-reports` | filtros `user_id`, `from`, `to`, `status` |
| GET | `/daily-reports/today` | el del user actual, hoy |
| PUT | `/daily-reports` | upsert (body: `report_date` opcional, default hoy) |
| GET | `/daily-reports/{id}` | self/mentor/lead/staff |
| POST | `/daily-reports/{id}/review` | lead/mentor/HR/admin |
| GET/POST | `/blockers` | cualquier miembro puede crear; listado filtrable |
| POST | `/blockers/{id}/resolve` | lead/mentor/HR/admin |

## Reglas

- **Un reporte por día por user.** UPSERT via PUT — no hay POST.
- **Review ≠ self.** Un user no puede marcar su propio reporte como revisado.
- **Submitted flag inmutable.** Si el reporte ya está submitted, re-enviarlo con `submit:true` NO vuelve a emitir `DailyReportSubmitted`.
- **Blocker idempotente.** Resolver un blocker ya resuelto no rompe ni emite duplicados.

## Eventos emitidos

| Evento | Consumidores (fase siguiente) |
|---|---|
| `DailyReportSubmitted` | Notifications (notifica al lead + mentor), AI (genera resumen), Analytics |
| `DailyReportReviewed` | Notifications al author |
| `BlockerRaised` | Notifications (lead + mentor + HR según severity), AI (insight candidate) |
| `BlockerResolved` | Notifications al raiser |

## Tests

- `tests/Feature/TrackingTest.php` — upsert idempotente por fecha, self-review bloqueado, review por lead, raise/resolve blocker, aislamiento multi-tenant.
