'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskForm } from '@/features/tasks/components/task-form'
import { listProjects } from '@/features/tasks/api/tasks'

export default function NuevaTareaPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const projectId = sp.get('project_id')

  if (!projectId) {
    return <NoProjectFallback onPick={(id) => router.push(`/tareas/nueva?project_id=${id}`)} />
  }

  return (
    <div className="mx-auto max-w-[720px] px-7 py-5 pb-10">
      <Link
        href="/tareas"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Tareas
      </Link>

      <SectionTitle
        kicker="Nueva tarea"
        title="Crea y asigna en un paso"
        sub="Define título, responsable y deadline. Puedes completar detalles después."
      />

      <PaperCard>
        <TaskForm projectId={projectId} />
      </PaperCard>
    </div>
  )
}

function NoProjectFallback({ onPick }: { onPick: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['projects-picker'],
    queryFn: () => listProjects({ status: 'active' }),
  })
  const projects = data?.data ?? []

  return (
    <div className="mx-auto max-w-[720px] px-7 py-5 pb-10">
      <Link
        href="/tareas"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Tareas
      </Link>

      <SectionTitle
        kicker="Nueva tarea"
        title="¿En qué proyecto?"
        sub="Las tareas viven dentro de un proyecto. Elige uno para continuar."
      />

      <PaperCard>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-soft text-primary-ink">
              <Icon.Panel size={16} />
            </div>
            <p className="text-[13px] text-ink-2">
              No hay proyectos activos todavía. Crea uno primero para poder registrar tareas.
            </p>
            <Link
              href="/proyectos"
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              Ir a proyectos
              <Icon.Chev size={12} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id)}
                className="flex items-center gap-3 rounded-md border border-paper-line-soft bg-paper-surface px-3 py-2.5 text-left transition hover:border-paper-line hover:bg-paper-bg-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.color ?? 'hsl(var(--accent-h))' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{p.name}</div>
                  {p.description && (
                    <div className="truncate text-[11.5px] text-ink-3">{p.description}</div>
                  )}
                </div>
                {typeof p.task_count === 'number' && (
                  <span className="font-mono text-[11px] text-ink-3">{p.task_count} tareas</span>
                )}
                <Icon.Chev size={12} className="text-ink-3" />
              </button>
            ))}
          </div>
        )}
      </PaperCard>
    </div>
  )
}
