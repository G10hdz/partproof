import { server } from '@/server/api';
import { Fact, PageHeader } from '@/components/Ui';
import { money } from '@/components/format';

export const metadata = { title: 'Ajustes' };
export default async function SettingsPage() {
  const [c, sites, modes] = await Promise.all([server.getCompany(), server.listSites(), server.getModes()]);
  return <><PageHeader title="Ajustes" description="Parámetros de la demo, solo lectura." />
    <section className="panel"><dl>
      <Fact label="Empresa">{c.name}</Fact><Fact label="Moneda">{c.currency}</Fact>
      <Fact label="Presupuesto mensual">{money(c.monthly_budget, c.currency)}</Fact><Fact label="Tope por compra">{money(c.purchase_cap, c.currency)}</Fact>
      {sites.map((s) => <Fact key={s.id} label="Planta">{s.name} · {s.country}</Fact>)}
      <Fact label="Pagos">{modes.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Fact><Fact label="Visión">{modes.vision === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</Fact>
      <Fact label="Telemetría">SIMULADA</Fact></dl></section></>;
}
