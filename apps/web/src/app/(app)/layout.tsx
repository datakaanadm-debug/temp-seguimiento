import { Sidebar } from '@/components/shared/sidebar'
import { Topbar } from '@/components/shared/topbar'
import { CommandPalette } from '@/components/shared/command-palette'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { AiCoach } from '@/components/shared/ai-coach'
import { PresenceBar } from '@/components/shared/presence-bar'
import { AuthProvider } from '@/providers/auth-provider'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { requireSession } from '@/lib/auth/server'

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant } = await requireSession()

  return (
    <AuthProvider initialUser={user} initialTenant={tenant}>
      <RealtimeProvider>
        <div className="flex h-dvh overflow-hidden bg-paper">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <OfflineBanner />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
          <CommandPalette />
          <AiCoach />
          <PresenceBar />
        </div>
      </RealtimeProvider>
    </AuthProvider>
  )
}
