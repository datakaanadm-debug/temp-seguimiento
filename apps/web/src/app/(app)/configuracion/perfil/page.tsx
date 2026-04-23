'use client'

import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, TonalAvatar,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyProfile } from '@/features/people/hooks/use-people'
import { useCurrentUser } from '@/providers/auth-provider'

export default function PerfilPage() {
  const user = useCurrentUser()
  const { data: profile, isLoading } = useMyProfile()

  return (
    <div>
      <SectionTitle
        kicker="Personal"
        title="Mi perfil"
        sub="Información visible a tu equipo y mentor"
        right={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            <Icon.Settings size={13} />
            Editar
          </button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <PaperCard className="mb-4">
            <div className="flex items-center gap-4">
              <TonalAvatar size={56} name={user.name ?? user.email} />
              <div className="min-w-0 flex-1">
                <div className="font-serif text-[20px] leading-tight text-ink">{user.name}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">{user.email}</div>
                <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                  {user.role_label}
                </div>
              </div>
            </div>
            {profile?.bio && (
              <p className="mt-4 border-t border-paper-line-soft pt-4 font-serif text-[15px] leading-[1.65] text-ink-2">
                {profile.bio}
              </p>
            )}
          </PaperCard>

          <PaperCard title="Preferencias">
            <div className="grid gap-4 md:grid-cols-2 text-[13px]">
              <Row label="Idioma" value={user.locale ?? 'es-MX'} />
              <Row label="Zona horaria" value={user.timezone ?? 'America/Mexico_City'} />
              <Row
                label="Verificación de email"
                value={user.email_verified_at ? 'Verificado' : 'Pendiente'}
                tone={user.email_verified_at ? 'ok' : 'warn'}
              />
              <Row
                label="2FA"
                value={user.two_factor_enabled ? 'Activado' : 'No activado'}
                tone={user.two_factor_enabled ? 'ok' : 'neutral'}
              />
            </div>
          </PaperCard>

          <div className="mt-4 rounded-md border border-dashed border-paper-line bg-paper-surface p-4 text-[12px] leading-[1.5] text-ink-3">
            La edición avanzada de perfil (skills, social links, datos académicos) estará
            disponible en la próxima iteración.
          </div>
        </>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'ok' | 'warn' | 'neutral'
}) {
  const color =
    tone === 'ok' ? 'text-success' : tone === 'warn' ? 'text-warning' : 'text-ink'
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">{label}</div>
      <div className={`mt-0.5 font-medium ${color}`}>{value}</div>
    </div>
  )
}
