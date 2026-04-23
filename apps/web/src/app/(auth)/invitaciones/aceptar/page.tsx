import { redirect } from 'next/navigation'
import { AcceptInvitationForm } from '@/features/auth/components/accept-invitation-form'

export const metadata = { title: 'Aceptar invitación' }

type SearchParams = Promise<{ token?: string; email?: string }>

export default async function AceptarPage({ searchParams }: { searchParams: SearchParams }) {
  const { token, email } = await searchParams
  if (!token || !email || token.length !== 64) {
    redirect('/login')
  }
  return <AcceptInvitationForm token={token!} email={email!} />
}
