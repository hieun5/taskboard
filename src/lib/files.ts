/** Shared by client and server: which files are allowed, and how to show them. */

export type FileKind = "pdf" | "image" | "doc" | "sheet" | "slides" | "text" | "archive";

type FileType = { mime: string; kind: FileKind };

export const ALLOWED_FILE_TYPES: Record<string, FileType> = {
  pdf: { mime: "application/pdf", kind: "pdf" },
  png: { mime: "image/png", kind: "image" },
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  heic: { mime: "image/heic", kind: "image" },
  txt: { mime: "text/plain", kind: "text" },
  md: { mime: "text/markdown", kind: "text" },
  csv: { mime: "text/csv", kind: "sheet" },
  doc: { mime: "application/msword", kind: "doc" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "doc" },
  odt: { mime: "application/vnd.oasis.opendocument.text", kind: "doc" },
  xls: { mime: "application/vnd.ms-excel", kind: "sheet" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "sheet" },
  ods: { mime: "application/vnd.oasis.opendocument.spreadsheet", kind: "sheet" },
  ppt: { mime: "application/vnd.ms-powerpoint", kind: "slides" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "slides" },
  zip: { mime: "application/zip", kind: "archive" },
};

/** Image types browsers can show inline (HEIC can't, so it downloads instead). */
const INLINE_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i + 1).toLowerCase();
}

export function fileTypeFor(fileName: string): FileType | null {
  return ALLOWED_FILE_TYPES[extensionOf(fileName)] ?? null;
}

export function kindForMime(mime: string): FileKind {
  for (const t of Object.values(ALLOWED_FILE_TYPES)) if (t.mime === mime) return t.kind;
  return "doc";
}

export function isPreviewableImage(mime: string): boolean {
  return INLINE_IMAGE_MIMES.has(mime);
}

/** Files we let the browser display (images and PDFs). Everything else downloads. */
export function opensInline(mime: string): boolean {
  return INLINE_IMAGE_MIMES.has(mime) || mime === "application/pdf";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** Strip path parts and control characters from a user-supplied file name. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim();
  return (cleaned || "file").slice(0, 180);
}
