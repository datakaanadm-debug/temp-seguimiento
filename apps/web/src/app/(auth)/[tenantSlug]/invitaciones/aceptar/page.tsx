import { redirect } from 'next/navigation'
import { AcceptInvitationForm } from '@/features/auth/components/accept-invitation-form'

export const metadata = { title: 'Aceptar invitación' }

type Params = Promise<{ tenantSlug: string }>
type SearchParams = Promise<{ token?: string; email?: string }>

/**
 * Ruta pública que recibe el link de invitación del email.
 *
 * Formato: `/{tenantSlug}/invitaciones/aceptar?token=...&email=...`
 *
 * El slug del path se pasa al form para que persista la cookie tenant_slug
 * antes de aceptar, así los endpoints authenticated posteriores ya conocen
 * el tenant correcto.
 */
export default async function AceptarPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { tenantSlug } = await params
  const { token, email } = await searchParams

  if (!token || !email || token.length !== 64) {
    redirect('/login')
  }

  return <AcceptInvitationForm token={token!} email={email!} tenantSlug={tenantSlug} />
}
