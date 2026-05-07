'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { checkInKeyResult, type KeyResult } from '@/features/okrs/api/okrs'

export function CheckInDialog({
  open,
  onOpenChange,
  kr,
  objectiveLabel,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  kr: KeyResult | null
  objectiveLabel?: string
  onSaved?: () => void
}) {
  const qc = useQueryClient()
  const [progress, setProgress] = useState(kr?.progress_percent ?? 0)
  const [confidence, setConfidence] = useState(kr?.confidence ?? 5)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (kr) {
      setProgress(kr.progress_percent)
      setConfidence(kr.confidence)
      setNote('')
    }
  }, [kr?.id])

  const save = useMutation({
    mutationFn: () =>
      checkInKeyResult(kr!.id, {
        new_progress: progress,
        new_confidence: confidence,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Check-in registrado')
      qc.invalidateQueries({ queryKey: ['okrs-all'] })
      onSaved?.()
      onOpenChange(false)
    },
    onError: (e: any) => {
      const msg = e?.errors ? Object.values(e.errors).flat()[0] : (e?.message ?? 'Error')
      toast.error(String(msg))
    },
  })

  if (!kr) return null

  const delta = progress - kr.progress_percent
  const confDelta = confidence - kr.confidence

  // Color del trail según confidence
  const confColor =
    confidence >= 7 ? 'hsl(var(--ok))' : confidence >= 4 ? 'hsl(var(--warn))' : 'hsl(var(--danger))'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Check-in del KR</DialogTitle>
          {objectiveLabel && (
            <p className="text-[12px] text-ink-3">
              Objetivo: <span className="text-ink-2">{objectiveLabel}</span>
            </p>
          )}
          <p className="mt-1 text-[13px] text-ink-2">{kr.text}</p>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
          className="grid gap-4"
        >
          {/* Progress slider */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Progreso
              </span>
              <span className="flex items-center gap-2">
                <span className="font-serif text-[24px] leading-none text-ink">{progress}%</span>
                {delta !== 0 && (
                  <span
                    className={`font-mono text-[11px] ${
                      delta > 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-primary"
              style={{
                background: `linear-gradient(to right, ${confColor} 0%, ${confColor} ${progress}%, hsl(var(--paper-line-soft)) ${progress}%, hsl(var(--paper-line-soft)) 100%)`,
                height: 6,
                borderRadius: 3,
                appearance: 'none',
                outline: 'none',
              }}
            />
            <div className="flex justify-between text-[10px] text-ink-3">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Confidence slider */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Confianza (0–10)
              </span>
              <span className="flex items-center gap-2">
                <span className="font-serif text-[20px] leading-none text-ink">{confidence}</span>
                {confDelta !== 0 && (
                  <span
                    className={`font-mono text-[11px] ${
                      confDelta > 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {confDelta > 0 ? '+' : ''}{confDelta}
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                const active = n <= confidence
                const tone = n <= 3 ? '#a8432e' : n <= 6 ? '#b8892a' : '#5a7a3f'
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConfidence(n)}
                    className="flex-1 rounded transition"
                    style={{
                      height: 24,
                      background: active ? tone : 'hsl(var(--paper-line-soft))',
                      opacity: active ? 1 : 0.5,
                    }}
                    title={`${n}/10`}
                  >
                    <span className="sr-only">{n}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-ink-3">
              <span>en riesgo</span>
              <span>incierto</span>
              <span>en track</span>
            </div>
          </div>

          {/* Nota opcional */}
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Nota del check-in (opcional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Contexto: qué moví, qué sigue, bloqueos…"
              className="resize-y rounded-md border border-paper-line bg-paper-surface p-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10.5px] text-ink-3">Atajos:</span>
            {[
              { label: '+10%', d: 10 },
              { label: '+25%', d: 25 },
              { label: 'Completado (100%)', set: 100 },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  if ('set' in q && q.set != null) setProgress(q.set)
                  else if ('d' in q) setProgress(Math.min(100, progress + q.d))
                }}
                className="rounded-full border border-paper-line bg-paper-surface px-2 py-[2px] text-[10.5px] text-ink-2 hover:border-paper-line-soft hover:text-ink"
              >
                {q.label}
              </button>
            ))}
          </div>

          <DialogFooter className="mt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink-2 hover:bg-paper-bg-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              <Icon.Check size={13} />
              {save.isPending ? 'Guardando…' : 'Registrar check-in'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
