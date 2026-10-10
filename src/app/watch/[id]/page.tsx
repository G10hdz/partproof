import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { approvalBlockReason, money, proposalById, proposalContext, PART_LABELS, STATUS_LABELS } from '@/lib/queries';
import ApproveButtons from '@/components/ApproveButtons';
import { Badge } from '@/components/Ui';

export const metadata={title:'Reloj'};
export default async function WatchPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const db=getDb();const p=proposalById(db,id);if(!p)notFound();
  const {quote,machine}=proposalContext(db,p);const block=approvalBlockReason(p,quote);
  return <div className="watch-face"><Badge>{STATUS_LABELS[p.status]}</Badge><h1>{PART_LABELS[p.partType]}</h1>
    <p>{machine.name}{quote&&` · ${money(quote.price,quote.currency)}`}</p>
    <ApproveButtons id={p.id} disabled={!!block} rejectDisabled={p.status!=='proposed'} reason={block} compact/></div>;
}
