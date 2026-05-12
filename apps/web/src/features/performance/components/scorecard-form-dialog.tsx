'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { ApiError } from '@/lib/api-client'
import {
  createScorecard, updateScorecard, type ScorecardMetricInput,
} from '../api/performance'
import type { MetricType, Scorecard } from '@/types/api'

const TYPE_OPTIONS: Array<{ value: MetricType; label: string }> = [
  { value: 'manual', label: 'Numérico libre' },
  { value: 'likert', label: 'Escala 1-5 (likert)' },
  { value: 'rubric', label: 'Texto / rúbrica' },
  { value: 'auto', label: 'Auto (computado al enviar)' },
]

const APPLICABLE_OPTIONS = [
  { value: 'intern', label: 'Practicantes' },
  { value: 'mentor', label: 'Mentores' },
  { value: 'staff', label: 'Staff (líderes / HR)' },
] as const

/**
 * Genera una `key` válida (regex /^[a-z][a-z0-9_]*$/) a partir del label.
 * Garantiza que key sea único dentro del conjunto que se está editando.
 */
function autoKey(label: string, existing: string[]): string {
  let base = label
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'k$1')
  if (!base) base = 'metric'
  if (!existing.includes(base)) return base
  let i = 2
  while (existing.includes(`${base}_${i}`)) i++
  return `${base}_${i}`
}

interface MetricRow extends ScorecardMetricInput {
  /** id efímero para keys de React, no se manda al backend */
  _uid: string
}

const newRow = (label = '', existing: string[] = []): MetricRow => ({
  _uid: crypto.randomUUID(),
  key: label ? autoKey(label, existing) : '',
  label,
  type: 'manual',
  weight: 1,
  target_value: null,
  unit: null,
  source: null,
  config: {},
  position: existing.length,
})

