'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { initialsFromName } from '@/lib/utils'
import { useProfile } from '@/features/people/hooks/use-people'

export default function PracticantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: profile, isLoading } = useProfile(id)

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!profile) {
    return <div className="container py-12 text-center text-muted-foreground">Perfil no encontrado.</div>
  }

  const u = profile.user
  const intern = profile.intern_data

  return (
    <div className="container py-6 max-w-4xl">
      <Link href="/practicantes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Practicantes
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={u?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl">{initialsFromName(u?.name ?? u?.email ?? '?')}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{u?.name ?? u?.email}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {profile.position_title ?? profile.kind_label}
            {intern?.semester && ` · ${intern.semester}º semestre`}
          </div>
          <div className="mt-2 flex gap-2">
            <Badge>{profile.kind_label}</Badge>
            {intern?.university && <Badge variant="outline">{intern.university}</Badge>}
          </div>
        </div>
      </div>

      {profile.bio && (
        <div className="mt-6 text-sm text-foreground/80">{profile.bio}</div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {intern && (
          <Card>
            <CardHeader>
              <CardTitle>Datos académicos</CardTitle>
              <CardDescription>Convenio universitario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Universidad" value={intern.university} />
              <Row label="Carrera" value={intern.career} />
              <Row label="Semestre" value={intern.semester?.toString() ?? null} />
              <Row label="Tutor académico" value={intern.university_advisor} />
              <Row
                label="Horas"
                value={
                  intern.mandatory_hours
                    ? `${intern.hours_completed}/${intern.mandatory_hours} (${Math.round(intern.progress_percent ?? 0)}%)`
                    : '—'
                }
              />
              {intern.gpa != null && <Row label="GPA" value={String(intern.gpa)} />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Info de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Email" value={u?.email ?? null} />
            <Row label="Teléfono" value={profile.phone ?? null} />
            <Row
              label="Inicio"
              value={profile.start_date ? new Date(profile.start_date).toLocaleDateString('es-MX') : null}
            />
            <Row
              label="Término"
              value={profile.end_date ? new Date(profile.end_date).toLocaleDateString('es-MX') : null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}
