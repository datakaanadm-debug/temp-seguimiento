'use client'

import Link from 'next/link'
import { use } from 'react'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile } from '@/features/people/hooks/use-people'

export default function PracticantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: profile, isLoading } = useProfile(id)

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
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
          >
            <Icon.Settings size={13} />
            Editar
          </button>
        </div>

        {profile.bio && (
          <p className="mt-4 border-t border-paper-line-soft pt-4 font-serif text-[15px] leading-[1.65] text-ink-2">
            {profile.bio}
          </p>
        )}
      </div>

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
