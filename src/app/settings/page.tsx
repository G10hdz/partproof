import { getDb } from '@/lib/db';
import { companySettings, integrationModes, money } from '@/lib/queries';
import { EmptyState, Fact, PageHeader } from '@/components/Ui';

export const metadata={title:'Ajustes'};
export default function SettingsPage(){
  const c=companySettings(getDb());const {payment,vision}=integrationModes();
  return <><PageHeader title="Ajustes" description="Parámetros de la demo, solo lectura."/>
    {!c?<EmptyState title="Sin empresa">Carga la semilla.</EmptyState>:<section className="panel"><dl>
      <Fact label="Empresa">{c.name}</Fact><Fact label="País">{c.country}</Fact><Fact label="Moneda">{c.currency}</Fact>
      <Fact label="Presupuesto mensual">{money(c.monthlyBudget)}</Fact><Fact label="Tope por compra">{money(c.purchaseCap)}</Fact>
      <Fact label="Pagos">{payment==='reap'?'REAP SANDBOX':payment==='mock'?'MOCK':'Pendiente de A3'}</Fact>
      <Fact label="Visión">{vision==='live'?'EN VIVO':vision==='replay'?'REPETICIÓN':'Pendiente de A4'}</Fact>
      <Fact label="Telemetría">SIMULADA</Fact></dl></section>}</>;
}
