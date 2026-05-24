import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://sybilshield:sybilshield@localhost:5432/sybilshield";

export const queryClient = postgres(connectionString, { max: 20 });
export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
export * from "./schema.js";
