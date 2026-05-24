/**
 * Applies pending Drizzle migrations.
 *
 * Run: tsx src/db/migrate.ts
 * In Docker: docker compose exec api npx tsx src/db/migrate.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const url =
    process.env.DATABASE_URL ?? "postgres://sybilshield:sybilshield@localhost:5432/sybilshield";
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  console.log(`[migrate] applying to ${url.replace(/:[^@]+@/, ":***@")}`);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("[migrate] done");
  await client.end();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
