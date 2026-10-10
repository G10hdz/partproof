import { describe, it, expect } from 'vitest';
import { newDb } from '@/lib/db';
import { DEMO_TOKENS, seedDb, sha256 } from '@/data/seed';
import { getCompany, getMachine, getStock } from '@/lib/rows';
import { catalog, findByPart } from '@/lib/catalog';

describe('foundation', () => {
  it('seeds the demo fleet atomically with hashed tokens', () => {
    const db = newDb();
    try {
      seedDb(db);
      expect(getCompany(db, 'c1')).toMatchObject({
        name: 'Forja3D MX', country: 'MX', monthlyBudget: 6000, purchaseCap: 1500,
      });
      expect(getMachine(db, 'P3').nameplateModel).toBe('Original Prusa MK3S+');
      expect(getStock(db, 'P4', 'nozzle').qty).toBe(1);
      for (const [id, token] of Object.entries(DEMO_TOKENS)) {
        expect(db.prepare('select mcp_token_hash from machine where id=?').get(id))
          .toEqual({ mcp_token_hash: sha256(token) });
      }
      db.prepare('update stock set qty=0 where machine_id=?').run('P4');
      seedDb(db);
      expect(getStock(db, 'P4', 'nozzle').qty).toBe(1);
      expect(db.prepare('select count(*) as n from machine').get()).toEqual({ n: 4 });
      expect(db.prepare('select count(*) as n from stock').get()).toEqual({ n: 4 });

      db.prepare('update company set name=? where id=?').run('Keep on failure', 'c1');
      db.exec(`create trigger fail_seed before insert on machine
        begin select raise(abort, 'seed failure'); end;`);
      expect(() => seedDb(db)).toThrow('seed failure');
      expect(getCompany(db, 'c1').name).toBe('Keep on failure');
      expect(getMachine(db, 'P3').nameplateModel).toBe('Original Prusa MK3S+');
    } finally {
      db.close();
    }
  });

  it('catalog: digitmakers ships to MX, cubictech does not', () => {
    expect(catalog).toHaveLength(4);
    const ship = (id: string) => catalog.find((c) => c.id === id)!.shipsTo.includes('MX');
    expect(ship('dm-accel-cable')).toBe(true);
    expect(ship('ct-nozzle-04')).toBe(false);
    expect(findByPart('ptfe_tube')).toHaveLength(1);
  });
});
