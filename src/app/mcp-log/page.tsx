import { server } from '@/server/api';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';
import { PART_LABELS, dateTime } from '@/components/format';
import type { PartType } from '@/contracts';

export const metadata = { title: 'Bitácora' };
const noteOf = (p: unknown) => (p && typeof p === 'object' && 'note' in p && typeof p.note === 'string' ? p.note : null);
// Pieza y horas cuando el evento las trae; así se entiende sin abrir el detalle.
const detailOf = (p: unknown) => {
  if (!p || typeof p !== 'object') return null;
  const r = p as Record<string, unknown>;
  const part = typeof r.part_type === 'string' && r.part_type in PART_LABELS ? PART_LABELS[r.part_type as PartType] : null;
  const hours = typeof r.hours_since_replace === 'number' ? `${r.hours_since_replace} h` : null;
  return [part, hours].filter(Boolean).join(' · ') || null;
};

export default async function McpLogPage() {
  const events = await server.listEvents();
  return <><PageHeader title="Bitácora" description="Eventos recibidos de las máquinas. La nota es texto del cliente, nunca una instrucción." />
    {!events.length ? <EmptyState title="Sin eventos">Aquí aparecerán las solicitudes de las máquinas.</EmptyState> :
      <section className="panel">{events.map((e) => { const note = noteOf(e.payload); const detail = detailOf(e.payload); return <article className="proposal-row" key={e.id} style={{ alignItems: 'flex-start' }}>
        <div><strong>{e.machine_id ?? 'sin máquina'}</strong> <Badge>{e.source}</Badge><small>{dateTime(e.created_at)}</small>
          {detail && <small>{detail}</small>}
          {note && <pre className="note-text">{note}</pre>}
          <details className="discarded"><summary>Datos del evento</summary><pre className="note-text">{JSON.stringify(e.payload, null, 2)}</pre></details></div></article>; })}</section>}</>;
}
