import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dataDir, "family.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES people(id) ON DELETE CASCADE,
  gender TEXT,
  birth_year TEXT,
  death_year TEXT,
  note TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_people_parent ON people(parent_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM people").get().c;
  if (count > 0) return;

  const seedPath = path.join(dataDir, "seed.json");
  if (!fs.existsSync(seedPath)) return;
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  const insert = db.prepare(
    `INSERT INTO people (id, name, parent_id, note, sort_order) VALUES (@id, @name, @parentId, @note, @sortOrder)`
  );
  const tx = db.transaction((rows) => {
    rows.forEach((r, i) => {
      insert.run({
        id: r.id,
        name: r.name,
        parentId: r.parentId || null,
        note: r.note || null,
        sortOrder: i,
      });
    });
  });
  tx(seed);
  console.log(`Seeded ${seed.length} people from seed.json`);
}

seedIfEmpty();

export default db;
