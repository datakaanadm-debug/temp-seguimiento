'use client'

import Link from 'next/link'
import { use, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile } from '@/features/people/hooks/use-people'
import { MentorCard } from '@/features/people/components/mentor-card'
import { EditProfileDialog } from '@/features/people/components/edit-profile-dialog'
import { Can } from '@/components/shared/can'
import { markInternHired } from '@/features/people/api/people'
import { useAuth } from '@/providers/auth-provider'

export default function PracticantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile(id)
  const [editOpen, setEditOpen] = useState(false)
  const qc = useQueryClient()

  const hireMutation = useMutation({
    mutationFn: () => markInternHired(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['profile', id] })
      qc.invalidateQueries({ queryKey: ['profiles-list'] })
      if (res.meta?.was_first_time) {
        toast.success('Practicante marcado como contratado 🎉')
      } else {
        toast.info('Ya estaba marcado como contratado.')
      }
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo marcar como contratado'),
  })

  const handleMarkHired = () => {
    if (!profile) return
    const name = profile.user?.name ?? profile.user?.email ?? 'este practicante'
    if (!window.confirm(`¿Marcar a ${name} como contratado? Se otorgará la badge "Legacy intern" y quedará registrado como graduado del programa.`)) {
      return
    }
    hireMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1000px] px-7 py-5 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-[1000px] px-7 py-16 text-center text-[13px] text-ink-3">
        Perfil no encontrado.
      </div>
    )
  }

  const u = profile.user
  const intern = profile.intern_data
  const progress = intern?.progress_percent ?? 0

  return (
    <div className="mx-auto max-w-[1000px] px-7 py-5 pb-10">
      <Link
        href="/practicantes"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Practicantes
      </Link>

      {/* Hero */}
      <div className="mb-5 rounded-lg border border-paper-line bg-paper-raised p-5 shadow-paper-1">
        <div className="flex items-start gap-4">
          <TonalAvatar size={64} name={u?.name ?? u?.email} />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-ink-3">
              {profile.kind_label}
            </div>
            <h1 className="mt-0.5 font-serif text-[26px] leading-tight tracking-tight text-ink">
              {u?.name ?? u?.email}
            </h1>
            <div className="mt-1 text-[13px] text-ink-2">
              {profile.position_title ?? 'Practicante'}
              {intern?.semester && ` · ${intern.semester}º semestre`}
              {intern?.university && ` · ${intern.university}`}
            </div>
            {intern?.mandatory_hours && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 w-56 overflow-hidden rounded-full bg-paper-line-soft">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-ink-3">
                  {intern.hours_completed}/{intern.mandatory_hours}h · {Math.round(progress)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {profile.hired_at && (
              <PaperBadge tone="ok" className="!text-[10.5px]">
                Contratado · {new Date(profile.hired_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </PaperBadge>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {/*
                Atajo "Ver bitácoras" — el backend valida en
                DailyReportController::index() que el actor sea admin/HR, o
                mentor con asignación activa, o team_lead del intern. Si el
                role del visitante no aplica, la página destino muestra
                empty state honesto. Por eso lo dejamos visible para todo
                visitante distinto al propio dueño del perfil.
              */}
              {profile.kind === 'intern' && u?.id && u.id !== user?.id && (
                <Link
                  href={`/reportes-diarios?user_id=${u.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
                  title="Ver el historial de bitácoras enviadas por este practicante"
                >
                  <Icon.Log size={13} />
                  Ver bitácoras
                </Link>
              )}
              <Can capability="view_all_interns">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
                >
                  <Icon.Settings size={13} />
                  Editar
                </button>
              </Can>
              <Can capability="view_all_interns">
                {profile.kind === 'intern' && !profile.hired_at && (
                  <button
                    type="button"
                    onClick={handleMarkHired}
                    disabled={hireMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ink px-2.5 py-[7px] text-[12px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
                    title="Otorga la badge 'Legacy intern' y registra al practicante como graduado del programa"
                  >
                    <Icon.Check size={13} />
                    {hireMutation.isPending ? 'Marcando…' : 'Marcar como contratado'}
                  </button>
                )}
              </Can>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 border-t border-paper-line-soft pt-4 font-serif text-[15px] leading-[1.65] text-ink-2">
            {profile.bio}
          </p>
        )}
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} />

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {intern && (
          <PaperCard title="Datos académicos">
            <div className="space-y-3 text-[13px]">
              <Row label="Universidad" value={intern.university} />
              <Row label="Carrera" value={intern.career} />
              <Row label="Semestre" value={intern.semester?.toString()} />
              <Row label="Tutor académico" value={intern.university_advisor} />
              <Row
                label="Horas"
                value={
                  intern.mandatory_hours
                    ? `${intern.hours_completed}/${intern.mandatory_hours}`
                    : undefined
                }
              />
              {intern.gpa != null && <Row label="GPA" value={String(intern.gpa)} />}
            </div>
          </PaperCard>
        )}

        {profile.kind === 'intern' && u?.id && <MentorCard internUserId={u.id} />}

        <PaperCard title="Contacto y fechas">
          <div className="space-y-3 text-[13px]">
            <Row label="Email" value={u?.email} mono />
            <Row label="Teléfono" value={profile.phone ?? undefined} mono />
            <Row
              label="Inicio"
              value={profile.start_date ? new Date(profile.start_date).toLocaleDateString('es-MX') : undefined}
            />
            <Row
              label="Término"
              value={profile.end_date ? new Date(profile.end_date).toLocaleDateString('es-MX') : undefined}
            />
            <div className="flex justify-between gap-2 border-t border-paper-line-soft pt-2.5">
              <span className="text-ink-3">Estado</span>
              <PaperBadge tone="accent">{profile.kind_label}</PaperBadge>
            </div>
          </div>
        </PaperCard>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-3">{label}</span>
      <span className={`text-right font-medium text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}
