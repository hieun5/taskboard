import { execFileSync } from "node:child_process";
import { E2E_DB, E2E_OUTBOX } from "../../playwright.config";

export default async function setup() {
  execFileSync(process.execPath, ["tests/reset-db.mjs", E2E_DB, ".data/e2e-uploads", E2E_OUTBOX], { stdio: "inherit" });
}
