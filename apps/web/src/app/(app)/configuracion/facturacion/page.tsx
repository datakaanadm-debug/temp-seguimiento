'use client'

import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard, PaperBadge } from '@/components/ui/primitives'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    practicantes: 10,
    features: ['Core de tareas y bitácora', 'Reportes básicos', 'Notificaciones'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 299,
    practicantes: 50,
    features: ['Todo Starter +', 'Evaluaciones 360°', 'Mentoría 1:1', 'Automatizaciones'],
    highlight: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 799,
    practicantes: 200,
    features: ['Todo Growth +', 'IA coach y resúmenes', 'OKRs empresa/equipo', 'Reportes universidad'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    practicantes: Infinity,
    features: ['Todo Business +', 'SSO SAML/OIDC', 'SLA 99.9%', 'White-label', 'Integraciones custom'],
  },
] as const

const INVOICES = [
  { id: 'INV-2026-04', date: '1 abr 2026', amount: 299, status: 'paid' as const },
  { id: 'INV-2026-03', date: '1 mar 2026', amount: 299, status: 'paid' as const },
  { id: 'INV-2026-02', date: '1 feb 2026', amount: 99, status: 'paid' as const },
]

export default function FacturacionPage() {
  const { tenant } = useAuth()
  const currentPlan = tenant?.plan ?? 'growth'
  const practicantesUsed = 24
  const practicantesMax = PLANS.find((p) => p.id === currentPlan)?.practicantes ?? 50
  const pct = practicantesMax === Infinity ? 0 : (practicantesUsed / practicantesMax) * 100

  return (
    <div>
      <SectionTitle
        kicker="Workspace"
        title="Facturación"
        sub={`Plan actual: ${currentPlan.toUpperCase()} · siguiente cobro el 1 may 2026`}
        right={
          <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
            <Icon.Attach size={12} />
            Descargar facturas
          </button>
        }
      />

      {/* Usage card */}
      <PaperCard className="mb-5">
        <div className="flex items-center gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
              Uso actual
            </div>
            <div className="mt-1.5 font-serif text-[48px] leading-none tracking-tight">
              {practicantesUsed}
              <span className="ml-2 text-[20px] text-ink-3">/ {practicantesMax === Infinity ? '∞' : practicantesMax}</span>
            </div>
            <div className="mt-1 text-[12px] text-ink-3">practicantes activos</div>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex justify-between text-[11px]">
              <span className="text-ink-3">Cuota del plan {currentPlan}</span>
              <span className="font-mono text-ink">{Math.round(pct)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-line-soft">
              <div
                className={cn('h-full rounded-full', pct > 85 ? 'bg-warning' : 'bg-primary')}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            {pct > 85 && practicantesMax !== Infinity && (
              <div className="mt-2 text-[12px] text-warning">
                Estás cerca del límite. Considera subir al plan siguiente.
              </div>
            )}
          </div>
        </div>
      </PaperCard>

      {/* Plans */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan
          const canDowngrade = PLANS.findIndex((x) => x.id === p.id) < PLANS.findIndex((x) => x.id === currentPlan)
          return (
            <div
              key={p.id}
              className={cn(
                'flex flex-col rounded-lg border p-4 transition',
                p.highlight && !isCurrent && 'border-primary shadow-paper-2',
                isCurrent && 'border-ink bg-paper-surface',
                !p.highlight && !isCurrent && 'border-paper-line bg-paper-raised',
              )}
            >
              {p.highlight && !isCurrent && (
                <PaperBadge tone="accent" className="self-start !text-[9px]">
                  MÁS POPULAR
                </PaperBadge>
              )}
              {isCurrent && (
                <PaperBadge tone="ok" className="self-start !text-[9px]">
                  TU PLAN
                </PaperBadge>
              )}
              <div className="mt-2 font-serif text-[22px] leading-tight tracking-tight text-ink">
                {p.name}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                {p.price != null ? (
                  <>
                    <span className="font-serif text-[32px] leading-none text-ink">
                      ${p.price}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">USD/mes</span>
                  </>
                ) : (
                  <span className="font-serif text-[22px] text-ink">Custom</span>
                )}
              </div>
              <div className="mt-1 text-[12px] text-ink-3">
                Hasta {p.practicantes === Infinity ? '∞' : p.practicantes} practicantes
              </div>
              <ul className="mt-3 flex-1 space-y-1.5 text-[12px] text-ink-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Icon.Check size={11} className="mt-0.5 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={cn(
                  'mt-4 rounded-md px-3 py-1.5 text-[12px] font-medium transition',
                  isCurrent
                    ? 'cursor-default bg-paper-line-soft text-ink-3'
                    : canDowngrade
                      ? 'border border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft'
                      : 'bg-ink text-paper-surface hover:bg-ink-2',
                )}
                disabled={isCurrent}
              >
                {isCurrent ? 'Plan activo' : canDowngrade ? 'Bajar de plan' : 'Actualizar'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Invoices */}
      <PaperCard title="Historial de facturas" noPad>
        <div
          className="grid border-b border-paper-line px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3"
          style={{ gridTemplateColumns: '1fr 120px 100px 90px 40px' }}
        >
          <span>Número</span>
          <span>Fecha</span>
          <span>Monto</span>
          <span>Estado</span>
          <span />
        </div>
        {INVOICES.map((inv, i) => (
          <div
            key={inv.id}
            className={cn(
              'grid items-center gap-3 px-4 py-3 text-[13px]',
              i < INVOICES.length - 1 && 'border-b border-paper-line-soft',
            )}
            style={{ gridTemplateColumns: '1fr 120px 100px 90px 40px' }}
          >
            <span className="font-mono text-[12px] text-ink">{inv.id}</span>
            <span className="text-ink-2">{inv.date}</span>
            <span className="font-mono font-semibold">${inv.amount} USD</span>
            <span>
              <PaperBadge tone={inv.status === 'paid' ? 'ok' : 'warn'}>
                {inv.status === 'paid' ? 'Pagada' : 'Pendiente'}
              </PaperBadge>
            </span>
            <button
              type="button"
              className="rounded-md p-1 text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
              aria-label="Descargar"
            >
              <Icon.Download size={12} />
            </button>
          </div>
        ))}
      </PaperCard>
    </div>
  )
}
