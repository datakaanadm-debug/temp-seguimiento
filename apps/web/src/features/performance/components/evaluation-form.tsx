'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import {
  useAcknowledgeEvaluation, useEvaluation, useSaveResponses, useSubmitEvaluation,
} from '../hooks/use-evaluations'
import { apiClient } from '@/lib/api-client'
import type { EvaluationStatus, ScorecardMetric } from '@/types/api'

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  SUBMITTED: 'Enviada',
  ACKNOWLEDGED: 'Aceptada',
  DISPUTED: 'En disputa',
  RESOLVED: 'Resuelta',
  CANCELLED: 'Cancelada',
}

export function EvaluationEditor({ id }: { id: string }) {
  const { data: evaluation, isLoading } = useEvaluation(id)
  const save = useSaveResponses(id)
  const submit = useSubmitEvaluation(id)
  const ack = useAcknowledgeEvaluation(id)
  const me = useCurrentUser()

  const [responses, setResponses] = useState<Record<string, number | string>>({})
  const [narrative, setNarrative] = useState('')
  const [overallScore, setOverallScore] = useState<number | ''>('')
  const [draftingNarrative, setDraftingNarrative] = useState(false)

  useEffect(() => {
    if (!evaluation) return
    const init: typeof responses = {}
    for (const r of evaluation.responses ?? []) {
      init[r.metric_id] = r.value_numeric ?? r.value_text ?? ''
    }
    setResponses(init)
    setNarrative(evaluation.narrative ?? evaluation.ai_draft_narrative ?? '')
    setOverallScore(evaluation.overall_score ?? '')
  }, [evaluation?.id])

  const metrics = evaluation?.scorecard?.metrics ?? []
  const kpiData = useMemo(() => {
    return metrics.map((m) => {
      const r = evaluation?.responses?.find((x) => x.metric_id === m.id)
      const val = Number(r?.value_numeric ?? r?.auto_value ?? 0)
      const scale = m.unit === 'percent' ? 100 : 5
      return { label: m.label, value: (val / scale) * 100, raw: val, unit: m.unit }
    })
  }, [evaluation, metrics])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-7 py-5">
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }
  if (!evaluation) {
    return (
      <div className="mx-auto max-w-[1200px] px-7 py-16 text-center text-ink-3">
        Evaluación no encontrada.
      </div>
    )
  }

  const isSubject = evaluation.subject_user_id === me.id
  const isEvaluator = evaluation.evaluator_user_id === me.id || !evaluation.evaluator_user_id
  const writable = ['SCHEDULED', 'IN_PROGRESS'].includes(evaluation.status) && isEvaluator && !isSubject
  const canAck = evaluation.status === 'SUBMITTED' && isSubject

  const handleSaveDraft = async () => {
    const payload: Record<string, any> = {}
    for (const [metricId, value] of Object.entries(responses)) {
      payload[metricId] = typeof value === 'number'
        ? { value_numeric: value }
        : { value_text: String(value || '') }
    }
    await save.mutateAsync({
      responses: payload,
      narrative: narrative || null,
      overall_score: overallScore === '' ? null : Number(overallScore),
    })
    toast.success('Borrador guardado')
  }

  const handleGenerateAiDraft = async () => {
    setDraftingNarrative(true)
    try {
      const res = await apiClient.post<{ data: { content: string } }>(
        '/api/v1/ai/summaries/evaluation-narrative',
        { evaluation_id: id },
      )
      setNarrative(res.data.content)
      toast.success('Borrador IA generado. Revísalo antes de enviar.')
    } catch {
      toast.error('No se pudo generar el borrador IA.')
    } finally {
      setDraftingNarrative(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <Link
        href="/evaluaciones"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Evaluaciones
      </Link>

      <SectionTitle
        kicker={`Evaluación ${evaluation.kind_label ?? evaluation.kind}`}
        title={`Scorecard de ${evaluation.subject?.name ?? '—'}`}
        sub={
          evaluation.submitted_at
            ? `Cerrada ${new Date(evaluation.submitted_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} · ${STATUS_LABEL[evaluation.status]}`
            : evaluation.scheduled_for
              ? `Programada para ${new Date(evaluation.scheduled_for).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : STATUS_LABEL[evaluation.status]
        }
        right={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[5px] text-[12px] text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Attach size={12} />
              Descargar PDF
            </button>
            {writable && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={save.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[5px] text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
              >
                {save.isPending ? 'Guardando…' : 'Guardar borrador'}
              </button>
            )}
            {writable && (
              <button
                type="button"
                onClick={async () => {
                  await handleSaveDraft()
                  await submit.mutateAsync()
                  toast.success('Evaluación enviada')
                }}
                disabled={submit.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-[5px] text-[12px] font-medium text-primary-foreground disabled:opacity-50"
              >
                {submit.isPending ? 'Enviando…' : 'Enviar'}
              </button>
            )}
            {canAck && (
              <button
                type="button"
                onClick={() => ack.mutate()}
                disabled={ack.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-[5px] text-[12px] font-medium text-primary-foreground disabled:opacity-50"
              >
                {ack.isPending ? 'Confirmando…' : 'Confirmar recibida'}
              </button>
            )}
          </>
        }
      />

      {/* Top row: score + radar */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: '320px 1fr' }}>
        <ScoreCard
          overall={overallScore === '' ? evaluation.overall_score : Number(overallScore)}
          status={evaluation.status}
          subject={evaluation.subject?.name}
        />
        <PaperCard
          title="KPIs · vista radar"
          right={<PaperBadge tone="neutral">Actual</PaperBadge>}
        >
          {kpiData.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-3">
              Sin métricas en este scorecard.
            </div>
          ) : (
            <div className="grid items-center gap-6" style={{ gridTemplateColumns: '240px 1fr' }}>
              <RadarChart data={kpiData.map((k) => k.value)} />
              <div className="flex flex-col gap-2.5">
                {kpiData.map((k, i) => (
                  <div
                    key={i}
                    className="grid items-center gap-2 text-[12.5px]"
                    style={{ gridTemplateColumns: '1fr 40px 60px' }}
                  >
                    <span className="truncate text-ink">{k.label}</span>
                    <span className="font-mono font-semibold">{k.raw}</span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {k.unit === 'percent' ? '%' : '/ 5'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PaperCard>
      </div>

      {/* Metrics + Narrative */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <PaperCard title="Métricas del scorecard">
          <div className="-my-1 divide-y divide-paper-line-soft">
            {metrics.map((m) => (
              <MetricInput
                key={m.id}
                metric={m}
                autoValue={evaluation.responses?.find((r) => r.metric_id === m.id)?.auto_value ?? null}
                value={responses[m.id] ?? ''}
                onChange={(v) => setResponses({ ...responses, [m.id]: v })}
                disabled={!writable}
              />
            ))}
            {metrics.length === 0 && (
              <div className="py-6 text-center text-[13px] text-ink-3">
                El scorecard no tiene métricas configuradas.
              </div>
            )}
          </div>
        </PaperCard>

        <PaperCard
          title="Narrativa cualitativa"
          right={
            writable && (
              <button
                type="button"
                onClick={handleGenerateAiDraft}
                disabled={draftingNarrative}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2 py-[4px] text-[11px] text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
              >
                <Icon.Sparkles size={11} />
                {draftingNarrative ? 'Generando…' : 'Borrador IA'}
              </button>
            )
          }
        >
          <textarea
            rows={12}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            disabled={!writable}
            placeholder="Observaciones generales, fortalezas, áreas de oportunidad, recomendaciones…"
            className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-3 font-serif text-[15px] leading-[1.65] text-ink outline-none focus:border-primary disabled:opacity-60"
          />
          <div className="mt-3">
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.4px] text-ink-3">
              Score general · 0 a 100
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={overallScore}
              onChange={(e) => setOverallScore(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={!writable}
              className="w-32 rounded-md border border-paper-line bg-paper-surface px-2.5 py-1.5 font-mono text-[16px] text-ink outline-none focus:border-primary disabled:opacity-60"
            />
          </div>
        </PaperCard>
      </div>
    </div>
  )
}

function ScoreCard({
  overall, status, subject,
}: { overall: number | null; status: EvaluationStatus; subject?: string | null }) {
  const isPositive = overall != null && overall >= 80
  return (
    <div className="rounded-lg border border-paper-line bg-paper-raised p-[22px]">
      <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
        Resultado global
      </div>
      <div className="mt-2 flex items-end gap-2.5">
        <div className="font-serif tracking-tight" style={{ fontSize: 68, lineHeight: 0.9 }}>
          {overall ?? '—'}
        </div>
        <div className="pb-2.5 text-[13px] text-ink-3">/ 100</div>
        {overall != null && (
          <PaperBadge tone={isPositive ? 'ok' : overall >= 60 ? 'warn' : 'danger'} className="ml-auto mb-3">
            {isPositive ? 'Destacado' : overall >= 60 ? 'En target' : 'Requiere atención'}
          </PaperBadge>
        )}
      </div>
      <div className="mt-3 text-[13px] leading-[1.55] text-ink-2">
        {subject && <b className="text-ink">{subject}</b>}
        {isPositive
          ? ' muestra un desempeño sobresaliente — por encima del objetivo.'
          : overall == null
            ? ' aún sin score asignado.'
            : ' está en progreso hacia las metas definidas.'}
      </div>
      <div className="mt-4 border-t border-paper-line-soft pt-3.5 text-[12px]">
        <div className="grid grid-cols-2 gap-2.5">
          <Detail label="Estado" value={STATUS_LABEL[status]} />
          <Detail label="Valor actual" value={overall != null ? `${overall} / 100` : '—'} />
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-3">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  )
}

function RadarChart({ data }: { data: number[] }) {
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const radius = 100
  const n = data.length || 1

  const point = (i: number, scale: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(angle) * radius * scale, cy + Math.sin(angle) * radius * scale] as const
  }

  const gridRings = [0.25, 0.5, 0.75, 1]
  const shape = data.map((v, i) => point(i, Math.min(1, v / 100))).map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {gridRings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => point(i, r)).map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="hsl(var(--paper-line))"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--paper-line))" />
      })}
      <polygon
        points={shape}
        fill="hsl(var(--accent-h) / 0.25)"
        stroke="hsl(var(--accent-h))"
        strokeWidth={2}
      />
      {data.map((v, i) => {
        const [x, y] = point(i, Math.min(1, v / 100))
        return <circle key={i} cx={x} cy={y} r={3.5} fill="hsl(var(--accent-h))" />
      })}
    </svg>
  )
}

function MetricInput({
  metric, autoValue, value, onChange, disabled,
}: {
  metric: ScorecardMetric
  autoValue: number | null
  value: number | string
  onChange: (v: number | string) => void
  disabled: boolean
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{metric.label}</div>
          <div className="mt-0.5 text-[11px] text-ink-3">
            Peso {metric.weight}
            {metric.target_value != null && ` · meta ${metric.target_value}${metric.unit === 'percent' ? '%' : ''}`}
          </div>
        </div>
        {metric.type === 'auto' && autoValue != null && (
          <PaperBadge tone="info" className="tabular-nums">
            {autoValue}{metric.unit === 'percent' ? '%' : ''}
          </PaperBadge>
        )}
      </div>
      <div className="mt-2.5">
        {metric.type === 'likert' ? (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onChange(n)}
                className={cn(
                  'h-8 w-8 rounded-md border text-[13px] font-medium transition disabled:opacity-50',
                  Number(value) === n
                    ? 'border-primary-ink bg-primary text-primary-foreground'
                    : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        ) : metric.type === 'manual' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={disabled}
            className="w-32 rounded-md border border-paper-line bg-paper-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-primary disabled:opacity-60"
          />
        ) : metric.type === 'rubric' ? (
          <textarea
            rows={2}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full resize-y rounded-md border border-paper-line bg-paper-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-primary disabled:opacity-60"
          />
        ) : (
          <div className="text-[11px] italic text-ink-3">Se calcula automáticamente al enviar.</div>
        )}
      </div>
    </div>
  )
}
