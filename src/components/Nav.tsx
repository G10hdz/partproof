'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' || path.startsWith('/machines') : path.startsWith(href));
  return <nav className="side-nav" aria-label="Navegación principal">{NAV_ITEMS.map((item, i) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}><span className="mono">0{i + 1}</span>{item.label}</Link>)}</nav>;
}
