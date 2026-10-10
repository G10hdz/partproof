import Link from 'next/link';
import { server } from '@/server/api';
import { Badge, EmptyState, Fact, PageHeader } from '@/components/Ui';
import { PART_LABELS, dateTime, money } from '@/components/format';

export const metadata = { title: 'Libro' };
export default async function LedgerPage() {
  const l = await server.getLedger();
  const pct = l.monthly_budget > 0 ? Math.min(100, (l.monthly_total / l.monthly_budget) * 100) : 0;
  const avail = Math.max(0, l.monthly_budget - l.monthly_total);
  return <><PageHeader title="Libro" description="Compras confirmadas, gasto del mes contra presupuesto y costo por hora de uso." actions={<a className="btn" href="/api/ledger/csv" download>Exportar CSV</a>} />
    <div className="stack">
      <section className="panel dark"><h2>Gasto de refacciones del mes</h2><p className="big-number">{money(l.monthly_total, l.currency)}</p>
        <p className="muted small">De {money(l.monthly_budget, l.currency)} · {money(avail, l.currency)} disponibles</p><div className="progress"><span style={{ width: `${pct}%` }} /></div></section>
      <div className="grid cols-2">
        <section className="panel"><h2>Movimientos</h2>{!l.rows.length ? <EmptyState title="Sin compras">Aprobar y pagar una propuesta la agrega aquí.</EmptyState> :
          <div className="table-scroll"><table><caption className="sr-only">Compras confirmadas</caption><thead><tr><th>Máquina / pieza</th><th>Fecha</th><th>Importe</th><th>Proveedor</th></tr></thead>
            <tbody>{l.rows.map((r) => <tr key={r.proposal_id}><td><strong><Link className="link" href={`/proposals/${r.proposal_id}`}>{r.machine_id} / {PART_LABELS[r.part_type]}</Link></strong><small>{r.product_title} · {r.order_id}</small></td><td>{dateTime(r.created_at)}</td><td>{money(r.amount_company, l.currency)}<small>{money(r.amount)}</small></td><td><Badge>{r.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Badge></td></tr>)}</tbody></table></div>}</section>
        <section className="panel"><h2>Costo de refacciones por hora</h2><dl>{l.cost_per_hour.map((c) => <Fact key={c.machine_id} label={c.machine_id}>{c.amount === null ? '—' : `${money(c.amount, l.currency)} / h`}</Fact>)}</dl>
          <p className="small muted">Gasto registrado / horas totales.</p></section>
      </div></div></>;
}
