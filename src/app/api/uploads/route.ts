import { createWriteStream } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "@/env";
import { verifySignedPayload } from "@/lib/auth/crypto";
import { getCurrentUser } from "@/lib/auth/dal";
import { ensureLocalDir, localPathFor, type LocalUploadClaim } from "@/lib/storage";

/**
 * Upload endpoint for the local storage driver (development and tests). Mirrors Azure's
 * signed PUT: the URL carries a short-lived signed claim for exactly one file.
 */
export async function PUT(request: Request) {
  if (env().STORAGE_DRIVER !== "local") return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifySignedPayload(token, env().sessionSecret);
  if (!payload) return new Response("Invalid upload link", { status: 403 });
  const claim = JSON.parse(payload) as LocalUploadClaim;
  if (claim.exp < Date.now()) return new Response("Upload link expired", { status: 403 });
  if (claim.uid !== user.id) return new Response("Invalid upload link", { status: 403 });
  if (!request.body) return new Response("No file", { status: 400 });

  const declared = Number(request.headers.get("content-length") ?? claim.size);
  if (declared > claim.size) return new Response("File is larger than declared", { status: 413 });

  await ensureLocalDir(claim.key);
  const finalPath = localPathFor(claim.key);
  const tmpPath = `${finalPath}.part`;
  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      if (received > claim.size) cb(new Error("too large"));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), limit, createWriteStream(tmpPath, { flags: "wx" }));
    await rename(tmpPath, finalPath);
  } catch (err) {
    await rm(tmpPath, { force: true });
    const tooLarge = err instanceof Error && err.message === "too large";
    return new Response(tooLarge ? "File is larger than declared" : "Upload failed", { status: tooLarge ? 413 : 500 });
  }
  return new Response(null, { status: 201 });
}
