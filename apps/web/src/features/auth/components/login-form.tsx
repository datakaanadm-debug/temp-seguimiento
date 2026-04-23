'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { getTenantSlug, setTenantSlug } from '@/lib/tenant'
import { login } from '../api'

const schema = z.object({
  tenantSlug: z
    .string()
    .min(1, 'Ingresa el slug de tu empresa')
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
  remember: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: getTenantSlug() ?? '', email: '', password: '' },
  })

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    try {
      setTenantSlug(data.tenantSlug)
      await login({ email: data.email, password: data.password, remember: data.remember })
      router.replace('/')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.errors?.email?.[0] ?? err.message ?? 'Credenciales inválidas'
        form.setError('email', { message: msg })
      } else {
        toast.error('No se pudo iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede a tu espacio de trabajo Interna.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">Empresa</Label>
            <Input
              id="tenantSlug"
              type="text"
              autoComplete="organization"
              placeholder="acme-tech"
              {...form.register('tenantSlug')}
              aria-invalid={!!form.formState.errors.tenantSlug}
            />
            {form.formState.errors.tenantSlug && (
              <p className="text-xs text-destructive">{form.formState.errors.tenantSlug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              {...form.register('email')}
              aria-invalid={!!form.formState.errors.email}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/recuperar" className="text-xs text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
              aria-invalid={!!form.formState.errors.password}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Nuevo en Interna?{' '}
            <Link href="/registro" className="text-primary hover:underline">
              Crea tu empresa
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
