import { TonalAvatar } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/**
 * TypingIndicator — muestra quién está escribiendo en un hilo/campo.
 * Úsalo en comentarios de tareas, notas de mentoría, chat de coach, etc.
 */
export function TypingIndicator({
  users,
  className,
}: {
  users: Array<{ name: string; tone?: string }>
  className?: string
}) {
  if (users.length === 0) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-paper-line-soft bg-paper-surface px-2.5 py-1 text-[11px] text-ink-3 animate-fade-in',
        className,
      )}
    >
      <div className="flex -space-x-1.5">
        {users.slice(0, 3).map((u) => (
          <div key={u.name} className="rounded-full border border-paper-raised">
            <TonalAvatar size={16} name={u.name} tone={u.tone} />
          </div>
        ))}
      </div>
      <span>
        {users.length === 1
          ? `${users[0]!.name.split(' ')[0]} está escribiendo`
          : `${users[0]!.name.split(' ')[0]} y ${users.length - 1} más escribiendo`}
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-pulse rounded-full bg-ink-3" />
        <span
          className="h-1 w-1 animate-pulse rounded-full bg-ink-3"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1 w-1 animate-pulse rounded-full bg-ink-3"
          style={{ animationDelay: '300ms' }}
        />
      </span>
    </div>
  )
}
