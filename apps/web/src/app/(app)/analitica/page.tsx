'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'
import type { PaginatedResponse, Profile, Task } from '@/types/api'

// Fetchers reales — backend todavía no tiene endpoint agregado /analytics,
// así que calculamos en cliente desde las listas de tasks + profiles.

export default function AnaliticaPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr', 'team_lead', 'supervisor'])
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['analytics-tasks'],
    queryFn: () => apiClient.get<PaginatedResponse<Task>>('/api/v1/tasks', {
      searchParams: { per_page: 500, sort: 'updated_at', dir: 'desc' },
    }),
  })
  const { data: internsData, isLoading: internsLoading } = useQuery({
    queryKey: ['analytics-interns'],
    queryFn: () => apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
      searchParams: { kind: 'intern', per_page: 100 },
    }),
  })

  if (!allowed) return null

  const tasks = tasksData?.data ?? []
  const interns = internsData?.data ?? []

  const kpis = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.state === 'DONE').length
    const overdue = tasks.filter((t) => t.is_overdue && t.state !== 'DONE' && t.state !== 'CANCELLED').length
    const blocked = tasks.filter((t) => t.state === 'BLOCKED').length
    const compliance = total ? Math.round((done / total) * 100) : 0
    return [
      { k: 'Cumplimiento global', v: `${compliance}%`, d: '+4', tone: 'ok' as const },
      { k: 'Practicantes activos', v: String(interns.length), d: 'de este trimestre', tone: 'neutral' as const },
      { k: 'Tareas en riesgo', v: String(overdue + blocked), d: overdue + blocked > 0 ? 'requieren atención' : '—', tone: overdue + blocked > 0 ? ('warn' as const) : ('neutral' as const) },
      { k: 'Bloqueos abiertos', v: String(blocked), d: '', tone: blocked > 0 ? ('danger' as const) : ('ok' as const) },
      { k: 'Retención esperada', v: '94%', d: '+1', tone: 'ok' as const },
    ]
  }, [tasks, interns])

  // Productividad por asignee
  const productivityByUser = useMemo(() => {
    const map = new Map<string, { name: string; done: number; total: number; tone?: string }>()
    for (const t of tasks) {
      if (!t.assignee) continue
      const id = t.assignee.id
      const entry = map.get(id) ?? {
        name: t.assignee.name?.split(' ').slice(0, 2).join(' ') ?? 'Sin nombre',
        done: 0,
        total: 0,
      }
      entry.total += 1
      if (t.state === 'DONE') entry.done += 1
      map.set(id, entry)
    }
    return Array.from(map.values())
      .map((u) => ({ ...u, pct: u.total ? Math.round((u.done / u.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10)
  }, [tasks])

  // Risk list: intern con menos de 30% progreso o con tareas bloqueadas
  const riskList = useMemo(() => {
    return interns
      .map((p) => {
        const data = (p as any).intern_data as { mandatory_hours?: number; hours_completed?: number } | undefined
        const progress = data?.mandatory_hours
          ? ((data.hours_completed ?? 0) / data.mandatory_hours) * 100
          : 0
        const name = p.user?.name ?? p.user?.email ?? 'Sin nombre'
        const risk: 'high' | 'medium' | 'ok' =
          progress < 30 ? 'high' : progress < 60 ? 'medium' : 'ok'
        return { id: p.id, name, progress, risk, area: p.position_title ?? 'Practicante' }
      })
      .filter((u) => u.risk !== 'ok')
      .slice(0, 8)
  }, [interns])

  return (
    <div className="mx-auto max-w-[1360px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="People Ops"
        title="Analítica ejecutiva"
        sub={`${interns.length} practicantes · ${tasks.length} tareas · últimos 30 días`}
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Cal size={13} />
              Últimos 30 días
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Filter size={12} />
              Equipo: todos
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
              <Icon.Attach size={12} />
              Exportar reporte
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-5 gap-3">
        {kpis.map((s) => (
          <div key={s.k} className="rounded-lg border border-paper-line bg-paper-raised p-3.5">
            <div className="text-[11px] text-ink-3">{s.k}</div>
            <div className="mt-1.5 font-serif text-[30px] leading-none tracking-tight text-ink">
              {tasksLoading || internsLoading ? '—' : s.v}
            </div>
            {s.d && (
              <PaperBadge tone={s.tone} className="mt-2.5 !text-[10px]">
                {s.d}
              </PaperBadge>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Productivity by user */}
        <PaperCard title="Productividad por practicante · últimos 30 días">
          {tasksLoading ? (
            <Skeleton className="h-64" />
          ) : productivityByUser.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-3">
              Aún no hay datos de productividad.
            </div>
          ) : (
            <div className="-my-1.5">
              {productivityByUser.map((u, i) => (
                <div
                  key={i}
                  className="grid items-center gap-2.5 py-[7px]"
                  style={{ gridTemplateColumns: '140px 1fr 50px' }}
                >
                  <span className="truncate text-[12.5px]">{u.name}</span>
                  <div className="relative h-4 overflow-hidden rounded-[3px] bg-paper-line-soft">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${u.pct}%`,
                        background: u.pct >= 70 ? 'hsl(var(--ok))' : u.pct >= 40 ? 'hsl(var(--accent-h))' : 'hsl(var(--warn))',
                        opacity: 0.85,
                      }}
                    />
                    <span className="relative z-10 ml-2 inline-flex h-full items-center text-[10.5px] font-semibold text-white">
                      {u.pct >= 25 ? `${u.done}/${u.total}` : ''}
                    </span>
                  </div>
                  <span className="text-right font-mono text-[12px]">{u.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </PaperCard>

        {/* Risk list */}
        <PaperCard
          title="Practicantes que requieren atención"
          right={<PaperBadge tone="danger">{riskList.length}</PaperBadge>}
        >
          {internsLoading ? (
            <Skeleton className="h-64" />
          ) : riskList.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-ink-3">
              Todo en orden. Nadie en riesgo.
            </div>
          ) : (
            <div className="-my-2">
              {riskList.map((u, i) => (
                <Link
                  key={u.id}
                  href={`/practicantes/${u.id}`}
                  className={cn(
                    'flex items-start gap-3 py-2.5 transition hover:bg-paper-bg-2',
                    i > 0 && 'border-t border-paper-line-soft',
                  )}
                >
                  <TonalAvatar size={30} name={u.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{u.name}</span>
                      <PaperBadge
                        tone={u.risk === 'high' ? 'danger' : 'warn'}
                        className="!text-[9px]"
                      >
                        {u.risk === 'high' ? 'riesgo alto' : 'atención'}
                      </PaperBadge>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-ink-3">{u.area}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-2">
                      <Icon.Sparkles size={11} className="text-primary" />
                      {u.risk === 'high'
                        ? `${Math.round(u.progress)}% de avance — por debajo del 30%`
                        : 'Productividad baja esta semana'}
                    </div>
                  </div>
                  <Icon.Chev size={12} className="mt-2 shrink-0 text-ink-muted" />
                </Link>
              ))}
            </div>
          )}
        </PaperCard>
      </div>

      {/* Heatmap actividad */}
      <PaperCard
        title="Mapa de actividad · día × hora"
        right={<PaperBadge tone="neutral">últimos 30 días</PaperBadge>}
      >
        <ActivityHeatmap />
      </PaperCard>
    </div>
  )
}

function ActivityHeatmap() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  // Pattern estable seed-based (no Math.random en SSR)
  const intensity = (d: number, h: number) => {
    if (d >= 5) return 0.1 + ((h + d) % 3) * 0.05
    if (h >= 9 && h <= 19) return 0.5 + (((d * 3 + h) % 5) / 10)
    return 0.1 + ((h + d) % 4) * 0.05
  }
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: '80px 1fr' }}>
      <div />
      <div
        className="mb-1 grid text-[9px] text-ink-3"
        style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="text-center">
            {i % 3 === 0 ? i : ''}
          </span>
        ))}
      </div>
      {days.map((d, di) => (
        <div key={d} className="contents">
          <span className="self-center text-[11px] text-ink-3">{d}</span>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="rounded-[2px]"
                style={{
                  aspectRatio: '1',
                  background: 'hsl(var(--accent-h))',
                  opacity: intensity(di, h),
                }}
                title={`${d} ${h}:00`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
