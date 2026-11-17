import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { finishUpload, startUpload } from "@/lib/data/attachments";
import { ensureLocalDir, localPathFor } from "@/lib/storage";

export async function makeUser(name = "Member", opts: { isAdmin?: boolean } = {}): Promise<User> {
  const [u] = await db()
    .insert(schema.users)
    .values({ email: `${randomUUID()}@test.local`, displayName: name, isAdmin: opts.isAdmin ?? false })
    .returning();
  return u;
}

export const topicInput = (over: Record<string, string> = {}) => ({
  title: "Fix the garage door",
  task: "Oil the rollers",
  goal: "It opens quietly",
  bodyMd: "Some **notes**",
  status: "open",
  ...over,
});

/** Simulates a finished browser upload through the local driver. */
export async function uploadFile(user: User, fileName = "notes.pdf", content = "%PDF-1.4 test") {
  const { id } = await startUpload(user, { fileName, size: Buffer.byteLength(content) });
  const [row] = await db().select().from(schema.attachments).where((await import("drizzle-orm")).eq(schema.attachments.id, id));
  await ensureLocalDir(row.storageKey);
  await writeFile(localPathFor(row.storageKey), content);
  await finishUpload(user, id);
  return { id, key: row.storageKey };
}
