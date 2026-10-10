import { notFound } from 'next/navigation';
import { server } from '@/server/api';
import CaptureForm from '@/components/CaptureForm';
import EquipmentVisual from '@/components/EquipmentVisual';
import { Fact, PageHeader, ProposalList } from '@/components/Ui';
import { PART_LABELS, dateTime, lifePercent } from '@/components/format';

export default async function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await server.getMachineView(id);
  if (!v) notFound();
  const { machine: m, site } = v;
  return <>
    <PageHeader title={m.name} description={`${m.nameplate_model} · ${m.hotend} · ${site.name}`} eyebrow="Máquina" />
    <div className="grid cols-2">
      <div className="stack">
        <section className="panel"><h2>Refacciones</h2>{v.stock.map((s) => { const pct = lifePercent(s.hours_since_replace, s.rated_life_hours); return <div className="part-row" key={s.part_type}>
          <div><strong>{PART_LABELS[s.part_type]}</strong><span>{s.qty} / {s.min_qty} mín.</span></div>
          <div className="progress" role="img" aria-label={`Vida usada ${pct}%`}><span style={{ width: `${pct}%` }} /></div><small className="muted">{s.hours_since_replace} de {s.rated_life_hours} h</small></div>; })}</section>
        <section className="panel"><h2>Solicitudes</h2><ProposalList proposals={v.proposals} sites={[site]} /></section>
        <section className="panel"><h2>Eventos</h2>{v.events.length ? v.events.map((e) => <div className="fact" key={e.id}><dt>{e.source}</dt><dd>{dateTime(e.created_at)}</dd></div>) : <p className="muted">Sin eventos.</p>}</section>
      </div>
      <div className="stack">
        <section className="panel"><h2>Placa registrada</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo" src={`/api/photos/${v.plate_photo_id}`} alt={`Placa de ${m.name}`} />
          <dl><Fact label="Horas de uso">{m.hours_total} h</Fact><Fact label="Costo de paro">{m.downtime_cost_per_hour} / h</Fact></dl></section>
        <section className="panel"><h2>Subir evidencia</h2><EquipmentVisual /><CaptureForm machineId={m.id} parts={[...new Set(v.stock.map((s) => s.part_type))]} /></section>
      </div>
    </div></>;
}
