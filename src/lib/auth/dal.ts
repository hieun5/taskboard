import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import type { User } from "@/db/schema";
import { env } from "@/env";
import { SESSION_COOKIE } from "./constants";
import { createSession, deleteSession, findUserBySessionToken } from "./login";

/** The signed-in member for this request, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Session checks compare against the current time, so they must run per request.
  await connection();
  return findUserBySessionToken(token);
});

/**
 * Data Access Layer entry point: every page and server action that touches member-only
 * data calls this. Redirects to /login when signed out, and to /welcome until the member
 * has picked a display name.
 */
export async function requireUser(opts: { allowMissingName?: boolean } = {}): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.displayName && !opts.allowMissingName) redirect("/welcome");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().secureCookies,
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
}
