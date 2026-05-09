'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { Can } from '@/components/shared/can'
import { getProject, listTasks, listProjectLists } from '@/features/tasks/api/tasks'
import { KanbanBoard } from '@/features/tasks/components/kanban-board'
import { EditProjectDialog } from '@/features/tasks/components/edit-project-dialog'

export default function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [editOpen, setEditOpen] = useState(false)

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
  })
  const { data: tasksData } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => listTasks({ project_id: id, per_page: 200 }),
  })
  const { data: listsData } = useQuery({
    queryKey: ['project-lists', id],
    queryFn: () => listProjectLists(id),
  })

  const project = projectData?.data
  const tasks = tasksData?.data ?? []
  const lists = listsData?.data ?? []

  if (projectLoading) {
    return (
      <div className="mx-auto max-w-[1360px] px-7 py-5">
        <Skeleton className="mb-4 h-20 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-[1360px] px-7 py-16 text-center text-ink-3">
        Proyecto no encontrado.
      </div>
    )
  }

  const progress = tasks.length
    ? Math.round((tasks.filter((t) => t.state === 'DONE').length / tasks.length) * 100)
    : 0

  return (
    <div className="mx-auto max-w-[1360px] px-7 py-5 pb-10">
      <Link
        href="/proyectos"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Proyectos
      </Link>

      <SectionTitle
        kicker={project.slug.toUpperCase()}
        title={project.name}
        sub={project.description ?? `${tasks.length} tareas · ${progress}% completado`}
        right={
          <>
            <Can capability="create_projects">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
              >
                <Icon.Settings size={13} />
                Ajustes
              </button>
            </Can>
            <Link
              href={`/tareas/nueva?project_id=${project.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Nueva tarea
            </Link>
          </>
        }
      />

      <EditProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />

      {/* Overview cards */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <PaperCard>
          <div className="text-[11px] text-ink-3">Estado</div>
          <div className="mt-1 font-serif text-[22px] leading-none capitalize text-ink">
            {project.status}
          </div>
        </PaperCard>
        <PaperCard>
          <div className="text-[11px] text-ink-3">Tareas totales</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">
            {tasks.length}
          </div>
        </PaperCard>
        <PaperCard>
          <div className="text-[11px] text-ink-3">Completadas</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-ink">
            {tasks.filter((t) => t.state === 'DONE').length}
          </div>
          <PaperBadge tone="ok" className="mt-1.5 !text-[10px]">
            {progress}%
          </PaperBadge>
        </PaperCard>
        <PaperCard>
          <div className="text-[11px] text-ink-3">Bloqueadas</div>
          <div className="mt-1 font-serif text-[28px] leading-none tracking-tight text-destructive">
            {tasks.filter((t) => t.state === 'BLOCKED').length}
          </div>
        </PaperCard>
      </div>

      {/* Kanban embedded */}
      <KanbanBoard projectId={project.id} lists={lists} />
    </div>
  )
}
