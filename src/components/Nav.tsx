'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav__link${active ? ' nav__link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
