import Link from 'next/link'
import { cookies } from 'next/headers'
import { apiClientServer, ApiError } from '@/lib/api-client'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge, TonalAvatar, PriorityDot, Spark } from '@/components/ui/primitives'
import { getSessionServer } from '@/lib/auth/server'
import type { PaginatedResponse, Task, Profile, DataEnvelope } from '@/types/api'

export const metadata = { title: 'Inicio' }

type Insight = {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  kind: string
  summary: string
  subject?: { id: string; name?: string | null }
  created_at: string
}

async function fetchDashboardData() {
  const cookieStore = await cookies()
  const client = apiClientServer(cookieStore)

  // Hacer las 3 llamadas en paralelo, tolerando fallos individuales
  const [tasksRes, internsRes, insightsRes] = await Promise.allSettled([
    client.get<PaginatedResponse<Task>>('/api/v1/tasks', {
      searchParams: { per_page: 20, sort: 'updated_at', dir: 'desc' },
    }),
    client.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
      searchParams: { kind: 'intern', per_page: 12 },
    }),
    client
      .get<{ data: Insight[] }>('/api/v1/ai/insights', {
        searchParams: { active_only: true },
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) return { data: [] as Insight[] }
        throw err
      }),
  ])

  return {
    tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.data : [],
    interns: internsRes.status === 'fulfilled' ? internsRes.value.data : [],
    insights: insightsRes.status === 'fulfilled' ? insightsRes.value.data : [],
  }
}

