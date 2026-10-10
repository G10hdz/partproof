import Link from 'next/link';
import { server } from '@/server/api';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';
import { PART_LABELS, dateTime, money } from '@/components/format';

export const metadata = { title: 'Libro' };
export default async function LedgerPage() {
  const l = await server.getLedger();
  const pct = l.monthly_budget > 0 ? Math.min(100, (l.monthly_total / l.monthly_budget) * 100) : 0;
  return <><PageHeader title="Libro" description="Compras confirmadas, gasto del mes contra presupuesto y costo por hora de uso." />
    <section className="panel"><h2>Total del mes</h2><p className="big-number">{money(l.monthly_total, l.currency)}</p>
      <div className="progress"><span style={{ width: `${pct}%` }} /></div><p className="muted small">de {money(l.monthly_budget, l.currency)} de presupuesto</p>
      <p className="small"><a className="link" href="/api/ledger/csv" download>Exportar CSV</a></p></section>
    <section className="panel" style={{ marginTop: 18 }}><h2>Costo por hora</h2><div className="table-scroll"><table><caption className="sr-only">Costo por hora por máquina</caption>
      <thead><tr><th>Máquina</th><th>{l.currency} / hora</th></tr></thead>
      <tbody>{l.cost_per_hour.map((c) => <tr key={c.machine_id}><td>{c.machine_id}</td><td>{c.amount === null ? '—' : money(c.amount, l.currency)}</td></tr>)}</tbody></table></div></section>
    <section className="panel" style={{ marginTop: 18 }}><h2>Compras</h2>{!l.rows.length ? <EmptyState title="Sin compras">Aprobar y pagar una propuesta la agrega aquí.</EmptyState> :
      <div className="table-scroll"><table><caption className="sr-only">Compras confirmadas</caption><thead><tr><th>Fecha</th><th>Máquina</th><th>Pieza</th><th>Producto</th><th>Orden</th><th>Proveedor</th><th>Monto</th><th>En {l.currency}</th></tr></thead>
        <tbody>{l.rows.map((r) => <tr key={r.proposal_id}><td>{dateTime(r.created_at)}</td><td>{r.machine_id}</td><td>{PART_LABELS[r.part_type]}</td><td><Link className="link" href={`/proposals/${r.proposal_id}`}>{r.product_title}</Link></td><td>{r.order_id}</td><td><Badge>{r.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Badge></td><td>{money(r.amount)}</td><td>{money(r.amount_company, l.currency)}</td></tr>)}</tbody></table></div>}</section></>;
}
