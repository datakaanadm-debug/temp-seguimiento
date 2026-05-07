'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { listDepartments } from '@/features/organization/api/organization'
import { NewDepartmentDialog } from '@/features/organization/components/new-department-dialog'
import { NewAreaDialog } from '@/features/organization/components/new-area-dialog'
import { NewTeamDialog } from '@/features/organization/components/new-team-dialog'
import { TeamMembersDialog } from '@/features/organization/components/team-members-dialog'
import { useRequireRole } from '@/hooks/use-require-role'
import type { Team } from '@/types/api'

export default function EquipoPage() {
  const allowed = useRequireRole(['tenant_admin', 'hr'])

  const [newDeptOpen, setNewDeptOpen] = useState(false)
  const [newAreaOpen, setNewAreaOpen] = useState(false)
  const [newTeamOpen, setNewTeamOpen] = useState(false)
  const [areaContext, setAreaContext] = useState<{ deptId?: string | null; areaId?: string | null }>({})
  const [membersTeam, setMembersTeam] = useState<Pick<Team, 'id' | 'name' | 'color'> | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => listDepartments(),
    staleTime: 60_000,
  })

  if (!allowed) return null

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
          <>
            {deps.length > 0 && (
              <button
                type="button"
                onClick={() => { setAreaContext({}); setNewAreaOpen(true) }}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
              >
                <Icon.Plus size={12} />
                Nueva área
              </button>
            )}
            <button
              type="button"
              onClick={() => { setAreaContext({}); setNewTeamOpen(true) }}
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Plus size={12} />
              Nuevo equipo
            </button>
            <button
              type="button"
              onClick={() => setNewDeptOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Nuevo departamento
            </button>
          </>
        }
      />

      <NewDepartmentDialog open={newDeptOpen} onOpenChange={setNewDeptOpen} />
      <NewAreaDialog
        open={newAreaOpen}
        onOpenChange={setNewAreaOpen}
        departments={deps}
        defaultDepartmentId={areaContext.deptId ?? null}
      />
      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        departments={deps}
        defaultAreaId={areaContext.areaId ?? null}
      />
      <TeamMembersDialog
        open={!!membersTeam}
        onOpenChange={(o) => !o && setMembersTeam(null)}
        team={membersTeam}
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
            onClick={() => setNewDeptOpen(true)}
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
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-3">
                    {dep.areas?.length ?? 0} áreas
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAreaContext({ deptId: dep.id }); setNewAreaOpen(true) }}
                    className="inline-flex items-center gap-1 rounded-md border border-paper-line bg-paper-raised px-2 py-[3px] text-[11px] text-ink-3 hover:border-paper-line-soft hover:text-ink"
                    title="Añadir área a este departamento"
                  >
                    <Icon.Plus size={10} />
                    área
                  </button>
                </span>
              }
            >
              {(dep.areas ?? []).length === 0 ? (
                <p className="py-2 text-[12.5px] text-ink-3">Sin áreas configuradas.</p>
              ) : (
                <div className="-my-2 divide-y divide-paper-line-soft">
                  {dep.areas!.map((area) => (
                    <div key={area.id} className="border-l-2 border-primary/40 py-2.5 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-[13px] font-semibold text-ink">{area.name}</div>
                        <button
                          type="button"
                          onClick={() => { setAreaContext({ areaId: area.id }); setNewTeamOpen(true) }}
                          className="inline-flex items-center gap-1 rounded-md border border-paper-line bg-paper-raised px-2 py-[3px] text-[11px] text-ink-3 hover:border-paper-line-soft hover:text-ink"
                          title="Añadir equipo a esta área"
                        >
                          <Icon.Plus size={10} />
                          equipo
                        </button>
                      </div>
                      {area.teams && area.teams.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {area.teams.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setMembersTeam({ id: t.id, name: t.name, color: t.color })}
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition hover:bg-paper-bg-2"
                              style={{
                                borderColor: t.color ?? 'hsl(var(--paper-line))',
                                color: t.color ?? 'hsl(var(--ink-2))',
                              }}
                              title="Ver miembros del equipo"
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
                            </button>
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
