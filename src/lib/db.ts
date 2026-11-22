import pg, { type PoolClient } from 'pg';
const globalDb = globalThis as unknown as { nxwPool?: pg.Pool };
export const pool = globalDb.nxwPool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 8_000 });
globalDb.nxwPool = pool;
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
