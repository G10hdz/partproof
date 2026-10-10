import { getDb } from '@/lib/db';
import { ledgerByMachine, monthTotalMxn } from '@/lib/ledger';
import { companySettings, integrationModes, money, pendingIntegration } from '@/lib/queries';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';

export const metadata={title:'Libro'};
export default function LedgerPage(){
  const db=getDb();const company=companySettings(db);const {payment}=integrationModes();
  let rows:ReturnType<typeof ledgerByMachine>|null=null;let total=0;
  try{rows=ledgerByMachine(db);total=monthTotalMxn(db,Date.now());}catch(e){if(!pendingIntegration(e))throw e;}
  return <><PageHeader title="Libro" description="Gasto por máquina y por hora de uso, y total del mes contra presupuesto."/>
    {!rows?<EmptyState title="Libro pendiente de A3">Aún no hay integración de pagos; no se muestra ningún gasto.</EmptyState>:<>
      <section className="panel"><h2>Total del mes <Badge>{payment==='reap'?'REAP SANDBOX':'MOCK'}</Badge></h2>
        <p className="big-number">{money(total)}</p>
        {company&&<><div className="progress"><span style={{width:`${Math.min(100,total/company.monthlyBudget*100)}%`}}/></div><p className="muted small">de {money(company.monthlyBudget)} de presupuesto</p></>}</section>
      <section className="panel table-scroll" style={{marginTop:18}}><table><caption className="sr-only">Gasto por máquina</caption>
        <thead><tr><th>Máquina</th><th>Gasto</th><th>Horas</th><th>MXN / hora</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.machineId}><td><strong>{r.machineId}</strong> {r.name}</td><td>{money(r.totalMxn)}</td><td>{r.hoursTotal}</td><td>{money(r.mxnPerHour)}</td></tr>)}</tbody></table></section></>}
  </>;
}
