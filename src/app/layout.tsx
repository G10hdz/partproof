import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { SandboxBanner } from '@/components/SandboxBanner';

export const metadata: Metadata = {
  title: 'PartProof — Shell de demo',
  description:
    'Shell de la demo PartProof: impresoras que piden su refacción con evidencia, gate determinista y sandbox.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SandboxBanner />
        <header className="header">
          <div className="header__inner">
            <div className="brand">
              PartProof
              <span className="brand__sub">Forja3D MX · demo</span>
            </div>
            <Nav />
          </div>
        </header>
        <main className="main">{children}</main>
        <footer className="footer">
          Demo estática de Forja3D MX · Integración pendiente.
        </footer>
      </body>
    </html>
  );
}
