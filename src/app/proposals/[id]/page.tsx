import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { approvalBlockReason, dateTime, money, proposalById, proposalContext, PART_LABELS, STATUS_LABELS } from '@/lib/queries';
import { getItem } from '@/lib/catalog';
import ApproveButtons from '@/components/ApproveButtons';
import EquipmentVisual from '@/components/EquipmentVisual';
import GateChecklist from '@/components/GateChecklist';
import { Badge, Fact, PageHeader } from '@/components/Ui';

export default async function ProposalPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const db=getDb();const p=proposalById(db,id);if(!p)notFound();
  const ctx=proposalContext(db,p);const item=p.itemId?getItem(p.itemId):null;const block=approvalBlockReason(p,ctx.quote);
  return <>
    <PageHeader title={PART_LABELS[p.partType]} description={`${ctx.machine.name} (${p.machineId}) · ${dateTime(p.createdAt)}`} eyebrow="Propuesta"/>
    <div className="grid cols-2">
      <div className="stack"><GateChecklist v={p.verification}/></div>
      <div className="stack"><section className="panel"><EquipmentVisual part={p.partType}/>
        <Badge tone={p.status==='paid'?'good':p.status==='rejected'||p.status==='failed'?'bad':'neutral'}>{STATUS_LABELS[p.status]}</Badge>
        <dl>
          <Fact label="Producto">{item?.title??'Sin producto seleccionado'}</Fact>
          <Fact label="Comercio">{item?.merchant??'—'}</Fact>
          <Fact label="Precio">{ctx.quote?money(ctx.quote.price,ctx.quote.currency):'—'}</Fact>
          <Fact label="Cotización válida hasta">{ctx.quote?dateTime(ctx.quote.validUntil):'—'}</Fact>
          <Fact label="Origen">{ctx.source??'—'}</Fact>
          <Fact label="Horas reportadas">{ctx.hours??'—'}</Fact>
          <Fact label="Evidencia">{ctx.photo?`Foto ${ctx.photo.id} · ${Math.round(ctx.photo.confidence*100)}%`:'Sin foto'}</Fact>
        </dl>
        {p.reason&&<p className="notice-text">{p.reason}</p>}
        <ApproveButtons id={p.id} disabled={!!block} rejectDisabled={p.status!=='proposed'} reason={block}/></section></div>
    </div></>;
}
