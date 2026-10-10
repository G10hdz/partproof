// Contrato común entre backend y frontend; cambios requieren actualizar sus consumidores.
// Flujo de pago: docs/superpowers/specs/2026-10-09-reap-payment-flow.md
export type PartType = 'ptfe_tube' | 'thermistor' | 'accelerometer_cable' | 'nozzle';
export type ProposalStatus = 'proposed' | 'approved' | 'rejected' | 'paid' | 'failed';
export type GatePhase = 'A' | 'B';
export type GateRule = 'evidence' | 'compat' | 'variant_exact' | 'ships_to' | 'price_cap' | 'budget' | 'quote_valid';
export type ProviderMode = 'mock' | 'reap';
export type VisionMode = 'live' | 'replay';

export interface Money { amount: number; currency: string }

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
}

export interface Company {
  id: string;
  name: string;
  currency: string;
  monthly_budget: number;
  purchase_cap: number;
  billing_email: string;
}
export interface Site {
  id: string;
  company_id: string;
  name: string;
  country: string;
  shipping_address: ShippingAddress;
}
export interface Machine {
  id: string;
  company_id: string;
  site_id: string;
  name: string;
  nameplate_model: string;
  hotend: string;
  hours_total: number;
  downtime_cost_per_hour: number;
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

export interface ProviderQuote {
  id: string;
  checkoutUrl: string;
  merchantDomain: string;
  itemsSubtotal: Money;
  shipping: Money | null;
  tax: Money | null;
  finalAmount: Money;
  expiresAt: string;
}
export type CheckoutStatus = 'REQUIRES_ACTION' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export interface ProviderCheckout {
  id: string;
  status: CheckoutStatus;
  approvalUrl: string | null;
  approvalExpiresAt: string | null;
  orderId: string | null;
  finalAmount: Money | null;
}
export type ProviderErrorCode =
  | 'ITEMS_UNSHIPPABLE'
  | 'ADDRESS_INVALID'
  | 'CHECKOUT_URL_INVALID'
  | 'CARD_PAYMENT_UNAVAILABLE'
  | 'VARIANT_UNAVAILABLE'
  | 'QUOTE_EXPIRED'
  | 'RETRYABLE'
  | 'NOT_ENABLED'
  | 'UNKNOWN';
export class ProviderError extends Error {
  constructor(readonly code: ProviderErrorCode, message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}
export interface PaymentProvider {
  quote(input: {
    product: Product;
    quantity: 1;
    shipTo: ShippingAddress;
    email: string;
    idempotencyKey: string;
  }): Promise<ProviderQuote>;
  checkout(input: { quoteId: string; idempotencyKey: string }): Promise<ProviderCheckout>;
  getCheckout(id: string): Promise<ProviderCheckout>;
}

export interface GateCheck { rule: GateRule; phase: GatePhase; passed: boolean; reason: string }
export interface GateResult { passed: boolean; phase_reached: GatePhase; checks: GateCheck[] }
// Fase A: sin red. Si falla, no se llama a Reap.
export interface GateInputA {
  machine: Machine;
  site: Site;
  product: Product;
  vision: VisionResult;
  photo_id: string;
  hours_since_replace: number;
  checkout_url: string;
}
// Fase B: sobre el quote de Reap (finalAmount incluye envío e impuestos).
export interface GateInputB {
  company: Company;
  quote: ProviderQuote;
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

// DTO para la UI. El frontend solo consume estos tipos y las funciones de src/server/api.ts.
export interface ProposalView {
  id: string;
  machine_id: string;
  site_id: string;
  part_type: PartType;
  status: ProposalStatus;
  product: Product | null;
  quote: ProviderQuote | null;
  quote_amount_company: number | null;
  checkout: ProviderCheckout | null;
  provider: ProviderMode | null;
  verification: GateResult;
  reason: string | null;
  hours_since_replace: number;
  photo_id: string;
  created_at: string;
}
export interface LedgerRow {
  proposal_id: string;
  machine_id: string;
  site_id: string;
  order_id: string;
  provider: ProviderMode;
  amount: Money;
  amount_company: number;
  created_at: string;
}
export interface LedgerView {
  rows: LedgerRow[];
  monthly_total: number;
  monthly_budget: number;
  currency: string;
  cost_per_hour: { machine_id: string; amount: number | null }[];
}
export interface EventView {
  id: string;
  machine_id: string | null;
  source: 'klipper' | 'photo';
  payload: unknown;
  created_at: string;
}
export interface DemoModes { provider: ProviderMode; vision: VisionMode; demo: boolean }

export interface PartProofServer {
  getCompany(): Promise<Company>;
  listSites(): Promise<Site[]>;
  listMachines(): Promise<Machine[]>;
  listStock(): Promise<Stock[]>;
  listProposals(): Promise<ProposalView[]>;
  getProposal(id: string): Promise<ProposalView | null>;
  getLedger(): Promise<LedgerView>;
  listEvents(): Promise<EventView[]>;
  getModes(): Promise<DemoModes>;
  // Crea el checkout en Reap; la UI muestra checkout.approvalUrl como QR.
  approveProposal(id: string): Promise<ProposalView>;
  // Consulta el estado del checkout; la UI lo llama cada 2 s mientras status sea 'approved'.
  refreshProposal(id: string): Promise<ProposalView>;
  // Quote y checkout nuevos tras 'failed' o quote vencido.
  requoteProposal(id: string): Promise<ProposalView>;
  rejectProposal(id: string): Promise<ProposalView>;
  advanceHours(machineId: string, hours: number): Promise<void>;
  saveSettings(input: { monthly_budget: number; purchase_cap: number }): Promise<void>;
  resetDemo(): Promise<void>;
}
