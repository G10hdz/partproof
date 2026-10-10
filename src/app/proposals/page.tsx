import { getDb } from '@/lib/db';
import { recentProposals } from '@/lib/queries';
import { PageHeader, ProposalList } from '@/components/Ui';

export const metadata={title:'Propuestas'};
export default function ProposalsPage(){
  return <><PageHeader title="Propuestas" description="Solicitudes de refacciones con su estado. Nada se paga sin aprobación humana."/>
    <section className="panel"><ProposalList proposals={recentProposals(getDb())}/></section></>;
}
