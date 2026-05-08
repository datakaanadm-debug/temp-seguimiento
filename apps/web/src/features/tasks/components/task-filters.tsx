'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { apiClient } from '@/lib/api-client'
import { listProjects } from '@/features/tasks/api/tasks'
import { cn } from '@/lib/utils'
import type { PaginatedResponse, Profile, TaskPriority, TaskState } from '@/types/api'

const STATES: { value: TaskState; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TO_DO', label: 'Pendientes' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'IN_REVIEW', label: 'Revisión' },
  { value: 'DONE', label: 'Listo' },
  { value: 'BLOCKED', label: 'Bloqueado' },
]

const PRIORITIES: { value: TaskPriority; label: string; dot: string }[] = [
  { value: 'urgent', label: 'Urgente', dot: 'hsl(var(--danger))' },
  { value: 'high', label: 'Alta', dot: 'hsl(var(--warn))' },
  { value: 'normal', label: 'Normal', dot: 'hsl(var(--info))' },
  { value: 'low', label: 'Baja', dot: 'hsl(var(--ink-3))' },
]

export interface TaskFiltersValue {
  state: TaskState | null
  priority: TaskPriority | null
  assignee_id: string | null
  project_id: string | null
  q: string | null
}

export function TaskFilters({
  value,
  onChange,
}: {
  value: TaskFiltersValue
  onChange: (next: TaskFiltersValue) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const { data: profilesData } = useQuery({
    queryKey: ['profiles-assignee-picker'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
    enabled: open,
  })
  const people = profilesData?.data ?? []

  // Proyectos para el filtro. Cargados solo cuando el dropdown está abierto
  // para no traerlos al render inicial.
  const { data: projectsData } = useQuery({
    queryKey: ['projects-task-filter'],
    queryFn: () => listProjects({ status: 'active' }),
    enabled: open,
  })
  const projects = projectsData?.data ?? []

  const activeCount =
    (value.state ? 1 : 0) +
    (value.priority ? 1 : 0) +
    (value.assignee_id ? 1 : 0) +
    (value.project_id ? 1 : 0) +
    (value.q ? 1 : 0)

  const reset = () =>
    onChange({ state: null, priority: null, assignee_id: null, project_id: null, q: null })

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[7px] text-[12px] font-medium transition',
          activeCount > 0
            ? 'border-primary-ink bg-primary-soft text-primary-ink'
            : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
        )}
      >
        <Icon.Filter size={13} />
        Filtros
        {activeCount > 0 && (
          <span className="rounded-full bg-primary-ink px-1.5 text-[10px] font-semibold text-paper-surface">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[280px] rounded-lg border border-paper-line bg-paper-raised p-3 shadow-paper-2">
          <label className="mb-3 block">
            <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Buscar
            </span>
            <input
              type="text"
              value={value.q ?? ''}
              onChange={(e) => onChange({ ...value, q: e.target.value || null })}
              placeholder="título o descripción…"
              className="w-full rounded-md border border-paper-line bg-paper-surface px-2.5 py-[6px] text-[12.5px] text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="mb-3">
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Estado
            </div>
            <div className="flex flex-wrap gap-1">
              {STATES.map((s) => {
                const active = value.state === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, state: active ? null : s.value })
                    }
                    className={cn(
                      'rounded-full border px-2 py-[3px] text-[11.5px] transition',
                      active
                        ? 'border-ink bg-ink text-paper-surface'
                        : 'border-paper-line bg-paper-surface text-ink-2 hover:border-paper-line-soft',
                    )}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Prioridad
            </div>
            <div className="flex flex-wrap gap-1">
              {PRIORITIES.map((p) => {
                const active = value.priority === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, priority: active ? null : p.value })
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11.5px] transition',
                      active
                        ? 'border-ink bg-ink text-paper-surface'
                        : 'border-paper-line bg-paper-surface text-ink-2 hover:border-paper-line-soft',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: p.dot }} />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Proyecto
            </span>
            <select
              value={value.project_id ?? ''}
              onChange={(e) => onChange({ ...value, project_id: e.target.value || null })}
              className="w-full rounded-md border border-paper-line bg-paper-surface px-2.5 py-[6px] text-[12.5px] text-ink outline-none focus:border-primary"
            >
              <option value="">— todos los proyectos —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Asignado a
            </span>
            <select
              value={value.assignee_id ?? ''}
              onChange={(e) => onChange({ ...value, assignee_id: e.target.value || null })}
              className="w-full rounded-md border border-paper-line bg-paper-surface px-2.5 py-[6px] text-[12.5px] text-ink outline-none focus:border-primary"
            >
              <option value="">— todas las personas —</option>
              {people.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.user?.name ?? p.user?.email}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between border-t border-paper-line-soft pt-2.5">
            <button
              type="button"
              onClick={reset}
              disabled={activeCount === 0}
              className="text-[11.5px] text-ink-3 hover:text-ink disabled:opacity-40"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-ink px-2.5 py-[4px] text-[11.5px] font-medium text-paper-surface hover:bg-ink-2"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
