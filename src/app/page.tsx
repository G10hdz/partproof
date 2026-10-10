import Link from 'next/link';
import { server } from '@/server/api';
import EquipmentVisual from '@/components/EquipmentVisual';
import { AdvanceHours, ResetDemo } from '@/components/DemoControls';
import { Badge, Fact, PageHeader, ProposalList } from '@/components/Ui';
import { PART_LABELS, lifePercent } from '@/components/format';

export default async function FleetPage() {
  const [machines, sites, stock, proposals, modes] = await Promise.all([server.listMachines(), server.listSites(), server.listStock(), server.listProposals(), server.getModes()]);
  return <>
    <PageHeader title="Flota" description="Estado de cada impresora, su stock de refacciones y la vida útil restante." />
    <div className="grid cols-auto">{machines.map((m) => <section className="panel" key={m.id}>
      <EquipmentVisual />
      <Badge>{m.id}</Badge> <Badge>{sites.find((s) => s.id === m.site_id)?.name ?? m.site_id}</Badge>
      <h3><Link href={`/machines/${m.id}`}>{m.name}</Link></h3>
      <p className="muted small">{m.nameplate_model} · {m.hotend}</p>
      <dl><Fact label="Horas de uso">{m.hours_total} h</Fact></dl>
      {stock.filter((s) => s.machine_id === m.id).map((s) => { const pct = lifePercent(s.hours_since_replace, s.rated_life_hours); return <div className="part-row" key={s.part_type}>
        <div><strong>{PART_LABELS[s.part_type]}</strong><Badge tone={s.qty < s.min_qty ? 'bad' : 'good'}>{s.qty} / {s.min_qty} mín.</Badge></div>
        <div className="progress" role="img" aria-label={`Vida usada ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
        <small className="muted">{s.hours_since_replace} de {s.rated_life_hours} h ({pct}%)</small></div>; })}
      <p className="small"><Link className="link" href={`/machines/${m.id}`}>Detalle y foto de placa →</Link></p>
      {modes.demo && <AdvanceHours machineId={m.id} />}
    </section>)}</div>
    <section className="panel" style={{ marginTop: 18 }}><h2>Solicitudes recientes</h2><ProposalList proposals={proposals.slice(0, 5)} sites={sites} />
      <p className="small"><Link className="link" href="/proposals">Ver todas →</Link></p></section>
    {modes.demo && <div style={{ marginTop: 18 }}><ResetDemo /></div>}
  </>;
}
