import { Sidebar } from '@/components/shared/sidebar'
import { Topbar } from '@/components/shared/topbar'
import { CommandPalette } from '@/components/shared/command-palette'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { AuthProvider } from '@/providers/auth-provider'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { requireSession } from '@/lib/auth/server'

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant } = await requireSession()

  return (
    <AuthProvider initialUser={user} initialTenant={tenant}>
      <RealtimeProvider>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <OfflineBanner />
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </div>
          <CommandPalette />
        </div>
      </RealtimeProvider>
    </AuthProvider>
  )
}
