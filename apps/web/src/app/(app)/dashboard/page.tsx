import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InsightsPanel } from '@/features/ai/components/insights-panel'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vista general del programa de prácticas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Practicantes activos</CardDescription>
            <CardTitle className="text-3xl tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Conectar al endpoint de analytics.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tareas vencidas</CardDescription>
            <CardTitle className="text-3xl tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Agregados por equipo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reportes hoy</CardDescription>
            <CardTitle className="text-3xl tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Compromiso diario del equipo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertas IA</CardDescription>
            <CardTitle className="text-3xl tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Últimos 14 días.
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Alertas IA abiertas</h2>
        <InsightsPanel />
      </section>
    </div>
  )
}
