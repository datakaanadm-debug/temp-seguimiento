# Módulo Notifications

Capa transversal que convierte eventos de dominio en notificaciones multi-canal, con preferencias por user.

## Responsabilidades

- Listeners que escuchan eventos de **otros módulos** (Tasks, Tracking, eventualmente Performance/AI) y disparan notificaciones.
- `PreferenceMatrix`: decide a qué canales enviar según `NotificationPreference` del user.
- Endpoints: feed de notificaciones del user, marcar como leídas, gestionar preferencias.

## Estructura

```
app/Modules/Notifications/
├── Domain/
│   ├── Enums/
│   │   ├── NotificationChannel.php        in_app, email, push
│   │   ├── NotificationCategory.php       10 categorías del MVP
│   │   └── NotificationFrequency.php      immediate, hourly, daily, never
│   ├── Events/
│   │   └── NotificationDispatched.php     interno (métricas)
│   └── NotificationPreference.php         (tenant, user, channel, category) unique + quiet_hours JSONB
├── Application/
│   ├── Commands/                          UpsertPreferences + Handler
│   └── Services/
│       └── PreferenceMatrix.php           resuelve channels a usar según preferencias
├── Infrastructure/
│   ├── Listeners/                         ← cross-module, cada uno escucha eventos externos
│   │   ├── NotifyTaskAssigned            (TaskAssigned → TaskAssignedNotification)
│   │   ├── NotifyCommentMentions         (TaskCommented + mentions → CommentMentionNotification)
│   │   ├── NotifyBlockerRaised           (BlockerRaised → BlockerRaisedNotification)
│   │   └── NotifyDailyReportSubmitted    (DailyReportSubmitted → DailyReportSubmittedNotification)
│   └── Notifications/
│       ├── BaseNotification.php           via() consulta PreferenceMatrix
│       ├── TaskAssignedNotification.php
│       ├── CommentMentionNotification.php
│       ├── BlockerRaisedNotification.php
│       └── DailyReportSubmittedNotification.php
└── Http/
    ├── Controllers/                       NotificationController (feed), NotificationPreferenceController
    ├── Requests/                          UpsertPreferencesRequest
    ├── Resources/                         NotificationResource, NotificationPreferenceResource
    └── routes.php
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/notifications?unread=1` | Feed paginado + contador unread en meta |
| GET | `/notifications/unread-count` | Solo contador unread (cheap poll) |
| POST | `/notifications/{id}/read` | Marcar una como leída |
| POST | `/notifications/read-all` | Marcar todas como leídas |
| DELETE | `/notifications/{id}` | Borrar |
| GET | `/notification-preferences` | Preferencias del user |
| PUT | `/notification-preferences` | Upsert (array de rows `{channel, category, enabled, frequency, quiet_hours}`) |

## Decisiones

1. **Sin notifications custom table.** Uso de `notifications` de Laravel estándar (morph to notifiable = User), con `tenant_id` añadido para RLS.
2. **Preferencias opt-out, no opt-in.** Por defecto **in-app + email** en todas las categorías. Esto es lo que el usuario espera; preferencias explícitas silencian lo que no quiera.
3. **Quiet hours solo afectan email/push.** In-app siempre pasa — el usuario decide cuándo ve su feed.
4. **`frequency=hourly|daily` aplazado a fase 2.** En MVP solo `immediate` y `never` funcionan realmente; los otros valores se guardan pero se tratan como "skip" por ahora (cron de digest vendrá después).
5. **Cross-module via listeners, no sync calls.** El módulo Tasks no sabe que existe Notifications. Desacoplamiento estricto.
6. **Idempotencia con `ProcessedEvent::guard`.** Un mismo evento retry-eado no dispara notificaciones duplicadas.
7. **Self-notification guard.** Si el actor == receptor, no se envía (ej. user se auto-asigna una task).

## Cross-module listener map

```
Tasks.TaskAssigned        → NotifyTaskAssigned        → TaskAssignedNotification
Tasks.TaskCommented       → NotifyCommentMentions     → CommentMentionNotification  (solo a mentions)
Tracking.BlockerRaised    → NotifyBlockerRaised       → BlockerRaisedNotification   (recipients por severity)
Tracking.DailyReportSubmitted → NotifyDailyReportSubmitted → DailyReportSubmittedNotification
                                                        (mentor activo + leads de teams del autor)
```

## Tests

- `tests/Feature/NotificationsTest.php` — PreferenceMatrix con defaults + disabled + quiet hours; listeners de TaskAssigned y CommentMentions con `Notification::fake()`.

## TODO fase 2

- [ ] Push channel real (FCM para Android, APNs para iOS) vía `broadcast` driver custom
- [ ] Digest diario/semanal con cron + `NotificationFrequency::Daily/Hourly`
- [ ] Realtime via Reverb (invalidación de badge counter in-app)
- [ ] Email templates con branding del tenant (logo, colores)
- [ ] Unsubscribe link en emails con token firmado
