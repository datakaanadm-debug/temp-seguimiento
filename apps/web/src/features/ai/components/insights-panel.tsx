'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useInsights } from '../hooks/use-ai'
import { InsightCard } from './insight-card'

export function InsightsPanel() {
  const { data, isLoading } = useInsights({ active_only: true })
  const insights = data?.data ?? []

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  }

  if (insights.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
        Sin alertas por ahora — todo va bien. 👍
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((i) => (
        <InsightCard key={i.id} insight={i} />
      ))}
    </div>
  )
}
