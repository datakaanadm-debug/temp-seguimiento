@php
    $logoUrl = $tenant['theme']['logo_url'] ?? null;
    $primary = $tenant['theme']['brand_primary'] ?? '#0891B2';
    $primaryDark = $tenant['theme']['brand_dark'] ?? '#0E7490';
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte Ejecutivo · {{ $tenant['name'] }}</title>
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
        .brand-logo {
            max-height: 44px;
            max-width: 120px;
            object-fit: contain;
        }
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

        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }
        .kpi {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
        }
        .kpi .label { font-size: 9pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi .value { font-size: 20pt; font-weight: 700; color: #0F172A; margin-top: 4px; }
        .kpi .sub { font-size: 9pt; color: #64748B; margin-top: 4px; }

        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 16px; }
        th { background: #F1F5F9; text-align: left; padding: 8px; font-weight: 600; color: #334155; }
        td { padding: 8px; border-bottom: 1px solid #E2E8F0; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 500; }
        .badge-warn { background: #FEE2E2; color: #991B1B; }
        .badge-ok { background: #D1FAE5; color: #065F46; }

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
        .empty {
            background: #F8FAFC;
            border: 1px dashed #CBD5E1;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            color: #64748B;
            font-size: 10pt;
            margin-bottom: 16px;
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
                <div class="kind">Resumen Ejecutivo del Programa</div>
            </div>
        </div>
        <div style="text-align: right; font-size: 9pt; color: #64748B;">
            Emitido: {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}<br>
            Periodo: {{ \Carbon\Carbon::parse($period['start'])->format('d/m/Y') }} —
                    {{ \Carbon\Carbon::parse($period['end'])->format('d/m/Y') }}
        </div>
    </div>

    <h2>Headcount del programa</h2>
    <div class="kpi-grid">
        <div class="kpi">
            <div class="label">Practicantes activos</div>
            <div class="value">{{ $headcount['active_interns'] }}</div>
            <div class="sub">con perfil intern</div>
        </div>
        <div class="kpi">
            <div class="label">Mentores activos</div>
            <div class="value">{{ $headcount['active_mentors'] }}</div>
            <div class="sub">con perfil mentor</div>
        </div>
        <div class="kpi">
            <div class="label">Asignaciones activas</div>
            <div class="value">{{ $headcount['assignments_active'] }}</div>
            <div class="sub">
                @if($headcount['mentor_to_intern_ratio'] !== null)
                    ratio mentor/practicante {{ $headcount['mentor_to_intern_ratio'] }}
                @else — @endif
            </div>
        </div>
    </div>

    <h2>Cumplimiento de tareas</h2>
    <div class="kpi-grid">
        <div class="kpi">
            <div class="label">Tareas completadas</div>
            <div class="value">{{ $tasks['completed'] }}</div>
            <div class="sub">en el periodo</div>
        </div>
        <div class="kpi">
            <div class="label">% a tiempo</div>
            <div class="value">
                @if($tasks['on_time_percent'] !== null)
                    {{ number_format($tasks['on_time_percent'], 1) }}%
                @else —@endif
            </div>
            <div class="sub">{{ $tasks['completed'] }} muestra</div>
        </div>
        <div class="kpi">
            <div class="label">Tareas vencidas</div>
            <div class="value">{{ $tasks['overdue_active'] }}</div>
            <div class="sub">activas con fecha pasada</div>
        </div>
    </div>

    <h2>Tracking y evaluación</h2>
    <div class="kpi-grid">
        <div class="kpi">
            <div class="label">Horas registradas</div>
            <div class="value">{{ number_format($tracking['hours_total'], 1) }}h</div>
            <div class="sub">{{ $tracking['reports_submitted'] }} bitácoras</div>
        </div>
        <div class="kpi">
            <div class="label">Bitácoras enviadas</div>
            <div class="value">{{ $tracking['reports_submitted'] }}</div>
            <div class="sub">submitted/reviewed</div>
        </div>
        <div class="kpi">
            <div class="label">Evaluación promedio</div>
            <div class="value">
                @if($evaluation['avg_score'] !== null)
                    {{ number_format($evaluation['avg_score'], 1) }}/10
                @else —@endif
            </div>
            <div class="sub">{{ $evaluation['sample_size'] }} evaluaciones</div>
        </div>
    </div>

    <h2>Top 5 performers</h2>
    @if(count($top_performers) > 0)
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Practicante</th>
                    <th style="text-align: right;">Tareas completadas</th>
                    <th style="text-align: right;">% a tiempo</th>
                </tr>
            </thead>
            <tbody>
                @foreach($top_performers as $i => $p)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $p['name'] }}</td>
                        <td style="text-align: right;">{{ $p['tasks_done'] }}</td>
                        <td style="text-align: right;">
                            @if($p['on_time_percent'] !== null)
                                {{ number_format($p['on_time_percent'], 1) }}%
                            @else —@endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="empty">No hay tareas completadas en el periodo.</div>
    @endif

    <h2>Riesgos · practicantes con ≥3 tareas vencidas</h2>
    @if(count($risks) > 0)
        <table>
            <thead>
                <tr>
                    <th>Practicante</th>
                    <th style="text-align: right;">Tareas vencidas activas</th>
                </tr>
            </thead>
            <tbody>
                @foreach($risks as $r)
                    <tr>
                        <td>{{ $r['name'] }}</td>
                        <td style="text-align: right;">
                            <span class="badge badge-warn">{{ $r['overdue_count'] }}</span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="empty">
            <span class="badge badge-ok">Sin riesgos detectados</span><br>
            Ningún practicante acumula 3+ tareas vencidas activas.
        </div>
    @endif

    <div class="footer">
        {{ $tenant['name'] }} · Reporte generado por Senda · {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}
    </div>
</div>
</body>
</html>
