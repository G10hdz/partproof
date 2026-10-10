import { server } from '@/server/api';
import SettingsForm from '@/components/SettingsForm';
import { Fact, PageHeader } from '@/components/Ui';

export const metadata = { title: 'Ajustes' };
export default async function SettingsPage() {
  const [c, sites, modes] = await Promise.all([server.getCompany(), server.listSites(), server.getModes()]);
  return <><PageHeader title="Ajustes" description="Límites de gasto editables; el resto de los parámetros es de solo lectura." />
    <div className="grid cols-2">
      <section className="panel"><h2>Política de la granja</h2><SettingsForm budget={c.monthly_budget} cap={c.purchase_cap} currency={c.currency} overrides={c.budget_overrides ?? {}} /></section>
      <div className="stack">
        <section className="panel"><h2>Cómo se usa esta política</h2><dl><Fact label="Empresa">{c.name}</Fact><Fact label="Moneda">{c.currency}</Fact>
          {sites.map((s) => <Fact key={s.id} label="Planta">{s.name} · {s.country}</Fact>)}</dl>
          <p className="small muted">Las compras que exceden alguno de estos límites quedan bloqueadas.</p></section>
        <section className="panel dark"><h2>Entorno de demo</h2><dl><Fact label="Pagos">{modes.provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</Fact><Fact label="Visión">{modes.vision === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</Fact><Fact label="Telemetría">SIMULADA</Fact></dl></section>
      </div></div></>;
}
