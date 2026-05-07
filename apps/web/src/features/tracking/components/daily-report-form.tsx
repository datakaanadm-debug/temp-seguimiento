'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '@/providers/auth-provider'
import { TonalAvatar } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { summarizeDailyReport } from '@/features/ai/api/ai'
import { useTodayReport, useUpsertDailyReport } from '../hooks/use-daily-report'
import { DailyReportAttachments } from './daily-report-attachments'
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
  { value: 'blocked', emoji: '😕', label: 'Bloqueado' },
  { value: 'stressed', emoji: '😐', label: 'Estresado' },
  { value: 'ok', emoji: '🙂', label: 'OK' },
  { value: 'good', emoji: '😊', label: 'Bien' },
  { value: 'great', emoji: '🤩', label: 'Excelente' },
]

export function DailyReportForm() {
  const { user } = useAuth()
  const { data: existing } = useTodayReport()
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

  const submit = async (shouldPublish: boolean) => {
    const values = form.getValues()
    if (shouldPublish) {
      const parse = schema.safeParse(values)
      if (!parse.success) {
        parse.error.errors.forEach((e) => toast.error(e.message))
        return
      }
    }
    try {
      await upsert.mutateAsync({
        ...values,
        blockers_text: values.blockers_text || null,
        plan_tomorrow: values.plan_tomorrow || null,
        mood: values.mood ?? null,
        hours_worked: values.hours_worked ?? null,
        submit: shouldPublish,
      })
      toast.success(shouldPublish ? 'Reporte enviado' : 'Borrador guardado')
      if (shouldPublish) {
        localStorage.removeItem(`draft:daily-report:${new Date().toISOString().slice(0, 10)}`)
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error guardando el reporte')
    }
  }

  const submitted = existing?.status === 'submitted' || existing?.status === 'reviewed'
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  const summarize = useMutation({
    mutationFn: async () => {
      // Guarda borrador primero si no existe
      let reportId = existing?.id
      if (!reportId) {
        const values = form.getValues()
        if (!values.progress_summary || values.progress_summary.trim().length < 10) {
          throw new Error('Escribe al menos los avances de hoy antes de resumir')
        }
        const saved = await upsert.mutateAsync({
          ...values,
          blockers_text: values.blockers_text || null,
          plan_tomorrow: values.plan_tomorrow || null,
          mood: values.mood ?? null,
          hours_worked: values.hours_worked ?? null,
          submit: false,
        })
        reportId = saved.data.id
      }
      return summarizeDailyReport(reportId)
    },
    onSuccess: (res) => {
      setAiSummary(res.data.content)
      toast.success('Resumen generado')
    },
    onError: (err: any) => toast.error(err?.message ?? 'No se pudo generar el resumen'),
  })
  const selectedMood = form.watch('mood')
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <form
      onSubmit={form.handleSubmit(() => submit(true))}
      className="rounded-lg border border-paper-line bg-paper-raised shadow-paper-1"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-paper-line-soft p-4">
        <TonalAvatar size={32} name={user?.name ?? user?.email} />
        <div className="flex-1">
          <div className="text-[13px] font-semibold capitalize text-ink">{today}</div>
          <div className="text-[11px] text-ink-3">
            {submitted ? 'Enviado · puedes actualizar' : 'Aún no guardado · se enviará a tu líder y mentor'}
          </div>
        </div>
        <div className="flex gap-1">
          {MOODS.map((m) => {
            const selected = selectedMood === m.value
            return (
              <button
                key={m.value}
                type="button"
                title={m.label}
                onClick={() => form.setValue('mood', selected ? null : m.value)}
                className={cn(
                  'flex h-[30px] w-[30px] items-center justify-center rounded-full border text-[15px] transition',
                  selected
                    ? 'border-primary bg-primary-soft'
                    : 'border-paper-line bg-paper-raised hover:border-paper-line-soft',
                )}
                aria-pressed={selected}
              >
                {m.emoji}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.4px] text-ink-3">
              Horas trabajadas
            </span>
            <input
              type="number"
              step="0.25"
              min={0}
              max={24}
              placeholder="7.5"
              className="rounded-md border border-paper-line bg-paper-surface px-2.5 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              {...form.register('hours_worked', { valueAsNumber: true })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.4px] text-ink-3">
              Estado de ánimo
            </span>
            <div className="rounded-md border border-paper-line bg-paper-surface px-2 py-1.5 text-[13px] text-ink-2">
              {selectedMood ? MOODS.find((m) => m.value === selectedMood)?.label : 'Sin seleccionar'}
            </div>
          </label>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="progress_summary" className="text-[12.5px] font-semibold text-ink">
              ¿Qué avanzaste hoy?
            </label>
            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-ink-3">
              <Icon.Sparkles size={10} /> IA puede autocompletar desde tus tareas
            </span>
          </div>
          <textarea
            id="progress_summary"
            rows={5}
            autoFocus
            placeholder={'• Terminé el primer prototipo del dashboard ejecutivo\n• Sincronicé con el líder para alinear copy…'}
            className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-3 text-[13px] leading-[1.55] text-ink outline-none focus:border-primary"
            {...form.register('progress_summary')}
          />
          {form.formState.errors.progress_summary && (
            <p className="mt-1 text-[11px] text-destructive">
              {form.formState.errors.progress_summary.message}
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label
              htmlFor="plan_tomorrow"
              className="mb-1.5 block text-[12.5px] font-semibold text-ink"
            >
              Próximos pasos
            </label>
            <textarea
              id="plan_tomorrow"
              rows={3}
              placeholder="• Continuar con el prototipo…"
              className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-2.5 text-[13px] leading-[1.5] text-ink outline-none focus:border-primary"
              {...form.register('plan_tomorrow')}
            />
          </div>
          <div>
            <label
              htmlFor="blockers_text"
              className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink"
            >
              Bloqueos
              <span className="rounded-full bg-paper-line-soft px-1.5 py-0.5 font-mono text-[9px] text-ink-3">
                opcional
              </span>
            </label>
            <textarea
              id="blockers_text"
              rows={3}
              placeholder="• No tengo acceso a…"
              className="w-full resize-y rounded-md border border-paper-line bg-paper-surface p-2.5 text-[13px] leading-[1.5] text-ink outline-none focus:border-primary"
              {...form.register('blockers_text')}
            />
          </div>
        </div>
      </div>

      {aiSummary && (
        <div className="mx-4 mb-3 rounded-md border border-paper-line-soft bg-paper-surface p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Icon.Sparkles size={12} className="text-primary" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Resumen generado por IA
            </span>
            <button
              type="button"
              onClick={() => setAiSummary(null)}
              className="ml-auto text-[11px] text-ink-3 hover:text-ink"
            >
              Cerrar
            </button>
          </div>
          <p className="whitespace-pre-wrap font-serif text-[13px] leading-[1.6] text-ink">
            {aiSummary}
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-2.5 border-t border-paper-line-soft p-4">
        <DailyReportAttachments reportId={existing?.id ?? null} />
        <button
          type="button"
          onClick={() => summarize.mutate()}
          disabled={summarize.isPending || upsert.isPending}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[12px] text-ink-3 hover:bg-paper-bg-2 hover:text-ink disabled:opacity-50"
        >
          <Icon.Sparkles size={12} />
          {summarize.isPending ? 'Resumiendo…' : 'Resumir con IA'}
        </button>
        <span className="ml-auto text-[11px] text-ink-3">
          {upsert.isPending ? 'Guardando…' : existing ? 'Guardado automático' : ''}
        </span>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={upsert.isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[5px] text-[12px] font-medium text-ink-2 hover:border-paper-line-soft disabled:opacity-50"
        >
          Guardar borrador
        </button>
        <button
          type="submit"
          disabled={upsert.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-[5px] text-[12px] font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
        >
          {submitted ? 'Actualizar' : 'Publicar entrada'}
        </button>
      </div>
    </form>
  )
}
