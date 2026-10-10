import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProposalView, Site } from '@/contracts';
import { PART_LABELS, STATUS_LABELS, dateTime } from './format';

export function PageHeader({ title, description, eyebrow = 'Forja3D MX / Operación' }: { title: string; description: string; eyebrow?: string }) {
  return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></header>;
}
export const statusTone = (s: ProposalView['status']) => (s === 'paid' ? 'good' : s === 'rejected' || s === 'failed' ? 'bad' : 'neutral');
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good' | 'bad' | 'neutral' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><dt>{label}</dt><dd>{children}</dd></div>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><h3>{title}</h3><p>{children}</p></div>;
}
export function ProposalList({ proposals, sites }: { proposals: ProposalView[]; sites: Site[] }) {
  if (!proposals.length) return <EmptyState title="Todavía no hay solicitudes">Aparecerán cuando una máquina pida una refacción por MCP o con una foto.</EmptyState>;
  return <div className="proposal-list">{proposals.map((p) => <Link className="proposal-row" key={p.id} href={`/proposals/${p.id}`}>
    <div><strong>{p.machine_id} / {PART_LABELS[p.part_type]}</strong><small>{sites.find((s) => s.id === p.site_id)?.name ?? p.site_id} · {dateTime(p.created_at)}</small></div>
    <Badge tone={statusTone(p.status)}>{STATUS_LABELS[p.status]}</Badge><span aria-hidden="true">↗</span></Link>)}</div>;
}
