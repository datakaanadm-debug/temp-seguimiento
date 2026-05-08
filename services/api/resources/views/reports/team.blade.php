@php
    $logoUrl = $tenant['theme']['logo_url'] ?? null;
    $primary = $tenant['theme']['brand_primary'] ?? '#0891B2';
    $primaryDark = $tenant['theme']['brand_dark'] ?? '#0E7490';
    $teamColor = $team['color'] ?? $primary;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Equipo · {{ $team['name'] }}</title>
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

        .team-card {
            background: #F8FAFC;
            border-left: 4px solid {{ $teamColor }};
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .team-card .name { font-size: 16pt; font-weight: 700; color: #0F172A; }
        .team-card .meta { font-size: 10pt; color: #475569; margin-top: 4px; }

        .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 10px;
            font-size: 10pt;
        }
        .meta-grid dt { color: #64748B; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.4px; }
        .meta-grid dd { margin: 0 0 6px 0; font-weight: 500; color: #0F172A; }

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
        .badge-warn { background: #FEE2E2; color: #991B1B; }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #E2E8F0;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 4px;
        }
        .progress-fill {
            height: 100%;
            background: {{ $teamColor }};
            transition: width 0.3s;
        }

        .okr {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 10px;
        }
        .okr .label { font-size: 11pt; font-weight: 600; color: #0F172A; }
        .okr .meta-line { font-size: 9pt; color: #64748B; margin-top: 2px; }
        .okr ul { margin: 8px 0 0 0; padding-left: 0; list-style: none; }
        .okr li { font-size: 9.5pt; color: #334155; padding: 4px 0; border-top: 1px dashed #E2E8F0; }
        .okr li:first-child { border-top: 0; }

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
                <div class="kind">Reporte de Equipo</div>
            </div>
        </div>
        <div style="text-align: right; font-size: 9pt; color: #64748B;">
            Emitido: {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}<br>
            Periodo: {{ \Carbon\Carbon::parse($period['start'])->format('d/m/Y') }} —
                    {{ \Carbon\Carbon::parse($period['end'])->format('d/m/Y') }}
        </div>
    </div>

    {{-- Header del team --}}
    <div class="team-card">
        <div class="name">{{ $team['name'] }}</div>
        <div class="meta">
            @if($team['area_name']) {{ $team['area_name'] }} · @endif
            {{ $team['members_count'] }} {{ $team['members_count'] === 1 ? 'miembro' : 'miembros' }} activos
        </div>
        <dl class="meta-grid">
            <div>
                <dt>Lead</dt>
                <dd>{{ $team['lead_name'] ?? '—' }}</dd>
            </div>
            <div>
                <dt>Slug</dt>
                <dd style="font-family: monospace; font-size: 9.5pt;">{{ $team['slug'] }}</dd>
            </div>
        </dl>
    </div>

    <h2>Resumen del periodo</h2>
    <div class="kpi-grid">
        <div class="kpi">
            <div class="label">Tareas completadas</div>
            <div class="value">{{ $team_totals['tasks_done'] }}</div>
            <div class="sub">en el periodo</div>
        </div>
        <div class="kpi">
            <div class="label">En progreso</div>
            <div class="value">{{ $team_totals['tasks_in_progress'] }}</div>
            <div class="sub">activas hoy</div>
        </div>
        <div class="kpi">
            <div class="label">Vencidas</div>
            <div class="value">{{ $team_totals['tasks_overdue'] }}</div>
            <div class="sub">activas con fecha pasada</div>
        </div>
    </div>

    <h2>Cumplimiento por miembro</h2>
    @if(count($members) > 0)
        <table>
            <thead>
                <tr>
                    <th>Miembro</th>
                    <th>Rol</th>
                    <th style="text-align: right;">Tareas DONE</th>
                    <th style="text-align: right;">% a tiempo</th>
                    <th style="text-align: right;">Vencidas</th>
                    <th style="text-align: right;">Horas</th>
                </tr>
            </thead>
            <tbody>
                @foreach($members as $m)
                    <tr>
                        <td>{{ $m['name'] }}</td>
                        <td>
                            <span class="badge badge-pending" style="text-transform: uppercase; font-size: 8pt;">
                                {{ $m['role'] }}
                            </span>
                        </td>
                        <td style="text-align: right;">{{ $m['tasks_done'] }}</td>
                        <td style="text-align: right;">
                            @if($m['tasks_on_time_percent'] !== null)
                                {{ number_format($m['tasks_on_time_percent'], 1) }}%
                            @else —@endif
                        </td>
                        <td style="text-align: right;">
                            @if($m['tasks_overdue'] > 0)
                                <span class="badge badge-warn">{{ $m['tasks_overdue'] }}</span>
                            @else
                                <span style="color: #94A3B8;">0</span>
                            @endif
                        </td>
                        <td style="text-align: right;">{{ number_format($m['hours'], 1) }}h</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div class="empty">El equipo no tiene miembros activos.</div>
    @endif
</div>

@if(count($recent_tasks) > 0 || count($okrs) > 0)
<div class="page">
    <h2>Actividad reciente del equipo</h2>
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
                                {{ $t['state'] }}
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

    <h2>OKRs del equipo</h2>
    @if(count($okrs) > 0)
        @foreach($okrs as $obj)
            <div class="okr">
                <div class="label">{{ $obj['label'] }}</div>
                <div class="meta-line">
                    {{ $obj['quarter'] }} ·
                    estado: {{ $obj['status'] }}
                    @if($obj['avg_progress'] !== null)
                        · progreso promedio: {{ number_format($obj['avg_progress'], 1) }}%
                    @endif
                </div>
                @if($obj['avg_progress'] !== null)
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {{ min(100, $obj['avg_progress']) }}%"></div>
                    </div>
                @endif
                @if(count($obj['key_results']) > 0)
                    <ul>
                        @foreach($obj['key_results'] as $kr)
                            <li>
                                <strong>{{ $kr['progress_percent'] }}%</strong> · {{ $kr['text'] }}
                                @if($kr['unit'] && ($kr['target_value'] !== null))
                                    <span style="color: #94A3B8;">
                                        ({{ $kr['current_value'] ?? '—' }} / {{ $kr['target_value'] }} {{ $kr['unit'] }})
                                    </span>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </div>
        @endforeach
    @else
        <div class="empty">El equipo no tiene OKRs vinculados.</div>
    @endif

    <div class="footer">
        {{ $tenant['name'] }} · Reporte generado por Senda · {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}
    </div>
</div>
@else
    <div class="footer">
        {{ $tenant['name'] }} · Reporte generado por Senda · {{ \Carbon\Carbon::parse($generated_at)->locale('es')->isoFormat('LL') }}
    </div>
@endif

</body>
</html>
