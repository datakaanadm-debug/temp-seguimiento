import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { PaperBadge, TonalAvatar } from '@/components/ui/primitives'
import type { Profile } from '@/types/api'

export function PersonRow({ profile }: { profile: Profile }) {
  const u = profile.user
  const progress = profile.intern_data?.progress_percent
  const toneMap: Record<string, 'accent' | 'info' | 'ok' | 'neutral'> = {
    intern: 'accent',
    mentor: 'info',
    staff: 'ok',
  }

  return (
    <Link
      href={`/practicantes/${profile.id}`}
      className="flex items-center gap-4 px-4 py-3 transition hover:bg-paper-bg-2"
    >
      <TonalAvatar size={36} name={u?.name ?? u?.email} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{u?.name ?? u?.email ?? '—'}</div>
        <div className="mt-0.5 truncate text-[11px] text-ink-3">
          {profile.position_title ?? profile.kind_label}
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
      <PaperBadge tone={toneMap[profile.kind] ?? 'neutral'}>{profile.kind_label}</PaperBadge>
      <Icon.Chev size={12} className="text-ink-muted" />
    </Link>
  )
}
