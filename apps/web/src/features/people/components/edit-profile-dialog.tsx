'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { updateProfile, upsertInternData } from '@/features/people/api/people'
import type { Profile } from '@/types/api'

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  profile: Profile
}) {
  const qc = useQueryClient()
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [skillsInput, setSkillsInput] = useState('')

  // Intern data
  const [university, setUniversity] = useState('')
  const [career, setCareer] = useState('')
  const [semester, setSemester] = useState('')
  const [mandatoryHours, setMandatoryHours] = useState('')
  const [hoursCompleted, setHoursCompleted] = useState('')
  const [universityAdvisor, setUniversityAdvisor] = useState('')

  useEffect(() => {
    if (!open) return
    setBio(profile.bio ?? '')
    setPhone(profile.phone ?? '')
    setPositionTitle(profile.position_title ?? '')
    setStartDate(profile.start_date ?? '')
    setEndDate(profile.end_date ?? '')
    setSkillsInput((profile.skills ?? []).join(', '))

    const i = profile.intern_data
    setUniversity(i?.university ?? '')
    setCareer(i?.career ?? '')
    setSemester(i?.semester != null ? String(i.semester) : '')
    setMandatoryHours(i?.mandatory_hours != null ? String(i.mandatory_hours) : '')
    setHoursCompleted(i?.hours_completed != null ? String(i.hours_completed) : '')
    setUniversityAdvisor(i?.university_advisor ?? '')
  }, [open, profile.id])

  const save = useMutation({
    mutationFn: async () => {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50)

      await updateProfile(profile.id, {
        bio: bio || null,
        phone: phone || null,
        position_title: positionTitle || null,
        start_date: startDate || null,
        end_date: endDate || null,
        skills,
      } as any)

      if (profile.kind === 'intern') {
        await upsertInternData(profile.id, {
          university: university || null,
          career: career || null,
          semester: semester ? Number(semester) : null,
          mandatory_hours: mandatoryHours ? Number(mandatoryHours) : null,
          hours_completed: hoursCompleted ? Number(hoursCompleted) : 0,
          university_advisor: universityAdvisor || null,
        })
      }
    },
    onSuccess: () => {
      toast.success('Perfil actualizado')
      qc.invalidateQueries({ queryKey: ['profile', profile.id] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
      onOpenChange(false)
    },
    onError: (e: any) => {
      const msg = e?.errors
        ? Object.values(e.errors).flat()[0]
        : (e?.message ?? 'No se pudo guardar')
      toast.error(String(msg))
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  const isIntern = profile.kind === 'intern'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[640px] overflow-y-auto border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Editar perfil</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Actualiza información profesional y de contacto.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Puesto / cargo">
              <input
                type="text"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="Ej. Practicante de diseño"
                className="input"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 ..."
                className="input"
              />
            </Field>
          </div>

          <Field label="Bio / descripción">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Una línea sobre la persona, intereses, fortalezas…"
              className="input min-h-[64px] resize-y"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Fecha de inicio">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Fecha de término">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Skills (separadas por coma)">
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, Figma, Inglés intermedio"
              className="input"
            />
          </Field>

          {isIntern && (
            <>
              <div className="mt-1 flex items-center gap-2 border-t border-paper-line-soft pt-3">
                <Icon.Onboard size={14} className="text-ink-3" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                  Datos académicos
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Universidad">
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Carrera">
                  <input
                    type="text"
                    value={career}
                    onChange={(e) => setCareer(e.target.value)}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Semestre">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Horas requeridas">
                  <input
                    type="number"
                    min={0}
                    value={mandatoryHours}
                    onChange={(e) => setMandatoryHours(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Horas completadas">
                  <input
                    type="number"
                    min={0}
                    value={hoursCompleted}
                    onChange={(e) => setHoursCompleted(e.target.value)}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Tutor académico">
                <input
                  type="text"
                  value={universityAdvisor}
                  onChange={(e) => setUniversityAdvisor(e.target.value)}
                  className="input"
                />
              </Field>
            </>
          )}

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
              disabled={save.isPending}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {save.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </DialogFooter>
        </form>

        <style jsx>{`
          .input {
            width: 100%;
            border: 1px solid hsl(var(--paper-line));
            background: hsl(var(--paper-surface));
            border-radius: var(--radius-md);
            padding: 7px 10px;
            font-size: 13px;
            color: hsl(var(--ink));
            outline: none;
          }
          .input:focus {
            border-color: hsl(var(--accent-h));
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
        {label}
      </span>
      {children}
    </label>
  )
}
