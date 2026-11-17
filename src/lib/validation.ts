import { z } from "zod";
import { LIMITS } from "./limits";

const trimmed = (label: string, max: number, required = true) => {
  const base = z.string().trim().max(max, `${label} can be at most ${max} characters.`);
  return required ? base.min(1, `${label} is required.`) : base;
};

export const topicStatusSchema = z.enum(["open", "active", "wrapped_up"]);

export const topicInputSchema = z.object({
  title: trimmed("Title", LIMITS.title),
  task: trimmed("Task", LIMITS.task),
  goal: trimmed("Goal", LIMITS.goal),
  bodyMd: trimmed("Notes", LIMITS.body, false),
  status: topicStatusSchema.default("open"),
});
export type TopicInput = z.infer<typeof topicInputSchema>;

export const progressInputSchema = z.object({
  bodyMd: trimmed("Update", LIMITS.progress, false),
});

export const displayNameSchema = trimmed("Name", LIMITS.displayName);

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

export const uuidSchema = z.string().uuid();
export const uuidListSchema = z.array(uuidSchema).max(LIMITS.attachmentsPerPost, `You can attach up to ${LIMITS.attachmentsPerPost} files at a time.`);

/** First validation message, for showing in a form. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Something in the form isn't right.";
}

/** Field → message map for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
