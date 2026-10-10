import { server } from '@/server/api';

export default async function Banner() {
  const { provider, vision } = await server.getModes();
  return <div className="mode-banner" role="status"><strong>SANDBOX</strong><span>Pagos: {provider === 'reap' ? 'REAP SANDBOX' : 'MOCK'}</span><span>Visión: {vision === 'live' ? 'EN VIVO' : 'REPETICIÓN'}</span><span>Telemetría: SIMULADA</span></div>;
}
