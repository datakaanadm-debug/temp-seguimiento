'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

// Mock mientras no exista el módulo OKRs en backend.
// Estructura data-driven lista para conectar a /api/v1/okrs cuando exista.

type KR = {
  id: string
  text: string
  progress: number
  confidence: number // 0-10
  owner?: string
}

type Objective = {
  id: string
  level: 'company' | 'team' | 'individual'
  label: string
  owner: string
  quarter: string
  krs: KR[]
  children?: string[] // ids de objectivos hijo
}

const OBJECTIVES: Objective[] = [
  {
    id: 'o1',
    level: 'company',
    label: 'Consolidar Interna como la plataforma #1 de gestión de practicantes en LATAM',
    owner: 'Acme Tech',
    quarter: 'Q2 2026',
    krs: [
      { id: 'kr1', text: 'Alcanzar 30 empresas cliente activas', progress: 42, confidence: 6 },
      { id: 'kr2', text: 'NPS del programa > 55 pts', progress: 78, confidence: 9 },
      { id: 'kr3', text: '85% retención trimestral de empresas', progress: 60, confidence: 7 },
    ],
    children: ['o2', 'o3'],
  },
  {
    id: 'o2',
    level: 'team',
    label: 'Elevar la experiencia del producto — equipo Diseño',
    owner: 'Equipo Diseño',
    quarter: 'Q2 2026',
    krs: [
      { id: 'kr4', text: 'Reducir tareas de fricción en onboarding de 7 a 3', progress: 55, confidence: 7 },
      { id: 'kr5', text: 'Publicar design system v2 con 40+ componentes', progress: 30, confidence: 5 },
      { id: 'kr6', text: 'Co-facilitar 3 workshops con Producto', progress: 66, confidence: 8 },
    ],
    children: ['o4'],
  },
  {
    id: 'o3',
    level: 'team',
    label: 'Reducir bloqueos y fricción operativa — equipo Ingeniería',
    owner: 'Equipo Ingeniería',
    quarter: 'Q2 2026',
    krs: [
      { id: 'kr7', text: 'Disminuir tiempo medio de merge de 2d a 8h', progress: 70, confidence: 8 },
      { id: 'kr8', text: 'Cero incidentes en producción > P2', progress: 100, confidence: 10 },
      { id: 'kr9', text: 'Migración de auth legacy completada', progress: 20, confidence: 4 },
    ],
    children: [],
  },
  {
    id: 'o4',
    level: 'individual',
    label: 'Elevar consistencia visual del producto',
    owner: 'Valentina Cruz',
    quarter: 'Q2 2026',
    krs: [
      { id: 'kr10', text: 'Auditar 100% de componentes críticos', progress: 90, confidence: 9 },
      { id: 'kr11', text: 'Proponer 3 mejoras priorizadas', progress: 66, confidence: 7 },
      { id: 'kr12', text: 'Implementar 1 mejora end-to-end', progress: 30, confidence: 5 },
    ],
    children: [],
  },
]

const VIEWS = [
  { id: 'mine', label: 'Los míos' },
  { id: 'team', label: 'Por equipo' },
  { id: 'tree', label: 'Alineación' },
] as const
type View = (typeof VIEWS)[number]['id']

