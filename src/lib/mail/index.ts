import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EmailClient } from "@azure/communication-email";
import { env } from "@/env";

export type Mail = { to: string; subject: string; text: string; html: string };
export type OutboxEntry = Mail & { sentAt: string };

let azureClient: EmailClient | undefined;

/** Sends an email through the configured driver. */
export async function sendMail(mail: Mail): Promise<void> {
  const e = env();
  if (e.MAIL_DRIVER === "azure") {
    azureClient ??= new EmailClient(e.ACS_CONNECTION_STRING!);
    const poller = await azureClient.beginSend({
      senderAddress: e.MAIL_FROM!,
      content: { subject: mail.subject, plainText: mail.text, html: mail.html },
      recipients: { to: [{ address: mail.to }] },
    });
    await poller.pollUntilDone();
    return;
  }

  // Console driver: log it and keep the last 50 messages in a local file for /dev/mail.
  console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
  const file = path.resolve(e.DEV_OUTBOX_FILE);
  const existing = await readOutbox();
  const next = [{ ...mail, sentAt: new Date().toISOString() }, ...existing].slice(0, 50);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2));
}

/** Messages captured by the console driver, newest first. */
export async function readOutbox(): Promise<OutboxEntry[]> {
  try {
    return JSON.parse(await readFile(path.resolve(env().DEV_OUTBOX_FILE), "utf8")) as OutboxEntry[];
  } catch {
    return [];
  }
}

export function devOutboxEnabled(): boolean {
  const e = env();
  return e.MAIL_DRIVER === "console" && (e.NODE_ENV !== "production" || e.ALLOW_DEV_OUTBOX);
}
