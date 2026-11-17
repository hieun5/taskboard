import "server-only";
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    SESSION_SECRET: z.string().optional(),
    ADMIN_EMAILS: z.string().optional().default(""),

    MAIL_DRIVER: z.enum(["console", "azure"]).default("console"),
    MAIL_FROM: z.string().optional(),
    ACS_CONNECTION_STRING: z.string().optional(),
    ALLOW_DEV_OUTBOX: bool,
    DEV_OUTBOX_FILE: z.string().default(".data/dev-outbox.json"),

    STORAGE_DRIVER: z.enum(["local", "azure"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default(".data/uploads"),
    AZURE_STORAGE_ACCOUNT: z.string().optional(),
    AZURE_STORAGE_KEY: z.string().optional(),
    AZURE_STORAGE_CONTAINER: z.string().default("attachments"),
    AZURE_STORAGE_ENDPOINT: z.string().url().optional(),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().max(100).default(25),
  })
  .superRefine((env, ctx) => {
    const prod = env.NODE_ENV === "production";
    if (prod && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
      ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message: "SESSION_SECRET must be at least 32 characters in production" });
    }
    if (env.MAIL_DRIVER === "azure" && (!env.ACS_CONNECTION_STRING || !env.MAIL_FROM)) {
      ctx.addIssue({ code: "custom", path: ["MAIL_DRIVER"], message: "MAIL_DRIVER=azure needs ACS_CONNECTION_STRING and MAIL_FROM" });
    }
    if (prod && env.MAIL_DRIVER === "console" && !env.ALLOW_DEV_OUTBOX) {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_DRIVER"],
        message: "MAIL_DRIVER=console exposes sign-in links on /dev/mail. In production use MAIL_DRIVER=azure (or set ALLOW_DEV_OUTBOX=true for local testing only)",
      });
    }
    if (env.STORAGE_DRIVER === "azure" && (!env.AZURE_STORAGE_ACCOUNT || !env.AZURE_STORAGE_KEY)) {
      ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "STORAGE_DRIVER=azure needs AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY" });
    }
  });

export type Env = z.infer<typeof schema> & { sessionSecret: string; adminEmails: string[]; secureCookies: boolean };

let cached: Env | undefined;

/** Parsed, validated environment. Read lazily so `next build` works without secrets. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${lines}`);
  }
  const e = parsed.data;
  cached = {
    ...e,
    sessionSecret: e.SESSION_SECRET ?? "dev-only-secret-change-me-dev-only-secret",
    adminEmails: e.ADMIN_EMAILS.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    secureCookies: e.APP_URL.startsWith("https://"),
  };
  return cached;
}
