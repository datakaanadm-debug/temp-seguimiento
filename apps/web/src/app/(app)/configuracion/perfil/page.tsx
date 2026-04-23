'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { initialsFromName } from '@/lib/utils'
import { useMyProfile } from '@/features/people/hooks/use-people'
import { useCurrentUser } from '@/providers/auth-provider'

export default function PerfilPage() {
  const user = useCurrentUser()
  const { data: profile, isLoading } = useMyProfile()

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Información visible a tu equipo.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback>{initialsFromName(user.name ?? user.email)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email} · {user.role_label}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            {profile?.bio && <p>{profile.bio}</p>}
            <p>
              Edición avanzada de perfil (skills, social links, datos académicos) estará disponible en la próxima iteración.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
