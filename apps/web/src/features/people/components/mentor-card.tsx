'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PaperCard, TonalAvatar } from '@/components/ui/primitives'
import { Icon } from '@/components/ui/icon'
import { apiClient } from '@/lib/api-client'
import { Can } from '@/components/shared/can'
import {
  assignMentor,
  listMentorAssignments,
  unassignMentor,
} from '@/features/people/api/people'
import type { PaginatedResponse, Profile } from '@/types/api'

export function MentorCard({ internUserId }: { internUserId: string }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['mentor-assignments-for-intern', internUserId],
    queryFn: () => listMentorAssignments({ intern_user_id: internUserId, status: 'active' }),
    enabled: !!internUserId,
  })
  const active = assignmentsData?.data?.[0] ?? null

  const remove = useMutation({
    mutationFn: (id: string) => unassignMentor(id),
    onSuccess: () => {
      toast.success('Mentor desvinculado')
      qc.invalidateQueries({ queryKey: ['mentor-assignments-for-intern', internUserId] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo desasignar'),
  })

  return (
    <PaperCard
      title="Mentor asignado"
      right={
        <Can capability="view_all_interns">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink"
          >
            <Icon.Plus size={11} />
            {active ? 'Cambiar' : 'Asignar'}
          </button>
        </Can>
      }
    >
      {isLoading ? (
        <div className="h-14 animate-pulse rounded bg-paper-line-soft" />
      ) : active ? (
        <div className="flex items-center gap-3">
          <TonalAvatar
            size={40}
            name={active.mentor?.name ?? active.mentor?.email}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">
              {active.mentor?.name ?? active.mentor?.email}
            </div>
            <div className="text-[11.5px] text-ink-3">
              Asignado{' '}
              {active.started_at
                ? new Date(active.started_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </div>
          </div>
          <Can capability="view_all_interns">
            <button
              type="button"
              onClick={() => remove.mutate(active.id)}
              disabled={remove.isPending}
              className="rounded p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-ink disabled:opacity-50"
              title="Desvincular mentor"
              aria-label="Desvincular mentor"
            >
              ×
            </button>
          </Can>
        </div>
      ) : (
        <div className="py-4 text-center text-[12.5px] text-ink-3">
          Sin mentor asignado todavía.
        </div>
      )}

      <AssignMentorDialog
        open={open}
        onOpenChange={setOpen}
        internUserId={internUserId}
        currentAssignmentId={active?.id ?? null}
      />
    </PaperCard>
  )
}

function AssignMentorDialog({
  open,
  onOpenChange,
  internUserId,
  currentAssignmentId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  internUserId: string
  currentAssignmentId: string | null
}) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string>('')
  const [notes, setNotes] = useState('')

  const { data: mentorsData } = useQuery({
    queryKey: ['profiles-can-mentor-picker'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { can_mentor: true, per_page: 50 },
      }),
    enabled: open,
  })
  const mentors = mentorsData?.data ?? []

  const run = useMutation({
    mutationFn: async () => {
      if (currentAssignmentId) {
        await unassignMentor(currentAssignmentId)
      }
      return assignMentor({
        intern_user_id: internUserId,
        mentor_user_id: picked,
        notes: notes.trim() || null,
      })
    },
    onSuccess: () => {
      toast.success('Mentor asignado')
      qc.invalidateQueries({ queryKey: ['mentor-assignments-for-intern', internUserId] })
      qc.invalidateQueries({ queryKey: ['onboarding-checklist'] })
      setPicked('')
      setNotes('')
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo asignar'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked) return
    run.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">
            {currentAssignmentId ? 'Cambiar mentor' : 'Asignar mentor'}
          </DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            El practicante recibirá notificación y verá al nuevo mentor en su dashboard.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Mentor</span>
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              required
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            >
              <option value="">— selecciona —</option>
              {mentors.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name ?? m.user?.email}
                  {m.kind_label ? ` — ${m.kind_label}` : ''}
                </option>
              ))}
            </select>
            {mentors.length === 0 && (
              <span className="text-[11px] text-ink-3">
                No hay mentores registrados. Invita uno primero desde{' '}
                <Link href="/practicantes" className="text-primary-ink hover:underline">
                  Practicantes
                </Link>
                .
              </span>
            )}
          </label>

          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Notas (opcional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto: por qué este match, áreas de enfoque, expectativas…"
              rows={3}
              className="resize-y rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
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
              disabled={run.isPending || !picked}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {run.isPending ? 'Guardando…' : currentAssignmentId ? 'Cambiar' : 'Asignar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
