import Link from 'next/link';
import { server } from '@/server/api';
import EquipmentVisual from '@/components/EquipmentVisual';
import { AdvanceHours, ResetDemo } from '@/components/DemoControls';
import { Fact, PageHeader, ProposalList, Tag } from '@/components/Ui';
import { PART_LABELS, latestProposalFor, money } from '@/components/format';

export default async function FleetPage() {
  const [machines, sites, stock, proposals, modes, ledger] = await Promise.all([server.listMachines(), server.listSites(), server.listStock(), server.listProposals(), server.getModes(), server.getLedger()]);
  const low = stock.filter((s) => s.qty < s.min_qty);
  const hero = machines.find((m) => low.some((s) => s.machine_id === m.id)) ?? machines[0];
  const others = machines.filter((m) => m.id !== hero?.id);
  const heroProposal = latestProposalFor(proposals, hero?.id);
  const pending = low[0];
  const pct = ledger.monthly_budget > 0 ? Math.min(100, (ledger.monthly_total / ledger.monthly_budget) * 100) : 0;
  const row = (m: (typeof machines)[number]) => { const s = stock.filter((x) => x.machine_id === m.id); const bad = s.some((x) => x.qty < x.min_qty);
    return <div className="row" key={m.id}><EquipmentVisual variant="compact" /><div className="grow"><strong><Link href={`/machines/${m.id}`}>{m.id} / {m.nameplate_model}</Link></strong><small>{m.hotend} · {m.hours_total} h · {sites.find((x) => x.id === m.site_id)?.name}</small></div>
      <Tag tone={bad ? 'bad' : 'good'}>{s.map((x) => `${PART_LABELS[x.part_type]} ${x.qty} / ${x.min_qty}`).join(' · ') || 'Sin stock registrado'}</Tag><Link className="btn" href={`/machines/${m.id}`}>Ver ficha</Link>
      {modes.demo && <AdvanceHours machineId={m.id} />}</div>; };
  return <>
    <PageHeader title="Flota" eyebrow="Forja3D MX / 04 Equipos" description="Estado de cada impresora, su stock de refacciones y la vida útil restante." back={false} />
    <div className="grid cols-2">
      <div className="stack">
        {hero && <section className="panel dark"><h2>{hero.id} / {hero.nameplate_model}</h2><EquipmentVisual variant="hero" />
          <div className="actions"><Link className="btn" href={`/machines/${hero.id}`}>Ver ficha</Link>{heroProposal && <Link className="btn accent" href={`/proposals/${heroProposal.id}`}>Revisar solicitud</Link>}{modes.demo && <AdvanceHours machineId={hero.id} />}</div></section>}
        <section className="panel"><h2>Otras máquinas</h2>{others.length ? others.map(row) : <p className="muted">Sin más máquinas.</p>}</section>
        <section className="panel"><h2>Solicitudes recientes</h2><ProposalList proposals={proposals.slice(0, 5)} sites={sites} /><p className="small"><Link className="link" href="/proposals">Ver todas →</Link></p></section>
      </div>
      <div className="stack">
        <section className="panel"><h2>Reposición pendiente</h2>{pending ? <><Tag>Stock bajo</Tag><h3 style={{ marginTop: 18 }}>{PART_LABELS[pending.part_type]}</h3>
          <dl><Fact label="Stock / mínimo">{pending.qty} / {pending.min_qty}</Fact><Fact label="Máquina">{pending.machine_id}</Fact><Fact label="Horas desde cambio">{pending.hours_since_replace} / {pending.rated_life_hours} h</Fact></dl></> : <p className="muted">Todo el stock está sobre el mínimo.</p>}</section>
        <section className="panel"><h2>Presupuesto del mes</h2><p className="eyebrow">Gasto del mes</p><p className="big-number">{money(ledger.monthly_total, ledger.currency)}</p>
          <div className="progress"><span style={{ width: `${pct}%` }} /></div><dl><Fact label="Presupuesto">{money(ledger.monthly_budget, ledger.currency)}</Fact><Fact label="Disponible">{money(Math.max(0, ledger.monthly_budget - ledger.monthly_total), ledger.currency)}</Fact></dl></section>
        {modes.demo && <ResetDemo />}
      </div>
    </div></>;
}
