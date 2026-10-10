import { server } from '@/server/api';
import SettingsForm from '@/components/SettingsForm';
import { Fact, PageHeader } from '@/components/Ui';
import { money } from '@/components/format';

export const metadata = { title: 'Ajustes' };
export default async function SettingsPage() {
  const [c, sites, modes] = await Promise.all([server.getCompany(), server.listSites(), server.getModes()]);
  return <><PageHeader title="Ajustes" description="Límites de gasto editables; el resto de los parámetros es de solo lectura." />
    <section className="panel"><dl>
      <Fact label="Empresa">{c.name}</Fact><Fact label="Moneda">{c.currency}</Fact>
      {sites.map((s) => <Fact key={s.id} label="Planta">{s.name} · {s.country}</Fact>)}
      <Fact label="Pagos">{modes.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Fact><Fact label="Visión">{modes.vision === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</Fact>
      <Fact label="Telemetría">SIMULADA</Fact></dl></section>
    <section className="panel" style={{ marginTop: 18 }}><h2>Límites de gasto</h2><SettingsForm budget={c.monthly_budget} cap={c.purchase_cap} currency={c.currency} /></section></>;
}
