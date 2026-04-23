'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type Insight = {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  kind: string
  summary: string
  subject?: { id: string; name?: string | null } | null
  created_at: string
  resolved_at?: string | null
}

type Summary = {
  id: string
  kind: string
  content: string
  subject?: { id: string; name?: string | null } | null
  created_at: string
  approved_at?: string | null
}

const SEVERITY_TONE = {
  critical: 'danger',
  high: 'warn',
  medium: 'info',
  low: 'neutral',
} as const

const SEVERITY_COLOR = {
  critical: 'hsl(var(--danger))',
  high: 'hsl(var(--warn))',
  medium: 'hsl(var(--info))',
  low: 'hsl(var(--ink-muted))',
}

export default function IaPage() {
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights-all'],
    queryFn: async () => {
      try {
        return await apiClient.get<{ data: Insight[] }>('/api/v1/ai/insights', {
          searchParams: { per_page: 50 },
        })
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return { data: [] as Insight[] }
        throw e
      }
    },
  })
  const { data: summariesData, isLoading: summariesLoading } = useQuery({
    queryKey: ['ai-summaries'],
    queryFn: async () => {
      try {
        return await apiClient.get<{ data: Summary[] }>('/api/v1/ai/summaries', {
          searchParams: { per_page: 20 },
        })
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return { data: [] as Summary[] }
        throw e
      }
    },
  })

  const insights = insightsData?.data ?? []
  const summaries = summariesData?.data ?? []

  const open = insights.filter((i) => !i.resolved_at)
  const resolved = insights.filter((i) => i.resolved_at).length
  const critical = insights.filter((i) => i.severity === 'critical').length

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Capa IA · Interna Copilot"
        title="Insights, resúmenes y coaching"
        sub={`${open.length} alertas abiertas · ${resolved} resueltas · ${summaries.length} resúmenes generados`}
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Settings size={12} />
              Ajustes IA
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
              <Icon.Sparkles size={12} />
              Abrir coach
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <PaperCard>
          <div className="text-[11px] text-ink-3">Alertas abiertas</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">
            {insightsLoading ? '—' : open.length}
          </div>
          {critical > 0 && (
            <PaperBadge tone="danger" className="mt-2 !text-[10px]">
              {critical} críticas
            </PaperBadge>
          )}
        </PaperCard>
        <PaperCard>
          <div className="text-[11px] text-ink-3">Resueltas este mes</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">
            {insightsLoading ? '—' : resolved}
          </div>
        </PaperCard>
        <PaperCard>
          <div className="text-[11px] text-ink-3">Resúmenes generados</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">
            {summariesLoading ? '—' : summaries.length}
          </div>
        </PaperCard>
        <PaperCard>
          <div className="text-[11px] text-ink-3">Ahorro estimado</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">
            ~{Math.round((summaries.length + resolved) * 0.25)}h
          </div>
          <PaperBadge tone="ok" className="mt-2 !text-[10px]">
            esta semana
          </PaperBadge>
        </PaperCard>
      </div>

      {/* Two columns */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Insights feed */}
        <PaperCard
          title="Alertas activas"
          right={
            <Link href="/analitica" className="text-[12px] text-ink-3 hover:text-ink">
              Ver analítica →
            </Link>
          }
          noPad
        >
          {insightsLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : open.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-ink-3">
              Sin alertas abiertas. El equipo está en orden.
            </div>
          ) : (
            <div>
              {open.slice(0, 8).map((ins, i) => (
                <div
                  key={ins.id}
                  className={cn(
                    'grid items-start gap-3 p-4',
                    i < open.length - 1 && 'border-b border-paper-line-soft',
                  )}
                  style={{ gridTemplateColumns: '32px 1fr auto' }}
                >
                  <div
                    className="grid h-8 w-8 place-items-center rounded-md"
                    style={{
                      background: `${SEVERITY_COLOR[ins.severity]}22`,
                      color: SEVERITY_COLOR[ins.severity],
                    }}
                  >
                    <Icon.AlertTriangle size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PaperBadge tone={SEVERITY_TONE[ins.severity]} className="!text-[9px]">
                        {ins.severity.toUpperCase()}
                      </PaperBadge>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                        {ins.kind.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] leading-[1.5] text-ink">{ins.summary}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-3">
                      {ins.subject?.name && (
                        <>
                          <TonalAvatar size={14} name={ins.subject.name} />
                          <span>{ins.subject.name}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>
                        {new Date(ins.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-paper-line bg-paper-surface px-2 py-1 text-[11px] font-medium text-ink-2 hover:border-paper-line-soft"
                  >
                    Resolver
                  </button>
                </div>
              ))}
            </div>
          )}
        </PaperCard>

        {/* Summaries */}
        <PaperCard title="Resúmenes recientes" noPad>
          {summariesLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-ink-3">
              Aún no se han generado resúmenes. Usa el coach IA para crear el primero.
            </div>
          ) : (
            <div>
              {summaries.slice(0, 6).map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    'p-4',
                    i < summaries.length - 1 && 'border-b border-paper-line-soft',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon.Sparkles size={11} className="text-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.4px] text-ink-3">
                      {s.kind.replace(/_/g, ' ')}
                    </span>
                    {s.approved_at && (
                      <PaperBadge tone="ok" className="!text-[9px]">
                        APROBADO
                      </PaperBadge>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-ink-3">
                      {new Date(s.created_at).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="font-serif text-[13.5px] leading-[1.55] text-ink-2 line-clamp-3">
                    {s.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PaperCard>
      </div>

      {/* Capabilities */}
      <div className="mt-6">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
          Qué puede hacer el coach IA
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {[
            { t: 'Resúmenes diarios y semanales', d: 'Transforma tu actividad en bitácoras bien escritas.' },
            { t: 'Detección de bloqueos', d: 'Señala practicantes con patrones de atraso antes de que escalen.' },
            { t: 'Narrativa de evaluaciones', d: 'Genera borrador de evaluación que puedes revisar y publicar.' },
            { t: 'Match de mentor', d: 'Sugiere el mejor mentor para un practicante nuevo.' },
            { t: 'Coaching proactivo', d: 'Tips contextuales basados en tus tareas y objetivos.' },
            { t: 'Predicción de contratación', d: 'Estima probabilidad de conversión a empleado formal.' },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-lg border border-paper-line-soft bg-paper-surface p-3.5"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Icon.Sparkles size={11} className="text-primary" />
                <span className="text-[12.5px] font-semibold text-ink">{c.t}</span>
              </div>
              <p className="text-[11.5px] leading-[1.45] text-ink-3">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
