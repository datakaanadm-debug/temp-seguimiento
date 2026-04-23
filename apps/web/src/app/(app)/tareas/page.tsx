'use client'

import Link from 'next/link'
import { useQueryState, parseAsStringLiteral, parseAsString, parseAsBoolean } from 'nuqs'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskListView } from '@/features/tasks/components/task-list-view'
import { KanbanBoard } from '@/features/tasks/components/kanban-board'

export default function TareasPage() {
  const [view, setView] = useQueryState(
    'view',
    parseAsStringLiteral(['kanban', 'list']).withDefault('list'),
  )
  const [projectId, setProjectId] = useQueryState('project_id', parseAsString)
  const [mine, setMine] = useQueryState('mine', parseAsBoolean.withDefault(false))

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-sm text-muted-foreground">
            {mine ? 'Solo las tuyas' : 'Todas las del tenant'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={mine ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMine(!mine)}
          >
            Mis tareas
          </Button>
          <div className="border rounded-md inline-flex">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              title="Vista lista"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
              title="Vista kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/tareas/nueva">
              <Plus className="h-4 w-4" /> Nueva
            </Link>
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        projectId ? (
          <KanbanBoard projectId={projectId} />
        ) : (
          <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
            Selecciona un proyecto para ver su tablero Kanban.
          </div>
        )
      ) : (
        <TaskListView
          params={{
            project_id: projectId ?? undefined,
            mine: mine || undefined,
            sort: 'updated_at',
            dir: 'desc',
            per_page: 50,
          }}
        />
      )}
    </div>
  )
}
