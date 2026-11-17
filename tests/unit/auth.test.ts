import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db, schema } from "@/db";
import { sha256 } from "@/lib/auth/crypto";
import { consumeLoginToken, createSession, deleteSession, findUserBySessionToken, requestLoginLink } from "@/lib/auth/login";
import { inviteMember } from "@/lib/data/members";
import { makeUser } from "./helpers";

async function lastLinkFor(email: string): Promise<string> {
  const mails = JSON.parse(await readFile(".data/test-outbox.json", "utf8")) as { to: string; text: string }[];
  const mail = mails.find((m) => m.to === email);
  if (!mail) throw new Error(`no mail for ${email}`);
  return new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
}

describe("magic-link sign-in", () => {
  it("does not email people who aren't invited", async () => {
    const res = await requestLoginLink("stranger@test.local");
    expect(res.sent).toBe(false);
    const rows = await db().select().from(schema.loginTokens).where(eq(schema.loginTokens.email, "stranger@test.local"));
    expect(rows).toHaveLength(0);
  });

  it("signs in an ADMIN_EMAILS address as an admin, once per link", async () => {
    expect((await requestLoginLink("  Admin@Test.local ")).sent).toBe(true);
    const token = await lastLinkFor("admin@test.local");
    const stored = await db().select().from(schema.loginTokens).where(eq(schema.loginTokens.email, "admin@test.local"));
    expect(stored[0].tokenHash).toBe(sha256(token)); // only the hash is stored

    const first = await consumeLoginToken(token);
    expect(first.ok).toBe(true);
    const second = await consumeLoginToken(token);
    expect(second).toEqual({ ok: false, reason: "invalid" });

    const [user] = await db().select().from(schema.users).where(eq(schema.users.email, "admin@test.local"));
    expect(user.isAdmin).toBe(true);
  });

  it("lets invited people in and marks the invite accepted", async () => {
    const admin = await makeUser("Admin", { isAdmin: true });
    await inviteMember(admin, "Uncle@Test.local");
    expect((await requestLoginLink("uncle@test.local")).sent).toBe(true);
    const result = await consumeLoginToken(await lastLinkFor("uncle@test.local"));
    expect(result).toMatchObject({ ok: true, needsName: true });
    const [invite] = await db().select().from(schema.invites).where(eq(schema.invites.email, "uncle@test.local"));
    expect(invite.acceptedAt).not.toBeNull();
  });

  it("rejects expired links", async () => {
    await db().insert(schema.loginTokens).values({ tokenHash: sha256("old-token"), email: "admin@test.local", expiresAt: new Date(Date.now() - 1000) });
    expect(await consumeLoginToken("old-token")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rate-limits link requests", async () => {
    const admin = await makeUser("Admin", { isAdmin: true });
    await inviteMember(admin, "busy@test.local");
    const results = [];
    for (let i = 0; i < 7; i++) results.push((await requestLoginLink("busy@test.local")).sent);
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it("creates, finds and ends sessions", async () => {
    const user = await makeUser("Session person");
    const { token } = await createSession(user.id);
    expect((await findUserBySessionToken(token))?.id).toBe(user.id);
    expect(await findUserBySessionToken("not-a-real-token")).toBeNull();
    await deleteSession(token);
    expect(await findUserBySessionToken(token)).toBeNull();
  });
});
