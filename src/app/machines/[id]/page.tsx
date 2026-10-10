import Link from 'next/link';
import { notFound } from 'next/navigation';
import { server } from '@/server/api';
import EquipmentVisual from '@/components/EquipmentVisual';
import { Fact, PageHeader, ProposalList } from '@/components/Ui';
import { PART_LABELS, dateTime, lifePercent } from '@/components/format';

export default async function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await server.getMachineView(id);
  if (!v) notFound();
  const { machine: m, site } = v;
  const open = v.proposals.find((p) => p.status === 'proposed') ?? v.proposals[0];
  const low = v.stock.find((s) => s.qty < s.min_qty) ?? v.stock[0];
  const last = v.events[0];
  return <>
    <PageHeader title="Detalle de máquina" eyebrow={`Forja3D MX / ${site.name}`} description={`${m.nameplate_model} · ${m.hotend}`} actions={<Link className="btn" href={`/machines/${m.id}/evidence`}>Completar evidencia</Link>} />
    <div className="split-focus">
      <section className="panel dark"><EquipmentVisual variant="hero" /><p className="eyebrow">{m.id} / Equipo registrado</p><p className="big-number">{m.name}</p></section>
      <div className="stack">
        <section className="panel"><h2>Ficha de equipo</h2><dl><Fact label="Identificador">{m.id}</Fact><Fact label="Modelo">{m.nameplate_model}</Fact><Fact label="Hotend">{m.hotend}</Fact><Fact label="Uso acumulado">{m.hours_total} h</Fact><Fact label="Costo de paro">{m.downtime_cost_per_hour} / h</Fact></dl></section>
        {low && <section className="panel"><h2>Pieza que solicita</h2><h3>{PART_LABELS[low.part_type]}</h3>
          <dl><Fact label="Stock / mínimo">{low.qty} / {low.min_qty}</Fact><Fact label="Horas desde cambio">{low.hours_since_replace} / {low.rated_life_hours} h</Fact></dl>
          <div className="progress" role="img" aria-label={`Vida usada ${lifePercent(low.hours_since_replace, low.rated_life_hours)}%`}><span style={{ width: `${lifePercent(low.hours_since_replace, low.rated_life_hours)}%` }} /></div>
          <p className="small muted">Vida nominal de ejemplo; no es detección visual de desgaste.</p>
          {open && <Link className="btn primary block" href={`/proposals/${open.id}`}>Ver propuesta</Link>}</section>}
      </div>
    </div>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
      <section className="panel"><h2>Evidencia registrada</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="photo" src={`/api/photos/${v.plate_photo_id}`} alt={`Placa de ${m.name}`} />
        <dl><Fact label="Modelo de placa">{m.nameplate_model}</Fact></dl><Link className="btn block" href={`/machines/${m.id}/evidence`}>Subir nueva evidencia</Link></section>
      <section className="panel"><h2>Último evento</h2>{last ? <p className="small">{dateTime(last.created_at)} · {last.source}</p> : <p className="muted">Sin eventos.</p>}<Link className="btn" href="/mcp-log">Ver bitácora</Link>
        <h2 style={{ marginTop: 22 }}>Solicitudes</h2><ProposalList proposals={v.proposals} sites={[site]} /></section>
    </div></>;
}
