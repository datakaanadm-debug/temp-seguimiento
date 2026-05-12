'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQueryState, parseAsBoolean, parseAsString } from 'nuqs'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge, TonalAvatar } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useEvaluations } from '@/features/performance/hooks/use-evaluations'
import { NewEvaluationDialog } from '@/features/performance/components/new-evaluation-dialog'
import { AssignEvaluatorDialog } from '@/features/performance/components/assign-evaluator-dialog'
import { Can } from '@/components/shared/can'
import { useCan } from '@/hooks/use-can'
import { cn } from '@/lib/utils'
import type { Evaluation, EvaluationStatus } from '@/types/api'

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
  const [newQuery, setNewQuery] = useQueryState('new', parseAsBoolean)
  const [newOpen, setNewOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<Evaluation | null>(null)
  // Asignar/reasignar evaluador es un set más restringido que crear (mentor
  // crea sus propias evaluaciones pero no reasigna las de otros). Mismo set
  // que EvaluationPolicy::assign en backend → 403 si no matchea.
  const canAssign = useCan('assign_evaluator')

  // Si el user entra con ?new=true (link viejo o desde tour), abrir el dialog.
  // Luego limpiamos el query param para que el back-button no re-abra.
  useEffect(() => {
    if (newQuery) {
      setNewOpen(true)
      setNewQuery(null)
    }
  }, [newQuery, setNewQuery])

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
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
              >
                <Icon.Plus size={13} />
                Nueva evaluación
              </button>
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
          {items.map((e, i) => {
            // El botón Asignar sólo aparece cuando el row es asignable
            // (SCHEDULED o IN_PROGRESS) y el user tiene la capability.
            const canShowAssign = canAssign && (e.status === 'SCHEDULED' || e.status === 'IN_PROGRESS')
            return (
              <div
                key={e.id}
                className={cn(
                  'relative grid items-center gap-4 px-4 py-3 transition hover:bg-paper-bg-2',
                  i < items.length - 1 && 'border-b border-paper-line-soft',
                )}
                style={{ gridTemplateColumns: '36px 1fr 140px 120px 110px 90px 32px' }}
              >
                {/* Link cubre toda la card excepto el botón Asignar */}
                <Link
                  href={`/evaluaciones/${e.id}`}
                  className="absolute inset-0"
                  aria-label={`Abrir evaluación de ${e.subject?.name ?? 'sin sujeto'}`}
                />
                <TonalAvatar
                  size={32}
                  name={e.subject?.name ?? e.subject?.email}
                  className="relative pointer-events-none"
                />
                <div className="relative min-w-0 pointer-events-none">
                  <div className="truncate text-[13px] font-medium text-ink">
                    {e.subject?.name ?? 'Sin sujeto'}
                  </div>
                  <div className="truncate text-[11px] text-ink-3">
                    {e.kind_label ?? e.kind}
                    {e.scheduled_for &&
                      ` · ${new Date(e.scheduled_for).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                </div>
                <div className="relative pointer-events-none">
                  <PaperBadge tone={STATUS_TONE[e.status]}>
                    {STATUS_LABEL[e.status]}
                  </PaperBadge>
                </div>
                <div className="relative text-right pointer-events-none">
                  {e.overall_score != null ? (
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-serif text-[20px] leading-none">{e.overall_score}</span>
                      <span className="font-mono text-[10px] text-ink-3">/ 100</span>
                    </div>
                  ) : (
                    <span className="font-mono text-[11px] text-ink-muted">—</span>
                  )}
                </div>
                <div className="relative text-right font-mono text-[10.5px] text-ink-3 pointer-events-none">
                  {e.evaluator?.name?.split(' ')[0] ?? '—'}
                </div>
                <div className="relative flex justify-end">
                  {canShowAssign ? (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault()
                        ev.stopPropagation()
                        setAssignTarget(e)
                      }}
                      className="rounded-md border border-paper-line bg-paper-raised px-2 py-0.5 text-[10.5px] text-ink-2 hover:border-paper-line-soft"
                    >
                      {e.evaluator_user_id ? 'Reasignar' : 'Asignar'}
                    </button>
                  ) : (
                    <span className="font-mono text-[10px] text-ink-muted">—</span>
                  )}
                </div>
                <Icon.Chev size={12} className="relative text-ink-muted pointer-events-none" />
              </div>
            )
          })}
        </div>
      )}

      <NewEvaluationDialog open={newOpen} onOpenChange={setNewOpen} />
      <AssignEvaluatorDialog
        evaluation={assignTarget}
        open={!!assignTarget}
        onOpenChange={(o) => { if (!o) setAssignTarget(null) }}
      />
    </div>
  )
}