export default async function DashboardPage() {
  const session = await getSessionServer()
  const firstName = session?.user.name?.split(' ')[0] ?? session?.user.email ?? ''
  const tenantName = session?.tenant.name ?? ''

  const { tasks, interns, insights } = await fetchDashboardData()

  const activeTasks = tasks.filter((t) => t.state !== 'DONE' && t.state !== 'CANCELLED')
  const blockedTasks = tasks.filter((t) => t.state === 'BLOCKED')
  const inReview = tasks.filter((t) => t.state === 'IN_REVIEW')
  const overdue = tasks.filter((t) => t.is_overdue && t.state !== 'DONE')

  const attentionTasks = [...blockedTasks, ...overdue, ...inReview].slice(0, 6)
  const criticalInsights = insights.filter(
    (i) => i.severity === 'high' || i.severity === 'critical',
  )

  // Stats
  const stats = [
    { k: 'Tareas en curso', v: activeTasks.length.toString(), d: '', trend: [4, 5, 6, 7, 7, 8, 8] },
    { k: 'Bloqueos abiertos', v: blockedTasks.length.toString(), d: blockedTasks.length > 0 ? 'requiere atención' : '', trend: [0, 1, 0, 1, 1, 2, blockedTasks.length] },
    { k: 'En revisión', v: inReview.length.toString(), d: 'pendientes de líder', trend: [2, 3, 2, 3, 4, 3, inReview.length] },
    { k: 'Practicantes activos', v: interns.length.toString(), d: `de ${tenantName}`, trend: [5, 6, 6, 7, 7, 8, interns.length] },
  ]

  return (
    <div className="mx-auto max-w-[1360px] px-7 py-5 pb-10">
      <SectionTitle
        kicker={`Bienvenido${firstName ? ', ' + firstName : ''}`}
        title="Resumen de tu equipo hoy"
        sub={`${activeTasks.length} tareas en curso · ${blockedTasks.length} bloqueos · ${interns.length} practicantes`}
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Cal size={13} />
              Hoy
            </button>
            <Link
              href="/tareas/nueva"
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Nueva tarea
            </Link>
          </>
        }
      />

      {/* AI summary strip */}
      <AiSummaryStrip
        insights={criticalInsights}
        fallbackText={
          activeTasks.length === 0
            ? 'Aún no hay tareas activas. Crea la primera para ver insights del equipo.'
            : blockedTasks.length > 0
              ? `Hay ${blockedTasks.length} tarea${blockedTasks.length > 1 ? 's' : ''} bloqueada${blockedTasks.length > 1 ? 's' : ''}. Revisa la columna "Bloqueadas" en el tablero.`
              : `Tu equipo tiene ${activeTasks.length} tareas en curso. ${inReview.length > 0 ? `${inReview.length} esperan tu revisión.` : 'Todo marcha en orden.'}`
        }
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* LEFT column */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-paper-line bg-paper-raised p-3.5"
              >
                <div className="mb-1 text-[11px] tracking-[0.3px] text-ink-3">{s.k}</div>
                <div className="flex items-end justify-between gap-2">
                  <div className="font-serif text-[28px] leading-none tracking-tight">{s.v}</div>
                  <Spark data={s.trend} width={64} height={22} />
                </div>
                {s.d && (
                  <div className="mt-1.5 text-[11px] text-ink-3">{s.d}</div>
                )}
              </div>
            ))}
          </div>

          {/* Attention tasks */}
          <PaperCard
            title="Tareas que requieren atención"
            right={
              <Link
                href="/tareas"
                className="text-[12px] text-ink-3 hover:text-ink"
              >
                Ver todas →
              </Link>
            }
            noPad
          >
            {attentionTasks.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-ink-3">
                Todo en orden. No hay tareas que requieran atención.
              </div>
            ) : (
              <div>
                {attentionTasks.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/tareas/${t.id}`}
                    className="grid items-center gap-3 px-3.5 py-2.5 text-[13px] hover:bg-paper-bg-2"
                    style={{
                      gridTemplateColumns: '24px 1fr auto auto auto 28px',
                      borderBottom: i < attentionTasks.length - 1 ? '1px solid hsl(var(--paper-line-soft))' : 'none',
                    }}
                  >
                    <PriorityDot p={t.priority as any} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{t.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-3">
                        <span className="font-mono">T-{t.id.slice(0, 8).toUpperCase()}</span>
                        {t.state === 'BLOCKED' && <PaperBadge tone="danger" className="!text-[9px]">BLOQUEADA</PaperBadge>}
                        {t.is_overdue && t.state !== 'BLOCKED' && <PaperBadge tone="warn" className="!text-[9px]">VENCIDA</PaperBadge>}
                      </div>
                    </div>
                    <span className="text-[12px] text-ink-2">
                      {t.due_at ? new Date(t.due_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {(t.actual_minutes / 60).toFixed(1)}h
                      {t.estimated_minutes ? `/${(t.estimated_minutes / 60).toFixed(0)}h` : ''}
                    </span>
                    {t.assignee ? (
                      <TonalAvatar size={22} name={t.assignee.name ?? t.assignee.email} />
                    ) : (
                      <div className="h-[22px] w-[22px] rounded-full border border-dashed border-paper-line" />
                    )}
                    <Icon.Chev size={12} className="ml-1 text-ink-muted" />
                  </Link>
                ))}
              </div>
            )}
          </PaperCard>

          {/* Interns pulse */}
          {interns.length > 0 && (
            <PaperCard
              title="Practicantes — pulso semanal"
              right={
                <Link href="/practicantes" className="text-[12px] text-ink-3 hover:text-ink">
                  Ver todos →
                </Link>
              }
            >
              <div className="grid grid-cols-3 gap-2.5">
                {interns.slice(0, 9).map((p) => {
                  const name = p.user?.name ?? p.user?.email ?? 'Sin nombre'
                  const internData = (p as any).intern_data as
                    | { mandatory_hours?: number; hours_completed?: number; university?: string }
                    | undefined
                  const progress = internData?.mandatory_hours
                    ? Math.min(100, ((internData.hours_completed ?? 0) / internData.mandatory_hours) * 100)
                    : 0
                  return (
                    <Link
                      key={p.id}
                      href={`/practicantes/${p.id}`}
                      className="flex gap-2.5 rounded-md border border-paper-line-soft bg-paper-surface p-3 transition hover:border-paper-line hover:bg-paper-raised"
                    >
                      <TonalAvatar size={32} name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink">{name}</div>
                        <div className="truncate text-[11px] text-ink-3">
                          {internData?.university ?? p.position_title ?? 'Practicante'}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-line-soft">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-ink-3">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </PaperCard>
          )}
        </div>

        {/* RIGHT column */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* AI Alerts */}
          <PaperCard
            title="Alertas IA"
            right={
              insights.length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )
            }
          >
            {insights.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-ink-3">
                Sin alertas abiertas. El equipo está en orden.
              </div>
            ) : (
              <div className="-mx-0.5 flex flex-col gap-2.5">
                {insights.slice(0, 5).map((ins) => (
                  <div
                    key={ins.id}
                    className="rounded-md border-l-2 bg-paper-bg-2 p-2.5"
                    style={{ borderLeftColor: severityColor(ins.severity) }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon.AlertTriangle size={12} style={{ color: severityColor(ins.severity) }} />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                        {ins.kind.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[12.5px] leading-[1.45] text-ink">
                      {ins.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PaperCard>

          {/* Quick links */}
          <PaperCard title="Accesos rápidos">
            <div className="flex flex-col gap-1.5 text-[13px]">
              <QuickLink href="/reportes-diarios" icon="Log" label="Revisar bitácoras" />
              <QuickLink href="/evaluaciones" icon="Eval" label="Evaluaciones pendientes" />
              <QuickLink href="/reportes/universidad/solicitar" icon="Onboard" label="Reporte universidad" />
              <QuickLink href="/configuracion/equipo" icon="People" label="Administrar equipo" />
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  )
}

function severityColor(s: Insight['severity']) {
  switch (s) {
    case 'critical':
      return 'hsl(var(--danger))'
    case 'high':
      return 'hsl(var(--warn))'
    case 'medium':
      return 'hsl(var(--info))'
    default:
      return 'hsl(var(--ink-muted))'
  }
}

function QuickLink({ href, icon, label }: { href: string; icon: keyof typeof Icon; label: string }) {
  const IconC = Icon[icon]
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-ink-2 transition hover:bg-paper-bg-2 hover:text-ink"
    >
      <IconC size={14} className="text-ink-3" />
      <span className="flex-1">{label}</span>
      <Icon.Chev size={12} className="text-ink-muted" />
    </Link>
  )
}

function AiSummaryStrip({
  insights,
  fallbackText,
}: {
  insights: Insight[]
  fallbackText: string
}) {
  const topInsight = insights[0]
  const generatedAt = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-lg border border-paper-line p-3.5"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--paper-surface)), hsl(var(--paper-bg)))',
      }}
    >
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink text-paper-bg">
        <Icon.Sparkles size={14} />
      </div>
      <div className="flex-1">
        <div className="mb-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
          RESUMEN · generado {generatedAt}
        </div>
        <div className="text-[13.5px] leading-[1.55] text-ink">
          {topInsight ? topInsight.summary : fallbackText}
        </div>
      </div>
      <Link
        href="/analitica"
        className="shrink-0 text-[12px] text-ink-3 hover:text-ink"
      >
        Ver detalles →
      </Link>
    </div>
  )
}
