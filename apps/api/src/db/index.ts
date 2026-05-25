import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://sybilshield:sybilshield@localhost:5432/sybilshield";

// `prepare: false` — postgres-js's default prepared-statement caching causes
// a read-after-write race in our setup: after the worker commits new rows
// in one container, an API GET via a separate pool occasionally returned an
// empty result for up to ~10s before becoming consistent. Reproduced on a
// fresh smoke account today (commit b8da051's two-phase write didn't help —
// rows were in pg yet API still saw zero). Disabling prepared statements
// makes every read re-plan against the current snapshot. Cost: a small CPU
// overhead per query; benefit: caller can read /results immediately after
// observing status=complete.
export const queryClient = postgres(connectionString, { max: 20, prepare: false });
export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
export * from "./schema.js";
