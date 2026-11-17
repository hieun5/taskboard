import "server-only";
import { asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { forbidden, invalid } from "@/lib/errors";
import { displayNameSchema, emailSchema, firstError } from "@/lib/validation";

export async function listMembers() {
  return db()
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      isAdmin: schema.users.isAdmin,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.createdAt));
}

export async function listPendingInvites() {
  return db()
    .select()
    .from(schema.invites)
    .where(isNull(schema.invites.acceptedAt))
    .orderBy(asc(schema.invites.createdAt));
}

export async function inviteMember(actor: User, rawEmail: unknown, makeAdmin = false): Promise<{ email: string; alreadyMember: boolean }> {
  if (!actor.isAdmin) throw forbidden("Only admins can invite people.");
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw invalid(firstError(parsed.error));
  const email = parsed.data;
  const [member] = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (member) return { email, alreadyMember: true };
  await db()
    .insert(schema.invites)
    .values({ email, invitedById: actor.id, isAdmin: makeAdmin })
    .onConflictDoUpdate({ target: schema.invites.email, set: { isAdmin: makeAdmin, invitedById: actor.id } });
  return { email, alreadyMember: false };
}

export async function revokeInvite(actor: User, email: string): Promise<void> {
  if (!actor.isAdmin) throw forbidden("Only admins can remove invites.");
  await db().delete(schema.invites).where(eq(schema.invites.email, email.toLowerCase()));
}

export async function updateProfile(actor: User, input: { displayName: unknown; emailNotifications?: boolean }): Promise<void> {
  const parsed = displayNameSchema.safeParse(input.displayName);
  if (!parsed.success) throw invalid(firstError(parsed.error));
  await db()
    .update(schema.users)
    .set({
      displayName: parsed.data,
      ...(input.emailNotifications === undefined ? {} : { emailNotifications: input.emailNotifications }),
    })
    .where(eq(schema.users.id, actor.id));
}

export async function getUserById(id: string) {
  const [row] = await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return row ?? null;
}
