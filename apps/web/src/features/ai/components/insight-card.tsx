'use client'

import { AlertTriangle, Check, EyeOff, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useInsightActions } from '../hooks/use-ai'
import { cn } from '@/lib/utils'
import type { AiInsight } from '@/types/api'

const SEVERITY_STYLES: Record<AiInsight['severity'], { icon: any; bg: string; badge: string }> = {
  info: { icon: Lightbulb, bg: 'border-l-primary', badge: 'bg-primary/10 text-primary' },
  warning: { icon: AlertTriangle, bg: 'border-l-warning', badge: 'bg-warning/10 text-warning-foreground' },
  critical: { icon: AlertTriangle, bg: 'border-l-destructive', badge: 'bg-destructive/10 text-destructive' },
}

export function InsightCard({ insight }: { insight: AiInsight }) {
  const { acknowledge, dismiss, resolve } = useInsightActions()
  const style = SEVERITY_STYLES[insight.severity]
  const Icon = style.icon

  return (
    <Card className={cn('border-l-4', style.bg)}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', insight.severity === 'critical' ? 'text-destructive' : 'text-primary')} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{insight.title}</h3>
              <span className={cn('text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded', style.badge)}>
                {insight.kind_label}
              </span>
              {insight.confidence != null && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(insight.confidence * 100)}% confianza
                </span>
              )}
            </div>
            {insight.description && (
              <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
            )}
            {insight.evidence && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver evidencia
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(insight.evidence, null, 2)}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {insight.is_active && !insight.acknowledged_at && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => acknowledge.mutate(insight.id)}
                title="Marcar como visto"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {insight.is_active && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => resolve.mutate(insight.id)}
                  title="Resolver"
                >
                  <Check className="h-4 w-4 text-success" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => dismiss.mutate(insight.id)}
                  title="Descartar"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
