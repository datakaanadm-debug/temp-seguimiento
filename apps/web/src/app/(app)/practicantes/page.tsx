'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfiles } from '@/features/people/hooks/use-people'
import { PersonRow } from '@/features/people/components/person-row'
import { Search } from 'lucide-react'

export default function PracticantesPage() {
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''))
  const [kind, setKind] = useQueryState('kind', parseAsString)

  const { data, isLoading } = useProfiles({
    q: q || undefined,
    kind: kind ?? undefined,
    per_page: 50,
  })
  const profiles = data?.data ?? []

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Personas</h1>
        <p className="text-sm text-muted-foreground">Practicantes, mentores y equipo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            value={q ?? ''}
            onChange={(e) => setQ(e.target.value || null)}
            className="pl-9"
          />
        </div>
        {(['intern', 'mentor', 'staff'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(kind === k ? null : k)}
            className={`px-3 py-1.5 rounded-md border text-sm ${
              kind === k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {k === 'intern' ? 'Practicantes' : k === 'mentor' ? 'Mentores' : 'Staff'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
          Sin resultados.
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {profiles.map((p) => (
            <PersonRow key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  )
}
