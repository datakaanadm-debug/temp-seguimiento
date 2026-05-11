'use client'

import { useState } from 'react'
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
import { registerTenant } from '../api'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  slug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(48)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Solo minúsculas, números y guiones'),
  admin_name: z.string().min(2, 'Mínimo 2 caracteres'),
  admin_email: z.string().email('Email inválido'),
  admin_password: z.string().min(12, 'Mínimo 12 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', admin_name: '', admin_email: '', admin_password: '' },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await registerTenant(data)
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        for (const [field, messages] of Object.entries(err.errors)) {
          form.setError(field as keyof FormValues, { message: messages[0] })
        }
      } else {
        toast.error((err as Error)?.message ?? 'No se pudo registrar la empresa')
      }
    }
  }

  if (submitted) {
    // El backend hoy NO envía email de verificación — el admin queda activo
    // inmediatamente. Antes este estado decía "Revisa tu correo · enviamos
    // un link de verificación" que mentía y dejaba al user refrescando su
    // inbox para siempre. Honesto: confirmamos creación y mandamos a login.
    return (
      <Card>
        <CardHeader>
          <CardTitle>¡Empresa creada!</CardTitle>
          <CardDescription>
            Tu workspace <strong>{form.getValues('slug')}</strong> está listo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Inicia sesión con <strong>{form.getValues('admin_email')}</strong> para
            empezar a invitar a tu equipo y configurar el workspace.
          </p>
          <Link
            href={`/login?slug=${encodeURIComponent(form.getValues('slug'))}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-[7px] text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir al login →
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu empresa</CardTitle>
        <CardDescription>14 días de prueba gratis, sin tarjeta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la empresa</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Subdominio</Label>
            <div className="flex items-center gap-1">
              <Input id="slug" {...form.register('slug')} placeholder="mi-empresa" className="lowercase" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">.interna.app</span>
            </div>
            {form.formState.errors.slug && (
              <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">Tu cuenta de administrador</p>
            <div className="space-y-2">
              <Label htmlFor="admin_name">Tu nombre</Label>
              <Input id="admin_name" {...form.register('admin_name')} />
              {form.formState.errors.admin_name && (
                <p className="text-xs text-destructive">{form.formState.errors.admin_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_email">Email</Label>
              <Input id="admin_email" type="email" {...form.register('admin_email')} />
              {form.formState.errors.admin_email && (
                <p className="text-xs text-destructive">{form.formState.errors.admin_email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_password">Contraseña (mín. 12)</Label>
              <Input id="admin_password" type="password" {...form.register('admin_password')} />
              {form.formState.errors.admin_password && (
                <p className="text-xs text-destructive">{form.formState.errors.admin_password.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Creando…' : 'Crear empresa'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
