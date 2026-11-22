import 'dotenv/config';
import { pool, transaction } from '../src/lib/db';

await transaction(async client => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS admins (id uuid PRIMARY KEY, username text NOT NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS admin_sessions (token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE, rate_ip text NOT NULL, expires_at timestamptz NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON admin_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS login_attempts (username text NOT NULL, ip text NOT NULL, failures integer NOT NULL DEFAULT 0, window_started timestamptz NOT NULL DEFAULT now(), blocked_until timestamptz, PRIMARY KEY(username,ip));
    CREATE TABLE IF NOT EXISTS site (id integer PRIMARY KEY CHECK(id=1), draft jsonb NOT NULL, published jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz);
    CREATE TABLE IF NOT EXISTS entries (id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('service','case','news')), slug text NOT NULL, data jsonb NOT NULL, published_data jsonb, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, UNIQUE(kind,slug));
    CREATE INDEX IF NOT EXISTS entries_kind ON entries(kind);
    ALTER TABLE entries ADD COLUMN IF NOT EXISTS published_slug text;
    UPDATE entries SET published_slug=slug WHERE published_data IS NOT NULL AND published_slug IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS entries_published_slug ON entries(kind,published_slug) WHERE published_slug IS NOT NULL;
    CREATE TABLE IF NOT EXISTS folders (id uuid PRIMARY KEY, name text NOT NULL, parent_id uuid REFERENCES folders(id) ON DELETE RESTRICT);
    CREATE TABLE IF NOT EXISTS files (id uuid PRIMARY KEY, name text NOT NULL, storage_name text NOT NULL UNIQUE, mime text NOT NULL, size bigint NOT NULL, folder_id uuid REFERENCES folders(id) ON DELETE RESTRICT, alt text NOT NULL DEFAULT '', thumbnail text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS files_folder ON files(folder_id);
    INSERT INTO migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
    INSERT INTO migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
  `);
});
console.log('数据库迁移完成（版本 2）。');
await pool.end();