export function ScorecardFormDialog({
  open,
  onOpenChange,
  scorecard,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Si se pasa, edita; si no, crea. */
  scorecard?: Scorecard | null
}) {
  const qc = useQueryClient()
  const isEdit = !!scorecard
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [applicableTo, setApplicableTo] = useState<'intern' | 'mentor' | 'staff'>('intern')
  const [isActive, setIsActive] = useState(true)
  const [metrics, setMetrics] = useState<MetricRow[]>([newRow()])

  useEffect(() => {
    if (!open) return
    if (scorecard) {
      setName(scorecard.name)
      setDescription(scorecard.description ?? '')
      setApplicableTo(scorecard.applicable_to)
      setIsActive(scorecard.is_active)
      setMetrics(
        (scorecard.metrics ?? []).map((m, i) => ({
          _uid: crypto.randomUUID(),
          key: m.key,
          label: m.label,
          type: m.type,
          source: m.source,
          target_value: m.target_value,
          unit: m.unit,
          weight: m.weight,
          config: m.config as Record<string, unknown>,
          position: m.position ?? i,
        })),
      )
    } else {
      setName('')
      setDescription('')
      setApplicableTo('intern')
      setIsActive(true)
      setMetrics([newRow()])
    }
  }, [open, scorecard?.id])

  const mutation = useMutation({
    mutationFn: async () => {
      const payloadMetrics = metrics
        .filter((m) => m.label.trim() !== '')
        .map(({ _uid, ...rest }, i) => ({ ...rest, position: i }))
      if (isEdit && scorecard) {
        return updateScorecard(scorecard.id, {
          name, description: description || null, is_active: isActive,
          metrics: payloadMetrics,
        })
      }
      return createScorecard({
        name,
        description: description || null,
        applicable_to: applicableTo,
        metrics: payloadMetrics,
      })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Scorecard actualizada' : 'Scorecard creada')
      qc.invalidateQueries({ queryKey: ['scorecards'] })
      qc.invalidateQueries({ queryKey: ['scorecards-active'] })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        const firstKey = Object.keys(err.errors)[0]
        toast.error(firstKey ? err.errors[firstKey]![0] : err.message)
        return
      }
      toast.error('No se pudo guardar la scorecard')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || metrics.filter((m) => m.label.trim()).length === 0) {
      toast.error('Necesita un nombre y al menos una métrica con etiqueta')
      return
    }
    mutation.mutate()
  }

  const updateMetric = (uid: string, patch: Partial<MetricRow>) => {
    setMetrics((rows) =>
      rows.map((r) => (r._uid === uid ? { ...r, ...patch } : r)),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar “${scorecard?.name}”` : 'Nueva scorecard'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* Header fields */}
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">Nombre</Label>
              <Input
                id="sc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Scorecard de practicante — 90 días"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-applicable">Aplica a</Label>
              <select
                id="sc-applicable"
                value={applicableTo}
                onChange={(e) => setApplicableTo(e.target.value as any)}
                disabled={isEdit /* applicable_to no es editable post-create */}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                {APPLICABLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sc-desc">Descripción <span className="font-mono text-[10px] text-ink-3">opcional</span></Label>
            <textarea
              id="sc-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuándo usar esta scorecard, qué criterios prima…"
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-[13px] text-ink-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Scorecard activa (visible al programar nuevas evaluaciones)
            </label>
          )}

          {/* Metrics builder */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Métricas <span className="font-mono text-[10px] text-ink-3">{metrics.filter((m) => m.label.trim()).length}</span></Label>
              <button
                type="button"
                onClick={() => setMetrics((rows) => [...rows, newRow('', rows.map((r) => r.key))])}
                className="inline-flex items-center gap-1 rounded-md border border-paper-line bg-paper-raised px-2 py-1 text-[11px] hover:border-paper-line-soft"
              >
                <Icon.Plus size={11} /> Añadir métrica
              </button>
            </div>

            <div className="rounded-md border border-paper-line">
              <div
                className="grid items-center gap-2 border-b border-paper-line-soft bg-paper-bg-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.4px] text-ink-3"
                style={{ gridTemplateColumns: '1fr 160px 80px 80px 90px 28px' }}
              >
                <span>Etiqueta</span>
                <span>Tipo</span>
                <span>Peso</span>
                <span>Meta</span>
                <span>Unidad</span>
                <span></span>
              </div>
              {metrics.map((m) => (
                <div
                  key={m._uid}
                  className="grid items-center gap-2 border-b border-paper-line-soft px-3 py-2 last:border-b-0"
                  style={{ gridTemplateColumns: '1fr 160px 80px 80px 90px 28px' }}
                >
                  <Input
                    value={m.label}
                    onChange={(e) => {
                      const label = e.target.value
                      const others = metrics.filter((r) => r._uid !== m._uid).map((r) => r.key)
                      updateMetric(m._uid, {
                        label,
                        // Sólo auto-derivar key si el usuario aún no la editó manualmente
                        // (heurística: si la key actual matchea la versión auto-derivada
                        // del label anterior, asumimos que sigue siendo auto).
                        key: m.key === '' || m.key === autoKey(m.label, others)
                          ? autoKey(label, others)
                          : m.key,
                      })
                    }}
                    placeholder="Ej. Comunicación"
                    className="h-8 text-[13px]"
                  />
                  <select
                    value={m.type}
                    onChange={(e) => updateMetric(m._uid, { type: e.target.value as MetricType })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[12px]"
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={10}
                    value={m.weight ?? 1}
                    onChange={(e) => updateMetric(m._uid, { weight: Number(e.target.value) || 1 })}
                    className="h-8 text-[13px]"
                  />
                  <Input
                    type="number"
                    step={0.1}
                    value={m.target_value ?? ''}
                    onChange={(e) =>
                      updateMetric(m._uid, {
                        target_value: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="—"
                    className="h-8 text-[13px]"
                  />
                  <Input
                    value={m.unit ?? ''}
                    onChange={(e) => updateMetric(m._uid, { unit: e.target.value || null })}
                    placeholder="%, h…"
                    className="h-8 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => setMetrics((rows) => rows.filter((r) => r._uid !== m._uid))}
                    disabled={metrics.length === 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-bg-2 disabled:opacity-30"
                    aria-label="Eliminar métrica"
                  >
                    <Icon.X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-ink-3">
              Tipo · <b>likert</b> = botones 1-5 · <b>manual</b> = número libre ·
              <b> rubric</b> = texto · <b>auto</b> = se calcula (advanced).
            </p>
          </div>

          <DialogFooter className="!flex-row !justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear scorecard'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
