import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const DEMO_TOKENS: Record<string, string> = {
  P1: 'demo-token-p1', P2: 'demo-token-p2', P3: 'demo-token-p3', P4: 'demo-token-p4',
};

export function seedDb(db: Database.Database): void {
  db.transaction(() => {
    db.exec(`delete from purchase; delete from proposal; delete from quote; delete from event;
             delete from photo; delete from stock; delete from machine; delete from company;`);
    db.prepare('insert into company values (?,?,?,?,?,?)')
      .run('c1', 'Forja3D MX', 'MX', 'MXN', 6000, 1500);
    const m = db.prepare('insert into machine values (?,?,?,?,?,?,?,?)');
    const fleet: [string, string, string, string, number][] = [
      ['P1', 'P1', 'Original Prusa MK4S', 'Nextruder', 820],
      ['P2', 'P2', 'Original Prusa MK3S', 'E3D V6', 2310],
      ['P3', 'P3', 'Original Prusa MK3S+', 'E3D V6', 1480],
      ['P4', 'P4', 'Creality K1', 'Micro Swiss FlowTech', 640],
    ];
    for (const [id, name, model, hotend, hours] of fleet)
      m.run(id, 'c1', name, model, hotend, hours, 120, sha256(DEMO_TOKENS[id]));
    const s = db.prepare('insert into stock values (?,?,?,?,?,?)');
    s.run('P1', 'accelerometer_cable', 1, 1, 1500, 1480);
    s.run('P2', 'ptfe_tube', 1, 1, 1000, 980);
    s.run('P3', 'ptfe_tube', 1, 1, 1000, 960);
    s.run('P4', 'nozzle', 1, 1, 600, 590);
  })();
}
