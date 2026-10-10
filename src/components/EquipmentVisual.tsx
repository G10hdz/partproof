import type { PartType } from '@/contracts';
export default function EquipmentVisual({ part, variant }: { part?: PartType; variant?: 'hero' | 'compact' }) {
  const path = part === 'accelerometer_cable' ? 'M55 120C15 15 185 10 170 100S45 195 55 120M47 115h20v27H47zM145 102h25v20h-25z' : part === 'ptfe_tube' ? 'M60 150C50 30 170 25 160 120M53 150h15M153 120h15' : part === 'nozzle' ? 'M80 40h60v70l-25 50h-10l-25-50zM80 55h60M80 70h60M80 85h60M95 135h30' : part === 'thermistor' ? 'M45 40C20 130 160 160 150 75M145 65h20v30h-20z' : 'M35 15h150v155H35zM50 30h120v120H50zM50 65h120M110 30v60M97 90h26v20H97zM68 137h87l15 17H50zM35 178h150';
  return <div className={`equipment-visual${variant ? ` ${variant}` : ''}`}><svg viewBox="0 0 220 190" fill="none" stroke="currentColor" strokeWidth={part === 'ptfe_tube' ? 8 : 2} role="img" aria-label={part ? 'Esquema ilustrativo de refacción' : 'Esquema ilustrativo de impresora'}><path d={path} /></svg><span>Esquema ilustrativo</span></div>;
}
