<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte Universitario · {{ $intern['name'] }}</title>
    <style>
        @page { margin: 0; }
        * { box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11pt;
            color: #0F172A;
            margin: 0;
            padding: 0;
        }
        .page {
            padding: 40px 48px;
            page-break-after: always;
        }
        .page:last-child { page-break-after: auto; }

        .brand {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid {{ $tenant['theme']['brand_primary'] ?? '#0891B2' }};
            padding-bottom: 12px;
            margin-bottom: 24px;
        }
        .brand h1 { margin: 0; font-size: 22pt; color: {{ $tenant['theme']['brand_dark'] ?? '#0E7490' }}; }
        .brand .kind { color: #64748B; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }

        h2 { color: {{ $tenant['theme']['brand_dark'] ?? '#0E7490' }}; font-size: 14pt; margin: 24px 0 8px; }

        .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #F8FAFC;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .meta dt { color: #64748B; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .meta dd { margin: 0 0 8px 0; font-weight: 500; }

        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .kpi {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
        }
        .kpi .label { font-size: 9pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi .value { font-size: 20pt; font-weight: 700; color: #0F172A; margin-top: 4px; }
        .kpi .sub { font-size: 9pt; color: #64748B; margin-top: 4px; }

        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th { background: #F1F5F9; text-align: left; padding: 8px; font-weight: 600; color: #334155; }
        td { padding: 8px; border-bottom: 1px solid #E2E8F0; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 500; }
        .badge-done { background: #D1FAE5; color: #065F46; }
        .badge-progress { background: #DBEAFE; color: #1E40AF; }
        .badge-pending { background: #F1F5F9; color: #475569; }

        .footer {
            position: fixed;
            bottom: 20px;
            left: 48px;
            right: 48px;
            font-size: 8pt;
            color: #94A3B8;
            text-align: center;
            border-top: 1px solid #E2E8F0;
            padding-top: 8px;
        }
    </style>
</head>
<body>
<div class="page">
    <div class="brand">
        <div>
            <h1>{{ $tenant['name'] }}</h1>
            <div class="kind">Reporte de Prácticas Profesionales</div>
        </div>
        <div style="text-align: right; font-size: 9pt; color: #64748B;">
            Emitido: {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}<br>
            Periodo: {{ \Carbon\Carbon::parse($period['start'])->format('d/m/Y') }} —
                    {{ \Carbon\Carbon::parse($period['end'])->format('d/m/Y') }}
        </div>
    </div>

    <dl class="meta">
        <div>
            <dt>Practicante</dt>
            <dd>{{ $intern['name'] }}</dd>
        </div>
        <div>
            <dt>Universidad</dt>
            <dd>{{ $intern['university'] ?? '—' }}</dd>
        </div>
        <div>
            <dt>Carrera</dt>
            <dd>{{ $intern['career'] ?? '—' }}
                @if(!empty($intern['semester'])) · {{ $intern['semester'] }}º semestre @endif
            </dd>
        </div>
        <div>
            <dt>Puesto</dt>
            <dd>{{ $intern['position_title'] ?? '—' }}</dd>
        </div>
        <div>
            <dt>Inicio prácticas</dt>
            <dd>{{ $intern['start_date'] ?? '—' }}</dd>
        </div>
        <div>
            <dt>Tutor académico</dt>
            <dd>{{ $intern['university_advisor'] ?? '—' }}</dd>
        </div>
    </dl>

    <h2>Cumplimiento de horas</h2>
    @if(!empty($intern['mandatory_hours']))
        <div class="kpi" style="margin-bottom: 20px;">
            <div class="label">Horas completadas / obligatorias</div>
            <div class="value">
                {{ $intern['hours_completed'] ?? 0 }} / {{ $intern['mandatory_hours'] }}
            </div>
            <div class="sub">{{ number_format($intern['progress_percent'] ?? 0, 1) }}% del convenio</div>
        </div>
    @else
        <p>No hay horas obligatorias configuradas.</p>
    @endif

    <h2>Indicadores del periodo</h2>
    <div class="kpi-grid">
        <div class="kpi">
            <div class="label">Tareas a tiempo</div>
            <div class="value">
                @if($kpis['tasks_on_time']['value'] !== null)
                    {{ number_format($kpis['tasks_on_time']['value'], 1) }}%
                @else —@endif
            </div>
            <div class="sub">{{ $kpis['tasks_on_time']['sample_size'] }} tareas completadas</div>
        </div>
        <div class="kpi">
            <div class="label">Tareas completadas</div>
            <div class="value">{{ (int) ($kpis['tasks_completed']['value'] ?? 0) }}</div>
            <div class="sub">en el periodo</div>
        </div>
        <div class="kpi">
            <div class="label">Horas registradas</div>
            <div class="value">{{ number_format($kpis['hours_logged']['value'] ?? 0, 1) }}h</div>
            <div class="sub">{{ $kpis['hours_logged']['sample_size'] }} sesiones</div>
        </div>
        <div class="kpi">
            <div class="label">Evaluación promedio</div>
            <div class="value">
                @if($kpis['avg_review_score']['value'] !== null)
                    {{ number_format($kpis['avg_review_score']['value'], 1) }}/10
                @else —@endif
            </div>
            <div class="sub">{{ $kpis['avg_review_score']['sample_size'] }} evaluaciones</div>
        </div>
        <div class="kpi">
            <div class="label">Tareas vencidas</div>
            <div class="value">{{ (int) ($kpis['overdue_count']['value'] ?? 0) }}</div>
            <div class="sub">activas con fecha pasada</div>
        </div>
        <div class="kpi">
            <div class="label">Reportes diarios</div>
            <div class="value">{{ $daily_reports_count }}</div>
            <div class="sub">enviados en el periodo</div>
        </div>
    </div>

    <h2>Actividad reciente</h2>
    @if(count($recent_tasks ?? []) > 0)
        <table>
            <thead>
                <tr>
                    <th>Tarea</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th>Completada</th>
                    <th style="text-align: right;">Tiempo (min)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($recent_tasks as $t)
                    <tr>
                        <td>{{ $t['title'] }}</td>
                        <td>
                            <span class="badge badge-{{ $t['state'] === 'DONE' ? 'done' : ($t['state'] === 'IN_PROGRESS' ? 'progress' : 'pending') }}">
                                {{ $t['state_label'] }}
                            </span>
                        </td>
                        <td>{{ $t['due_at'] ?? '—' }}</td>
                        <td>{{ $t['completed_at'] ?? '—' }}</td>
                        <td style="text-align: right;">{{ $t['actual_minutes'] }} / {{ $t['estimated_minutes'] ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p>No hay actividad registrada en el periodo.</p>
    @endif

    <div class="footer">
        {{ $tenant['name'] }} · Reporte generado por Interna · {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}
    </div>
</div>
</body>
</html>
