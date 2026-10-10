import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { recentProposals } from '@/lib/queries';
import { EmptyState, PageHeader } from '@/components/Ui';

export const metadata={title:'Reloj'};
export default function WatchIndex(){
  const next=recentProposals(getDb()).find(p=>p.status==='proposed');
  if(next)redirect(`/watch/${next.id}`);
  return <><PageHeader title="Reloj" description="Aprobación con un toque."/><EmptyState title="Nada pendiente">No hay solicitudes por aprobar.</EmptyState></>;
}
