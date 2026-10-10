// Datos semilla del demo: Forja3D con plantas en Guadalajara y Toronto.
// digitmakers.ca no envía a MX (sandbox S-3), por eso existe la planta de Toronto.
import type { Company, Machine, Site, Stock } from '@/contracts';

// Tasas de ejemplo a la moneda de la empresa; no son de mercado.
export const FX_TO_MXN: Record<string, number> = { MXN: 1, CAD: 13.0, AUD: 12.0 };

export function seedCompany(): Company {
  return {
    id: 'forja3d', name: 'Forja3D', currency: 'MXN',
    monthly_budget: 6000, purchase_cap: 1000, billing_email: 'ops@forja3d.mx',
  };
}

export function seedSites(): Site[] {
  return [
    {
      id: 'gdl', company_id: 'forja3d', name: 'Planta Guadalajara', country: 'MX',
      shipping_address: {
        firstName: 'Forja3D', lastName: 'Operaciones', phone: '+523312345678',
        addressLine1: 'Av. Chapultepec 100', city: 'Guadalajara', region: 'JAL', postalCode: '44100', country: 'MX',
      },
    },
    {
      id: 'tor', company_id: 'forja3d', name: 'Planta Toronto', country: 'CA',
      shipping_address: {
        firstName: 'Forja3D', lastName: 'Operaciones', phone: '+14165550123',
        addressLine1: '100 Queen St W', city: 'Toronto', region: 'ON', postalCode: 'M5H 2N2', country: 'CA',
      },
    },
  ];
}

export function seedMachines(): Machine[] {
  const m = (id: string, site_id: string, nameplate_model: string, hotend: string, hours_total: number): Machine =>
    ({ id, company_id: 'forja3d', site_id, name: id, nameplate_model, hotend, hours_total, downtime_cost_per_hour: 120 });
  return [
    m('P1', 'tor', 'Original Prusa MK4S', 'Nextruder', 820),
    m('P2', 'tor', 'Original Prusa MK3S', 'E3D V6', 2310),
    m('P3', 'gdl', 'Original Prusa MK3S+', 'E3D V6', 1480),
    m('P4', 'tor', 'Creality K1', 'Micro Swiss FlowTech', 640),
  ];
}

// Cada pieza está a pocas horas de su vida nominal: "Avanzar horas" la consume y deja el stock en 0.
export function seedStock(): Stock[] {
  const s = (machine_id: string, part_type: Stock['part_type'], rated: number, since: number): Stock =>
    ({ machine_id, part_type, qty: 1, min_qty: 1, rated_life_hours: rated, hours_since_replace: since });
  return [
    s('P1', 'accelerometer_cable', 1500, 1480),
    s('P2', 'ptfe_tube', 1000, 980),
    s('P3', 'ptfe_tube', 1000, 960),
    s('P4', 'nozzle', 600, 590),
  ];
}
