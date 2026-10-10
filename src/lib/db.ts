import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA } from './schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const path = process.env.DB_PATH ?? './data/app.db';
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    db = new Database(path);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA);
  }
  return db;
}

export function resetDbForTests(): void {
  db?.close();
  db = null;
}

export function newDb(): Database.Database {
  const d = new Database(':memory:');
  d.exec(SCHEMA);
  return d;
}