export default function OkrsPage() {
  const [view, setView] = useState<View>('mine')

  const mine = OBJECTIVES.filter((o) => o.level === 'individual')
  const team = OBJECTIVES.filter((o) => o.level === 'team')
  const company = OBJECTIVES.filter((o) => o.level === 'company')

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Objetivos · Q2 2026"
        title="Objetivos y resultados clave (OKRs)"
        sub={`${company.length} de empresa · ${team.length} de equipo · ${mine.length} individuales · check-in semanal los viernes`}
        right={
          <>
            <div className="inline-flex rounded-md border border-paper-line bg-paper-raised p-0.5">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    'rounded-[4px] px-2.5 py-[5px] text-[12px] transition',
                    view === v.id
                      ? 'bg-paper-bg-2 font-semibold text-ink'
                      : 'font-medium text-ink-3 hover:text-ink',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
              <Icon.Plus size={13} />
              Nuevo OKR
            </button>
          </>
        }
      />

      {view === 'tree' ? (
        <AlignmentTree objectives={OBJECTIVES} />
      ) : (
        <div className="flex flex-col gap-4">
          {(view === 'mine' ? mine : team).map((o) => (
            <ObjectiveCard key={o.id} objective={o} />
          ))}
        </div>
      )}
    </div>
  )
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const avg = objective.krs.reduce((a, k) => a + k.progress, 0) / Math.max(1, objective.krs.length)
  const conf = objective.krs.reduce((a, k) => a + k.confidence, 0) / Math.max(1, objective.krs.length)
  const levelTone = { company: 'ok', team: 'accent', individual: 'info' } as const

  return (
    <PaperCard>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <PaperBadge tone={levelTone[objective.level]} className="!text-[10px] uppercase">
              {objective.level === 'company' ? 'EMPRESA' : objective.level === 'team' ? 'EQUIPO' : 'INDIVIDUAL'}
            </PaperBadge>
            <span className="font-mono text-[11px] text-ink-3">{objective.quarter}</span>
            <span className="ml-auto font-mono text-[11px] text-ink-3">{objective.owner}</span>
          </div>
          <div className="font-serif text-[17px] leading-tight tracking-tight text-ink">
            {objective.label}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-0.5 flex justify-between text-[11px]">
                <span className="text-ink-3">Progreso global</span>
                <span className="font-mono text-ink">{Math.round(avg)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-paper-line-soft">
                <div className="h-full rounded-full bg-primary" style={{ width: `${avg}%` }} />
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase text-ink-3">Confianza</div>
              <div className="font-serif text-[18px] leading-none text-ink">
                {conf.toFixed(1)}<span className="text-[11px] text-ink-3">/10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-paper-line-soft pt-3">
        {objective.krs.map((k, i) => (
          <div key={k.id}>
            <div className="mb-1 flex items-center gap-2 text-[12.5px]">
              <span className="font-mono text-[11px] font-semibold text-primary">
                KR{i + 1}
              </span>
              <span className="flex-1 text-ink-2">{k.text}</span>
              <span className="font-mono text-[11px] text-ink-3">{k.progress}%</span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-paper-line-soft">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${k.progress}%`,
                  background:
                    k.confidence >= 7
                      ? 'hsl(var(--ok))'
                      : k.confidence >= 4
                        ? 'hsl(var(--warn))'
                        : 'hsl(var(--danger))',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-paper-line-soft pt-3 text-[11px] text-ink-3">
        <Icon.Cal size={11} />
        Último check-in: viernes pasado
        <button className="ml-auto inline-flex items-center gap-1 rounded-md border border-paper-line bg-paper-raised px-2 py-1 text-[11px] font-medium text-ink-2 hover:border-paper-line-soft">
          <Icon.Plus size={10} />
          Check-in
        </button>
      </div>
    </PaperCard>
  )
}

function AlignmentTree({ objectives }: { objectives: Objective[] }) {
  const byId = new Map(objectives.map((o) => [o.id, o] as const))
  const roots = objectives.filter((o) => o.level === 'company')

  return (
    <div className="rounded-lg border border-paper-line bg-paper-raised p-5 shadow-paper-1">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
        Árbol de alineación · Q2 2026
      </div>
      <div className="flex flex-col gap-5">
        {roots.map((r) => (
          <TreeNode key={r.id} node={r} byId={byId} depth={0} />
        ))}
      </div>
    </div>
  )
}

function TreeNode({
  node,
  byId,
  depth,
}: {
  node: Objective
  byId: Map<string, Objective>
  depth: number
}) {
  const avg = node.krs.reduce((a, k) => a + k.progress, 0) / Math.max(1, node.krs.length)
  const levelLabel = node.level === 'company' ? 'EMPRESA' : node.level === 'team' ? 'EQUIPO' : 'INDIVIDUAL'
  const levelColor =
    node.level === 'company'
      ? 'hsl(var(--ok))'
      : node.level === 'team'
        ? 'hsl(var(--accent-h))'
        : 'hsl(var(--info))'

  return (
    <div className="relative flex flex-col gap-3" style={{ paddingLeft: depth * 28 }}>
      {depth > 0 && (
        <span
          className="absolute top-0 h-full w-px bg-paper-line"
          style={{ left: depth * 28 - 14 }}
        />
      )}

      <div
        className={cn(
          'relative flex items-start gap-3 rounded-md border border-paper-line-soft bg-paper-surface p-3',
          depth > 0 && 'before:absolute before:-left-[14px] before:top-[18px] before:h-px before:w-3.5 before:bg-paper-line',
        )}
      >
        <span
          className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: levelColor }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-semibold tracking-wider"
              style={{ color: levelColor }}
            >
              {levelLabel}
            </span>
            <span className="font-mono text-[10.5px] text-ink-3">{node.owner}</span>
          </div>
          <div className="font-serif text-[15px] leading-tight text-ink">{node.label}</div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-line-soft">
              <div
                className="h-full rounded-full"
                style={{ width: `${avg}%`, background: levelColor }}
              />
            </div>
            <span className="font-mono text-[10.5px] text-ink-3">{Math.round(avg)}%</span>
          </div>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="flex flex-col gap-3">
          {node.children.map((cid) => {
            const child = byId.get(cid)
            if (!child) return null
            return <TreeNode key={cid} node={child} byId={byId} depth={depth + 1} />
          })}
        </div>
      )}
    </div>
  )
}
