import { notFound } from 'next/navigation';
import { server } from '@/server/api';
import CaptureForm from '@/components/CaptureForm';
import { PageHeader } from '@/components/Ui';

export const metadata = { title: 'Evidencia' };
export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await server.getMachineView(id);
  if (!v) notFound();
  return <>
    <PageHeader title="Evidencia" eyebrow="Forja3D MX / Datos de ejemplo" description={`${v.machine.id} / ${v.machine.nameplate_model} · ${v.site.name}`} />
    <CaptureForm machineId={v.machine.id} parts={[...new Set(v.stock.map((s) => s.part_type))]} registeredModel={v.machine.nameplate_model} />
  </>;
}
