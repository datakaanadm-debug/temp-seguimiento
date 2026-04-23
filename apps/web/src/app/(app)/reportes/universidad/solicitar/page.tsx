import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard } from '@/components/ui/primitives'
import { UniversityReportForm } from '@/features/reports/components/university-report-form'

export const metadata = { title: 'Reporte universidad' }

export default function SolicitarUniversidadPage() {
  return (
    <div className="mx-auto max-w-[720px] px-7 py-5 pb-10">
      <Link
        href="/reportes"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Reportes
      </Link>

      <SectionTitle
        kicker="Reporte académico"
        title="Reporte oficial para universidad"
        sub="Genera el PDF con horas acumuladas, KPIs, evaluaciones firmadas y bitácora del periodo."
      />

      <PaperCard>
        <UniversityReportForm />
      </PaperCard>

      <div className="mt-4 rounded-md border border-dashed border-paper-line bg-paper-surface p-4 text-[12px] leading-[1.5] text-ink-3">
        <b className="text-ink-2">Tip:</b> el reporte se genera en segundo plano. Recibirás
        una notificación cuando esté listo en tu historial de{' '}
        <Link href="/reportes" className="text-primary hover:underline">
          /reportes
        </Link>
        .
      </div>
    </div>
  )
}
