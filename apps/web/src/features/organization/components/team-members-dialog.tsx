'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { TonalAvatar } from '@/components/ui/primitives'
import { apiClient } from '@/lib/api-client'
import { addTeamMember, listTeamMembers, removeTeamMember } from '@/features/organization/api/organization'
import type { PaginatedResponse, Profile, Team } from '@/types/api'

const MEMBER_ROLES = [
  { value: 'lead', label: 'Líder' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'intern', label: 'Practicante' },
  { value: 'viewer', label: 'Observador' },
]

export function TeamMembersDialog({
  open,
  onOpenChange,
  team,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  team: Pick<Team, 'id' | 'name' | 'color'> | null
}) {
  const qc = useQueryClient()
  const [pickedUser, setPickedUser] = useState('')
  const [pickedRole, setPickedRole] = useState('intern')

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['team-members', team?.id],
    queryFn: () => listTeamMembers(team!.id),
    enabled: open && !!team?.id,
  })
  const members = membersData?.data ?? []

  const { data: profilesData } = useQuery({
    queryKey: ['profiles-team-pool'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
    enabled: open,
  })
  const allProfiles = profilesData?.data ?? []
  const memberUserIds = new Set(members.map((m) => m.user.id))
  const available = allProfiles.filter((p) => !memberUserIds.has(p.user_id))

  const add = useMutation({
    mutationFn: () => addTeamMember(team!.id, pickedUser, pickedRole),
    onSuccess: () => {
      toast.success('Miembro añadido')
      qc.invalidateQueries({ queryKey: ['team-members', team?.id] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      setPickedUser('')
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo añadir'),
  })

  const remove = useMutation({
    mutationFn: (membershipId: string) => removeTeamMember(team!.id, membershipId),
    onSuccess: () => {
      toast.success('Miembro removido')
      qc.invalidateQueries({ queryKey: ['team-members', team?.id] })
      qc.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo remover'),
  })

  if (!team) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px] text-ink">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: team.color ?? 'hsl(var(--ink-muted))' }}
            />
            Miembros de {team.name}
          </DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Añade líderes, mentores, practicantes u observadores. Los miembros heredan visibilidad de las tareas y proyectos del equipo.
          </p>
        </DialogHeader>

        {/* Lista actual */}
        <div className="rounded-md border border-paper-line bg-paper-surface">
          {isLoading ? (
            <div className="p-4 text-center text-[12px] text-ink-3">Cargando…</div>
          ) : members.length === 0 ? (
            <div className="p-4 text-center text-[12.5px] text-ink-3">
              Aún no hay miembros en este equipo.
            </div>
          ) : (
            <div className="divide-y divide-paper-line-soft">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 px-3 py-2">
                  <TonalAvatar size={28} name={m.user.name ?? m.user.email} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">
                      {m.user.name ?? m.user.email}
                    </div>
                    <div className="text-[11px] text-ink-3">{m.role_label ?? m.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Quitar a ${m.user.name ?? m.user.email} del equipo?`)) {
                        remove.mutate(m.id)
                      }
                    }}
                    disabled={remove.isPending}
                    className="rounded p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-destructive disabled:opacity-50"
                    aria-label="Quitar miembro"
                    title="Quitar miembro"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Añadir */}
        <div className="grid gap-2 border-t border-paper-line-soft pt-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
            Añadir miembro
          </span>
          <div className="flex gap-2">
            <select
              value={pickedUser}
              onChange={(e) => setPickedUser(e.target.value)}
              className="flex-1 rounded-md border border-paper-line bg-paper-surface px-2.5 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            >
              <option value="">— selecciona persona —</option>
              {available.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.user?.name ?? p.user?.email}
                  {p.role_label ? ` — ${p.role_label}` : ''}
                </option>
              ))}
            </select>
            <select
              value={pickedRole}
              onChange={(e) => setPickedRole(e.target.value)}
              className="rounded-md border border-paper-line bg-paper-surface px-2.5 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            >
              {MEMBER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => pickedUser && add.mutate()}
              disabled={!pickedUser || add.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              <Icon.Plus size={12} />
              {add.isPending ? 'Añadiendo…' : 'Añadir'}
            </button>
          </div>
          {available.length === 0 && (
            <span className="text-[11px] text-ink-3">
              Todos los usuarios del workspace ya están en este equipo.
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
