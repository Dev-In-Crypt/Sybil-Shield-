/**
 * Shared migration helper for integration tests.
 *
 * Wraps `drizzle migrate()` in a Postgres advisory lock so multiple test
 * files calling this concurrently won't race on schema creation (which
 * surfaced as duplicate-key errors on pg_namespace_nspname_index in CI).
 *
 * The lock is held only for the duration of the migration call, then released.
 * Second/third callers wait, then run migrate() which is a no-op once tables
 * exist.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const LOCK_ID = 0xc0ffee01;

export async function migrateOnce(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await client`SELECT pg_advisory_lock(${LOCK_ID})`;
    try {
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: "./src/db/migrations" });
    } finally {
      await client`SELECT pg_advisory_unlock(${LOCK_ID})`;
    }
  } finally {
    await client.end();
  }
}
