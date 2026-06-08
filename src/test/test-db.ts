import { afterEach, beforeEach } from "vitest";
import { closeDb, resetTestDatabase } from "@/lib/db";

export function setupTestDatabase(): void {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterEach(async () => {
    await closeDb();
  });
}
