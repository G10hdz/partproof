'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSchedule, runSchedules } from '@/app/actions';

export function CancelSchedule({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const router = useRouter();
  return <span><button className="secondary" disabled={pending} onClick={() => start(async () => { const r = await cancelSchedule(id); if (!r.ok) setMsg(r.error); router.refresh(); })}>Cancelar</button>{msg && <small role="status" className="notice-text">{msg}</small>}</span>;
}

export function RunNow() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const router = useRouter();
  return <div><button className="secondary" disabled={pending} onClick={() => start(async () => {
    const r = await runSchedules();
    setMsg(r.ok ? (r.data.length ? `Se revisaron ${r.data.length} programadas.` : 'No había programadas vencidas.') : r.error);
    router.refresh();
  })}>{pending ? 'Ejecutando…' : 'Ejecutar programadas ahora'}</button>{msg && <p role="status" className="muted small">{msg}</p>}</div>;
}
