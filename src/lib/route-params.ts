import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { uuidSchema } from "@/lib/validation";

/** Validates a UUID route param, showing the 404 page for anything else. */
export function requireUuid(value: string): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) notFound();
  return parsed.data;
}

/** Runs a lookup and turns our "not found" errors into the 404 page. */
export async function orNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
}
