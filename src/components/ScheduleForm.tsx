'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PartType } from '@/contracts';
import { createSchedule } from '@/app/actions';
import { PART_LABELS } from './format';

export interface Option { machine_id: string; label: string; parts: PartType[] }

export default function ScheduleForm({ options, today }: { options: Option[]; today: string }) {
  const [machine, setMachine] = useState(options[0]?.machine_id ?? '');
  const parts = options.find((o) => o.machine_id === machine)?.parts ?? [];
  const [part, setPart] = useState<PartType>(parts[0] ?? 'nozzle');
  const [date, setDate] = useState(today);
  const [repeat, setRepeat] = useState(false);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function changeMachine(id: string) {
    setMachine(id);
    const next = options.find((o) => o.machine_id === id)?.parts[0];
    if (next) setPart(next);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const r = await createSchedule({ machine_id: machine, part_type: part, date, repeat: repeat ? 'monthly' : 'once' });
        setMsg(r.ok ? 'Compra programada.' : r.error);
        if (r.ok) router.refresh();
      } catch { setMsg('No se pudo programar. Revisa los datos e intenta de nuevo.'); }
    });
  }
  return <form className="capture-form" onSubmit={submit}>
    <label htmlFor="sch-machine">Máquina<select id="sch-machine" value={machine} onChange={(e) => changeMachine(e.target.value)} disabled={pending}>{options.map((o) => <option key={o.machine_id} value={o.machine_id}>{o.label}</option>)}</select></label>
    <label htmlFor="sch-part">Refacción<select id="sch-part" value={part} onChange={(e) => setPart(e.target.value as PartType)} disabled={pending}>{parts.map((p) => <option key={p} value={p}>{PART_LABELS[p]}</option>)}</select></label>
    <label htmlFor="sch-date">Fecha<input id="sch-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required disabled={pending} /></label>
    <label className="inline" htmlFor="sch-repeat"><input id="sch-repeat" type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} disabled={pending} /> Repetir cada mes</label>
    <p className="muted small">Llegada la fecha se crea una propuesta; una persona debe aprobarla en Reap. Nada se paga solo.</p>
    <button className="primary" type="submit" disabled={pending || !machine}>{pending ? 'Programando…' : 'Programar'}</button>
    {msg && <p role="status" className="notice-text">{msg}</p>}
  </form>;
}
