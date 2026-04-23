'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  usePreferences, useUpsertPreferences,
} from '@/features/notifications/hooks/use-notifications'
import type {
  NotificationCategory, NotificationChannel, NotificationPreference,
} from '@/types/api'

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: 'task_assigned', label: 'Te asignaron una tarea' },
  { value: 'task_mentioned', label: 'Te mencionaron en una tarea' },
  { value: 'comment_mentioned', label: 'Te mencionaron en un comentario' },
  { value: 'task_due_soon', label: 'Tarea próxima a vencer' },
  { value: 'task_overdue', label: 'Tarea vencida' },
  { value: 'blocker_raised', label: 'Se reportó un bloqueo' },
  { value: 'evaluation_scheduled', label: 'Evaluación programada' },
  { value: 'evaluation_submitted', label: 'Evaluación enviada' },
  { value: 'daily_digest', label: 'Resumen diario' },
  { value: 'weekly_digest', label: 'Resumen semanal' },
]

const CHANNELS: NotificationChannel[] = ['in_app', 'email']

export default function PreferenciasNotificacionesPage() {
  const { data, isLoading } = usePreferences()
  const upsert = useUpsertPreferences()
  const [prefs, setPrefs] = useState<Map<string, NotificationPreference>>(new Map())

  useEffect(() => {
    if (!data) return
    const map = new Map<string, NotificationPreference>()
    for (const p of data) map.set(`${p.channel}:${p.category}`, p)
    setPrefs(map)
  }, [data])

  const toggle = (channel: NotificationChannel, category: NotificationCategory) => {
    const key = `${channel}:${category}`
    const existing = prefs.get(key)
    const next: NotificationPreference = existing
      ? { ...existing, enabled: !existing.enabled }
      : { channel, category, enabled: true, frequency: 'immediate', quiet_hours: null }
    const copy = new Map(prefs)
    copy.set(key, next)
    setPrefs(copy)
  }

  const isEnabled = (channel: NotificationChannel, category: NotificationCategory) => {
    const existing = prefs.get(`${channel}:${category}`)
    return existing?.enabled ?? true
  }

  const save = async () => {
    const list = Array.from(prefs.values())
    for (const cat of CATEGORIES) {
      for (const ch of CHANNELS) {
        const key = `${ch}:${cat.value}`
        if (!prefs.has(key)) {
          list.push({
            channel: ch,
            category: cat.value,
            enabled: true,
            frequency: 'immediate',
            quiet_hours: null,
          })
        }
      }
    }
    await upsert.mutateAsync(list)
    toast.success('Preferencias guardadas')
  }

  if (isLoading) {
    return (
      <div>
        <SectionTitle kicker="Personal" title="Preferencias" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div>
      <SectionTitle
        kicker="Personal"
        title="Preferencias de notificaciones"
        sub="Elige qué recibir y por dónde. Las in-app siempre se muestran en la bandeja."
        right={
          <button
            type="button"
            onClick={save}
            disabled={upsert.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
          >
            {upsert.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        }
      />

      <PaperCard noPad>
        <div
          className="grid border-b border-paper-line px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3"
          style={{ gridTemplateColumns: '1fr 90px 90px' }}
        >
          <span>Categoría</span>
          <span className="text-center">In-app</span>
          <span className="text-center">Email</span>
        </div>
        {CATEGORIES.map((c, i) => (
          <div
            key={c.value}
            className={cn(
              'grid items-center px-4 py-3 text-[13px]',
              i < CATEGORIES.length - 1 && 'border-b border-paper-line-soft',
            )}
            style={{ gridTemplateColumns: '1fr 90px 90px' }}
          >
            <span className="flex items-center gap-2 text-ink">
              <Icon.Bell size={12} className="text-ink-3" />
              {c.label}
            </span>
            {CHANNELS.map((ch) => (
              <span key={ch} className="text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-primary"
                  checked={isEnabled(ch, c.value)}
                  onChange={() => toggle(ch, c.value)}
                  aria-label={`${c.label} via ${ch}`}
                />
              </span>
            ))}
          </div>
        ))}
      </PaperCard>
    </div>
  )
}
