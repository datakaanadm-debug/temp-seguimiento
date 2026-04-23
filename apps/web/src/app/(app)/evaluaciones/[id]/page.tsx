import { EvaluationEditor } from '@/features/performance/components/evaluation-form'

export const metadata = { title: 'Evaluación' }

export default async function EvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EvaluationEditor id={id} />
}
