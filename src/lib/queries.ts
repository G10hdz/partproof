import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getCompany, getMachine, getPhoto } from './rows';
import { getProviderMode } from './payments';
import { getVisionMode } from './vision/analyze';
import type { PartType, ProposalView, ProposalStatus, Quote } from './types';

export const RULE_LABELS = {evidence:'Evidencia',compat:'Compatibilidad',variant_exact:'Variante exacta',ships_to:'Envío a México',price_cap:'Tope por compra',budget:'Presupuesto',quote_valid:'Cotización vigente'};
export const PART_LABELS: Record<PartType,string> = {accelerometer_cable:'Cable de acelerómetro',ptfe_tube:'Tubo PTFE',thermistor:'Termistor',nozzle:'Boquilla'};
export const STATUS_LABELS: Record<ProposalStatus,string> = {proposed:'Pendiente de aprobación',approved:'Pago en proceso',rejected:'Rechazada',paid:'Pagada',failed:'Pago fallido'};
const ruleNames = ['evidence','compat','variant_exact','ships_to','price_cap','budget','quote_valid'] as const;
const verificationSchema=z.object({ok:z.boolean(),rules:z.array(z.object({rule:z.enum(ruleNames),ok:z.boolean(),reason:z.string()})),discarded:z.array(z.object({itemId:z.string(),merchant:z.string(),failed:z.array(z.enum(ruleNames))}))});
export const money=(amount:number,currency='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency}).format(amount);
export const dateTime=(at:number)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(at);

export interface FleetRow {id:string;name:string;nameplateModel:string;hotend:string;hoursTotal:number;parts:{partType:PartType;qty:number;minQty:number;hoursSinceReplace:number;ratedLifeHours:number}[]}
export function fleetRows(db:Database.Database):FleetRow[]{
  const machines=db.prepare('select id,name,nameplate_model,hotend,hours_total from machine order by id').all() as {id:string;name:string;nameplate_model:string;hotend:string;hours_total:number}[];
  return machines.map(m=>({...{id:m.id,name:m.name,nameplateModel:m.nameplate_model,hotend:m.hotend,hoursTotal:m.hours_total},parts:(db.prepare('select part_type,qty,min_qty,hours_since_replace,rated_life_hours from stock where machine_id=? order by part_type').all(m.id) as {part_type:PartType;qty:number;min_qty:number;hours_since_replace:number;rated_life_hours:number}[]).map(s=>({partType:s.part_type,qty:s.qty,minQty:s.min_qty,hoursSinceReplace:s.hours_since_replace,ratedLifeHours:s.rated_life_hours}))}));
}
interface ProposalRow {id:string;machine_id:string;part_type:PartType;item_id:string|null;variant_id:string|null;quote_id:string|null;status:ProposalStatus;reason:string|null;verification:string|null;created_at:number}
function toView(r:ProposalRow):ProposalView{
  const verification=r.verification?verificationSchema.safeParse(JSON.parse(r.verification)):null;
  return {id:r.id,machineId:r.machine_id,partType:r.part_type,itemId:r.item_id,variantId:r.variant_id,quoteId:r.quote_id,status:r.status,reason:r.reason,createdAt:r.created_at,verification:verification?.success?verification.data:null};
}
export function proposalById(db:Database.Database,id:string):ProposalView|null{
  const row=db.prepare('select * from proposal where id=?').get(id) as ProposalRow|undefined;
  return row?toView(row):null;
}
export function recentProposals(db:Database.Database):ProposalView[]{return (db.prepare('select * from proposal order by created_at desc,id desc limit 50').all() as ProposalRow[]).map(toView);}
export function mcpLog(db:Database.Database){
  return (db.prepare(`select e.id,e.machine_id as machineId,e.source,e.payload,e.created_at as createdAt,p.id as proposalId,p.status from event e left join proposal p on p.event_id=e.id order by e.created_at desc,e.id desc limit 50`).all() as {id:string;machineId:string;source:string;payload:string;createdAt:number;proposalId:string|null;status:ProposalStatus|null}[]).map(r=>({...r,payload:JSON.parse(r.payload) as Record<string,unknown>}));
}
export function companySettings(db:Database.Database){return db.prepare('select id from company where id=?').get('c1')?getCompany(db,'c1'):null;}
export function proposalContext(db:Database.Database,p:ProposalView){
  const quote=p.quoteId?db.prepare('select id,item_id as itemId,price,currency,valid_until as validUntil from quote where id=?').get(p.quoteId) as Quote|undefined:undefined;
  const event=db.prepare('select e.source,e.payload from event e join proposal p on p.event_id=e.id where p.id=?').get(p.id) as {source:string;payload:string}|undefined;
  const payload=event?JSON.parse(event.payload) as Record<string,unknown>:{};
  const photoId=typeof payload.photoId==='string'?payload.photoId:null;
  return {machine:getMachine(db,p.machineId),quote:quote??null,source:event?.source??null,hours:typeof payload.hours==='number'?payload.hours:null,photo:photoId?getPhoto(db,photoId):null,photoId};
}
export function approvalBlockReason(p:ProposalView,quote:Pick<Quote,'validUntil'>|null,now=Date.now()):string|null{
  if(p.status!=='proposed')return `Esta propuesta está ${STATUS_LABELS[p.status].toLowerCase()}.`;
  const v=p.verification;
  if(!v?.ok||v.rules.length!==7||new Set(v.rules.map(r=>r.rule)).size!==7||v.rules.some(r=>!r.ok))return 'Las siete verificaciones deben pasar antes de aprobar.';
  if(!quote||!Number.isFinite(quote.validUntil)||quote.validUntil<=now)return 'La cotización venció o todavía no está disponible.';
  return null;
}
export const pendingIntegration=(error:unknown)=>error instanceof Error&&/^not implemented: A[34]$/.test(error.message);
export function integrationModes(){
  let payment:ReturnType<typeof getProviderMode>|null=null;
  let vision:ReturnType<typeof getVisionMode>|null=null;
  try{payment=getProviderMode();}catch(error){if(!pendingIntegration(error))throw error;}
  try{vision=getVisionMode();}catch(error){if(!pendingIntegration(error))throw error;}
  return {payment,vision};
}
