import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import { E2E_OUTBOX } from "../../playwright.config";

export type Mail = { to: string; subject: string; text: string };

export async function outbox(): Promise<Mail[]> {
  try {
    return JSON.parse(await readFile(E2E_OUTBOX, "utf8")) as Mail[];
  } catch {
    return [];
  }
}

/** Signs in through the real magic-link flow, reading the link from the dev outbox. */
export async function signIn(page: Page, email: string, name?: string) {
  const before = (await outbox()).length;
  await page.goto("/login");
  await page.getByPlaceholder("name@email.com").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect.poll(async () => (await outbox()).length).toBeGreaterThan(before);
  const mail = (await outbox()).find((m) => m.to === email && m.subject.includes("sign-in link"));
  const url = mail!.text.match(/https?:\/\/\S+/)![0];
  await page.goto(url);
  await page.getByRole("button", { name: "Sign in to Topic Board" }).click();
  if (name) {
    await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
    await page.getByLabel("Your name").fill(name);
    await page.getByRole("button", { name: "Continue to the board" }).click();
  }
  await expect(page.getByRole("heading", { name: "Challenges" })).toBeVisible();
}

export const PDF = { name: "paint-quote.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n") };
export const PNG = {
  name: "porch.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
};
