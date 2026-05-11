'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useMyProfile } from '@/features/people/hooks/use-people'
import {
  listMentorAssignments,
  updateProfile,
  upsertInternData,
} from '@/features/people/api/people'
import { TourDialog } from '@/features/onboarding/components/tour-dialog'

const STEPS = [
  { id: 'profile', label: 'Perfil', icon: 'People' as const },
  { id: 'docs', label: 'Documentos', icon: 'Onboard' as const },
  { id: 'tour', label: 'Tour', icon: 'Sparkles' as const },
  { id: 'mentor', label: 'Tu mentor', icon: 'Mentor' as const },
]

/**
 * Onboarding del intern. Antes este wizard era 100% local-state: 4 pasos
 * que nada persistía y "Ir a mi día" descartaba todo lo escrito.
 *
 * Hoy:
 *  - Step 1 (Perfil): persiste university/career/semester en intern_data
 *    via PUT /profiles/{id}/intern-data antes de avanzar.
 *  - Step 2 (Docs): los checks NDA + Reglamento se guardan en
 *    profile.social_links.docs_signed como flag (no hay tabla dedicada y
 *    es lo más pragmático para tracking; para uploads reales el user va
 *    a /onboarding después). Los checks se hidratan al recargar.
 *  - Step 3 (Tour): TourDialog ya cableado.
 *  - Step 4 (Mentor): carga el mentor real desde mentor_assignments del
 *    intern. Si no hay mentor asignado todavía, mensaje honesto.
 *  - Finalizar: POST /auth/me/tour-complete + redirect a /mi-dia.
 */
