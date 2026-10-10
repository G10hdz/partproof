'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { runSchedules } from '@/app/actions';

const KEY = 'partproof:schedules-ran';

export default function ScheduleRunner() {
  const router = useRouter();
  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch { /* sin sessionStorage: se ejecuta una vez por carga */ }
    runSchedules().then((r) => { if (r.ok && r.data.length) router.refresh(); }, () => {});
  }, [router]);
  return null;
}
