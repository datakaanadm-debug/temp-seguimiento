'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { createObjective, type Objective, type OkrLevel } from '@/features/okrs/api/okrs'
import type { PaginatedResponse, Profile, Team } from '@/types/api'

function currentQuarter(): string {
  const d = new Date()
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

export function NewOkrDialog({
  open,
  onOpenChange,
  parentOptions,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  parentOptions: Objective[]
}) {
  const { user, tenant } = useAuth()
  const qc = useQueryClient()

  const [level, setLevel] = useState<OkrLevel>('individual')
  const [label, setLabel] = useState('')
  const [quarter, setQuarter] = useState(currentQuarter())
  const [ownerId, setOwnerId] = useState<string>('')
  const [parentId, setParentId] = useState<string>('')
  const [krs, setKrs] = useState<{ text: string; progress: number; confidence: number }[]>([
    { text: '', progress: 0, confidence: 5 },
  ])

  const { data: teamsData } = useQuery({
    queryKey: ['teams-simple'],
    queryFn: () => apiClient.get<{ data: Team[] }>('/api/v1/teams'),
    enabled: open && level === 'team',
  })
  const { data: usersData } = useQuery({
    queryKey: ['profiles-all-simple'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
    enabled: open && level === 'individual',
  })

  const ownerOptions = useMemo(() => {
    if (level === 'company') {
      return tenant ? [{ id: tenant.id, name: tenant.name }] : []
    }
    if (level === 'team') {
      return (teamsData?.data ?? []).map((t) => ({ id: t.id, name: t.name }))
    }
    return (usersData?.data ?? []).map((p) => ({
      id: p.user_id,
      name: p.user?.name ?? p.user?.email ?? 'Sin nombre',
    }))
  }, [level, tenant, teamsData, usersData])

  const parentFiltered = useMemo(() => {
    if (level === 'company') return []
    if (level === 'team') return parentOptions.filter((o) => o.level === 'company')
    return parentOptions.filter((o) => o.level === 'team' || o.level === 'company')
  }, [level, parentOptions])

  const create = useMutation({
    mutationFn: createObjective,
    onSuccess: () => {
      toast.success('OKR creado')
      qc.invalidateQueries({ queryKey: ['okrs-all'] })
      setLabel('')
      setOwnerId('')
      setParentId('')
      setKrs([{ text: '', progress: 0, confidence: 5 }])
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'No se pudo crear el OKR')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !ownerId) return
    const filteredKrs = krs
      .filter((k) => k.text.trim())
      .map((k) => ({
        text: k.text.trim(),
        progress_percent: k.progress,
        confidence: k.confidence,
      }))
    const ownerType = level === 'company' ? 'tenant' : level === 'team' ? 'team' : 'user'
    const ownerName = ownerOptions.find((o) => o.id === ownerId)?.name
    create.mutate({
      level,
      label: label.trim(),
      quarter,
      owner_type: ownerType,
      owner_id: ownerId,
      owner_name: ownerName,
      parent_objective_id: parentId || null,
      key_results: filteredKrs.length > 0 ? filteredKrs : undefined,
    })
  }

  // Auto-fill owner for "individual" cuando es el propio user
  const myUserId = user?.id ?? ''
  const autoOwnerHint =
    level === 'individual' && user?.role !== 'tenant_admin' && user?.role !== 'hr' ? myUserId : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Nuevo OKR</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Define un objetivo con hasta 3 resultados clave medibles.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Nivel</span>
            <div className="inline-flex rounded-md border border-paper-line bg-paper-surface p-0.5">
              {(['individual', 'team', 'company'] as OkrLevel[]).map((lv) => {
                const active = level === lv
                const disabled =
                  lv === 'company' && user?.role !== 'tenant_admin' && user?.role !== 'hr'
                return (
                  <button
                    key={lv}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setLevel(lv)
                      setOwnerId(lv === 'individual' ? myUserId : '')
                      setParentId('')
                    }}
                    className={`flex-1 rounded-[4px] px-2.5 py-[6px] text-[12px] transition ${
                      active ? 'bg-paper-bg-2 font-semibold text-ink' : 'text-ink-3 hover:text-ink'
                    } ${disabled ? 'opacity-40' : ''}`}
                  >
                    {lv === 'individual' ? 'Individual' : lv === 'team' ? 'Equipo' : 'Empresa'}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Objetivo
            </span>
            <input
              type="text"
              required
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Dominar React hooks y testing avanzado"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Trimestre
              </span>
              <input
                type="text"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                {level === 'company' ? 'Empresa' : level === 'team' ? 'Equipo' : 'Persona'}
              </span>
              <select
                value={ownerId || autoOwnerHint || ''}
                onChange={(e) => setOwnerId(e.target.value)}
                required
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              >
                <option value="">— selecciona —</option>
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {parentFiltered.length > 0 && (
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Se alinea con (opcional)
              </span>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              >
                <option value="">— sin padre —</option>
                {parentFiltered.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.level === 'company' ? '🏢 ' : '👥 '} {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Resultados clave
              </span>
              {krs.length < 5 && (
                <button
                  type="button"
                  onClick={() => setKrs([...krs, { text: '', progress: 0, confidence: 5 }])}
                  className="flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink"
                >
                  <Icon.Plus size={11} /> añadir KR
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {krs.map((kr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold text-primary">
                    KR{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={kr.text}
                    onChange={(e) => {
                      // Usamos `kr` del scope del map (garantizado defined)
                      // en lugar de copy[idx] que TS tipa como T | undefined
                      // bajo noUncheckedIndexedAccess.
                      const copy = [...krs]
                      copy[idx] = { ...kr, text: e.target.value }
                      setKrs(copy)
                    }}
                    placeholder="Ej. Completar 5 proyectos con tests al 100%"
                    className="flex-1 rounded-md border border-paper-line bg-paper-surface px-2.5 py-[6px] text-[12.5px] text-ink outline-none focus:border-primary"
                  />
                  {krs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setKrs(krs.filter((_, i) => i !== idx))}
                      className="rounded p-1 font-mono text-[14px] leading-none text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
                      aria-label="Eliminar"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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
              disabled={create.isPending || !label.trim() || !(ownerId || autoOwnerHint)}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {create.isPending ? 'Creando…' : 'Crear OKR'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
