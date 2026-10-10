export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Flota' },
  { href: '/proposals', label: 'Propuestas' },
  { href: '/schedules', label: 'Programadas' },
  { href: '/ledger', label: 'Libro' },
  { href: '/settings', label: 'Ajustes' },
  { href: '/mcp-log', label: 'Registro MCP' },
];
