import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** A new random, URL-safe secret (256 bits). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC-signs a payload so it can be handed to the browser and verified later. */
export function signPayload(payload: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

/** Returns the payload if the signature is valid, otherwise null. */
export function verifySignedPayload(signed: string, secret: string): string | null {
  const [encoded, mac] = signed.split(".");
  if (!encoded || !mac) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return payload;
}
