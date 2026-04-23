'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskForm } from '@/features/tasks/components/task-form'

export default function NuevaTareaPage() {
  const sp = useSearchParams()
  const projectId = sp.get('project_id')

  if (!projectId) {
    return (
      <div className="container max-w-2xl py-6">
        <Card>
          <CardHeader>
            <CardTitle>Elige un proyecto</CardTitle>
            <CardDescription>
              Abre el tablero de un proyecto y haz clic en "Nueva tarea" desde ahí.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva tarea</CardTitle>
          <CardDescription>Crea una tarea y asígnala en un paso.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  )
}
