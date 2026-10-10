export const PART_TYPES = ['ptfe_tube', 'thermistor', 'accelerometer_cable', 'nozzle'] as const;
export type PartType = (typeof PART_TYPES)[number];
export type Currency = 'MXN' | 'CAD' | 'AUD';

export interface CatalogItem {
  id: string;
  merchant: string;
  title: string;
  variantId: string;
  price: number;
  currency: Currency;
  partType: PartType;
  compatModels?: string[];
  compatHotends?: string[];
  shipsTo: string[];
  leadTimeDays: number;
}

export interface Company {
  id: string; name: string; country: string; currency: 'MXN';
  monthlyBudget: number; purchaseCap: number;
}
export interface Machine {
  id: string; companyId: string; name: string; nameplateModel: string;
  hotend: string; hoursTotal: number; downtimeCostPerHour: number;
}
export interface Stock {
  machineId: string; partType: PartType; qty: number; minQty: number;
  ratedLifeHours: number; hoursSinceReplace: number;
}
export interface PhotoEvidence {
  id: string; machineId: string; nameplateModel: string | null; hotend: string | null;
  visibleDamage: string[]; confidence: number;
}
export interface Quote { id: string; itemId: string; price: number; currency: Currency; validUntil: number }

export type RuleName =
  | 'evidence' | 'compat' | 'variant_exact' | 'ships_to' | 'price_cap' | 'budget' | 'quote_valid';
export interface RuleResult { rule: RuleName; ok: boolean; reason: string }
export interface GateInput {
  company: Company; machine: Machine; item: CatalogItem; requestedVariantId: string;
  evidence: { hours: number | null; photoId: string | null; photoNameplateModel: string | null };
  quote: { validUntil: number; price: number; currency: Currency };
  now: number; spentThisMonthMxn: number;
}
export interface GateResult { ok: boolean; rules: RuleResult[] }
export interface Verification extends GateResult {
  discarded: { itemId: string; merchant: string; failed: RuleName[] }[];
}

export type ProposalStatus = 'proposed' | 'approved' | 'rejected' | 'paid' | 'failed';
export interface ProposalView {
  id: string; machineId: string; partType: PartType; itemId: string | null;
  variantId: string | null; quoteId: string | null; status: ProposalStatus;
  reason: string | null; verification: Verification | null; createdAt: number;
}

export interface PayInput {
  variantId: string; merchant: string; quantity: number;
  shipToCountry: string; idempotencyKey: string;
}
export interface PayResult { ref: string; amount: number; currency: Currency }
export interface PaymentProvider { name: 'mock' | 'reap'; pay(input: PayInput): Promise<PayResult> }
export interface ApproveResult {
  status: 'paid' | 'rejected' | 'failed'; alreadyPaid?: boolean; reason?: string;
}

export interface VisionResult {
  nameplateModel: string | null; hotend: string | null;
  visibleDamage: ('ptfe' | 'cable' | 'broken_part' | 'none')[];
  labelText: string | null; confidence: number;
}
