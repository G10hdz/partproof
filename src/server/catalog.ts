// Catálogo fijo, hecho a mano de la lista /merchants y de las fichas públicas.
// ships_to copia lo que dice /merchants; Reap es la fuente de verdad (sandbox S-3: digitmakers no envía a MX).
import type { Product } from '@/contracts';

export const CATALOG: Product[] = [
  {
    product_ref: 'dm-accel-cable', merchant: 'digitmakers.ca', title: 'Prusa Accelerometer Cables',
    variant_id: '67588566679782', price: 21.99, currency: 'CAD', part_type: 'accelerometer_cable',
    compat_models: ['MK4', 'MK4S', 'MK3.9', 'MK3.9S', 'MK3.5', 'MK3.5S', 'CORE One', 'CORE One+', 'CORE One L'],
    compat_hotends: [], ships_to: ['CA', 'US', 'MX'], lead_time_days: 5,
  },
  {
    product_ref: 'dm-ptfe-mk3s-plus', merchant: 'digitmakers.ca', title: 'Prusa Hotend PTFE Tube (MK3S+, MMU2S)',
    variant_id: '42393530925286', price: 2.99, currency: 'CAD', part_type: 'ptfe_tube',
    compat_models: ['MK3S+', 'MMU2S'], compat_hotends: [], ships_to: ['CA', 'US', 'MX'], lead_time_days: 5,
  },
  {
    product_ref: 'dm-thermistor', merchant: 'digitmakers.ca', title: 'Original Prusa Hotend Thermistor',
    variant_id: '44386635612390', price: 19.99, currency: 'CAD', part_type: 'thermistor',
    compat_models: ['MK3S', 'MK3', 'MK2.5S', 'MK2.5', 'MK2S', 'MK3S+', 'MK2'], compat_hotends: [],
    ships_to: ['CA', 'US', 'MX'], lead_time_days: 5,
  },
  {
    product_ref: 'ct-flowtech-04', merchant: 'cubictech.com.au', title: 'Micro Swiss FlowTech Hyper-CHT Nozzle 0.4 mm',
    variant_id: '53918466703643', price: 59.95, currency: 'AUD', part_type: 'nozzle',
    compat_models: [], compat_hotends: ['Micro Swiss FlowTech'], ships_to: ['AU', 'CA', 'US'], lead_time_days: 10,
  },
];

export const cartUrl = (p: Pick<Product, 'merchant' | 'variant_id'>) => `https://${p.merchant}/cart/${p.variant_id}:1`;
