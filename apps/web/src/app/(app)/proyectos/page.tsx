'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge, TonalAvatar } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { listProjects } from '@/features/tasks/api/tasks'
import { NewProjectDialog } from '@/features/tasks/components/new-project-dialog'
import { Can } from '@/components/shared/can'
import { useRequireRole } from '@/hooks/use-require-role'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/api'

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'ok' | 'warn' | 'danger'> = {
  active: 'accent',
  planning: 'neutral',
  paused: 'warn',
  completed: 'ok',
  archived: 'neutral',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  planning: 'Planificación',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
  cancelled: 'Cancelado',
}

export default function ProyectosPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr', 'team_lead', 'mentor', 'supervisor'])
  const [newOpen, setNewOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects({}),
  })
  if (!allowed) return null
  const projects = data?.data ?? []

  const active = projects.filter((p) => p.status === 'active').length
  const paused = projects.filter((p) => p.status === 'paused').length
  const done = projects.filter((p) => p.status === 'completed').length

  return (
    <div className="mx-auto max-w-[1360px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Proyectos · workspace"
        title="Todos los proyectos"
        sub={`${projects.length} proyectos · ${active} activos · ${paused} pausados · ${done} cerrados`}
        right={
          <>
            {/*
              Botón "Filtros" removido — no tenía onClick. Para reactivar,
              construir un dropdown con filter por status (active/paused/
              completed/archived) usando useQueryState.
            */}
            <Can capability="create_projects">
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
              >
                <Icon.Plus size={13} />
                Nuevo proyecto
              </button>
            </Can>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <p className="text-[13px] text-ink-3">
            Aún no hay proyectos. Crea el primero para organizar tareas por equipo.
          </p>
          <Can capability="create_projects">
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Crear primer proyecto
            </button>
          </Can>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {projects.map((p) => {
            const color = p.color ?? 'hsl(var(--accent-h))'
            return (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-paper-line bg-paper-raised shadow-paper-1 transition hover:border-paper-line-soft hover:shadow-paper-2"
              >
                <div className="h-[6px] w-full" style={{ background: color }} />
                <div className="flex-1 p-4">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-[18px] leading-tight tracking-tight text-ink">
                        {p.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                        {p.slug}
                      </div>
                    </div>
                    <PaperBadge tone={STATUS_TONE[p.status] ?? 'neutral'}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </PaperBadge>
                  </div>
                  {p.description && (
                    <p className="mb-3 line-clamp-2 text-[12.5px] leading-[1.5] text-ink-2">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] text-ink-3">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Icon.Tasks size={11} />
                      {p.task_count ?? 0} tareas
                    </span>
                    {p.end_date && (
                      <span className="inline-flex items-center gap-1">
                        <Icon.Cal size={11} />
                        {new Date(p.end_date).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}
