'use client'

import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { getRoles } from '@/features/auth/api'

const ACCENT_COLOR: Record<string, string> = {
  terracotta: '#c8532b',
  cobalt: '#3a5f8a',
  olive: '#5a7a3f',
  ochre: '#b8892a',
}

export default function RolesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const roles = data?.data?.roles ?? []
  const permissions = data?.data?.permissions ?? []
  const totalMembers = roles.reduce((a, r) => a + r.members, 0)

  return (
    <div>
      <SectionTitle
        kicker="Workspace · RBAC"
        title="Roles del sistema (lectura)"
        sub={
          isLoading
            ? 'Cargando…'
            : `${roles.length} roles activos · ${totalMembers} usuarios asignados`
        }
        right={
          <PaperBadge tone="neutral" className="!text-[10.5px]">
            Solo lectura
          </PaperBadge>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-md border border-paper-line bg-paper-bg-2 p-3 text-[12.5px] text-ink-2">
        <Icon.AlertTriangle size={14} className="mt-0.5 shrink-0 text-ink-3" />
        <div>
          <b className="text-ink">Roles fijos del sistema.</b> Los 6 roles y la matriz de
          permisos están definidos a nivel de plataforma y no se pueden editar desde aquí.
          Esta vista te permite consultar quién puede hacer qué dentro del workspace.
          Si necesitas roles personalizados o ajustar permisos por tenant, contacta a soporte.
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          {/* Roles list */}
          <div
            className="mb-5 grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {roles.map((r) => {
              const color = r.accent ? ACCENT_COLOR[r.accent] ?? 'hsl(var(--ink-3))' : 'hsl(var(--ink-3))'
              return (
                <div
                  key={r.id}
                  className="flex flex-col rounded-lg border border-paper-line bg-paper-raised p-3.5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <span className="text-[13px] font-semibold text-ink">{r.name}</span>
                    {r.is_system && (
                      <PaperBadge tone="neutral" className="ml-auto !text-[9px]">
                        SISTEMA
                      </PaperBadge>
                    )}
                  </div>
                  <p className="mb-3 flex-1 text-[11.5px] leading-[1.5] text-ink-3">
                    {r.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-ink-3">{r.members} miembros</span>
                    <span className="font-mono text-[10px] text-ink-muted">{r.id}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Permission matrix */}
          <PaperCard
            title="Matriz de permisos"
            right={<span className="text-[11px] text-ink-3">capacidades × roles</span>}
            noPad
          >
            <div className="overflow-x-auto">
              <div
                className="grid border-b border-paper-line px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3"
                style={{
                  gridTemplateColumns: `minmax(240px, 1fr) repeat(${roles.length}, minmax(80px, 1fr))`,
                }}
              >
                <span>Capacidad</span>
                {roles.map((r) => (
                  <span key={r.id} className="text-center">
                    {shortName(r.name)}
                  </span>
                ))}
              </div>
              {permissions.map((perm, i) => (
                <div
                  key={i}
                  className="grid items-center px-4 py-2.5 text-[12.5px]"
                  style={{
                    gridTemplateColumns: `minmax(240px, 1fr) repeat(${roles.length}, minmax(80px, 1fr))`,
                    borderBottom:
                      i < permissions.length - 1
                        ? '1px solid hsl(var(--paper-line-soft))'
                        : undefined,
                  }}
                >
                  <span className="text-ink">{perm.cap}</span>
                  {roles.map((r) => (
                    <span key={r.id} className="text-center">
                      {perm.roles.includes(r.id) ? (
                        <Icon.Check size={14} className="mx-auto text-success" />
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </PaperCard>
        </>
      )}
    </div>
  )
}

function shortName(name: string) {
  if (name.length <= 12) return name
  return name.split(' ')[0]
}
