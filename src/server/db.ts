// Persistencia en node:sqlite (sin módulos nativos). Las entidades se guardan como JSON;
// las columnas sueltas existen solo para las restricciones que importan.
import { DatabaseSync } from 'node:sqlite';
import type { Company, EventView, LedgerRow, Machine, ProposalView, Site, Stock } from '@/contracts';
import { seedCompany, seedMachines, seedSites, seedStock } from './seed';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS company (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS site (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS machine (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stock (
  machine_id TEXT NOT NULL, part_type TEXT NOT NULL, data TEXT NOT NULL,
  PRIMARY KEY (machine_id, part_type)
);
CREATE TABLE IF NOT EXISTS proposal (
  id TEXT PRIMARY KEY, machine_id TEXT NOT NULL, part_type TEXT NOT NULL, status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1, data TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS proposal_open
  ON proposal (machine_id, part_type) WHERE status IN ('proposed', 'approved');
CREATE TABLE IF NOT EXISTS purchase (
  proposal_id TEXT NOT NULL UNIQUE, data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL);
`;

type Row = { data: string };
const parse = <T>(rows: unknown[]): T[] => (rows as Row[]).map((r) => JSON.parse(r.data) as T);

export interface StoredProposal { view: ProposalView; attempt: number }

export function openStore(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const tx = <T>(fn: () => T): T => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };

  const store = {
    seed() {
      tx(() => {
        for (const t of ['company', 'site', 'machine', 'stock', 'proposal', 'purchase', 'event']) db.exec(`DELETE FROM ${t}`);
        store.putCompany(seedCompany());
        for (const s of seedSites()) db.prepare('INSERT INTO site (id, data) VALUES (?, ?)').run(s.id, JSON.stringify(s));
        for (const m of seedMachines()) store.putMachine(m);
        for (const s of seedStock()) store.putStock(s);
      });
    },
    isEmpty: () => !db.prepare('SELECT 1 FROM company LIMIT 1').get(),
    tx,

    getCompany: () => parse<Company>(db.prepare('SELECT data FROM company LIMIT 1').all())[0],
    putCompany: (c: Company) => db.prepare('INSERT OR REPLACE INTO company (id, data) VALUES (?, ?)').run(c.id, JSON.stringify(c)),
    listSites: () => parse<Site>(db.prepare('SELECT data FROM site ORDER BY id').all()),
    getSite: (id: string) => parse<Site>(db.prepare('SELECT data FROM site WHERE id = ?').all(id))[0] ?? null,
    listMachines: () => parse<Machine>(db.prepare('SELECT data FROM machine ORDER BY id').all()),
    getMachine: (id: string) => parse<Machine>(db.prepare('SELECT data FROM machine WHERE id = ?').all(id))[0] ?? null,
    putMachine: (m: Machine) => db.prepare('INSERT OR REPLACE INTO machine (id, data) VALUES (?, ?)').run(m.id, JSON.stringify(m)),
    listStock: () => parse<Stock>(db.prepare('SELECT data FROM stock ORDER BY machine_id, part_type').all()),
    getStock: (machineId: string, part: string) =>
      parse<Stock>(db.prepare('SELECT data FROM stock WHERE machine_id = ? AND part_type = ?').all(machineId, part))[0] ?? null,
    putStock: (s: Stock) => {
      if (!(s.qty >= 0)) throw new Error('El stock no puede ser negativo');
      db.prepare('INSERT OR REPLACE INTO stock (machine_id, part_type, data) VALUES (?, ?, ?)')
        .run(s.machine_id, s.part_type, JSON.stringify(s));
    },

    listProposals: () =>
      parse<ProposalView>(db.prepare(`SELECT data FROM proposal ORDER BY json_extract(data, '$.created_at') DESC, id`).all()),
    getProposal(id: string): StoredProposal | null {
      const row = db.prepare('SELECT data, attempt FROM proposal WHERE id = ?').get(id) as (Row & { attempt: number }) | undefined;
      return row ? { view: JSON.parse(row.data) as ProposalView, attempt: row.attempt } : null;
    },
    findOpenProposal(machineId: string, part: string): StoredProposal | null {
      const row = db.prepare(
        "SELECT id FROM proposal WHERE machine_id = ? AND part_type = ? AND status IN ('proposed', 'approved')",
      ).get(machineId, part) as { id: string } | undefined;
      return row ? store.getProposal(row.id) : null;
    },
    putProposal(view: ProposalView, attempt: number) {
      db.prepare(
        `INSERT INTO proposal (id, machine_id, part_type, status, attempt, data) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, attempt = excluded.attempt, data = excluded.data`,
      ).run(view.id, view.machine_id, view.part_type, view.status, attempt, JSON.stringify(view));
    },

    // Devuelve false si la propuesta ya tenía compra: una sola compra por propuesta.
    insertPurchase(row: LedgerRow): boolean {
      const r = db.prepare('INSERT OR IGNORE INTO purchase (proposal_id, data, created_at) VALUES (?, ?, ?)')
        .run(row.proposal_id, JSON.stringify(row), row.created_at);
      return Number(r.changes) === 1;
    },
    listPurchases: () => parse<LedgerRow>(db.prepare('SELECT data FROM purchase ORDER BY created_at').all()),

    addEvent: (e: EventView) =>
      db.prepare('INSERT INTO event (id, created_at, data) VALUES (?, ?, ?)').run(e.id, e.created_at, JSON.stringify(e)),
    listEvents: () => parse<EventView>(db.prepare('SELECT data FROM event ORDER BY created_at DESC, id DESC').all()),
  };
  return store;
}

export type Store = ReturnType<typeof openStore>;
