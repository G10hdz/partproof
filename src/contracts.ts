// Contrato común para los seis agentes; cambios requieren actualizar sus consumidores.
export type PartType = 'ptfe_tube' | 'thermistor' | 'accelerometer_cable' | 'nozzle';
export type ProposalStatus = 'proposed' | 'approved' | 'rejected' | 'paid' | 'failed';
export type GateRule = 'evidence' | 'compat' | 'variant_exact' | 'ships_to' | 'price_cap' | 'budget' | 'quote_valid';
export type ProviderMode = 'mock' | 'reap';
export type VisionMode = 'live' | 'replay';

export interface Machine {
  id: string;
  company_id: string;
  name: string;
  nameplate_model: string;
  hotend: string;
  hours_total: number;
  downtime_cost_per_hour: number;
}
export interface Company {
  id: string;
  name: string;
  country: string;
  currency: string;
  monthly_budget: number;
  purchase_cap: number;
}
export interface Stock {
  machine_id: string;
  part_type: PartType;
  qty: number;
  min_qty: number;
  rated_life_hours: number;
  hours_since_replace: number;
}
export interface Product {
  product_ref: string;
  merchant: string;
  title: string;
  variant_id: string;
  price: number;
  currency: string;
  part_type: PartType;
  compat_models: string[];
  compat_hotends: string[];
  ships_to: string[];
  lead_time_days: number;
}
export interface VisionResult {
  nameplate_model: string | null;
  hotend: string | null;
  visible_damage: ('ptfe' | 'cable' | 'broken_part' | 'none')[];
  label_text: string | null;
  confidence: number;
}
export interface Quote {
  id: string;
  product_ref: string;
  price: number;
  currency: string;
  valid_until: string;
}
export interface GateCheck { rule: GateRule; passed: boolean; reason: string }
export interface GateResult { passed: boolean; checks: GateCheck[] }
export interface GateInput {
  company: Company;
  machine: Machine;
  product: Product;
  quote: Quote;
  vision: VisionResult;
  photo_id: string;
  hours_since_replace: number;
  payment_variant_id: string;
  monthly_spend: number;
  fx_to_company: Record<string, number>;
  now: Date;
}
export interface RequestPartInput {
  machine_id: string;
  part_type: PartType;
  hours_since_replace: number;
  photo_id: string;
  note?: string;
}
export type RequestPartResult =
  | { proposal_id: string; status: ProposalStatus; verification: GateResult }
  | { proposal_id: null; status: 'needs_confirmation'; reason: string };
export interface PaymentInput {
  variantId: string;
  merchant: string;
  quantity: number;
  shipToCountry: string;
  idempotencyKey: string;
}
export interface PaymentResult { ref: string; amount: number; currency: string }
export interface PaymentProvider { pay(input: PaymentInput): Promise<PaymentResult> }
