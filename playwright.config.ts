import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
export const E2E_DB = process.env.TEST_DATABASE_URL ?? "postgres://taskboard:taskboard@localhost:5432/taskboard_test";
export const E2E_OUTBOX = ".data/e2e-outbox.json";

/**
 * End-to-end tests run against a production build (`npm run build` first) with the
 * console mail driver and local file storage, on a throwaway test database.
 */
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: E2E_DB,
      APP_URL: `http://localhost:${PORT}`,
      ADMIN_EMAILS: "admin@e2e.test",
      MAIL_DRIVER: "console",
      ALLOW_DEV_OUTBOX: "true",
      DEV_OUTBOX_FILE: E2E_OUTBOX,
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: ".data/e2e-uploads",
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
    },
  },
});
