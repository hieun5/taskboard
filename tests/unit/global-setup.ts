import { resetDatabase } from "../reset-db.mjs";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://taskboard:taskboard@localhost:5432/taskboard_test";
  await resetDatabase(url, [".data/test-uploads", ".data/test-outbox.json"]);
}
