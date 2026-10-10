import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProposalView } from '@/lib/types';
import { PART_LABELS, STATUS_LABELS, dateTime } from '@/lib/queries';
export function PageHeader({title,description,eyebrow='Forja3D MX / Operación'}:{title:string;description:string;eyebrow?:string}){return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></header>;}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'good'|'bad'|'neutral'}){return <span className={`badge ${tone}`}>{children}</span>;}
export function Fact({label,children}:{label:string;children:ReactNode}){return <div className="fact"><dt>{label}</dt><dd>{children}</dd></div>;}
export function EmptyState({title,children}:{title:string;children:ReactNode}){return <div className="empty-state"><h3>{title}</h3><p>{children}</p></div>;}
export function ProposalList({proposals}:{proposals:ProposalView[]}){return proposals.length?<div className="proposal-list">{proposals.map(p=><Link className="proposal-row" key={p.id} href={`/proposals/${p.id}`}><div><strong>{p.machineId} / {PART_LABELS[p.partType]}</strong><small>{dateTime(p.createdAt)}</small></div><Badge tone={p.status==='paid'?'good':p.status==='rejected'||p.status==='failed'?'bad':'neutral'}>{STATUS_LABELS[p.status]}</Badge><span aria-hidden="true">↗</span></Link>)}</div>:<EmptyState title="Todavía no hay solicitudes">Las propuestas aparecerán cuando una máquina solicite una refacción por MCP.</EmptyState>;}
