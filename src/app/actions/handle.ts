import "server-only";
import { AppError } from "@/lib/errors";
import type { FormState } from "./state";

/** Turn expected errors into a message for the form; let everything else (incl. redirects) through. */
export function toFormError(err: unknown, values?: Record<string, string>): FormState {
  if (err instanceof AppError) return { error: err.message, values };
  console.error(err);
  return { error: "Something went wrong. Please try again.", values };
}

export function formValues(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = String(formData.get(k) ?? "");
  return out;
}

export function formIds(formData: FormData, key = "attachmentIds"): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
}
