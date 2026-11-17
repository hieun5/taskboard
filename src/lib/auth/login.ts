import "server-only";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "@/env";
import { sendMail } from "@/lib/mail";
import { loginEmail } from "@/lib/mail/templates";
import { newToken, sha256 } from "./crypto";

export const LOGIN_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_LINKS_PER_WINDOW = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

/** Only same-site paths are allowed as a post-sign-in destination. */
export function isSafeNext(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && next.length < 500;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Can this email sign in? True for ADMIN_EMAILS, existing members and invited emails. */
export async function isAllowedEmail(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (env().adminEmails.includes(e)) return true;
  const [user] = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, e)).limit(1);
  if (user) return true;
  const [invite] = await db().select({ email: schema.invites.email }).from(schema.invites).where(eq(schema.invites.email, e)).limit(1);
  return Boolean(invite);
}

/**
 * Emails a one-time sign-in link if the address is allowed. Always resolves the same way
 * for the caller, so the login page never reveals who is on the invite list.
 */
export async function requestLoginLink(rawEmail: string, next?: string): Promise<{ sent: boolean }> {
  const email = normalizeEmail(rawEmail);
  if (!(await isAllowedEmail(email))) return { sent: false };

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const [{ count }] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.loginTokens)
    .where(and(eq(schema.loginTokens.email, email), gt(schema.loginTokens.createdAt, since)));
  if (count >= MAX_LINKS_PER_WINDOW) return { sent: false };

  // Housekeeping: drop expired tokens.
  await db().delete(schema.loginTokens).where(lt(schema.loginTokens.expiresAt, new Date()));

  const token = newToken();
  await db()
    .insert(schema.loginTokens)
    .values({ tokenHash: sha256(token), email, expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS) });

  const url = new URL("/auth/verify", env().APP_URL);
  url.searchParams.set("token", token);
  if (next && isSafeNext(next) && next !== "/") url.searchParams.set("next", next);
  await sendMail({ to: email, ...loginEmail(url.toString()) });
  return { sent: true };
}

export type ConsumeResult =
  | { ok: true; userId: string; needsName: boolean }
  | { ok: false; reason: "invalid" | "not_invited" };

/** Uses up a sign-in token and returns the member it belongs to (creating them on first sign-in). */
export async function consumeLoginToken(token: string): Promise<ConsumeResult> {
  if (!token || token.length > 200) return { ok: false, reason: "invalid" };
  const [row] = await db()
    .update(schema.loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.loginTokens.tokenHash, sha256(token)),
        isNull(schema.loginTokens.usedAt),
        gt(schema.loginTokens.expiresAt, new Date()),
      ),
    )
    .returning({ email: schema.loginTokens.email });
  if (!row) return { ok: false, reason: "invalid" };

  const email = row.email;
  const isEnvAdmin = env().adminEmails.includes(email);

  return db().transaction(async (tx) => {
    const [existing] = await tx.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing) {
      if (isEnvAdmin && !existing.isAdmin) {
        await tx.update(schema.users).set({ isAdmin: true }).where(eq(schema.users.id, existing.id));
      }
      return { ok: true as const, userId: existing.id, needsName: !existing.displayName };
    }

    const [invite] = await tx.select().from(schema.invites).where(eq(schema.invites.email, email)).limit(1);
    if (!invite && !isEnvAdmin) return { ok: false as const, reason: "not_invited" as const };

    const [created] = await tx
      .insert(schema.users)
      .values({ email, isAdmin: isEnvAdmin || Boolean(invite?.isAdmin) })
      .returning({ id: schema.users.id });
    if (invite) {
      await tx.update(schema.invites).set({ acceptedAt: new Date() }).where(eq(schema.invites.email, email));
    }
    return { ok: true as const, userId: created.id, needsName: true };
  });
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db().insert(schema.sessions).values({ idHash: sha256(token), userId, expiresAt });
  await db().delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  return { token, expiresAt };
}

export async function findUserBySessionToken(token: string) {
  if (!token || token.length > 200) return null;
  const [row] = await db()
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.idHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await db().delete(schema.sessions).where(eq(schema.sessions.idHash, sha256(token)));
}
