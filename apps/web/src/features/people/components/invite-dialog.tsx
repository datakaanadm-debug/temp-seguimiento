'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { inviteUser } from '@/features/auth/api'
import type { MembershipRole } from '@/types/api'

const ROLE_OPTIONS: { value: MembershipRole; label: string; hint: string }[] = [
  { value: 'intern', label: 'Practicante', hint: 'Reporta su día y gestiona sus tareas.' },
  { value: 'mentor', label: 'Mentor', hint: 'Acompaña 1:1 y lleva notas privadas.' },
  { value: 'team_lead', label: 'Líder de equipo', hint: 'Asigna tareas y evalúa.' },
  { value: 'hr', label: 'Recursos Humanos', hint: 'Supervisa programa y evalúa.' },
  { value: 'tenant_admin', label: 'Admin del workspace', hint: 'Acceso total.' },
  { value: 'supervisor', label: 'Supervisor', hint: 'Solo lectura de dashboards.' },
]

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MembershipRole>('intern')
  const [expiresHours, setExpiresHours] = useState(72)

  const invite = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      toast.success(`Invitación enviada a ${email}`)
      qc.invalidateQueries({ queryKey: ['invitations'] })
      qc.invalidateQueries({ queryKey: ['profiles'] })
      setEmail('')
      setRole('intern')
      setExpiresHours(72)
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err?.errors?.email?.[0] ?? err?.message ?? 'No se pudo enviar la invitación'
      toast.error(msg)
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    invite.mutate({
      email: email.trim().toLowerCase(),
      role,
      expires_in_hours: expiresHours,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Invitar persona</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Enviamos un enlace por email que expira según el tiempo configurado.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@empresa.com"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Rol</span>
            <div className="grid gap-1.5">
              {ROLE_OPTIONS.map((r) => {
                const active = role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left transition ${
                      active
                        ? 'border-ink bg-paper-bg-2'
                        : 'border-paper-line hover:border-paper-line-soft'
                    }`}
                  >
                    <div
                      className={`mt-[3px] h-3 w-3 shrink-0 rounded-full border ${
                        active ? 'border-ink bg-ink' : 'border-paper-line'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-ink">{r.label}</div>
                      <div className="text-[11.5px] text-ink-3">{r.hint}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Expira en (horas)
            </span>
            <input
              type="number"
              min={1}
              max={720}
              value={expiresHours}
              onChange={(e) => setExpiresHours(Number(e.target.value) || 72)}
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
              disabled={invite.isPending || !email.trim()}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {invite.isPending ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
