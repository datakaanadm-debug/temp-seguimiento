import { TaskDetail } from '@/features/tasks/components/task-detail'

export const metadata = { title: 'Tarea' }

type Params = Promise<{ id: string }>

export default async function TaskDetailPage({ params }: { params: Params }) {
  const { id } = await params
  return <TaskDetail taskId={id} />
}
