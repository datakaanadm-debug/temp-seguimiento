'use client'

import Link from 'next/link'
import { useQueryState, parseAsBoolean, parseAsString } from 'nuqs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useEvaluations } from '@/features/performance/hooks/use-evaluations'
import { initialsFromName } from '@/lib/utils'
import type { EvaluationStatus } from '@/types/api'

const STATUS_VARIANT: Record<EvaluationStatus, any> = {
  SCHEDULED: 'outline',
  IN_PROGRESS: 'default',
  SUBMITTED: 'warning',
  ACKNOWLEDGED: 'success',
  DISPUTED: 'destructive',
  RESOLVED: 'success',
  CANCELLED: 'secondary',
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

export default function EvaluacionesPage() {
  const [mine, setMine] = useQueryState('mine', parseAsBoolean.withDefault(true))
  const [status, setStatus] = useQueryState('status', parseAsString)
  const { data, isLoading } = useEvaluations({
    mine,
    status: (status as EvaluationStatus | undefined) ?? undefined,
    per_page: 50,
  })
  const items = data?.data ?? []

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evaluaciones</h1>
          <p className="text-sm text-muted-foreground">
            Scorecards aplicados a practicantes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={mine ? 'default' : 'outline'} size="sm" onClick={() => setMine(!mine)}>
            Solo mías
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'ACKNOWLEDGED'] as EvaluationStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? null : s)}
            className={`px-3 py-1 rounded-md border text-sm ${
              status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
          Sin evaluaciones.
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {items.map((e) => (
            <Link
              key={e.id}
              href={`/evaluaciones/${e.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={e.subject?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {initialsFromName(e.subject?.name ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{e.subject?.name ?? '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {e.kind_label}
                  {e.scheduled_for && ` · ${new Date(e.scheduled_for).toLocaleDateString('es-MX')}`}
                </div>
              </div>
              {e.overall_score != null && (
                <div className="hidden md:block text-right mr-3">
                  <div className="text-xs text-muted-foreground">Score</div>
                  <div className="font-semibold tabular-nums">{e.overall_score}/10</div>
                </div>
              )}
              <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
