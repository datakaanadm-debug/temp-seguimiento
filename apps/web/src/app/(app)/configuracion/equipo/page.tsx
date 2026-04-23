'use client'

import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { listDepartments } from '@/features/organization/api/organization'

export default function EquipoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => listDepartments(),
    staleTime: 5 * 60_000,
  })

  const deps = data?.data ?? []
  const total = deps.reduce(
    (a, d) => a + (d.areas?.reduce((b, ar) => b + (ar.teams?.length ?? 0), 0) ?? 0),
    0,
  )

  return (
    <div>
      <SectionTitle
        kicker="Workspace"
        title="Estructura organizacional"
        sub={
          isLoading
            ? 'Cargando estructura…'
            : `${deps.length} departamentos · ${total} equipos`
        }
        right={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            <Icon.Plus size={13} />
            Nuevo departamento
          </button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : deps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
          <Icon.People size={22} className="mx-auto mb-3 text-ink-3" />
          <div className="font-serif text-[18px] text-ink">Aún no hay estructura</div>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-3">
            Crea tu primer departamento para empezar a organizar equipos y practicantes.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            <Icon.Plus size={13} />
            Crear departamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {deps.map((dep) => (
            <PaperCard
              key={dep.id}
              title={dep.name}
              right={
                <span className="font-mono text-[11px] text-ink-3">
                  {dep.areas?.length ?? 0} áreas
                </span>
              }
            >
              {(dep.areas ?? []).length === 0 ? (
                <p className="py-2 text-[12.5px] text-ink-3">Sin áreas configuradas.</p>
              ) : (
                <div className="-my-2 divide-y divide-paper-line-soft">
                  {dep.areas!.map((area) => (
                    <div key={area.id} className="border-l-2 border-primary/40 py-2.5 pl-3">
                      <div className="text-[13px] font-semibold text-ink">{area.name}</div>
                      {area.teams && area.teams.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {area.teams.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                              style={{
                                borderColor: t.color ?? 'hsl(var(--paper-line))',
                                color: t.color ?? 'hsl(var(--ink-2))',
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: t.color ?? 'hsl(var(--ink-muted))' }}
                              />
                              {t.name}
                              {t.member_count != null && (
                                <span className="font-mono text-[10px] opacity-70">
                                  · {t.member_count}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <PaperBadge tone="neutral" className="mt-1.5 !text-[10px]">
                          sin equipos
                        </PaperBadge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PaperCard>
          ))}
        </div>
      )}
    </div>
  )
}
