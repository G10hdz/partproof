import { integrationModes } from '@/lib/queries';
export default function Banner(){
  const {payment,vision}=integrationModes();
  return <div className="mode-banner" role="status"><strong>SANDBOX</strong><span>Pagos: {payment==='reap'?'REAP SANDBOX':payment==='mock'?'MOCK':'PENDIENTE A3'}</span><span>Visión: {vision==='live'?'EN VIVO':vision==='replay'?'REPETICIÓN':'PENDIENTE A4'}</span><span>Telemetría: SIMULADA</span></div>;
}
