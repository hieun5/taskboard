import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { env } from "@/env";
import { signPayload } from "@/lib/auth/crypto";

export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };
export type DownloadOptions = { fileName: string; contentType: string; inline: boolean };

export interface StorageDriver {
  /** A short-lived URL the browser can PUT the file to directly. */
  createUploadTarget(key: string, opts: { contentType: string; size: number; ownerId: string }): Promise<UploadTarget>;
  /** Size of a stored object, or null if it doesn't exist. */
  size(key: string): Promise<number | null>;
  delete(key: string): Promise<void>;
  /** A response that delivers the file to an already-authorised member. */
  download(key: string, opts: DownloadOptions): Promise<Response>;
}

const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;
const DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;

function contentDisposition(fileName: string, inline: boolean): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

// ---------------------------------------------------------------------------
// Local disk (development and tests)
// ---------------------------------------------------------------------------

export type LocalUploadClaim = { key: string; size: number; type: string; exp: number; uid: string };

export function localPathFor(key: string): string {
  if (!/^[a-z0-9/-]+$/i.test(key) || key.includes("..")) throw new Error("Bad storage key");
  return path.resolve(env().LOCAL_STORAGE_DIR, key);
}

const localDriver: StorageDriver = {
  async createUploadTarget(key, { contentType, size, ownerId }) {
    const claim: LocalUploadClaim = { key, size, type: contentType, exp: Date.now() + UPLOAD_URL_TTL_MS, uid: ownerId };
    const token = signPayload(JSON.stringify(claim), env().sessionSecret);
    return { url: `/api/uploads?token=${encodeURIComponent(token)}`, method: "PUT", headers: { "Content-Type": contentType } };
  },
  async size(key) {
    try {
      return (await stat(localPathFor(key))).size;
    } catch {
      return null;
    }
  },
  async delete(key) {
    await rm(localPathFor(key), { force: true });
  },
  async download(key, { fileName, contentType, inline }) {
    const file = localPathFor(key);
    const info = await stat(file);
    const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": contentDisposition(fileName, inline),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  },
};

export async function ensureLocalDir(key: string) {
  await mkdir(path.dirname(localPathFor(key)), { recursive: true });
}

// ---------------------------------------------------------------------------
// Azure Blob Storage (production). Files stay in a private container; the browser
// only ever gets short-lived SAS URLs for a single blob.
// ---------------------------------------------------------------------------

function azure() {
  const e = env();
  const credential = new StorageSharedKeyCredential(e.AZURE_STORAGE_ACCOUNT!, e.AZURE_STORAGE_KEY!);
  const endpoint = e.AZURE_STORAGE_ENDPOINT ?? `https://${e.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`;
  const service = new BlobServiceClient(endpoint, credential);
  const container = service.getContainerClient(e.AZURE_STORAGE_CONTAINER);
  const sas = (key: string, permissions: string, ttl: number, extra: Record<string, string> = {}) =>
    generateBlobSASQueryParameters(
      {
        containerName: e.AZURE_STORAGE_CONTAINER,
        blobName: key,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: new Date(Date.now() - 60_000),
        expiresOn: new Date(Date.now() + ttl),
        ...extra,
      },
      credential,
    ).toString();
  return { container, sas };
}

const azureDriver: StorageDriver = {
  async createUploadTarget(key, { contentType }) {
    const { container, sas } = azure();
    const url = `${container.getBlockBlobClient(key).url}?${sas(key, "cw", UPLOAD_URL_TTL_MS)}`;
    return { url, method: "PUT", headers: { "Content-Type": contentType, "x-ms-blob-type": "BlockBlob" } };
  },
  async size(key) {
    const { container } = azure();
    try {
      const props = await container.getBlockBlobClient(key).getProperties();
      return props.contentLength ?? null;
    } catch {
      return null;
    }
  },
  async delete(key) {
    const { container } = azure();
    await container.getBlockBlobClient(key).deleteIfExists();
  },
  async download(key, { fileName, contentType, inline }) {
    const { container, sas } = azure();
    const query = sas(key, "r", DOWNLOAD_URL_TTL_MS, {
      contentDisposition: contentDisposition(fileName, inline),
      contentType,
    });
    return new Response(null, {
      status: 302,
      headers: { Location: `${container.getBlockBlobClient(key).url}?${query}`, "Cache-Control": "no-store" },
    });
  },
};

export function storage(): StorageDriver {
  return env().STORAGE_DRIVER === "azure" ? azureDriver : localDriver;
}
