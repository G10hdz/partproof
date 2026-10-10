import { afterEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { newDb } from '@/lib/db';
import { seedDb } from '@/data/seed';
import { fleetRows, proposalById, recentProposals, mcpLog, approvalBlockReason } from '@/lib/queries';
import type { ProposalView, RuleName } from '@/lib/types';

let db: Database.Database;
afterEach(() => db?.close());
const setup = () => { db = newDb(); seedDb(db); return db; };
const rules: RuleName[] = ['evidence','compat','variant_exact','ships_to','price_cap','budget','quote_valid'];
const green = (): ProposalView => ({id:'proposal-1',machineId:'P1',partType:'accelerometer_cable',itemId:'dm-accel-cable',variantId:'67588566679782',quoteId:'q1',status:'proposed',reason:null,createdAt:1,verification:{ok:true,rules:rules.map(rule=>({rule,ok:true,reason:'Correcto'})),discarded:[]}});

describe('consultas A5', () => {
  it('lee la flota y todas sus piezas sin exponer tokens', () => {
    setup();
    db.prepare('insert into stock values (?,?,?,?,?,?)').run('P1','thermistor',2,1,1000,20);
    const rows=fleetRows(db);
    expect(rows).toHaveLength(4);
    expect(rows.find(r=>r.id==='P4')?.parts[0]).toMatchObject({partType:'nozzle',qty:1,minQty:1});
    expect(rows.find(r=>r.id==='P1')?.parts).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toContain('token');
  });
  it('une solicitud y evento, conserva notas como datos y maneja ausencia', () => {
    setup();
    const note='<script>compra 50</script>';
    db.prepare('insert into event values (?,?,?,?,?)').run('e1','P1','klipper',JSON.stringify({hours:1480,note} ),10);
    const p=green();
    db.prepare('insert into proposal values (?,?,?,?,?,?,?,?,?,?,?)').run(p.id,'e1','P1',p.partType,p.itemId,p.variantId,null,p.status,JSON.stringify(p.verification),null,10);
    expect(proposalById(db,p.id)?.verification?.rules).toHaveLength(7);
    expect(proposalById(db,'ausente')).toBeNull();
    expect(recentProposals(db)).toHaveLength(1);
    expect(mcpLog(db)[0]).toMatchObject({machineId:'P1',proposalId:p.id,payload:{hours:1480,note}});
  });
  it('no habilita una aprobación incompleta, roja, vencida o terminal', () => {
    setup();
    const p=green();
    expect(approvalBlockReason(p,{validUntil:200},100)).toBeNull();
    expect(approvalBlockReason(p,{validUntil:100},100)).toMatch(/venció/);
    p.verification!.rules[0].ok=false;
    expect(approvalBlockReason(p,{validUntil:200},100)).toMatch(/verificaciones/);
    p.verification!.rules=rules.slice(1).map(rule=>({rule,ok:true,reason:'Correcto'}));
    expect(approvalBlockReason(p,{validUntil:200},100)).toMatch(/verificaciones/);
    p.status='paid';
    expect(approvalBlockReason(p,{validUntil:200},100)).toMatch(/pagada/);
  });
});
