'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser } from '@/providers/auth-provider'
import { initialsFromName, cn } from '@/lib/utils'
import {
  useAcknowledgeEvaluation, useEvaluation, useSaveResponses, useSubmitEvaluation,
} from '../hooks/use-evaluations'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import type { EvaluationResponse, EvaluationStatus, ScorecardMetric } from '@/types/api'

export function EvaluationEditor({ id }: { id: string }) {
  const { data: evaluation, isLoading } = useEvaluation(id)
  const save = useSaveResponses(id)
  const submit = useSubmitEvaluation(id)
  const ack = useAcknowledgeEvaluation(id)
  const me = useCurrentUser()

  const [responses, setResponses] = useState<Record<string, EvaluationResponse['value_numeric'] | string>>({})
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

  if (isLoading) return <div className="container py-6"><Skeleton className="h-96" /></div>
  if (!evaluation) return <div className="container py-12 text-center">Evaluación no encontrada.</div>

  const isSubject = evaluation.subject_user_id === me.id
  const isEvaluator = evaluation.evaluator_user_id === me.id || !evaluation.evaluator_user_id
  const writable = ['SCHEDULED', 'IN_PROGRESS'].includes(evaluation.status) && isEvaluator && !isSubject
  const canAck = evaluation.status === 'SUBMITTED' && isSubject

  const handleSaveDraft = async () => {
    const payload: any = {}
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
    } catch (e) {
      toast.error('No se pudo generar el borrador IA.')
    } finally {
      setDraftingNarrative(false)
    }
  }

  return (
    <div className="container py-6 max-w-4xl">
      <Link href="/evaluaciones" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Evaluaciones
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={evaluation.subject?.avatar_url ?? undefined} />
          <AvatarFallback>{initialsFromName(evaluation.subject?.name ?? '?')}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{evaluation.subject?.name}</h1>
          <div className="text-sm text-muted-foreground">{evaluation.kind_label}</div>
          <Badge className="mt-1">{evaluation.status}</Badge>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluation.scorecard?.metrics?.map((m) => (
              <MetricInput
                key={m.id}
                metric={m}
                autoValue={evaluation.responses?.find((r) => r.metric_id === m.id)?.auto_value ?? null}
                value={responses[m.id] ?? ''}
                onChange={(v) => setResponses({ ...responses, [m.id]: v })}
                disabled={!writable}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Narrativa</CardTitle>
            {writable && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAiDraft}
                disabled={draftingNarrative}
              >
                <Sparkles className="h-4 w-4" />
                {draftingNarrative ? 'Generando…' : 'Borrador IA'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <textarea
              rows={8}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              disabled={!writable}
              placeholder="Observaciones generales, fortalezas, áreas de oportunidad, recomendaciones…"
            />
            <div className="mt-4 space-y-2">
              <Label htmlFor="overall_score">Score general (0-10)</Label>
              <Input
                id="overall_score"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={overallScore}
                onChange={(e) => setOverallScore(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={!writable}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          {writable && (
            <>
              <Button variant="outline" onClick={handleSaveDraft} disabled={save.isPending}>
                {save.isPending ? 'Guardando…' : 'Guardar borrador'}
              </Button>
              <Button
                onClick={async () => {
                  await handleSaveDraft()
                  await submit.mutateAsync()
                }}
                disabled={submit.isPending}
              >
                {submit.isPending ? 'Enviando…' : 'Enviar evaluación'}
              </Button>
            </>
          )}
          {canAck && (
            <Button onClick={() => ack.mutate()} disabled={ack.isPending}>
              {ack.isPending ? 'Confirmando…' : 'Confirmar recibida'}
            </Button>
          )}
        </div>
      </div>
    </div>
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
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{metric.label}</div>
          <div className="text-xs text-muted-foreground">
            Peso {metric.weight}{metric.target_value != null && ` · meta ${metric.target_value}${metric.unit === 'percent' ? '%' : ''}`}
          </div>
        </div>
        {metric.type === 'auto' && autoValue != null && (
          <Badge variant="outline" className="tabular-nums">
            {autoValue}{metric.unit === 'percent' ? '%' : ''}
          </Badge>
        )}
      </div>
      <div className="mt-3">
        {metric.type === 'likert' ? (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onChange(n)}
                className={cn(
                  'h-9 w-9 rounded-md border text-sm font-medium',
                  Number(value) === n
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted disabled:opacity-50',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        ) : metric.type === 'manual' ? (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={disabled}
          />
        ) : metric.type === 'rubric' ? (
          <textarea
            rows={3}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        ) : (
          <div className="text-xs text-muted-foreground italic">Se calcula automáticamente al enviar.</div>
        )}
      </div>
    </div>
  )
}
