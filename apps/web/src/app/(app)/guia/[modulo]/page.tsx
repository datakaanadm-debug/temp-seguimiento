import { notFound } from 'next/navigation'
import { GUIDE_MODULES, GUIDE_MODULE_BY_SLUG } from '@/features/guide/data/modules'
import { ModuleDetail } from '@/features/guide/components/module-detail'

export async function generateStaticParams() {
  return GUIDE_MODULES.map((m) => ({ modulo: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modulo: string }>
}) {
  const { modulo } = await params
  const m = GUIDE_MODULE_BY_SLUG[modulo]
  if (!m) return { title: 'Módulo no encontrado' }
  return { title: `Guía · ${m.name}` }
}

export default async function ModuleGuidePage({
  params,
}: {
  params: Promise<{ modulo: string }>
}) {
  const { modulo } = await params
  const m = GUIDE_MODULE_BY_SLUG[modulo]
  if (!m) notFound()
  return <ModuleDetail module={m} />
}
