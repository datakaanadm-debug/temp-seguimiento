'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, PanelLeftClose, User as UserIcon, Settings } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useUiStore } from '@/lib/stores/ui-store'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initialsFromName, cn } from '@/lib/utils'
import { useConnectionStatus } from '@/hooks/use-connection-status'

export function Topbar() {
  const router = useRouter()
  const { user, tenant, setUser, setTenant } = useAuth()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const connectionStatus = useConnectionStatus()

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout')
    } catch {
      /* silencio */
    }
    setUser(null)
    setTenant(null)
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center border-b bg-card px-4 gap-3">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </Button>

      <div className="flex-1" />

      {/* Connection indicator */}
      <ConnectionDot status={connectionStatus} />

      {/* Notifications */}
      <Button variant="ghost" size="icon" asChild>
        <Link href="/notificaciones" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
        </Link>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-auto py-1.5 pr-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? ''} />
              <AvatarFallback>{initialsFromName(user?.name ?? user?.email ?? '?')}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-xs font-medium leading-tight">{user?.name ?? user?.email}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{user?.role_label}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="text-xs text-muted-foreground">Sesión en</div>
            <div className="text-sm font-semibold">{tenant?.name}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/configuracion/perfil">
              <UserIcon className="h-4 w-4" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/configuracion/notificaciones">
              <Settings className="h-4 w-4" />
              Preferencias
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

function ConnectionDot({ status }: { status: string }) {
  const [color, label] = (() => {
    switch (status) {
      case 'connected':
        return ['bg-success', 'Conectado'] as const
      case 'connecting':
      case 'unavailable':
      case 'initializing':
        return ['bg-warning animate-pulse', 'Reconectando'] as const
      default:
        return ['bg-destructive', 'Sin conexión'] as const
    }
  })()
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span className="hidden lg:inline">{label}</span>
    </span>
  )
}
