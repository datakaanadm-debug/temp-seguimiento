'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { acceptInvitation } from '../api'

const schema = z.object({
  token: z.string().length(64),
  email: z.string().email(),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  password: z.string().min(12, 'Mínimo 12 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function AcceptInvitationForm({
  token,
  email,
  tenantSlug,
}: {
  token: string
  email: string
  tenantSlug?: string
}) {
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (tenantSlug) {
      document.cookie = `tenant_slug=${tenantSlug}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    }
  }, [tenantSlug])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token,
      email,
      name: '',
      password: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await acceptInvitation({
        ...data,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
      })
      setAccepted(true)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          form.setError(field as keyof FormValues, { message: messages[0] })
        }
      } else {
        toast.error((err as Error)?.message ?? 'No se pudo aceptar la invitación')
      }
    }
  }

  if (accepted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>¡Cuenta activada!</CardTitle>
          <CardDescription>Ahora puedes iniciar sesión.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Ir al login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aceptar invitación</CardTitle>
        <CardDescription>
          Completa tus datos para activar tu cuenta en Senda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...form.register('token')} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" readOnly {...form.register('email')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tu nombre</Label>
            <Input id="name" autoFocus {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña (mín. 12)</Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Activando…' : 'Activar cuenta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