export default function BienvenidaPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, tenant, setUser } = useAuth()
  const { data: profile, isLoading: profileLoading } = useMyProfile()

  const [step, setStep] = useState(0)
  const [profileForm, setProfileForm] = useState({
    university: '',
    career: '',
    semester: '',
  })
  const [docsSigned, setDocsSigned] = useState({ nda: false, regulations: false })
  const [tourDone, setTourDone] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  // Hidratar form desde profile real cuando carga
  useEffect(() => {
    if (!profile) return
    const i = profile.intern_data
    setProfileForm({
      university: i?.university ?? '',
      career: i?.career ?? '',
      semester: i?.semester != null ? String(i.semester) : '',
    })
    // Re-hidratar docs flags si ya estaban guardados (persist across reloads).
    const links = (profile.social_links as Record<string, unknown> | undefined) ?? {}
    const docs = (links.docs_signed as Record<string, boolean> | undefined) ?? {}
    setDocsSigned({
      nda: docs.nda === true,
      regulations: docs.regulations === true,
    })
    // Si el user ya completó el tour previamente, marcar tourDone visualmente.
    if (user?.tour_completed_at) setTourDone(true)
  }, [profile?.id, user?.tour_completed_at])

  // Mentor real (query activa solo en step 4 para no pegarle al endpoint
  // si el user no llega a esa pantalla).
  const { data: assignmentsData } = useQuery({
    queryKey: ['my-mentor-assignments-active', user?.id],
    queryFn: () => listMentorAssignments({ intern_user_id: user!.id, status: 'active' }),
    enabled: !!user?.id && step >= 3,
  })
  const mentor = assignmentsData?.data?.[0]?.mentor ?? null

  // ── Mutations ────────────────────────────────────────────────────────
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Perfil no disponible')
      const sem = profileForm.semester ? Number(profileForm.semester) : null
      // intern_data upsert (university/career/semester).
      await upsertInternData(profile.id, {
        university: profileForm.university.trim() || null,
        career: profileForm.career.trim() || null,
        semester: sem,
      })
      return true
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar tu perfil'),
  })

  const saveDocs = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Perfil no disponible')
      const existingLinks = (profile.social_links as Record<string, unknown> | undefined) ?? {}
      // Guarda en profile.social_links.docs_signed — no es la home ideal
      // (no hay tabla `intern_consents` dedicada) pero el campo es jsonb y
      // ya está disponible. Si en el futuro se necesita auditoría legal,
      // migrar a `intern_consents` con timestamp + ip + version del doc.
      await updateProfile(profile.id, {
        social_links: {
          ...existingLinks,
          docs_signed: docsSigned,
        },
      } as any)
      return true
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar las firmas'),
  })

  const completeTour = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ user: typeof user }>('/api/v1/auth/me/tour-complete')
      if (res.user) setUser(res.user as any)
      return res
    },
  })

  // ── Validación por step ──────────────────────────────────────────────
  const isStep0Valid =
    profileForm.university.trim().length > 1 &&
    profileForm.career.trim().length > 1
  const isStep1Valid = docsSigned.nda && docsSigned.regulations

  const pct = ((step + 1) / STEPS.length) * 100
  const isLast = step === STEPS.length - 1

  const goNext = async () => {
    // Persiste antes de avanzar. Si la mutation falla, no avanzar.
    try {
      if (step === 0) {
        await saveProfile.mutateAsync()
        await qc.invalidateQueries({ queryKey: ['my-profile'] })
      }
      if (step === 1) {
        await saveDocs.mutateAsync()
        await qc.invalidateQueries({ queryKey: ['my-profile'] })
      }
    } catch {
      return // ya mostró toast
    }

    if (isLast) {
      setFinishing(true)
      try {
        await completeTour.mutateAsync()
        toast.success('¡Bienvenido a Senda!')
        router.replace('/mi-dia')
      } catch (e: any) {
        toast.error(e?.message ?? 'No se pudo finalizar el onboarding')
        setFinishing(false)
      }
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }
  }

  const goPrev = () => setStep((s) => Math.max(0, s - 1))

  const nextDisabled =
    finishing ||
    saveProfile.isPending ||
    saveDocs.isPending ||
    completeTour.isPending ||
    (step === 0 && !isStep0Valid) ||
    (step === 1 && !isStep1Valid)

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex max-w-[720px] flex-col px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-md bg-ink font-serif italic text-paper-surface"
            style={{ fontSize: 17 }}
          >
            s
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">
              Bienvenido a {tenant?.name ?? 'Senda'}
            </div>
            <div className="text-[11px] text-ink-3">
              Configura tu cuenta en menos de 3 minutos
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2 flex justify-between">
          {STEPS.map((s, i) => {
            const IconC = Icon[s.icon]
            const active = i === step
            const done = i < step
            return (
              <div key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full border-2 transition',
                    done && 'border-primary bg-primary text-primary-foreground',
                    active && !done && 'border-primary bg-primary-soft text-primary-ink',
                    !active && !done && 'border-paper-line bg-paper-raised text-ink-3',
                  )}
                >
                  {done ? <Icon.Check size={14} /> : <IconC size={14} />}
                </div>
                <span
                  className={cn(
                    'text-[11px]',
                    active || done ? 'font-semibold text-ink' : 'text-ink-3',
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-paper-line-soft">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Step card */}
        <div className="rounded-lg border border-paper-line bg-paper-raised shadow-paper-1">
          <div className="border-b border-paper-line-soft p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
              Paso {step + 1} de {STEPS.length}
            </div>
            <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-ink">
              {stepTitle(step)}
            </h1>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-2">
              {stepSubtitle(step, user?.name ?? undefined)}
            </p>
          </div>

          <div className="p-5">
            {step === 0 && (
              <>
                {profileLoading ? (
                  <div className="py-4 text-center text-[12.5px] text-ink-3">Cargando tu perfil…</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Universidad *">
                      <input
                        type="text"
                        placeholder="Ej. UNAM"
                        value={profileForm.university}
                        onChange={(e) => setProfileForm({ ...profileForm, university: e.target.value })}
                        className="w-full rounded-md border border-paper-line bg-paper-surface px-2.5 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
                      />
                    </Field>
                    <Field label="Carrera *">
                      <input
                        type="text"
                        placeholder="Ej. Ingeniería en Sistemas"
                        value={profileForm.career}
                        onChange={(e) => setProfileForm({ ...profileForm, career: e.target.value })}
                        className="w-full rounded-md border border-paper-line bg-paper-surface px-2.5 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
                      />
                    </Field>
                    <Field label="Semestre actual">
                      <input
                        type="number"
                        min={1}
                        max={14}
                        placeholder="7"
                        value={profileForm.semester}
                        onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}
                        className="w-full rounded-md border border-paper-line bg-paper-surface px-2.5 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
                      />
                    </Field>
                    <div className="md:col-span-2 text-[11.5px] text-ink-3">
                      <b className="text-ink-2">Tip:</b> podrás editar más datos académicos
                      (horas, tutor, GPA) después desde tu perfil.
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-3">
                <DocCheck
                  title="Acuerdo de Confidencialidad (NDA)"
                  desc="Protege la información sensible del equipo y del programa."
                  signed={docsSigned.nda}
                  onSign={() => setDocsSigned({ ...docsSigned, nda: !docsSigned.nda })}
                />
                <DocCheck
                  title="Reglamento interno"
                  desc="Código de conducta, horarios, política de permisos y vacaciones."
                  signed={docsSigned.regulations}
                  onSign={() =>
                    setDocsSigned({ ...docsSigned, regulations: !docsSigned.regulations })
                  }
                />
                <div className="mt-2 rounded-md border border-dashed border-paper-line bg-paper-surface p-3 text-[11.5px] text-ink-3">
                  Para entregar copias firmadas digitalmente o subir tu INE y otros documentos,
                  ve a tu sección de <b className="text-ink-2">Onboarding</b> después del registro.
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                  <Icon.Sparkles size={30} />
                </div>
                <div>
                  <div className="mb-1 font-serif text-[22px] text-ink">
                    Tour interactivo (60 seg)
                  </div>
                  <p className="mx-auto max-w-md text-[13px] text-ink-2">
                    Te mostramos cómo reportar tu día, crear tareas, iniciar el timer y
                    encontrar a tu mentor en la plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTourOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-[13px] font-medium transition',
                    tourDone
                      ? 'border-success bg-success-soft text-success'
                      : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
                  )}
                >
                  {tourDone ? (
                    <>
                      <Icon.Check size={14} /> Tour completado
                    </>
                  ) : (
                    <>
                      <Icon.Sparkles size={14} /> Iniciar tour
                    </>
                  )}
                </button>
                <TourDialog
                  open={tourOpen}
                  onOpenChange={setTourOpen}
                  onComplete={() => setTourDone(true)}
                />
              </div>
            )}

            {step === 3 && (
              mentor ? (
                <div className="flex gap-4 rounded-lg border border-paper-line-soft bg-paper-surface p-4">
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-full font-semibold text-white"
                    style={{ background: 'hsl(var(--tag-1))' }}
                  >
                    {initialsOf(mentor.name ?? mentor.email ?? 'M')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] uppercase tracking-[0.5px] text-ink-3">
                      TU MENTOR ASIGNADO
                    </div>
                    <div className="mt-1 font-serif text-[20px] text-ink">
                      {mentor.name ?? mentor.email}
                    </div>
                    {mentor.email && (
                      <div className="text-[12.5px] text-ink-3">{mentor.email}</div>
                    )}
                    <div className="mt-3 rounded-md bg-paper-raised p-3 text-[12.5px] leading-[1.55] text-ink-2">
                      Tu mentor recibió la notificación de la asignación. Coordinarán
                      su primera sesión 1:1 a través de <b>/mentoria</b>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-5 text-center">
                  <Icon.Mentor size={24} className="mx-auto mb-2 text-ink-3" />
                  <div className="font-serif text-[16px] text-ink">
                    Mentor pendiente de asignar
                  </div>
                  <p className="mx-auto mt-1 max-w-md text-[12.5px] text-ink-3">
                    Tu líder o RRHH te asignarán un mentor en los próximos días.
                    Mientras tanto, puedes empezar a explorar la plataforma —
                    tu primera sesión la verás reflejada en <b>/mentoria</b>.
                  </p>
                </div>
              )
            )}
          </div>

          <div className="flex items-center justify-between border-t border-paper-line-soft p-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0 || nextDisabled}
              className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink disabled:opacity-40"
            >
              <Icon.Chev size={11} className="rotate-180" />
              Atrás
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={nextDisabled}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-[7px] text-[13px] font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {finishing
                ? 'Finalizando…'
                : saveProfile.isPending || saveDocs.isPending
                  ? 'Guardando…'
                  : isLast
                    ? 'Ir a mi día'
                    : 'Siguiente'}
              <Icon.Chev size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function stepTitle(step: number) {
  return (
    [
      'Completa tu perfil',
      'Firma los documentos',
      'Conoce la plataforma',
      'Saluda a tu mentor',
    ][step] ?? ''
  )
}

function stepSubtitle(step: number, name?: string) {
  return (
    [
      `Esta información se comparte con tu líder y mentor, ${name?.split(' ')[0] ?? 'hola'}.`,
      'Léelos con calma. Puedes descargar una copia en cualquier momento desde tu perfil.',
      'En 60 segundos aprenderás a usar lo esencial del producto.',
      'Tu mentor ya fue notificado. Agendarán su primera sesión 1:1.',
    ][step] ?? ''
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.4px] text-ink-3">{label}</span>
      {children}
    </label>
  )
}

function DocCheck({
  title,
  desc,
  signed,
  onSign,
}: {
  title: string
  desc: string
  signed: boolean
  onSign: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3.5 transition',
        signed
          ? 'border-success bg-success-soft'
          : 'border-paper-line bg-paper-surface',
      )}
    >
      <div
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-md',
          signed ? 'bg-success text-success-foreground' : 'bg-paper-line-soft text-ink-3',
        )}
      >
        {signed ? <Icon.Check size={16} /> : <Icon.Attach size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="text-[11.5px] text-ink-3">{desc}</div>
      </div>
      <button
        type="button"
        onClick={onSign}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition',
          signed
            ? 'border-success-foreground bg-paper-raised text-success'
            : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
        )}
      >
        {signed ? 'Firmado' : 'Revisar y firmar'}
      </button>
    </div>
  )
}
