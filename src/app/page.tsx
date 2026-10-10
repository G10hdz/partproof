import Link from 'next/link';
import { getDb } from '@/lib/db';
import { fleetRows, recentProposals, integrationModes, PART_LABELS } from '@/lib/queries';
import CaptureForm from '@/components/CaptureForm';
import EquipmentVisual from '@/components/EquipmentVisual';
import { Badge, EmptyState, Fact, PageHeader, ProposalList } from '@/components/Ui';

export default function FleetPage(){
  const db=getDb();const fleet=fleetRows(db);const {vision}=integrationModes();
  return <>
    <PageHeader title="Flota" description="Estado de cada impresora, su stock de refacciones y la vida útil restante."/>
    <div className="grid cols-auto">{fleet.map(m=><section className="panel" key={m.id}>
      <EquipmentVisual/>
      <Badge>{m.id}</Badge><h3>{m.name}</h3>
      <p className="muted small">{m.nameplateModel} · {m.hotend}</p>
      <dl><Fact label="Horas de uso">{m.hoursTotal} h</Fact></dl>
      {m.parts.map(p=>{const pct=Math.min(100,Math.round(p.hoursSinceReplace/p.ratedLifeHours*100));const low=p.qty<=p.minQty;
        return <div className="part-row" key={p.partType}><div><strong>{PART_LABELS[p.partType]}</strong><Badge tone={low?'bad':'good'}>{p.qty}/{p.minQty} mín.</Badge></div>
          <div className="progress" role="img" aria-label={`Vida usada ${pct}%`}><span style={{width:`${pct}%`}}/></div>
          <small className="muted">{p.hoursSinceReplace} de {p.ratedLifeHours} h ({pct}%)</small></div>;})}
      <CaptureForm machineId={m.id} available={vision!==null}/>
    </section>)}</div>
    <section className="panel" style={{marginTop:18}}><h2>Solicitudes recientes</h2><ProposalList proposals={recentProposals(db).slice(0,5)}/>
      <p className="small"><Link href="/proposals">Ver todas →</Link></p></section>
    {fleet.length===0&&<EmptyState title="Sin máquinas">Carga la semilla para ver la flota.</EmptyState>}
  </>;
}
