'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api-client'
import { createMentorSession } from '@/features/mentorship/api/mentorship'
import type { PaginatedResponse, Profile } from '@/types/api'

function defaultScheduledAt(): string {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  t.setHours(10, 0, 0, 0)
  return t.toISOString().slice(0, 16)
}

export function NewSessionDialog({
  open,
  onOpenChange,
  internUserId,
  internName,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  internUserId: string
  internName?: string | null
}) {
  const qc = useQueryClient()
  const [mentorId, setMentorId] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(30)
  const [location, setLocation] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt())

  const { data: mentorsData } = useQuery({
    queryKey: ['profiles-mentors-simple'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { can_mentor: true, per_page: 50 },
      }),
    enabled: open,
  })
  const mentors = mentorsData?.data ?? []

  const create = useMutation({
    mutationFn: createMentorSession,
    onSuccess: () => {
      toast.success('Sesión agendada')
      qc.invalidateQueries({ queryKey: ['mentor-sessions-upcoming', internUserId] })
      qc.invalidateQueries({ queryKey: ['mentor-sessions-history', internUserId] })
      setTopic('')
      setLocation('')
      setDuration(30)
      setScheduledAt(defaultScheduledAt())
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err?.errors?.scheduled_at?.[0] ?? err?.message ?? 'No se pudo crear la sesión'
      toast.error(msg)
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentorId || !topic.trim()) return
    create.mutate({
      mentor_user_id: mentorId,
      intern_user_id: internUserId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      topic: topic.trim(),
      location: location.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Nueva sesión 1:1</DialogTitle>
          {internName && (
            <p className="text-[12.5px] text-ink-3">
              Con <span className="font-medium text-ink">{internName}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Mentor</span>
            <select
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
              required
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            >
              <option value="">— selecciona mentor —</option>
              {mentors.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name ?? m.user?.email}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Tema</span>
            <input
              type="text"
              required
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej. Revisión del sprint 3"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Fecha y hora
              </span>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Duración (min)
              </span>
              <input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 30)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Lugar / enlace (opcional)
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sala 3 · Meet · Zoom…"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink-2 hover:bg-paper-bg-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || !mentorId || !topic.trim()}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {create.isPending ? 'Creando…' : 'Agendar sesión'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
