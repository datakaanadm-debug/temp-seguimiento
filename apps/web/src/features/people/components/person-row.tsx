import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { initialsFromName } from '@/lib/utils'
import type { Profile } from '@/types/api'

export function PersonRow({ profile }: { profile: Profile }) {
  const u = profile.user
  return (
    <Link
      href={`/practicantes/${profile.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={u?.avatar_url ?? undefined} />
        <AvatarFallback>{initialsFromName(u?.name ?? u?.email ?? '?')}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{u?.name ?? u?.email ?? '—'}</div>
        <div className="text-xs text-muted-foreground truncate">
          {profile.position_title ?? profile.kind_label}
          {profile.intern_data?.university && ` · ${profile.intern_data.university}`}
        </div>
      </div>
      {profile.intern_data?.progress_percent != null && (
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Horas</span>
          <span className="text-sm font-medium tabular-nums">
            {Math.round(profile.intern_data.progress_percent)}%
          </span>
        </div>
      )}
      <Badge variant="outline">{profile.kind_label}</Badge>
    </Link>
  )
}
