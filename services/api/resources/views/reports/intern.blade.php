@php
    $logoUrl = $tenant['theme']['logo_url'] ?? null;
    $primary = $tenant['theme']['brand_primary'] ?? '#0891B2';
    $primaryDark = $tenant['theme']['brand_dark'] ?? '#0E7490';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Practicante · {{ $intern['name'] }}</title>
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
            border-bottom: 3px solid {{ $primary }};
            padding-bottom: 12px;
            margin-bottom: 24px;
        }
        .brand-left { display: flex; align-items: center; gap: 12px; }
        .brand-logo { max-height: 44px; max-width: 120px; object-fit: contain; }
        .brand-fallback {
            display: inline-block;
            width: 40px;
            height: 40px;
            line-height: 40px;
            text-align: center;
            background: {{ $primaryDark }};
            color: #ffffff;
            border-radius: 6px;
            font-family: Georgia, serif;
            font-style: italic;
            font-size: 22pt;
            font-weight: 600;
        }
        .brand h1 { margin: 0; font-size: 22pt; color: {{ $primaryDark }}; }
        .brand .kind { color: #64748B; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }

        h2 { color: {{ $primaryDark }}; font-size: 14pt; margin: 24px 0 8px; }

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
            margin-bottom: 16px;
        }
        .kpi { border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
        .kpi .label { font-size: 9pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi .value { font-size: 20pt; font-weight: 700; color: #0F172A; margin-top: 4px; }
        .kpi .sub { font-size: 9pt; color: #64748B; margin-top: 4px; }

        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 16px; }
        th { background: #F1F5F9; text-align: left; padding: 8px; font-weight: 600; color: #334155; }
        td { padding: 8px; border-bottom: 1px solid #E2E8F0; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 500; }
        .badge-done { background: #D1FAE5; color: #065F46; }
        .badge-progress { background: #DBEAFE; color: #1E40AF; }
        .badge-pending { background: #F1F5F9; color: #475569; }

        .empty {
            background: #F8FAFC;
            border: 1px dashed #CBD5E1;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            color: #64748B;
            font-size: 10pt;
            margin-bottom: 16px;
        }

        .project-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px dashed #E2E8F0;
        }
        .project-dot {
            width: 8px; height: 8px; border-radius: 50%;
            flex-shrink: 0;
        }

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
        <div class="brand-left">
            @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $tenant['name'] }}" class="brand-logo">
            @else
                <span class="brand-fallback">{{ mb_strtolower(mb_substr($tenant['name'] ?? 'S', 0, 1)) }}</span>
            @endif
            <div>
                <h1>{{ $tenant['name'] }}</h1>
                <div class="kind">Reporte de Practicante</div>
            </div>
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
            <dt>Email</dt>
            <dd>{{ $intern['email'] }}</dd>
        </div>
        <div>
            <dt>Puesto</dt>
            <dd>{{ $intern['position_title'] ?? '—' }}</dd>
        </div>
        <div>
            <dt>Universidad</dt>
            <dd>{{ $intern['university'] ?? '—' }}
                @if(!empty($intern['career'])) · {{ $intern['career'] }} @endif
            </dd>
        </div>
        <div>
            <dt>Inicio prácticas</dt>
            <dd>{{ $intern['start_date'] ?? '—' }}</dd>
        </div>
        <div>
            <dt>Mentores activos</dt>
            <dd>
                @if(count($mentors) > 0)
                    {{ implode(', ', array_map(fn ($m) => $m['name'], $mentors)) }}
                @else — @endif
            </dd>
        </div>
    </dl>

    @if(!empty($intern['mandatory_hours']))
        <h2>Cumplimiento de horas (convenio)</h2>
        <div class="kpi" style="margin-bottom: 20px;">
            <div class="label">Horas completadas / obligatorias</div>
            <div class="value">
                {{ $intern['hours_completed'] ?? 0 }} / {{ $intern['mandatory_hours'] }}
            </div>
            <div class="sub">{{ number_format($intern['progress_percent'] ?? 0, 1) }}% del convenio</div>
        </div>
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
            <div class="sub">{{ $kpis['tasks_on_time']['sample_size'] }} tareas</div>
        </div>
        <div class="kpi">
            <div class="label">Tareas completadas</div>
            <div class="value">{{ (int) ($kpis['tasks_completed']['value'] ?? 0) }}</div>
            <div class="sub">en el periodo</div>
        </div>
        <div class="kpi">
            <div class="label">Tareas vencidas</div>
            <div class="value">{{ (int) ($kpis['overdue_count']['value'] ?? 0) }}</div>
            <div class="sub">activas</div>
        </div>
        <div class="kpi">
            <div class="label">Horas registradas</div>
            <div class="value">{{ number_format($kpis['hours_logged']['value'] ?? 0, 1) }}h</div>
            <div class="sub">{{ $kpis['hours_logged']['sample_size'] }} sesiones</div>
        </div>
        <div class="kpi">
            <div class="label">Bitácoras enviadas</div>
            <div class="value">{{ $daily_reports['submitted'] + $daily_reports['reviewed'] }}</div>
            <div class="sub">{{ $daily_reports['draft'] }} borradores · {{ number_format($daily_reports['hours_logged'], 1) }}h</div>
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
    </div>

    <h2>Distribución por proyecto</h2>
    @if(count($by_project) > 0)
        @foreach($by_project as $p)
            <div class="project-row">
                <span class="project-dot" style="background: {{ $p['color'] ?? '#94A3B8' }};"></span>
                <span style="flex: 1; font-size: 11pt; color: #0F172A;">{{ $p['name'] }}</span>
                <span style="font-size: 10pt; color: #64748B;">
                    <strong style="color: #0F172A;">{{ $p['tasks_done'] }}</strong>
                    {{ $p['tasks_done'] === 1 ? 'tarea' : 'tareas' }}
                </span>
            </div>
        @endforeach
    @else
        <div class="empty">No hay tareas DONE en el periodo.</div>
    @endif

    <h2>Actividad reciente</h2>
    @if(count($recent_tasks) > 0)
        <table>
            <thead>
                <tr>
                    <th>Tarea</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th>Completada</th>
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
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="empty">No hay actividad de tareas en el periodo.</div>
    @endif

    <div class="footer">
        {{ $tenant['name'] }} · Reporte generado por Senda · {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}
    </div>
</div>
</body>
</html>
