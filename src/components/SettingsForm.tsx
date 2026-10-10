'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions';

interface Row { month: string; amount: string }

export default function SettingsForm({ budget, cap, currency, overrides }: { budget: number; cap: number; currency: string; overrides: Record<string, number> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState<Row[]>(Object.entries(overrides).sort().map(([month, amount]) => ({ month, amount: String(amount) })));
  const router = useRouter();

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const monthly_budget = Number(f.get('monthly_budget'));
    const purchase_cap = Number(f.get('purchase_cap'));
    const budget_overrides: Record<string, number> = {};
    for (const row of rows) {
      if (!row.month || row.amount === '') { setMsg('Completa el mes y el monto de cada excepción, o quítala.'); return; }
      if (row.month in budget_overrides) { setMsg(`El mes ${row.month} está repetido.`); return; }
      budget_overrides[row.month] = Number(row.amount);
    }
    start(async () => {
      try {
        const r = await saveSettings({ monthly_budget, purchase_cap, budget_overrides });
        setMsg(r.ok ? 'Límites guardados.' : r.error);
        router.refresh();
      } catch { setMsg('No se pudo guardar. Revisa los montos e intenta de nuevo.'); }
    });
  }

  return <form className="capture-form" onSubmit={submit}>
    <label htmlFor="monthly_budget">Presupuesto mensual base ({currency})<input id="monthly_budget" name="monthly_budget" type="number" min={0} max={10000000} step="0.01" defaultValue={budget} required disabled={pending} /></label>
    <label htmlFor="purchase_cap">Tope por compra ({currency})<input id="purchase_cap" name="purchase_cap" type="number" min={0} max={10000000} step="0.01" defaultValue={cap} required disabled={pending} /></label>
    <fieldset className="override-list"><legend>Excepciones por mes</legend>
      {rows.length === 0 && <p className="muted small">Todos los meses usan el presupuesto base.</p>}
      {rows.map((row, i) => <div className="inline" key={i}>
        <input aria-label="Mes" type="month" value={row.month} onChange={(e) => update(i, { month: e.target.value })} disabled={pending} />
        <input aria-label={`Presupuesto del mes (${currency})`} type="number" min={0} max={10000000} step="0.01" value={row.amount} onChange={(e) => update(i, { amount: e.target.value })} disabled={pending} />
        <button type="button" className="secondary" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} disabled={pending}>Quitar</button>
      </div>)}
      <button type="button" className="secondary" onClick={() => setRows((r) => [...r, { month: '', amount: '' }])} disabled={pending}>Agregar mes</button>
    </fieldset>
    <p className="muted small">Un mes sin excepción usa el presupuesto base. El tope por compra no puede superar el presupuesto de ningún mes. Aplica a las próximas verificaciones.</p>
    <button className="primary" type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar límites'}</button>
    {msg && <p role="status" className="notice-text">{msg}</p>}
  </form>;
}
