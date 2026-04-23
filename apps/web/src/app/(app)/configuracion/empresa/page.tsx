'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard } from '@/components/ui/primitives'
import { useAuth } from '@/providers/auth-provider'
import { updateTenant } from '@/features/auth/api'

const ACCENTS = [
  { id: 'cobalt', label: 'Cobalto', c: '#3a5f8a' },
  { id: 'terracotta', label: 'Terracota', c: '#c8532b' },
  { id: 'ink', label: 'Tinta', c: '#2a2320' },
  { id: 'olive', label: 'Oliva', c: '#5a7a3f' },
]

export default function EmpresaPage() {
  const { tenant, setTenant } = useAuth()
  const settings = (tenant?.settings ?? {}) as Record<string, any>
  const theme = (tenant?.theme ?? {}) as Record<string, any>

  const [form, setForm] = useState({
    name: tenant?.name ?? '',
    slug: tenant?.slug ?? '',
    domain: settings.domain ?? '',
    industry: settings.industry ?? 'Tecnología',
    size: settings.size ?? '11-50',
    data_residency: (tenant?.data_residency ?? 'latam') as 'latam' | 'us' | 'eu',
    accent: theme.accent ?? 'cobalt',
  })
  const [saving, setSaving] = useState(false)

  // Re-sync si tenant cambia
  useEffect(() => {
    if (!tenant) return
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      domain: (tenant.settings as any)?.domain ?? '',
      industry: (tenant.settings as any)?.industry ?? 'Tecnología',
      size: (tenant.settings as any)?.size ?? '11-50',
      data_residency: tenant.data_residency,
      accent: (tenant.theme as any)?.accent ?? 'cobalt',
    })
  }, [tenant?.id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateTenant({
        name: form.name,
        slug: form.slug,
        data_residency: form.data_residency,
        theme: { ...theme, accent: form.accent },
        settings: {
          ...settings,
          industry: form.industry,
          size: form.size,
          domain: form.domain || null,
        } as any,
      })
      setTenant(res.tenant)
      toast.success('Configuración de empresa guardada')
    } catch (err: any) {
      const msg = err?.errors?.slug?.[0] ?? err?.message ?? 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <SectionTitle
        kicker="Workspace"
        title="Empresa"
        sub="Información general, branding y residencia de datos"
        right={
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        }
      />

      <PaperCard title="Información general" className="mb-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre comercial">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-paper"
              required
            />
          </Field>
          <Field label="Slug · subdominio">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                }
                className="input-paper flex-1 font-mono"
                required
              />
              <span className="font-mono text-[11px] text-ink-3">.interna.app</span>
            </div>
          </Field>
          <Field label="Dominio corporativo (opcional)">
            <input
              type="text"
              placeholder="acme-tech.com"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="input-paper font-mono"
            />
          </Field>
          <Field label="Industria">
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="input-paper"
            >
              <option>Tecnología</option>
              <option>Consultoría</option>
              <option>Fintech</option>
              <option>Retail</option>
              <option>Educación</option>
              <option>Otro</option>
            </select>
          </Field>
          <Field label="Tamaño">
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="input-paper"
            >
              <option value="1-10">1–10</option>
              <option value="11-50">11–50</option>
              <option value="51-200">51–200</option>
              <option value="201-500">201–500</option>
              <option value="501+">501+</option>
            </select>
          </Field>
          <Field label="Residencia de datos">
            <select
              value={form.data_residency}
              onChange={(e) =>
                setForm({ ...form, data_residency: e.target.value as 'latam' | 'us' | 'eu' })
              }
              className="input-paper"
            >
              <option value="latam">LATAM (MX)</option>
              <option value="us">Estados Unidos</option>
              <option value="eu">Europa (EU)</option>
            </select>
          </Field>
        </div>
      </PaperCard>

      <PaperCard
        title="Branding"
        right={<span className="text-[11px] text-ink-3">afecta a toda tu workspace</span>}
      >
        <Field label="Color de acento">
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setForm({ ...form, accent: a.id })}
                title={a.label}
                className="relative h-10 w-14 rounded-md border-2 transition"
                style={{
                  background: a.c,
                  borderColor: form.accent === a.id ? 'hsl(var(--ink))' : 'hsl(var(--paper-line))',
                }}
              >
                {form.accent === a.id && (
                  <span className="absolute inset-0 flex items-center justify-center text-white">
                    <Icon.Check size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Field>
        <div className="mt-4 rounded-md border border-dashed border-paper-line bg-paper-surface p-8 text-center">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-ink-3">
            Logo
          </div>
          <div className="mt-1.5 text-[12px] text-ink-3">
            Arrastra un archivo aquí o{' '}
            <button type="button" className="font-medium text-primary hover:underline">
              busca en tu equipo
            </button>
          </div>
          <div className="mt-1 text-[10.5px] text-ink-muted">
            PNG o SVG · min 200×200 · máx 2 MB (subida pendiente de integración)
          </div>
        </div>
      </PaperCard>

      <style jsx>{`
        .input-paper {
          width: 100%;
          border: 1px solid hsl(var(--paper-line));
          background: hsl(var(--paper-surface));
          border-radius: var(--radius-md);
          padding: 7px 10px;
          font-size: 13px;
          color: hsl(var(--ink));
        }
        .input-paper:focus {
          outline: none;
          border-color: hsl(var(--accent-h));
        }
      `}</style>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.4px] text-ink-3">{label}</span>
      {children}
    </label>
  )
}
