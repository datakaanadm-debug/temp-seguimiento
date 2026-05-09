# Módulo Reports

Generación async de reportes PDF con branding del tenant. El **killer feature** es el reporte para universidades.

## Responsabilidades

- **Templates** reutilizables por tenant (university/executive/team/intern/custom) + config JSON.
- **ReportRun** es una instancia: tiene `status` (queued/running/completed/failed/expired), `file_key` en R2 cuando termina, `expires_at` TTL de 7 días.
- **Job async** GenerateReportJob reconstituye el contexto de tenant, construye data según el kind, renderiza con `spatie/laravel-pdf` (Browsershot), sube a R2.
- **Builder** dedicado para cada kind. MVP implementa `UniversityReportBuilder`; los demás kinds caen a un fallback mínimo.
- **Downloads** vía pre-signed URL R2 (TTL 15 min), no streaming — el backend no toca los bytes después del upload.

## Estructura

```
app/Modules/Reports/
├── Domain/
│   ├── Enums/                ReportKind, RunStatus
│   ├── Events/               ReportGenerated, ReportFailed
│   ├── ReportTemplate.php
│   ├── ReportRun.php
│   └── Export.php            (exports CSV/JSON/XLSX — reservado para fase 2)
├── Application/
│   ├── Services/
│   │   └── UniversityReportBuilder.php   junta Profile + InternData + KPIs + tasks recientes
│   ├── Commands/
│   │   └── RequestReport (+ Handler)     crea run queued + dispatcha job
│   └── Jobs/
│       └── GenerateReportJob             async, timeout 180s, 2 tries
└── Http/
    ├── Controllers/          ReportTemplateController, ReportRunController
    ├── Requests/
    ├── Resources/            ReportTemplateResource, ReportRunResource (incluye download_url)
    ├── Policies/             ReportTemplatePolicy (system templates inmutables), ReportRunPolicy
    └── routes.php
```

Y:

```
resources/views/reports/
└── university.blade.php      template con branding del tenant, grid de KPIs, tabla de tareas
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PATCH/DELETE | `/report-templates[/{id}]` | CRUD templates (admin/HR); system no editables |
| GET | `/reports?mine=1&status=` | Listado de runs |
| POST | `/reports` | Request (admin/HR/lead) — 202 Accepted, job async |
| GET | `/reports/{id}` | Detalle + download_url si completed |
| GET | `/reports/{id}/download` | Pre-signed URL fresca (TTL 15 min) |

Rate limit: `/reports` POST a **10/hora/IP** — generar PDFs es caro.

## Flujo completo

```
1. Admin POST /reports { template_id, subject_type: user, subject_id, period_start, period_end }
        ↓ RequestReportHandler
           - Crea ReportRun status=queued, expires_at = now + 7d
           - DB::afterCommit → GenerateReportJob::dispatch en queue 'reports'
        ↓ HTTP 202 Accepted { run con status=queued }

2. Worker Horizon toma GenerateReportJob
        ↓ TenantContext::run(tenantId, ...)
           - Run → status=running, started_at=now
           - Builder construye data según kind (UniversityReportBuilder para university)
           - spatie/laravel-pdf renderiza Blade view → archivo temporal
           - Storage::disk('r2')->put(storedKey, bytes)
           - Run → status=completed, file_key, file_size_bytes, completed_at
           - event(ReportGenerated)
        ↓ Si falla: status=failed, error_message, event(ReportFailed)

3. Cliente hace GET /reports/{id}
        ↓ Si status=completed: incluye download_url pre-firmada 15 min

4. Cliente descarga directamente desde R2 usando la URL.
```

## Template universitario (killer feature LATAM)

El Blade `reports/university.blade.php` produce un PDF A4 con:

- **Header con branding del tenant** (colores, logo futuro)
- **Datos del practicante**: nombre, universidad, carrera, semestre, tutor académico, puesto, fecha de inicio
- **Cumplimiento de horas** con porcentaje del convenio
- **6 KPIs del periodo**: tareas a tiempo, completadas, horas registradas, evaluación promedio, vencidas, reportes diarios
- **Tabla de actividad reciente** con estados badge-colored
- **Footer con fecha de emisión**

Data desde `UniversityReportBuilder` — junta Profile, InternData, KpiComputation de Performance, y resumen de tasks.

## Decisiones

1. **`spatie/laravel-pdf` con Browsershot (Puppeteer).** Render fiel HTML→PDF, soporta CSS moderno. Requiere Chromium en los workers.
2. **Render a archivo temporal primero, luego upload.** Evita mantener todo el PDF en memoria; si el job falla entre render y upload, Horizon re-intenta limpiamente.
3. **`expires_at` default 7 días.** Evita acumular archivos en R2 indefinidamente. Cron opcional (fase 2) marca status=expired y borra el file.
4. **Download URL generada on-demand.** TTL corto (15 min) reduce ventana de replay si la URL se filtra.
5. **Reports aislados por tenant RLS** + path R2 prefijado — doble defensa.
6. **Rate limit estricto.** PDFs son caros; 10/hora/IP previene abuso.

## Eventos

| Evento | Consumidores (fase 2) |
|---|---|
| `ReportGenerated` | Notifications al requester ("tu reporte está listo"), Analytics |
| `ReportFailed` | Notifications al requester + Sentry |

## Tests

- `tests/Feature/ReportsTest.php` — request crea run queued y dispatcha job con `Queue::fake()`; builder produce shape correcto; aislamiento multi-tenant.

## TODO fase 2

- [x] Executive builder dedicado (`ExecutiveReportBuilder` + `reports.executive`)
- [x] Team builder dedicado (`TeamReportBuilder` + `reports.team`, requiere `subject_type=team`)
- [x] Intern builder dedicado (`InternReportBuilder` + `reports.intern`, requiere `subject_type=user`)
- [ ] CSV/XLSX exports con streaming (`ExportUsersJob`, `ExportTasksJob`)
- [ ] Cron `ExpireOldReportsJob` → purga R2 + status=expired
- [ ] Email attachment opcional (enviar PDF directo al tutor académico)
- [ ] Signature digital del reporte (cryptographic hash + QR verificador)
- [x] Logo del tenant renderizado en el PDF (desde `tenants.theme.logo_url`)
