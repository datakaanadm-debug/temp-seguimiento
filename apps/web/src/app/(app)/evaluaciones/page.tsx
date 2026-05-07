'use client'

import Link from 'next/link'
import { useQueryState, parseAsBoolean, parseAsString } from 'nuqs'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge, TonalAvatar } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useEvaluations } from '@/features/performance/hooks/use-evaluations'
import { Can } from '@/components/shared/can'
import { cn } from '@/lib/utils'
import type { EvaluationStatus } from '@/types/api'

const STATUS_TONE: Record<EvaluationStatus, 'neutral' | 'info' | 'accent' | 'warn' | 'ok' | 'danger'> = {
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'accent',
  SUBMITTED: 'info',
  ACKNOWLEDGED: 'ok',
  DISPUTED: 'danger',
  RESOLVED: 'ok',
  CANCELLED: 'neutral',
}

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  SUBMITTED: 'Enviada',
  ACKNOWLEDGED: 'Aceptada',
  DISPUTED: 'En disputa',
  RESOLVED: 'Resuelta',
  CANCELLED: 'Cancelada',
}

const FILTERS: EvaluationStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'ACKNOWLEDGED']

export default function EvaluacionesPage() {
  const [mine, setMine] = useQueryState('mine', parseAsBoolean.withDefault(false))
  const [status, setStatus] = useQueryState('status', parseAsString)

  const { data, isLoading } = useEvaluations({
    mine,
    status: (status as EvaluationStatus | undefined) ?? undefined,
    per_page: 50,
  })
  const items = data?.data ?? []

  const scheduled = items.filter((e) => e.status === 'SCHEDULED').length
  const inProgress = items.filter((e) => e.status === 'IN_PROGRESS').length
  const done = items.filter((e) => e.status === 'ACKNOWLEDGED' || e.status === 'RESOLVED').length

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Performance"
        title="Evaluaciones de desempeño"
        sub={`${items.length} evaluaciones · ${scheduled} programadas · ${inProgress} en curso · ${done} cerradas`}
        right={
          <>
            <button
              type="button"
              onClick={() => setMine(!mine)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[7px] text-[12px] font-medium transition',
                mine
                  ? 'border-primary-ink bg-primary text-primary-foreground'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              <Icon.People size={13} />
              {mine ? 'Sólo mías' : 'Todas'}
            </button>
            <Can capability="create_evaluations">
              <Link
                href="/evaluaciones?new=true"
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
              >
                <Icon.Plus size={13} />
                Nueva evaluación
              </Link>
            </Can>
          </>
        }
      />

      {/* Status filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((s) => {
          const active = status === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(active ? null : s)}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium transition',
                active
                  ? 'border-primary-ink bg-primary-soft text-primary-ink'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          )
        })}
        {status && (
          <button
            type="button"
            onClick={() => setStatus(null)}
            className="text-[11px] text-ink-3 hover:text-ink"
          >
            limpiar
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <p className="text-[13px] text-ink-3">Sin evaluaciones con los filtros activos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
          {items.map((e, i) => (
            <Link
              key={e.id}
              href={`/evaluaciones/${e.id}`}
              className={cn(
                'grid items-center gap-4 px-4 py-3 transition hover:bg-paper-bg-2',
                i < items.length - 1 && 'border-b border-paper-line-soft',
              )}
              style={{ gridTemplateColumns: '36px 1fr 140px 120px 110px 32px' }}
            >
              <TonalAvatar
                size={32}
                name={e.subject?.name ?? e.subject?.email}
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-ink">
                  {e.subject?.name ?? 'Sin sujeto'}
                </div>
                <div className="truncate text-[11px] text-ink-3">
                  {e.kind_label ?? e.kind}
                  {e.scheduled_for &&
                    ` · ${new Date(e.scheduled_for).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </div>
              </div>
              <div>
                <PaperBadge tone={STATUS_TONE[e.status]}>
                  {STATUS_LABEL[e.status]}
                </PaperBadge>
              </div>
              <div className="text-right">
                {e.overall_score != null ? (
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="font-serif text-[20px] leading-none">{e.overall_score}</span>
                    <span className="font-mono text-[10px] text-ink-3">/ 100</span>
                  </div>
                ) : (
                  <span className="font-mono text-[11px] text-ink-muted">—</span>
                )}
              </div>
              <div className="text-right font-mono text-[10.5px] text-ink-3">
                {e.evaluator?.name?.split(' ')[0] ?? '—'}
              </div>
              <Icon.Chev size={12} className="text-ink-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
