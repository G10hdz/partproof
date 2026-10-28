import Script from 'next/script';
import type { Metadata } from 'next';
import Link from 'next/link';
import Banner from '@/components/Banner';
import ScheduleRunner from '@/components/ScheduleRunner';
import { Nav } from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PartProof · Forja3D MX', template: '%s · PartProof' },
  description: 'Reposición de refacciones con evidencia, verificaciones y aprobación humana.',
};
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body><a href="#contenido" className="skip-link">Saltar al contenido</a><div className="app-shell"><aside className="sidebar"><Link className="logo" href="/"><i aria-hidden="true" />partproof.</Link><p className="eyebrow">Workspace</p><Nav /><div className="sidebar-footer"><span className="mode">SANDBOX</span><p>Forja3D MX<br />Dos plantas</p></div></aside><div className="app-content"><ScheduleRunner /><Banner /><main id="contenido" className="content">{children}</main><footer className="app-footer">PartProof · Reposición con evidencia y aprobación humana.</footer></div></div><Script src="/positronica-analytics.js" strategy="afterInteractive" /></body></html>;
}
