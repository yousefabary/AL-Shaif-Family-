import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "seed.json"), "utf-8"));

const SCHEMA_SQL = `
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_people_parent ON people(parent_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
`;

function buildPoolConfig(connectionString) {
  const u = new URL(connectionString);
  const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "postgres",
    // Build the config from discrete fields instead of passing `connectionString`
    // straight through: pg internally re-parses the connection string and lets
    // whatever `sslmode` is embedded in it (Supabase/Neon URLs include one)
    // silently override an explicit `ssl` option, which defeated this setting
    // and caused "self-signed certificate in certificate chain" errors.
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  };
}

let pool;
export function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "لا يوجد اتصال بقاعدة البيانات. أضف قاعدة بيانات Postgres لهذا المشروع من لوحة تحكم Vercel (Storage) ثم أعد النشر."
      );
    }
    pool = new Pool(buildPoolConfig(connectionString));
  }
  return pool;
}

let readyPromise;
export function ensureReady() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

async function init() {
  const p = getPool();
  await p.query(SCHEMA_SQL);
  const { rows } = await p.query("SELECT COUNT(*)::int AS c FROM people");
  if (rows[0].c > 0) return;

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < seed.length; i++) {
      const person = seed[i];
      await client.query(
        `INSERT INTO people (id, name, parent_id, note, sort_order)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [person.id, person.name, person.parentId || null, person.note || null, i]
      );
    }
    await client.query("COMMIT");
    console.log(`Seeded ${seed.length} people from seed.json`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
