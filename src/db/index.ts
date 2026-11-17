import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

function create() {
  const client = postgres(env().DATABASE_URL, { max: 10, prepare: false });
  return drizzle(client, { schema });
}

type DB = ReturnType<typeof create>;
const globalForDb = globalThis as unknown as { __taskboardDb?: DB };

/** Shared Drizzle client (reused across hot reloads in development). */
export function db(): DB {
  if (!globalForDb.__taskboardDb) globalForDb.__taskboardDb = create();
  return globalForDb.__taskboardDb;
}

export { schema };
