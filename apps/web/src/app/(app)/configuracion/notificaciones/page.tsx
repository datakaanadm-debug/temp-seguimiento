'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { usePreferences, useUpsertPreferences } from '@/features/notifications/hooks/use-notifications'
import type { NotificationCategory, NotificationChannel, NotificationPreference } from '@/types/api'

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
    return existing?.enabled ?? true // default on
  }

  const save = async () => {
    const list = Array.from(prefs.values())
    // Asegurar todas las combinaciones estén representadas
    for (const cat of CATEGORIES) {
      for (const ch of CHANNELS) {
        const key = `${ch}:${cat.value}`
        if (!prefs.has(key)) {
          list.push({ channel: ch, category: cat.value, enabled: true, frequency: 'immediate', quiet_hours: null })
        }
      }
    }
    await upsert.mutateAsync(list)
    toast.success('Preferencias guardadas')
  }

  if (isLoading) {
    return <div className="container py-6 max-w-3xl"><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <div className="container py-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de notificaciones</CardTitle>
          <CardDescription>
            Elige qué recibir y por dónde. Las de la app (in-app) nunca se silencian.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Categoría</th>
                <th className="py-2 px-4 text-center">In-app</th>
                <th className="py-2 px-4 text-center">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CATEGORIES.map((c) => (
                <tr key={c.value}>
                  <td className="py-3 pr-4">{c.label}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={isEnabled(ch, c.value)}
                        onChange={() => toggle(ch, c.value)}
                        aria-label={`${c.label} via ${ch}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex justify-end">
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
