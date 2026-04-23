'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useQueryState, parseAsString } from 'nuqs'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import {
  listMentorSessions,
  listMentorNotes,
  getGrowthPath,
  createMentorNote,
  toggleGrowthGoal,
  type MentorSession,
} from '@/features/mentorship/api/mentorship'
import type { PaginatedResponse, Profile } from '@/types/api'

export default function MentoriaPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Practicante actual (para admin/hr/mentor): elegir del dropdown
  // Para intern: su propio user.id
  const [internUserId, setInternUserId] = useQueryState('intern_id', parseAsString)

  const isIntern = user?.role === 'intern'
  const effectiveInternId = isIntern ? user?.id ?? null : internUserId

  // Lista de practicantes (para picker)
  const { data: internsData } = useQuery({
    queryKey: ['profiles-interns-simple'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { kind: 'intern', per_page: 50 },
      }),
    enabled: !isIntern,
  })
  const interns = internsData?.data ?? []

  // Si admin aún no eligió, pre-selecciona el primero
  const resolvedInternId = effectiveInternId ?? interns[0]?.user_id ?? null

  // Sesiones con ese practicante
  const { data: upcomingData } = useQuery({
    queryKey: ['mentor-sessions-upcoming', resolvedInternId],
    queryFn: () =>
      listMentorSessions({
        intern_user_id: resolvedInternId ?? undefined,
        upcoming_only: true,
        per_page: 1,
      }),
    enabled: !!resolvedInternId,
  })
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['mentor-sessions-history', resolvedInternId],
    queryFn: () =>
      listMentorSessions({
        intern_user_id: resolvedInternId ?? undefined,
        status: 'completed' as const,
        per_page: 10,
      }),
    enabled: !!resolvedInternId,
  })

  const nextSession = upcomingData?.data?.[0] ?? null
  const history = historyData?.data ?? []

  // Growth
  const { data: growthData } = useQuery({
    queryKey: ['growth-path', resolvedInternId],
    queryFn: () => getGrowthPath(resolvedInternId!),
    enabled: !!resolvedInternId,
  })
  const skills = growthData?.data?.skills ?? []
  const goals = growthData?.data?.goals ?? []

  // Notas privadas del usuario actual sobre este practicante
  const { data: notesData } = useQuery({
    queryKey: ['mentor-notes', resolvedInternId],
    queryFn: () =>
      listMentorNotes({
        intern_user_id: resolvedInternId ?? undefined,
        per_page: 10,
      }),
    enabled: !!resolvedInternId,
  })
  const notes = notesData?.data ?? []
  const privateNote = notes.find((n) => n.visibility === 'private' && n.author_id === user?.id)

  const [draftNote, setDraftNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const currentNoteBody = privateNote?.body ?? draftNote

  const toggleGoal = useMutation({
    mutationFn: (goalId: string) => toggleGrowthGoal(goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth-path', resolvedInternId] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  })

  const saveNote = async () => {
    if (!resolvedInternId) return
    const body = draftNote || privateNote?.body || ''
    if (!body.trim()) return
    setIsSavingNote(true)
    try {
      if (privateNote) {
        await apiClient.put(`/api/v1/mentor-notes/${privateNote.id}`, {
          body,
          visibility: 'private',
        })
      } else {
        await createMentorNote({
          intern_user_id: resolvedInternId,
          visibility: 'private',
          body,
        })
      }
      await qc.invalidateQueries({ queryKey: ['mentor-notes', resolvedInternId] })
      setDraftNote('')
      toast.success('Nota guardada')
    } catch (e: any) {
      toast.error(e?.message ?? 'Error guardando nota')
    } finally {
      setIsSavingNote(false)
    }
  }

  if (!resolvedInternId) {
    return (
      <div className="mx-auto max-w-[1200px] px-7 py-5">
        <SectionTitle
          kicker="Mentoría"
          title="Selecciona un practicante"
          sub="Escoge con quién quieres trabajar para ver sus sesiones y crecimiento."
        />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const selectedIntern = interns.find((p) => p.user_id === resolvedInternId)
  const internName = selectedIntern?.user?.name ?? selectedIntern?.user?.email ?? (isIntern ? user?.name : '—')

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Mentoría"
        title={`Sesiones 1:1 con ${nextSession?.mentor?.name?.split(' ')[0] ?? '—'}`}
        sub={
          nextSession
            ? `Próxima sesión ${formatRelative(nextSession.scheduled_at)} · ${nextSession.duration_minutes} min`
            : 'Sin sesiones programadas. Agenda la primera.'
        }
        right={
          <>
            {!isIntern && (
              <select
                value={resolvedInternId}
                onChange={(e) => setInternUserId(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 focus:border-primary"
              >
                {interns.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.user?.name ?? p.user?.email}
                  </option>
                ))}
              </select>
            )}
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Cal size={13} />
              Reprogramar
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
              <Icon.Plus size={13} />
              Nueva sesión
            </button>
          </>
        }
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* LEFT */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Next session hero */}
          {nextSession ? (
            <NextSessionCard session={nextSession} />
          ) : (
            <PaperCard>
              <div className="py-6 text-center text-[13px] text-ink-3">
                Aún no hay sesiones programadas para {internName}.
              </div>
            </PaperCard>
          )}

          {/* History */}
          <PaperCard title="Historial de sesiones" right={history.length > 3 && <Link href="#" className="text-[12px] text-ink-3 hover:text-ink">Ver todas →</Link>}>
            {historyLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : history.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-3">
                Sin sesiones completadas aún.
              </p>
            ) : (
              <div className="-my-2">
                {history.slice(0, 5).map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-start gap-3 py-2.5',
                      i > 0 && 'border-t border-paper-line-soft',
                    )}
                  >
                    <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] text-ink-3">
                          {new Date(s.scheduled_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="truncate text-[13px] font-medium text-ink">
                          {s.topic}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-1.5">
                        {s.tags.map((t) => (
                          <PaperBadge key={t} tone="tag1" className="!text-[10px]">
                            #{t}
                          </PaperBadge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PaperCard>

          {/* Private notes */}
          <PaperCard
            title="Notas privadas"
            right={
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
                <Icon.Sparkles size={11} /> solo tú las ves
              </span>
            }
          >
            <textarea
              value={draftNote || currentNoteBody}
              onChange={(e) => setDraftNote(e.target.value)}
              rows={5}
              placeholder="Anota reflexiones, aprendizajes o preguntas para tu próxima sesión…"
              className="w-full resize-y rounded-md border border-paper-line-soft bg-paper-surface p-3 font-serif text-[15px] leading-[1.65] text-ink outline-none focus:border-primary"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              {privateNote && (
                <span className="text-[11px] text-ink-3">
                  Última edición: {new Date(privateNote.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              <button
                type="button"
                onClick={saveNote}
                disabled={isSavingNote || !(draftNote || currentNoteBody).trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[5px] text-[12px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
              >
                {isSavingNote ? 'Guardando…' : privateNote ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </PaperCard>
        </div>

        {/* RIGHT */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <PaperCard title="Growth path">
            {skills.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-ink-3">
                Sin skills configuradas.
              </p>
            ) : (
              <div className="space-y-3">
                {skills.map((g) => (
                  <div key={g.id}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="text-ink">{g.skill}</span>
                      <span className="font-mono text-ink-3">{g.progress_percent}%</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-paper-line-soft">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${g.progress_percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PaperCard>

          <PaperCard
            title="Objetivos Q2"
            right={
              <span className="font-mono text-[11px] text-ink-3">
                {goals.filter((g) => g.done).length}/{goals.length}
              </span>
            }
          >
            {goals.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-ink-3">
                Sin objetivos definidos.
              </p>
            ) : (
              <div className="-my-1">
                {goals.map((g, i) => (
                  <label
                    key={g.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 py-2 text-[12.5px]',
                      i > 0 && 'border-t border-paper-line-soft',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={g.done}
                      disabled={toggleGoal.isPending}
                      onChange={() => toggleGoal.mutate(g.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-primary"
                    />
                    <span className={g.done ? 'text-ink-3 line-through' : 'text-ink'}>
                      {g.text}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </PaperCard>

          <PaperCard title="Practicante">
            <div className="flex items-center gap-2.5">
              <TonalAvatar size={32} name={internName} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink">{internName}</div>
                {selectedIntern && (
                  <Link
                    href={`/practicantes/${selectedIntern.id}`}
                    className="text-[11px] text-ink-3 hover:text-ink"
                  >
                    Ver perfil →
                  </Link>
                )}
              </div>
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  )
}

function NextSessionCard({ session }: { session: MentorSession }) {
  const date = new Date(session.scheduled_at)
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 3).toUpperCase()
  const day = date.getDate()
  const hour = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const endHour = new Date(date.getTime() + session.duration_minutes * 60_000).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className="flex gap-[18px] rounded-lg border border-paper-line p-5"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--paper-surface)), hsl(var(--paper-bg)))',
      }}
    >
      <div className="shrink-0 border-r border-paper-line pr-[18px] text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
          {weekday}
        </div>
        <div className="my-0.5 font-serif text-[38px] leading-none">{day}</div>
        <div className="font-mono text-[11px] text-ink-3">
          {hour} – {endHour}
        </div>
      </div>
      <div className="flex-1">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.5px] text-ink-3">
          PRÓXIMA SESIÓN
        </div>
        <div className="mb-2 font-serif text-[22px] leading-tight tracking-tight text-ink">
          {session.topic}
        </div>
        <div className="mb-3.5 flex items-center gap-2.5 text-[13px]">
          {session.mentor && <TonalAvatar size={24} name={session.mentor.name ?? session.mentor.email} />}
          <span>{session.mentor?.name ?? '—'}</span>
          {session.location && <span className="text-[12px] text-ink-3">· {session.location}</span>}
        </div>
        {session.agenda.length > 0 && (
          <div className="rounded-md border border-paper-line-soft bg-paper-surface p-3 text-[12.5px]">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
              <Icon.Sparkles size={11} />
              Agenda sugerida
            </div>
            <ol className="m-0 space-y-0.5 pl-5 leading-[1.6] text-ink-2">
              {session.agenda.map((a, i) => (
                <li key={i} className="list-decimal">
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const target = new Date(iso)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (diffDays === 0) return `hoy ${target.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `mañana ${target.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays > 1 && diffDays < 7) return `en ${diffDays} días`
  return target.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
