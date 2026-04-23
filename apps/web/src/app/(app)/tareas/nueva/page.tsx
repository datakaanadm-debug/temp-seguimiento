'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard } from '@/components/ui/primitives'
import { TaskForm } from '@/features/tasks/components/task-form'

export default function NuevaTareaPage() {
  const sp = useSearchParams()
  const projectId = sp.get('project_id')

  if (!projectId) {
    return (
      <div className="mx-auto max-w-[720px] px-7 py-5 pb-10">
        <Link
          href="/tareas"
          className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
        >
          <Icon.Chev size={11} className="rotate-180" /> Tareas
        </Link>

        <SectionTitle
          kicker="Crear tarea"
          title="Elige un proyecto primero"
          sub="Las tareas viven dentro de un proyecto. Abre el tablero del proyecto donde quieras crearla."
        />

        <PaperCard>
          <div className="flex flex-col items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-soft text-primary-ink">
              <Icon.Panel size={16} />
            </div>
            <p className="text-[13px] text-ink-2">
              Desde <b>/proyectos</b> selecciona el proyecto donde trabajarás y usa el botón
              "Nueva tarea" en su tablero.
            </p>
            <Link
              href="/proyectos"
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              Ver proyectos
              <Icon.Chev size={12} />
            </Link>
          </div>
        </PaperCard>
      </div>
    )
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
