'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions';

export default function SettingsForm({ budget, cap, currency }: { budget: number; cap: number; currency: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const router = useRouter();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const monthly_budget = Number(f.get('monthly_budget'));
    const purchase_cap = Number(f.get('purchase_cap'));
    if (!Number.isFinite(monthly_budget) || !Number.isFinite(purchase_cap) || monthly_budget < 0 || purchase_cap < 0) { setMsg('Escribe montos válidos, de 0 en adelante.'); return; }
    if (purchase_cap > monthly_budget) { setMsg('El tope por compra no puede superar el presupuesto mensual.'); return; }
    start(async () => {
      try { const r = await saveSettings({ monthly_budget, purchase_cap }); setMsg(r.ok ? 'Límites guardados.' : r.error); router.refresh(); }
      catch { setMsg('No se pudo guardar. Revisa los montos e intenta de nuevo.'); }
    });
  }
  return <form className="capture-form" onSubmit={submit}>
    <label htmlFor="monthly_budget">Presupuesto mensual ({currency})<input id="monthly_budget" name="monthly_budget" type="number" min={0} max={10000000} step="0.01" defaultValue={budget} required disabled={pending} /></label>
    <label htmlFor="purchase_cap">Tope por compra ({currency})<input id="purchase_cap" name="purchase_cap" type="number" min={0} max={10000000} step="0.01" defaultValue={cap} required disabled={pending} /></label>
    <p className="muted small">Aplican a las próximas verificaciones; no cambian propuestas ya evaluadas.</p>
    <button className="primary" type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar límites'}</button>
    {msg && <p role="status" className="notice-text">{msg}</p>}
  </form>;
}
