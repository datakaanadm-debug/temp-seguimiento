'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api-client'
import { createTeam } from '@/features/organization/api/organization'
import type { Department, PaginatedResponse, Profile } from '@/types/api'

const TEAM_COLORS = [
  '#c8532b', // terracota
  '#456b7a', // cobalt
  '#5a7a3f', // olive
  '#8a6b9e', // purple
  '#b8892a', // ochre
  '#3e7a6b', // teal
  '#a8432e', // brick
  '#2a2320', // ink
]

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export function NewTeamDialog({
  open,
  onOpenChange,
  departments,
  defaultAreaId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  departments: Department[]
  defaultAreaId?: string | null
}) {
  const qc = useQueryClient()
  const [departmentId, setDepartmentId] = useState('')
  const [areaId, setAreaId] = useState(defaultAreaId ?? '')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState(TEAM_COLORS[0])
  const [leadUserId, setLeadUserId] = useState<string>('')

  const allAreas = useMemo(
    () => departments.flatMap((d) => (d.areas ?? []).map((a) => ({ ...a, departmentId: d.id, departmentName: d.name }))),
    [departments],
  )

  const filteredAreas = departmentId
    ? allAreas.filter((a) => a.departmentId === departmentId)
    : allAreas

  const { data: leadsData } = useQuery({
    queryKey: ['profiles-can-mentor-picker'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { can_mentor: true, per_page: 50 },
      }),
    enabled: open,
  })
  const possibleLeads = leadsData?.data ?? []

  const create = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      toast.success('Equipo creado')
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['teams-simple'] })
      setName(''); setSlug(''); setLeadUserId(''); setAreaId(defaultAreaId ?? '')
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo crear'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!areaId || !name.trim()) return
    create.mutate({
      area_id: areaId,
      name: name.trim(),
      slug: (slug || slugify(name)).trim(),
      color,
      lead_user_id: leadUserId || null,
    })
  }

  const noAreas = allAreas.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Nuevo equipo</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Los equipos pertenecen a un área. Tienen un líder responsable y un color
            para identificarlos en tableros.
          </p>
        </DialogHeader>

        {noAreas ? (
          <div className="rounded-md border border-dashed border-paper-line bg-paper-surface p-4 text-[12.5px] text-ink-3">
            Necesitas crear al menos un departamento y un área antes de poder crear equipos.
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Departamento</span>
                <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setAreaId('') }}
                  className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary">
                  <option value="">— todos —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Área</span>
                <select value={areaId} required onChange={(e) => setAreaId(e.target.value)}
                  className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary">
                  <option value="">— selecciona —</option>
                  {filteredAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{!departmentId && ` · ${a.departmentName}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Nombre del equipo</span>
              <input type="text" required autoFocus value={name}
                onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)) }}
                placeholder="Ej. Web · Brand Studio"
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Slug</span>
              <input type="text" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] font-mono text-[13px] text-ink outline-none focus:border-primary"
              />
            </label>

            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Líder de equipo (opcional)</span>
              <select value={leadUserId} onChange={(e) => setLeadUserId(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary">
                <option value="">— sin líder asignado —</option>
                {possibleLeads.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.user?.name ?? p.user?.email}{p.role_label ? ` — ${p.role_label}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Color</span>
              <div className="flex flex-wrap gap-1.5">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className={`h-7 w-7 rounded-md border-2 transition ${color === c ? 'border-ink' : 'border-paper-line'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="mt-2">
              <button type="button" onClick={() => onOpenChange(false)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink-2 hover:bg-paper-bg-2">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending || !name.trim() || !areaId}
                className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50">
                {create.isPending ? 'Creando…' : 'Crear equipo'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
