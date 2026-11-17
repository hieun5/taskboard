import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      "server-only": r("./tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/unit/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://taskboard:taskboard@localhost:5432/taskboard_test",
      APP_URL: "http://localhost:3000",
      ADMIN_EMAILS: "admin@test.local",
      MAIL_DRIVER: "console",
      DEV_OUTBOX_FILE: ".data/test-outbox.json",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: ".data/test-uploads",
      SESSION_SECRET: "test-secret-test-secret-test-secret-123",
    },
  },
});
