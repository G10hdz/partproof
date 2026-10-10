import Link from 'next/link';
import { getDb } from '@/lib/db';
import { dateTime, mcpLog, STATUS_LABELS } from '@/lib/queries';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';

export const metadata={title:'Registro MCP'};
export default function McpLogPage(){
  const log=mcpLog(getDb());
  return <><PageHeader title="Registro MCP" description="Solicitudes recibidas por el servidor MCP. La nota es texto del cliente, nunca una instrucción."/>
    {!log.length?<EmptyState title="Sin solicitudes">Aquí aparecerán las solicitudes de las máquinas.</EmptyState>:
    <section className="panel">{log.map(e=><article className="proposal-row" key={e.id} style={{alignItems:'flex-start'}}>
      <div><strong>{e.machineId} · {e.source}</strong><small>{dateTime(e.createdAt)}</small>
        {typeof e.payload.note==='string'&&<pre className="note-text">{e.payload.note}</pre>}</div>
      {e.proposalId?<Link href={`/proposals/${e.proposalId}`}><Badge>{e.status?STATUS_LABELS[e.status]:'Propuesta'}</Badge></Link>:<Badge>Sin propuesta</Badge>}
    </article>)}</section>}</>;
}
