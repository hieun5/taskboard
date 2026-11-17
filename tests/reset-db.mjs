// Drops and recreates the schema in a test database, then applies migrations.
import { rm } from "node:fs/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function resetDatabase(url, extraDirs = []) {
  if (!/test/.test(url)) throw new Error(`Refusing to reset a database whose URL doesn't mention "test": ${url}`);
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
    await migrate(drizzle(client), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  } finally {
    await client.end();
  }
  for (const dir of extraDirs) await rm(dir, { recursive: true, force: true });
}

// CLI: node tests/reset-db.mjs <database-url> [dir-to-clear ...]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, ...dirs] = process.argv.slice(2);
  await resetDatabase(url, dirs);
}
