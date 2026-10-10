import { notFound } from 'next/navigation';
import { server } from '@/server/api';
import EquipmentVisual from '@/components/EquipmentVisual';
import GateChecklist from '@/components/GateChecklist';
import ProposalPanel from '@/components/ProposalPanel';
import { Fact, PageHeader, Tag } from '@/components/Ui';
import { PART_LABELS, dateTime } from '@/components/format';

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, sites] = await Promise.all([server.getProposal(id), server.listSites()]);
  if (!p) notFound();
  const site = sites.find((s) => s.id === p.site_id);
  return <>
    <PageHeader title="Propuesta" eyebrow={`Forja3D MX / ${site?.name ?? p.site_id}`} description="Solicitada por la máquina · aprobada por una persona" actions={<Tag>{p.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Tag>} />
    <div className="grid cols-2">
      <div className="stack">
        <section className="panel dark"><h2>{p.product?.title ?? PART_LABELS[p.part_type]}</h2><EquipmentVisual part={p.part_type} variant="hero" />
          <dl><Fact label="Máquina">{p.machine_id}</Fact><Fact label="Pieza">{PART_LABELS[p.part_type]}</Fact><Fact label="Solicitada">{dateTime(p.created_at)}</Fact></dl></section>
        <section className="panel"><h2>Evidencia de la solicitud</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo" src={`/api/photos/${p.photo_id}`} alt="Foto de evidencia de la solicitud" />
          <dl><Fact label="Foto">{p.photo_id}</Fact><Fact label="Horas desde el cambio">{p.hours_since_replace} h</Fact></dl></section></div>
      <div className="stack"><ProposalPanel key={p.id} initial={p} /><GateChecklist v={p.verification} /></div>
    </div></>;
}
