import { notFound } from 'next/navigation';
import { server } from '@/server/api';
import EquipmentVisual from '@/components/EquipmentVisual';
import GateChecklist from '@/components/GateChecklist';
import ProposalPanel from '@/components/ProposalPanel';
import { Fact, PageHeader } from '@/components/Ui';
import { PART_LABELS, dateTime } from '@/components/format';

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, sites] = await Promise.all([server.getProposal(id), server.listSites()]);
  if (!p) notFound();
  const site = sites.find((s) => s.id === p.site_id);
  return <>
    <PageHeader title={PART_LABELS[p.part_type]} description={`${p.machine_id} · ${site?.name ?? p.site_id} · ${dateTime(p.created_at)}`} eyebrow="Propuesta" />
    <div className="grid cols-2">
      <div className="stack"><GateChecklist v={p.verification} />
        <section className="panel"><h2>Evidencia</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo" src={`/api/photos/${p.photo_id}`} alt="Foto de evidencia de la solicitud" />
          <dl><Fact label="Foto">{p.photo_id}</Fact><Fact label="Horas desde el cambio">{p.hours_since_replace} h</Fact></dl></section></div>
      <div className="stack"><section className="panel"><EquipmentVisual part={p.part_type} /></section><ProposalPanel key={p.id} initial={p} /></div>
    </div></>;
}
