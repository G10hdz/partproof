import { server } from '@/server/api';

export default async function Banner() {
  const { provider, vision } = await server.getModes();
  return <div className="mode-banner" role="status"><span className="eyebrow">Forja3D MX / Operación</span><span className="mode">SANDBOX · {provider === 'reap' ? 'REAP' : 'MOCK'}</span><span>Visión: {vision === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</span><span>Telemetría: SIMULADA</span></div>;
}
