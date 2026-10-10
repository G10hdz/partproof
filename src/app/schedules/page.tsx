import Link from 'next/link';
import { server } from '@/server/api';
import { CancelSchedule, RunNow } from '@/components/ScheduleControls';
import ScheduleForm from '@/components/ScheduleForm';
import { Badge, EmptyState, PageHeader } from '@/components/Ui';
import { PART_LABELS, dateOnly } from '@/components/format';

export const metadata = { title: 'Programadas' };
const TONE = { proposed: 'good', rejected: 'bad', error: 'bad', skipped: 'neutral' } as const;
const OUTCOME = { proposed: 'Propuesta creada', rejected: 'Rechazada por el gate', skipped: 'Omitida', error: 'Error' } as const;

export default async function SchedulesPage() {
  const [schedules, machines, stock] = await Promise.all([server.listSchedules(), server.listMachines(), server.listStock()]);
  const options = machines.map((m) => ({ machine_id: m.id, label: `${m.id} · ${m.nameplate_model}`, parts: stock.filter((s) => s.machine_id === m.id).map((s) => s.part_type) }));
  return <>
    <PageHeader title="Programadas" description="Reposiciones que se solicitan solas en una fecha. Crean una propuesta; una persona la aprueba." />
    <div className="grid cols-2">
      <section className="panel"><h2>Programaciones</h2>
        {!schedules.length ? <EmptyState title="Nada programado">Programa una refacción para que su solicitud se abra en la fecha elegida.</EmptyState> :
          <div className="proposal-list">{schedules.map((s) => <div className="proposal-row" key={s.id} style={{ alignItems: 'flex-start' }}>
            <div><strong>{s.machine_id} / {PART_LABELS[s.part_type]}</strong>
              <small>{s.active ? `Próxima: ${dateOnly(s.next_run)}` : 'Inactiva'} · {s.repeat === 'monthly' ? 'cada mes' : 'una vez'}</small>
              {s.last_result && <small>Última ejecución: <Badge tone={TONE[s.last_result.status]}>{OUTCOME[s.last_result.status]}</Badge> {s.last_result.message}{s.last_result.proposal_id && <> · <Link className="link" href={`/proposals/${s.last_result.proposal_id}`}>ver propuesta</Link></>}</small>}</div>
            {s.active && <CancelSchedule id={s.id} />}</div>)}</div>}
        <div style={{ marginTop: 14 }}><RunNow /></div></section>
      <section className="panel"><h2>Nueva programación</h2><ScheduleForm options={options} today={new Date().toISOString().slice(0, 10)} /></section>
    </div></>;
}
