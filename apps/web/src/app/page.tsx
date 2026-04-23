import { redirect } from 'next/navigation'
import { getSessionServer } from '@/lib/auth/server'

export default async function RootPage() {
  const session = await getSessionServer()
  if (!session) {
    redirect('/login')
  }
  // Redirigir según rol
  if (session.user.role === 'intern') {
    redirect('/mi-dia')
  }
  redirect('/dashboard')
}
