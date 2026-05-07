import Link from 'next/link'
import { cookies } from 'next/headers'
import { apiClientServer, ApiError } from '@/lib/api-client'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, PriorityDot, Spark,
} from '@/components/ui/primitives'
import { getSessionServer } from '@/lib/auth/server'
import type { PaginatedResponse, Task, DailyReport } from '@/types/api'
import type { CalendarTodayResponse } from '@/features/calendar/api/calendar'

export const metadata = { title: 'Mi día' }

async function fetchDay() {
  const cookieStore = await cookies()
  const client = apiClientServer(cookieStore)

  const [tasksRes, todayReportRes, calendarRes] = await Promise.allSettled([
    client.get<PaginatedResponse<Task>>('/api/v1/tasks', {
      searchParams: { mine: true, per_page: 50 },
    }),
    client
      .get<{ data: DailyReport | null }>('/api/v1/daily-reports/today')
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          return { data: null }
        }
        throw err
      }),
    client.get<CalendarTodayResponse>('/api/v1/calendar/today'),
  ])

  return {
    tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.data : [],
    todayReport: todayReportRes.status === 'fulfilled' ? todayReportRes.value.data : null,
    agenda: calendarRes.status === 'fulfilled' ? calendarRes.value.data : [],
  }
}

export default async function MiDiaPage() {
  const session = await getSessionServer()
  const firstName = session?.user.name?.split(' ')[0] ?? ''
  const greeting = greetingFor(new Date())
  const { tasks, todayReport, agenda } = await fetchDay()

  const myActive = tasks.filter((t) => t.state !== 'DONE' && t.state !== 'CANCELLED')
  const focusToday = myActive
    .filter((t) => {
      if (!t.due_at) return t.state === 'IN_PROGRESS'
      const due = new Date(t.due_at)
      const today = new Date()
      return due.toDateString() === today.toDateString() || due < today
    })
    .slice(0, 6)
  const doneThisWeek = tasks.filter((t) => {
    if (t.state !== 'DONE' || !t.completed_at) return false
    const c = new Date(t.completed_at)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    return c > weekStart
  }).length
  const hoursWeek = tasks.reduce((a, t) => a + (t.actual_minutes / 60), 0)

  const weekTrend = [4, 5, 4, 6, 7, 5, Math.min(10, Math.round(hoursWeek / 4))]
  const tasksTrend = [3, 3, 4, 4, 4, 3, myActive.length]

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker={`${greeting}${firstName ? ', ' + firstName : ''}`}
        title="Listo para seguir"
        sub={`${myActive.length} tareas activas · ${focusToday.length} para hoy · ${todayReport ? 'bitácora de hoy pendiente de enviar' : 'aún no has reportado hoy'}`}
        right={
          <>
            <Link
              href="/reportes-diarios/hoy"
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Log size={13} />
              Reportar mi día
            </Link>
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

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <KpiCard k="Tareas activas" v={String(myActive.length)} sub="asignadas a ti" trend={tasksTrend} />
        <KpiCard k="Horas esta semana" v={`${hoursWeek.toFixed(1)}h`} sub="meta 30h" trend={weekTrend} />
        <KpiCard k="Completadas 7d" v={String(doneThisWeek)} sub={doneThisWeek > 0 ? '↑ sigue así' : 'vamos por la 1ª'} trend={[1, 1, 2, 2, 3, doneThisWeek, doneThisWeek]} />
        <KpiCard k="Estado bitácora" v={todayReport ? (todayReport.status === 'submitted' ? 'Enviada' : 'Borrador') : 'Pendiente'} sub={todayReport?.hours_worked ? `${todayReport.hours_worked}h reportadas` : 'reporta en 30s'} trend={[1, 1, 1, 1, 1, 1, todayReport ? 2 : 0]} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* LEFT: Focus hoy + activas */}
        <div className="flex min-w-0 flex-col gap-4">
          <PaperCard
            title="Enfoque del día"
            right={
              <Link href="/tareas?mine=true" className="text-[12px] text-ink-3 hover:text-ink">
                Todas mis tareas →
              </Link>
            }
            noPad
          >
            {focusToday.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-ink-3">
                No hay tareas urgentes para hoy. Buen día para avanzar las pendientes.
              </div>
            ) : (
              <div>
                {focusToday.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/tareas/${t.id}`}
                    className={`grid items-center gap-3 px-4 py-2.5 text-[13px] transition hover:bg-paper-bg-2 ${
                      i < focusToday.length - 1 ? 'border-b border-paper-line-soft' : ''
                    }`}
                    style={{ gridTemplateColumns: '20px 1fr auto auto 24px' }}
                  >
                    <PriorityDot p={t.priority as any} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{t.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-ink-3">
                        <span>T-{t.id.slice(0, 8).toUpperCase()}</span>
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
                    <Icon.Chev size={12} className="text-ink-muted" />
                  </Link>
                ))}
              </div>
            )}
          </PaperCard>

          {/* Mis objetivos */}
          <PaperCard title="Objetivo del mes" right={<PaperBadge tone="accent">Q2</PaperBadge>}>
            <div className="flex items-end gap-6">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                  Proyectos entregados
                </div>
                <div className="mt-1 font-serif text-[44px] leading-none tracking-tight">
                  {Math.min(3, doneThisWeek)}<span className="text-[18px] text-ink-3"> / 3</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-ink-3">Avance</span>
                  <span className="font-mono text-ink">{Math.round((Math.min(3, doneThisWeek) / 3) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper-line-soft">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (doneThisWeek / 3) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-ink-3">
                  Sigue reportando tu día para mantener visibilidad con tu líder.
                </div>
              </div>
            </div>
          </PaperCard>
        </div>

        {/* RIGHT: agenda + accesos + logros */}
        <div className="flex min-w-0 flex-col gap-4">
          <PaperCard
            title="Agenda · hoy"
            right={
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-3">
                <Icon.Cal size={13} />
                {agenda.length}
              </span>
            }
          >
            {agenda.length === 0 ? (
              <div className="py-4 text-center text-[12.5px] text-ink-3">
                Sin eventos programados para hoy.
              </div>
            ) : (
              agenda.map((e, i) => {
                const time = new Date(e.starts_at).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const tone =
                  e.source === 'mentor_session'
                    ? ('tag1' as const)
                    : e.source === 'evaluation'
                      ? ('tag3' as const)
                      : ('tag2' as const)
                const body = (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-ink">{e.title}</div>
                    <PaperBadge tone={tone} className="mt-1 !text-[10px]">
                      {e.tags[0] ?? e.kind}
                    </PaperBadge>
                  </div>
                )
                return (
                  <div
                    key={`${e.source}-${e.id}`}
                    className={`flex items-start gap-2.5 py-2 ${i > 0 ? 'border-t border-paper-line-soft' : ''}`}
                  >
                    <span className="w-10 shrink-0 font-mono text-[11px] text-ink-3">{time}</span>
                    {e.link ? (
                      <Link href={e.link} className="min-w-0 flex-1 transition hover:opacity-80">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </div>
                )
              })
            )}
          </PaperCard>

          <PaperCard title="Accesos rápidos">
            <div className="flex flex-col gap-1.5 text-[13px]">
              <QuickLink href="/tareas" icon="Tasks" label="Mis tareas" />
              <QuickLink href="/reportes-diarios/hoy" icon="Log" label="Reporte diario" />
              <QuickLink href="/mentoria" icon="Mentor" label="Próxima sesión 1:1" />
              <QuickLink href="/evaluaciones?mine=true" icon="Eval" label="Mis evaluaciones" />
              <QuickLink href="/logros" icon="Sparkles" label="Mis logros" />
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ k, v, sub, trend }: { k: string; v: string; sub?: string; trend: number[] }) {
  return (
    <div className="rounded-lg border border-paper-line bg-paper-raised p-3.5">
      <div className="text-[11px] text-ink-3">{k}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">{v}</div>
        <Spark data={trend} width={64} height={22} />
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  )
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

function greetingFor(d: Date) {
  const h = d.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
