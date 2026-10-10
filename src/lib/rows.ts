import type Database from 'better-sqlite3';
import type { Company, Machine, Stock, PartType, PhotoEvidence } from './types';

export function getCompany(db: Database.Database, id: string): Company {
  const r = db.prepare('select * from company where id=?').get(id) as any;
  if (!r) throw new Error(`company ${id} not found`);
  return { id: r.id, name: r.name, country: r.country, currency: r.currency,
    monthlyBudget: r.monthly_budget, purchaseCap: r.purchase_cap };
}

export function getMachine(db: Database.Database, id: string): Machine {
  const r = db.prepare('select * from machine where id=?').get(id) as any;
  if (!r) throw new Error(`machine ${id} not found`);
  return { id: r.id, companyId: r.company_id, name: r.name, nameplateModel: r.nameplate_model,
    hotend: r.hotend, hoursTotal: r.hours_total, downtimeCostPerHour: r.downtime_cost_per_hour };
}

export function getStock(db: Database.Database, machineId: string, partType: PartType): Stock {
  const r = db.prepare('select * from stock where machine_id=? and part_type=?').get(machineId, partType) as any;
  if (!r) throw new Error(`stock ${machineId}/${partType} not found`);
  return { machineId: r.machine_id, partType: r.part_type, qty: r.qty, minQty: r.min_qty,
    ratedLifeHours: r.rated_life_hours, hoursSinceReplace: r.hours_since_replace };
}

export function getPhoto(db: Database.Database, id: string): PhotoEvidence | null {
  const r = db.prepare('select * from photo where id=?').get(id) as any;
  if (!r) return null;
  return { id: r.id, machineId: r.machine_id, nameplateModel: r.nameplate_model, hotend: r.hotend,
    visibleDamage: JSON.parse(r.visible_damage), confidence: r.confidence };
}
