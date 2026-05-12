'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'
import {
  deleteScorecard, getScorecard, listScorecards, updateScorecard,
} from '@/features/performance/api/performance'
import { ScorecardFormDialog } from '@/features/performance/components/scorecard-form-dialog'
import type { Scorecard } from '@/types/api'

const APPLICABLE_LABEL: Record<Scorecard['applicable_to'], string> = {
  intern: 'Practicantes',
  mentor: 'Mentores',
  staff: 'Staff',
}

export default function ScorecardsPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr'])
  const qc = useQueryClient()
  const [includeInactive, setIncludeInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['scorecards', { includeInactive }],
    queryFn: () => listScorecards({ active_only: !includeInactive }),
  })

  // Cuando hay un editingId, fetcheamos el scorecard CON métricas (el index
  // sólo trae metric_count). El dialog necesita el array completo.
  const editing = useQuery({
    queryKey: ['scorecards', 'detail', editingId],
    queryFn: () => getScorecard(editingId!).then((r) => r.data),
    enabled: !!editingId && dialogOpen,
    staleTime: 0,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateScorecard(id, { is_active: active }),
    onSuccess: (_, vars) => {
      toast.success(vars.active ? 'Scorecard reactivada' : 'Scorecard desactivada')
      qc.invalidateQueries({ queryKey: ['scorecards'] })
      qc.invalidateQueries({ queryKey: ['scorecards-active'] })
    },
    onError: () => toast.error('No se pudo actualizar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteScorecard(id),
    onSuccess: () => {
      toast.success('Scorecard eliminada')
      qc.invalidateQueries({ queryKey: ['scorecards'] })
      qc.invalidateQueries({ queryKey: ['scorecards-active'] })
    },
    onError: () => toast.error('No se pudo eliminar — quizás hay evaluaciones que la usan'),
  })

  if (!allowed) return null

  const items = list.data?.data ?? []

  return (
    <div>
      <SectionTitle
        kicker="Workspace · Performance"
        title="Scorecards"
        sub={
          list.isLoading
            ? 'Cargando…'
            : `${items.length} ${items.length === 1 ? 'plantilla' : 'plantillas'} de evaluación · cada una con sus métricas y pesos`
        }
        right={
          <>
            <label className="mr-2 inline-flex items-center gap-1.5 text-[12px] text-ink-2">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Incluir inactivas
            </label>
            <button
              type="button"
              onClick={() => { setEditingId(null); setDialogOpen(true) }}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Nueva scorecard
            </button>
          </>
        }
      />

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <p className="mb-3 text-[13px] text-ink-3">
            No hay scorecards configuradas. Crea una para empezar a programar evaluaciones.
          </p>
          <button
            type="button"
            onClick={() => { setEditingId(null); setDialogOpen(true) }}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            <Icon.Plus size={13} />
            Crear primera scorecard
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
          {items.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                'grid items-center gap-3 px-4 py-3',
                i < items.length - 1 && 'border-b border-paper-line-soft',
              )}
              style={{ gridTemplateColumns: '1fr 140px 80px 110px 220px' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-ink">{s.name}</span>
                  {!s.is_active && (
                    <PaperBadge tone="neutral">Inactiva</PaperBadge>
                  )}
                </div>
                {s.description && (
                  <div className="mt-0.5 truncate text-[11.5px] text-ink-3">
                    {s.description}
                  </div>
                )}
              </div>
              <div className="text-[12px] text-ink-2">
                {APPLICABLE_LABEL[s.applicable_to]}
              </div>
              <div className="font-mono text-[12px] text-ink-2">
                {s.metric_count ?? '—'} mét.
              </div>
              <div className="font-mono text-[10.5px] text-ink-3">
                {new Date(s.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleActive.mutate({ id: s.id, active: !s.is_active })}
                  disabled={toggleActive.isPending}
                  className="rounded-md border border-paper-line bg-paper-raised px-2 py-1 text-[11px] text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
                >
                  {s.is_active ? 'Desactivar' : 'Reactivar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingId(s.id); setDialogOpen(true) }}
                  className="rounded-md border border-paper-line bg-paper-raised px-2 py-1 text-[11px] text-ink-2 hover:border-paper-line-soft"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Eliminar la scorecard "${s.name}"? Las evaluaciones que la usaron seguirán existiendo, pero ya no podrás reusarla.`)) {
                      remove.mutate(s.id)
                    }
                  }}
                  disabled={remove.isPending}
                  className="rounded-md p-1 text-ink-3 hover:bg-paper-bg-2 disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  <Icon.X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScorecardFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditingId(null)
        }}
        scorecard={editingId ? editing.data ?? null : null}
      />
    </div>
  )
}
