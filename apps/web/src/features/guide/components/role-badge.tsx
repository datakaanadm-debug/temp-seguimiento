import { cn } from '@/lib/utils'
import type { MembershipRole } from '@/types/api'
import type { FlowStep } from '../data/modules'

const ROLE_LABEL: Record<MembershipRole | 'system' | 'any', string> = {
  tenant_admin: 'Admin',
  hr: 'RR. HH.',
  team_lead: 'Líder',
  mentor: 'Mentor',
  intern: 'Practicante',
  supervisor: 'Supervisor',
  viewer: 'Lector',
  system: 'Sistema',
  any: 'Cualquiera',
}

const ROLE_TONE: Record<MembershipRole | 'system' | 'any', string> = {
  tenant_admin: 'bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-700/40',
  hr: 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-700/40',
  team_lead: 'bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700/40',
  mentor: 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700/40',
  intern: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/40',
  supervisor: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/40',
  viewer: 'bg-paper-bg-2 text-ink-2 border-paper-line',
  system: 'bg-paper-bg-2 text-ink-3 border-paper-line',
  any: 'bg-paper-bg-2 text-ink-2 border-paper-line',
}

export function RoleBadge({
  role,
  size = 'md',
  className,
}: {
  role: MembershipRole | 'system' | 'any' | FlowStep['actor']
  size?: 'sm' | 'md'
  className?: string
}) {
  const r = role as keyof typeof ROLE_LABEL
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        ROLE_TONE[r] ?? ROLE_TONE.any,
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-[11.5px]',
        className,
      )}
    >
      {ROLE_LABEL[r] ?? r}
    </span>
  )
}

export function RoleBadgeRow({ roles }: { roles: MembershipRole[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => (
        <RoleBadge key={r} role={r} />
      ))}
    </div>
  )
}
