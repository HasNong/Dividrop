import Database from 'better-sqlite3';
import { resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'dividrop.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    migrate(db);
    seedIfEmpty(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK (role IN ('company','shareholder')),
      company_id TEXT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(
    'INSERT INTO users (role, company_id, username, full_name, password) VALUES (?, ?, ?, ?, ?)'
  );

  const users = [
    ['company', 'acme', 'acme', 'ACME Corp', '$2a$10$placeholder'],
    ['company', 'globex', 'globex', 'Globex Industries', '$2a$10$placeholder'],
    ['shareholder', null, 'alice', 'Alice (CEO)', '$2a$10$placeholder'],
    ['shareholder', null, 'bob', 'Bob (Investor)', '$2a$10$placeholder'],
    ['shareholder', null, 'charlie', 'Charlie (Investor)', '$2a$10$placeholder'],
    ['shareholder', null, 'diana', 'Diana (Investor)', '$2a$10$placeholder'],
    ['shareholder', null, 'eve', 'Eve (Investor)', '$2a$10$placeholder'],
  ];

  const insertMany = db.transaction(() => {
    for (const u of users) insert.run(...u);
  });

  insertMany();
}

export function findUserByUsername(username: string) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
}

export function createUser(role: string, username: string, fullName: string, password: string, companyId?: string) {
  return getDb().prepare(
    'INSERT INTO users (role, company_id, username, full_name, password) VALUES (?, ?, ?, ?, ?)'
  ).run(role, companyId || null, username, fullName, password);
}

export function updateLastLogin(userId: number) {
  getDb().prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(userId);
}
