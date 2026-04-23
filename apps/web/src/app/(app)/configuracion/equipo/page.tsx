'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { listDepartments } from '@/features/organization/api/organization'

export default function EquipoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => listDepartments(),
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return <div className="container py-6"><Skeleton className="h-96" /></div>
  }

  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estructura de equipo</h1>
        <p className="text-sm text-muted-foreground">Departments → Areas → Teams</p>
      </div>

      {(data?.data?.length ?? 0) === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay estructura</CardTitle>
            <CardDescription>
              Crea tu primer department para empezar a organizar equipos y practicantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              API disponible para crear via POST /api/v1/departments. UI para crear se añadirá en iteración siguiente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data!.data.map((dep) => (
            <Card key={dep.id}>
              <CardHeader>
                <CardTitle>{dep.name}</CardTitle>
                <CardDescription>{dep.areas?.length ?? 0} área(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dep.areas?.map((area) => (
                  <div key={area.id} className="pl-3 border-l-2">
                    <div className="font-medium text-sm">{area.name}</div>
                    {area.teams && area.teams.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {area.teams.map((t) => (
                          <Badge
                            key={t.id}
                            variant="outline"
                            style={{ borderColor: t.color, color: t.color }}
                          >
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
