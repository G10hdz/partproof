'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { advanceHours, resetDemo } from '@/app/actions';

export function AdvanceHours({ machineId }: { machineId: string }) {
  const [pending, start] = useTransition(); const [msg, setMsg] = useState(''); const router = useRouter();
  return <div><button className="secondary" disabled={pending} onClick={() => start(async () => { const r = await advanceHours(machineId, 100); setMsg(r.ok ? '+100 h simuladas.' : r.error); router.refresh(); })}>Avanzar 100 h (simulado)</button>{msg && <p role="status" className="muted small">{msg}</p>}</div>;
}
export function ResetDemo() {
  const [pending, start] = useTransition(); const [msg, setMsg] = useState(''); const router = useRouter();
  return <div><button className="secondary" disabled={pending} onClick={() => start(async () => { const r = await resetDemo(); setMsg(r.ok ? 'Demo reiniciada.' : r.error); router.refresh(); })}>Reiniciar demo</button>{msg && <p role="status" className="muted small">{msg}</p>}</div>;
}
