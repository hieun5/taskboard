import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("the board and new-topic form fit a phone screen", async ({ page }) => {
  await signIn(page, "admin@e2e.test");
  for (const path of ["/", "/topics/new", "/members", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal scroll on ${path}`).toBeLessThanOrEqual(0);
  }
  await page.goto("/");
  await expect(page.getByRole("link", { name: "New topic" })).toBeVisible();
});
