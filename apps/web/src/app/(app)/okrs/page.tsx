'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  listObjectives, checkInKeyResult,
  type KeyResult, type Objective,
} from '@/features/okrs/api/okrs'
import { NewOkrDialog } from '@/features/okrs/components/new-okr-dialog'
import { CheckInDialog } from '@/features/okrs/components/check-in-dialog'
import { Can } from '@/components/shared/can'

const VIEWS = [
  { id: 'mine', label: 'Los míos' },
  { id: 'team', label: 'Por equipo' },
  { id: 'tree', label: 'Alineación' },
] as const
type View = (typeof VIEWS)[number]['id']

export default function OkrsPage() {
  const [view, setView] = useState<View>('mine')
  const [newOkrOpen, setNewOkrOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['okrs-all'],
    queryFn: () => listObjectives({}),
  })
  const objectives = data?.data ?? []

  const mine = objectives.filter((o) => o.level === 'individual')
  const team = objectives.filter((o) => o.level === 'team')
  const company = objectives.filter((o) => o.level === 'company')

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker={`Objetivos · ${company[0]?.quarter ?? 'Q2 2026'}`}
        title="Objetivos y resultados clave (OKRs)"
        sub={
          isLoading
            ? 'Cargando…'
            : `${company.length} de empresa · ${team.length} de equipo · ${mine.length} individuales`
        }
        right={
          <>
            <div className="inline-flex rounded-md border border-paper-line bg-paper-raised p-0.5">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    'rounded-[4px] px-2.5 py-[5px] text-[12px] transition',
                    view === v.id
                      ? 'bg-paper-bg-2 font-semibold text-ink'
                      : 'font-medium text-ink-3 hover:text-ink',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Can capability="create_okr">
              <button
                type="button"
                onClick={() => setNewOkrOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
              >
                <Icon.Plus size={13} />
                Nuevo OKR
              </button>
            </Can>
          </>
        }
      />

      <NewOkrDialog open={newOkrOpen} onOpenChange={setNewOkrOpen} parentOptions={objectives} />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === 'tree' ? (
        <AlignmentTree objectives={objectives} />
      ) : (
        <div className="flex flex-col gap-4">
          {(view === 'mine' ? mine : team).length === 0 ? (
            <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center text-[13px] text-ink-3">
              Sin objetivos {view === 'mine' ? 'individuales' : 'de equipo'} para este trimestre.
            </div>
          ) : (
            (view === 'mine' ? mine : team).map((o) => <ObjectiveCard key={o.id} objective={o} />)
          )}
        </div>
      )}
    </div>
  )
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const qc = useQueryClient()
  const [checkInKr, setCheckInKr] = useState<KeyResult | null>(null)
  const avg = useMemo(
    () =>
      objective.key_results.length
        ? objective.key_results.reduce((a, k) => a + k.progress_percent, 0) / objective.key_results.length
        : 0,
    [objective.key_results],
  )
  const conf = useMemo(
    () =>
      objective.key_results.length
        ? objective.key_results.reduce((a, k) => a + k.confidence, 0) / objective.key_results.length
        : 0,
    [objective.key_results],
  )
  const levelTone = { company: 'ok', team: 'accent', individual: 'info' } as const

  // Mutation kept para compat (no se usa directo desde UI ahora — el dialog la maneja).
  // El dialog invalida el query cache en su onSuccess.
  void checkInKeyResult
  void qc

  return (
    <PaperCard>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <PaperBadge tone={levelTone[objective.level]} className="!text-[10px] uppercase">
              {objective.level === 'company' ? 'EMPRESA' : objective.level === 'team' ? 'EQUIPO' : 'INDIVIDUAL'}
            </PaperBadge>
            <span className="font-mono text-[11px] text-ink-3">{objective.quarter}</span>
            <span className="ml-auto font-mono text-[11px] text-ink-3">
              {objective.owner_name ?? objective.owner_type}
            </span>
          </div>
          <div className="font-serif text-[17px] leading-tight tracking-tight text-ink">
            {objective.label}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-0.5 flex justify-between text-[11px]">
                <span className="text-ink-3">Progreso global</span>
                <span className="font-mono text-ink">{Math.round(avg)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-paper-line-soft">
                <div className="h-full rounded-full bg-primary" style={{ width: `${avg}%` }} />
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase text-ink-3">Confianza</div>
              <div className="font-serif text-[18px] leading-none text-ink">
                {conf.toFixed(1)}
                <span className="text-[11px] text-ink-3">/10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-paper-line-soft pt-3">
        {objective.key_results.map((k, i) => (
          <div key={k.id}>
            <div className="mb-1 flex items-center gap-2 text-[12.5px]">
              <span className="font-mono text-[11px] font-semibold text-primary">KR{i + 1}</span>
              <span className="flex-1 text-ink-2">{k.text}</span>
              <button
                type="button"
                onClick={() => setCheckInKr(k)}
                className="inline-flex items-center gap-1 rounded-md border border-paper-line-soft bg-paper-surface px-2 py-[2px] font-mono text-[11px] text-ink-2 hover:border-paper-line hover:text-ink"
                title="Registrar check-in"
              >
                {k.progress_percent}%
                <Icon.Chev size={10} />
              </button>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-paper-line-soft">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${k.progress_percent}%`,
                  background:
                    k.confidence >= 7
                      ? 'hsl(var(--ok))'
                      : k.confidence >= 4
                        ? 'hsl(var(--warn))'
                        : 'hsl(var(--danger))',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <CheckInDialog
        open={!!checkInKr}
        onOpenChange={(o) => !o && setCheckInKr(null)}
        kr={checkInKr}
        objectiveLabel={objective.label}
      />
    </PaperCard>
  )
}

function AlignmentTree({ objectives }: { objectives: Objective[] }) {
  const byId = new Map(objectives.map((o) => [o.id, o] as const))
  const roots = objectives.filter((o) => o.level === 'company')

  if (roots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center text-[13px] text-ink-3">
        Sin objetivos de empresa definidos para mostrar el árbol.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-paper-line bg-paper-raised p-5 shadow-paper-1">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
        Árbol de alineación
      </div>
      <div className="flex flex-col gap-5">
        {roots.map((r) => (
          <TreeNode key={r.id} node={r} all={objectives} byId={byId} depth={0} />
        ))}
      </div>
    </div>
  )
}

function TreeNode({
  node,
  all,
  byId,
  depth,
}: {
  node: Objective
  all: Objective[]
  byId: Map<string, Objective>
  depth: number
}) {
  const avg = node.key_results.length
    ? node.key_results.reduce((a, k) => a + k.progress_percent, 0) / node.key_results.length
    : 0
  const levelLabel =
    node.level === 'company' ? 'EMPRESA' : node.level === 'team' ? 'EQUIPO' : 'INDIVIDUAL'
  const levelColor =
    node.level === 'company'
      ? 'hsl(var(--ok))'
      : node.level === 'team'
        ? 'hsl(var(--accent-h))'
        : 'hsl(var(--info))'

  const children = all.filter((o) => o.parent_objective_id === node.id)

  return (
    <div className="relative flex flex-col gap-3" style={{ paddingLeft: depth * 28 }}>
      {depth > 0 && (
        <span
          className="absolute top-0 h-full w-px bg-paper-line"
          style={{ left: depth * 28 - 14 }}
        />
      )}

      <div
        className={cn(
          'relative flex items-start gap-3 rounded-md border border-paper-line-soft bg-paper-surface p-3',
          depth > 0 && 'before:absolute before:-left-[14px] before:top-[18px] before:h-px before:w-3.5 before:bg-paper-line',
        )}
      >
        <span
          className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: levelColor }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-semibold tracking-wider"
              style={{ color: levelColor }}
            >
              {levelLabel}
            </span>
            <span className="font-mono text-[10.5px] text-ink-3">
              {node.owner_name ?? node.owner_type}
            </span>
          </div>
          <div className="font-serif text-[15px] leading-tight text-ink">{node.label}</div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-line-soft">
              <div
                className="h-full rounded-full"
                style={{ width: `${avg}%`, background: levelColor }}
              />
            </div>
            <span className="font-mono text-[10.5px] text-ink-3">{Math.round(avg)}%</span>
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <div className="flex flex-col gap-3">
          {children.map((c) => (
            <TreeNode key={c.id} node={c} all={all} byId={byId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
