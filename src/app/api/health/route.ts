import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

/** Liveness/readiness probe for Azure Container Apps. */
export async function GET() {
  await connection();
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
