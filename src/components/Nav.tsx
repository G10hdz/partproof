import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/nav';
export function Nav(){return <nav className="side-nav" aria-label="Navegación principal">{NAV_ITEMS.map((item,i)=><Link key={item.href} href={item.href}><span className="mono">0{i+1}</span>{item.label}</Link>)}</nav>;}
