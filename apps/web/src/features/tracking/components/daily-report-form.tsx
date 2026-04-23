'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useTodayReport, useUpsertDailyReport } from '../hooks/use-daily-report'
import type { Mood } from '@/types/api'

const schema = z.object({
  progress_summary: z.string().min(10, 'Cuéntanos un poco más (mín. 10 caracteres)').max(10_000),
  blockers_text: z.string().max(5000).optional().nullable(),
  plan_tomorrow: z.string().max(5000).optional().nullable(),
  mood: z.enum(['great', 'good', 'ok', 'stressed', 'blocked']).optional().nullable(),
  hours_worked: z.coerce.number().min(0).max(24).optional().nullable(),
})

type FormValues = z.infer<typeof schema>

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😀', label: 'Excelente' },
  { value: 'good', emoji: '🙂', label: 'Bien' },
  { value: 'ok', emoji: '😐', label: 'Ok' },
  { value: 'stressed', emoji: '😣', label: 'Estresado' },
  { value: 'blocked', emoji: '🛑', label: 'Bloqueado' },
]

export function DailyReportForm() {
  const { data: existing, isLoading } = useTodayReport()
  const upsert = useUpsertDailyReport()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      progress_summary: '',
      blockers_text: '',
      plan_tomorrow: '',
      mood: null,
      hours_worked: null,
    },
  })

  useEffect(() => {
    if (existing) {
      form.reset({
        progress_summary: existing.progress_summary ?? '',
        blockers_text: existing.blockers_text ?? '',
        plan_tomorrow: existing.plan_tomorrow ?? '',
        mood: existing.mood,
        hours_worked: existing.hours_worked,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  // Draft en localStorage (redundante con server si ya hay record, pero ayuda offline)
  useEffect(() => {
    const key = `draft:daily-report:${new Date().toISOString().slice(0, 10)}`
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (raw && !existing) {
      try {
        const { data } = JSON.parse(raw)
        form.reset(data)
      } catch {}
    }
    const sub = form.watch((value) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify({ data: value, timestamp: Date.now() }))
      }
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  const submit = async (submit: boolean) => {
    const values = form.getValues()
    await upsert.mutateAsync({
      ...values,
      blockers_text: values.blockers_text || null,
      plan_tomorrow: values.plan_tomorrow || null,
      mood: values.mood ?? null,
      hours_worked: values.hours_worked ?? null,
      submit,
    })
    if (submit) {
      localStorage.removeItem(`draft:daily-report:${new Date().toISOString().slice(0, 10)}`)
    }
  }

  const submitted = existing?.status === 'submitted' || existing?.status === 'reviewed'

  return (
    <form onSubmit={form.handleSubmit(() => submit(true))} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="progress_summary">¿Qué avanzaste hoy?</Label>
        <textarea
          id="progress_summary"
          rows={4}
          autoFocus
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Ej. Terminé el wireframe del hero y subí el mockup alta fi a Figma para revisión…"
          {...form.register('progress_summary')}
        />
        {form.formState.errors.progress_summary && (
          <p className="text-xs text-destructive">{form.formState.errors.progress_summary.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="blockers_text">¿Algo te bloqueó? <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <textarea
          id="blockers_text"
          rows={2}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Ej. No tengo acceso al sistema X; esperando feedback de Carlos."
          {...form.register('blockers_text')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan_tomorrow">¿Qué harás mañana? <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <textarea
          id="plan_tomorrow"
          rows={2}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Continuar con el prototipo y comenzar diseño del footer."
          {...form.register('plan_tomorrow')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>¿Cómo te sentiste?</Label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const selected = form.watch('mood') === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => form.setValue('mood', selected ? null : m.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                    selected ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                  aria-pressed={selected}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hours_worked">Horas trabajadas</Label>
          <Input
            id="hours_worked"
            type="number"
            step="0.25"
            min={0}
            max={24}
            placeholder="6.5"
            {...form.register('hours_worked', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {existing?.ai_summary_id && '✨ Con resumen IA generado'}
          {submitted && ' · Enviado'}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => submit(false)}
            disabled={upsert.isPending}
          >
            Guardar borrador
          </Button>
          <Button type="submit" disabled={upsert.isPending}>
            {submitted ? 'Actualizar' : 'Enviar reporte'}
          </Button>
        </div>
      </div>
    </form>
  )
}
