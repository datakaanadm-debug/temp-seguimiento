import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperCard } from '@/components/ui/primitives'
import { TeamReportForm } from '@/features/reports/components/team-report-form'

export const metadata = { title: 'Reporte de equipo' }

export default function SolicitarEquipoPage() {
  return (
    <div className="mx-auto max-w-[720px] px-7 py-5 pb-10">
      <Link
        href="/reportes"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Reportes
      </Link>

      <SectionTitle
        kicker="Reporte operativo"
        title="Reporte de equipo"
        sub="Genera el PDF con miembros, tareas cerradas, OKRs avanzados y bitácoras del periodo."
      />

      <PaperCard>
        <TeamReportForm />
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
