import { server } from '@/server/api';
import { PageHeader, ProposalList } from '@/components/Ui';

export const metadata = { title: 'Propuestas' };
export default async function ProposalsPage() {
  const [proposals, sites] = await Promise.all([server.listProposals(), server.listSites()]);
  return <><PageHeader title="Propuestas" description="Solicitudes de refacciones con su estado. Nada se paga sin aprobación humana." />
    <section className="panel"><ProposalList proposals={proposals} sites={sites} /></section></>;
}
