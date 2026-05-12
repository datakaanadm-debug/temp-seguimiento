'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { PaperCard, SectionTitle } from '@/components/ui/primitives'
import { GUIDE_MODULES } from '@/features/guide/data/modules'
import { ModuleCard } from '@/features/guide/components/module-detail'
import { useAuth } from '@/providers/auth-provider'

/**
 * Index de /guia: overview + grid de los 14 módulos como cards.
 * El sidebar del layout ya lista todo — esta página agrega contexto
 * general (qué es la guía, cómo está organizada) y un grid visual
 * más atractivo que la lista.
 */
export default function GuiaIndexPage() {
  const { user } = useAuth()

  return (
    <div className="pb-12">
      <SectionTitle
        kicker="Senda · Guía operativa"
        title={user?.name ? `Hola ${user.name.split(' ')[0]}, esta es tu guía` : 'Guía operativa de Senda'}
        sub="Cada módulo de la plataforma explicado: qué hace, quién lo usa, en qué orden ocurren las cosas. Pensada para tenerla cerca cuando aparezca una duda."
      />

      {/* Cómo está organizada */}
      <PaperCard title="Cómo está organizada" className="mb-5">
        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="flex gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[10px] font-semibold text-primary-ink">
              1
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-ink">Para qué sirve</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">Resumen del módulo en 1‑2 frases.</div>
            </div>
          </li>
          <li className="flex gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[10px] font-semibold text-primary-ink">
              2
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-ink">Flujo paso a paso</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">Quién hace qué, en qué orden, con animación.</div>
            </div>
          </li>
          <li className="flex gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[10px] font-semibold text-primary-ink">
              3
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-ink">Casos típicos + tips</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">Escenarios reales y errores comunes a evitar.</div>
            </div>
          </li>
        </ul>
      </PaperCard>

      {/* Grid de módulos */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-serif text-[20px] font-normal text-ink">Los 14 módulos</h2>
        <span className="font-mono text-[11px] text-ink-3">Click en cualquiera para abrir su guía</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDE_MODULES.map((m) => (
          <ModuleCard key={m.slug} module={m} />
        ))}
      </div>

      {/* Footer con tips operativos */}
      <div className="mt-8 rounded-lg border border-dashed border-paper-line bg-paper-surface p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-primary-ink">
            <Icon.Sparkles size={18} />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">¿No encontrás algo?</div>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-2">
              Probá con el <kbd className="rounded border border-paper-line bg-paper-raised px-1 py-0.5 font-mono text-[10.5px]">⌘K</kbd> Coach IA — le podés preguntar en lenguaje natural cómo hacer cualquier cosa en Senda y te responde con pasos específicos.
            </p>
            <Link
              href="/ia"
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-ink hover:underline"
            >
              Abrir Coach IA
              <Icon.Chev size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
