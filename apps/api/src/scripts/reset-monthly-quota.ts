/**
 * Resets `api_calls_this_month = 0` for every customer.
 *
 * Run from cron on the 1st of each month:
 *   docker compose exec -T api npx tsx src/scripts/reset-monthly-quota.ts
 *
 * Idempotent: safe to run more than once a month (won't double-zero).
 */
import { sql } from "drizzle-orm";
import { customers, db } from "../db/index.js";

async function main(): Promise<void> {
  const result = await db
    .update(customers)
    .set({ apiCallsThisMonth: 0 })
    .where(sql`${customers.apiCallsThisMonth} > 0`);
  const ts = new Date().toISOString();
  // drizzle returns a query result object; row count is in .rowCount on pg.
  // The exact field name depends on driver; we just log the timestamp so cron
  // can confirm execution from journal.
  console.log(`[reset-monthly-quota] ${ts} done`, result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[reset-monthly-quota] failed:", err);
    process.exit(1);
  });
