import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionServer } from '@/lib/auth/server'

export const metadata = { title: 'Mi día' }

export default async function MiDiaPage() {
  const session = await getSessionServer()
  const greeting = greetingFor(new Date())

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {session?.user.name?.split(' ')[0] ?? '—'}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tareas hoy</CardDescription>
            <CardTitle className="text-3xl tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Pendiente: conectar al listado del día
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tiempo hoy</CardDescription>
            <CardTitle className="text-3xl tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Timer + entradas manuales</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Próxima sesión 1:1</CardDescription>
            <CardTitle className="text-xl">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Fase 2: Mentorship</CardContent>
        </Card>
      </div>
    </div>
  )
}

function greetingFor(d: Date) {
  const h = d.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
