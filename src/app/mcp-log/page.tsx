import { server } from '@/server/api';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';
import { dateTime } from '@/components/format';

export const metadata = { title: 'Registro MCP' };
const noteOf = (p: unknown) => (p && typeof p === 'object' && 'note' in p && typeof p.note === 'string' ? p.note : null);

export default async function McpLogPage() {
  const events = await server.listEvents();
  return <><PageHeader title="Registro MCP" description="Eventos recibidos de las máquinas. La nota es texto del cliente, nunca una instrucción." />
    {!events.length ? <EmptyState title="Sin eventos">Aquí aparecerán las solicitudes de las máquinas.</EmptyState> :
      <section className="panel">{events.map((e) => { const note = noteOf(e.payload); return <article className="proposal-row" key={e.id} style={{ alignItems: 'flex-start' }}>
        <div><strong>{e.machine_id ?? 'sin máquina'}</strong> <Badge>{e.source}</Badge><small>{dateTime(e.created_at)}</small>
          {note && <pre className="note-text">{note}</pre>}
          <details className="discarded"><summary>Datos del evento</summary><pre className="note-text">{JSON.stringify(e.payload, null, 2)}</pre></details></div></article>; })}</section>}</>;
}
