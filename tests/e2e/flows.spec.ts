import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { outbox, PDF, PNG, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

let adminCtx: BrowserContext;
let uncleCtx: BrowserContext;
let admin: Page;
let uncle: Page;
let topicUrl = "";

test.beforeAll(async ({ browser }) => {
  adminCtx = await browser.newContext();
  uncleCtx = await browser.newContext();
  admin = await adminCtx.newPage();
  uncle = await uncleCtx.newPage();
});

test.afterAll(async () => {
  await adminCtx.close();
  await uncleCtx.close();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/topics/new");
  await expect(page).toHaveURL(/\/login\?next=%2Ftopics%2Fnew/);
});

test("people who aren't invited don't get a link", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("name@email.com").fill("stranger@e2e.test");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  expect((await outbox()).some((m) => m.to === "stranger@e2e.test")).toBe(false);
});

test("admin signs in, picks a name and invites a member", async () => {
  await signIn(admin, "admin@e2e.test", "Hieu");
  await expect(admin.getByText("Nothing on the board yet")).toBeVisible();

  await admin.goto("/members");
  await admin.getByLabel("Email", { exact: true }).fill("uncle@e2e.test");
  await admin.getByRole("button", { name: "Send invite" }).click();
  await expect(admin.getByText("Invited uncle@e2e.test.")).toBeVisible();
  await expect(admin.getByText("uncle@e2e.test").last()).toBeVisible();
  expect((await outbox()).some((m) => m.to === "uncle@e2e.test" && m.subject.includes("invited you"))).toBe(true);
});

test("admin posts a topic with a PDF and an image", async () => {
  await admin.goto("/topics/new");
  await admin.getByLabel("Title").fill("Repaint the back porch");
  await admin.getByLabel("Task").fill("Scrape, prime and paint the floor and railings.");
  await admin.getByLabel("Goal").fill("Done before Dec 15.");
  await admin.getByRole("textbox", { name: "Notes" }).fill("Order of work:\n\n- Scrape\n- Prime\n\n<script>alert(1)</script>");
  await admin.locator('input[type="file"]').setInputFiles([PDF, PNG]);
  await expect(admin.getByText("· ready")).toHaveCount(2);
  await admin.getByRole("button", { name: "Post topic" }).click();

  await expect(admin).toHaveURL(/\/topics\/[0-9a-f-]{36}$/);
  topicUrl = admin.url();
  await expect(admin.getByRole("heading", { name: "Repaint the back porch" })).toBeVisible();
  await expect(admin.getByRole("listitem").filter({ hasText: "Scrape" })).toBeVisible();
  await expect(admin.locator("script", { hasText: "alert(1)" })).toHaveCount(0);
  await expect(admin.getByRole("link", { name: /paint-quote\.pdf/ })).toBeVisible();
  await expect(admin.getByRole("img", { name: "porch.png" })).toBeVisible();

  const href = await admin.getByRole("link", { name: /paint-quote\.pdf/ }).getAttribute("href");
  const res = await admin.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
});

