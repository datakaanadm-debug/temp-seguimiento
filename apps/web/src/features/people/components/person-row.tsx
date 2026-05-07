import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { PaperBadge, TonalAvatar } from '@/components/ui/primitives'
import type { Profile } from '@/types/api'

const ROLE_TONE: Record<string, 'accent' | 'info' | 'ok' | 'warn' | 'neutral'> = {
  intern: 'accent',
  mentor: 'info',
  team_lead: 'warn',
  hr: 'ok',
  tenant_admin: 'neutral',
  supervisor: 'neutral',
}

export function PersonRow({ profile }: { profile: Profile }) {
  const u = profile.user
  const progress = profile.intern_data?.progress_percent
  const badgeLabel = profile.role_label ?? profile.kind_label
  const badgeTone = profile.role ? (ROLE_TONE[profile.role] ?? 'neutral') : 'neutral'

  return (
    <Link
      href={`/practicantes/${profile.id}`}
      className="flex items-center gap-4 px-4 py-3 transition hover:bg-paper-bg-2"
    >
      <TonalAvatar size={36} name={u?.name ?? u?.email} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{u?.name ?? u?.email ?? '—'}</div>
        <div className="mt-0.5 truncate text-[11px] text-ink-3">
          {profile.position_title ?? badgeLabel}
          {profile.intern_data?.university && ` · ${profile.intern_data.university}`}
        </div>
      </div>
      {progress != null && (
        <div className="hidden items-center gap-2 md:flex">
          <div className="h-1 w-20 overflow-hidden rounded-full bg-paper-line-soft">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <span className="min-w-[32px] text-right font-mono text-[11px] text-ink-3">
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <PaperBadge tone={badgeTone}>{badgeLabel}</PaperBadge>
      <Icon.Chev size={12} className="text-ink-muted" />
    </Link>
  )
}