test("an invited member signs in, logs progress and can't edit someone else's topic", async () => {
  await signIn(uncle, "uncle@e2e.test", "Uncle");
  const card = uncle.getByRole("link", { name: /Repaint the back porch/ });
  await expect(card.getByText("New")).toBeVisible();
  await card.click();

  await expect(uncle.getByRole("heading", { name: "Repaint the back porch" })).toBeVisible();
  await expect(uncle.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(uncle.locator("#topic-status")).toHaveCount(0);

  await uncle.getByRole("textbox", { name: "Update" }).fill("Scraped the railings. **Two boards** are soft.");
  await uncle.locator('input[type="file"]').setInputFiles([{ ...PDF, name: "receipt.pdf" }]);
  await expect(uncle.getByText("· ready")).toHaveCount(1);
  await uncle.getByRole("button", { name: "Post update" }).click();
  await expect(uncle.getByText("Two boards")).toBeVisible();
  await expect(uncle.locator("strong", { hasText: "Two boards" })).toBeVisible();
  await expect(uncle.getByRole("link", { name: /receipt\.pdf/ })).toBeVisible();
  await expect(uncle.getByRole("textbox", { name: "Update" })).toHaveValue("");

  await uncle.goto(`${topicUrl}/edit`);
  await expect(uncle.getByRole("heading", { name: "Nothing here" })).toBeVisible();

  // Members without admin rights can't invite.
  await uncle.goto("/members");
  await expect(uncle.getByRole("button", { name: "Send invite" })).toHaveCount(0);
});

test("the author sees the new activity, gets an email and updates the status", async () => {
  await expect.poll(async () => (await outbox()).some((m) => m.to === "admin@e2e.test" && m.subject.includes("added progress"))).toBe(true);

  await admin.goto("/");
  const card = admin.getByRole("link", { name: /Repaint the back porch/ });
  await expect(card.getByText("New activity")).toBeVisible();
  await expect(card.getByText("1 update · last active just now")).toBeVisible();
  await expect(card.getByText("3 files")).toBeVisible();

  await card.click();
  await expect(admin.getByText("Scraped the railings.")).toBeVisible();
  await admin.locator("#topic-status").selectOption("done");
  await expect(admin.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await admin.goto("/");
  await expect(admin.getByRole("link", { name: /Repaint the back porch/ }).getByText("Done", { exact: true })).toBeVisible();
  await expect(admin.getByRole("link", { name: /Repaint the back porch/ }).getByText("New activity")).toHaveCount(0);
});

test("search expands from a button and filters the board", async () => {
  await admin.goto("/");
  const box = admin.getByRole("searchbox", { name: "Search topics" });
  await expect(box).toBeHidden();
  await admin.getByRole("button", { name: "Search topics" }).click();
  await expect(box).toBeFocused();
  await box.fill("porch");
  await expect(admin).toHaveURL(/q=porch/);
  await expect(admin.getByText("1 topic found")).toBeVisible();
  await expect(admin.getByRole("link", { name: /Repaint the back porch/ })).toBeVisible();
  await box.fill("zzz");
  await expect(admin.getByText("No topics match")).toBeVisible();
  await admin.getByRole("link", { name: "Clear search" }).click();
  await expect(admin.getByRole("link", { name: /Repaint the back porch/ })).toBeVisible();
  await expect(box).toBeHidden();
});

test("members edit and delete their own progress", async () => {
  await uncle.goto(topicUrl);
  await uncle.getByRole("link", { name: "Edit" }).click();
  await uncle.getByRole("textbox", { name: "Update" }).fill("Scraped everything.");
  await uncle.getByRole("button", { name: "Save changes" }).click();
  await expect(uncle.getByText("Scraped everything.")).toBeVisible();

  // Delete asks first; Cancel keeps the update.
  await uncle.getByRole("button", { name: "Delete" }).click();
  const confirm = uncle.getByRole("dialog", { name: "Are you sure?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(uncle.getByText("Scraped everything.")).toBeVisible();

  await uncle.getByRole("button", { name: "Delete" }).click();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(uncle.getByText("No updates yet.")).toBeVisible();
});

test("dark mode sticks after a reload", async () => {
  await admin.goto("/settings");
  await admin.getByRole("radio", { name: "Dark" }).click();
  await expect(admin.locator("html")).toHaveClass(/dark/);
  await admin.reload();
  await expect(admin.locator("html")).toHaveClass(/dark/);
  await admin.getByRole("radio", { name: "Light" }).click();
  await expect(admin.locator("html")).not.toHaveClass(/dark/);
});

test("the author deletes the topic", async () => {
  await admin.goto(topicUrl);
  await admin.getByRole("button", { name: "Delete" }).first().click();
  await admin.getByRole("dialog", { name: "Are you sure?" }).getByRole("button", { name: "Delete" }).click();
  await expect(admin).toHaveURL(/\/$/);
  await expect(admin.getByText("Nothing on the board yet")).toBeVisible();
});

test("signing out ends the session", async () => {
  await uncle.goto("/");
  await uncle.getByRole("button", { name: /Account menu/ }).or(uncle.locator("summary[aria-label^='Account menu']")).first().click();
  await uncle.getByRole("button", { name: "Sign out" }).click();
  await expect(uncle).toHaveURL(/\/login/);
  await uncle.goto("/");
  await expect(uncle).toHaveURL(/\/login/);
});

test("after signing in you land on the page you asked for", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/members");
  await expect(page).toHaveURL(/next=%2Fmembers/);
  await page.getByPlaceholder("name@email.com").fill("admin@e2e.test");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  const mail = (await outbox()).find((m) => m.to === "admin@e2e.test" && m.text.includes("next=%2Fmembers"));
  await page.goto(mail!.text.match(/https?:\/\/\S+/)![0]);
  await page.getByRole("button", { name: "Sign in to Topic Board" }).click();
  await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();
  await ctx.close();
});
