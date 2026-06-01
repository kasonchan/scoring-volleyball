import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach } from "vitest";
import { closeDb, getDb, setDbPathForTests } from "@/lib/db";

export function setupTestDatabase(): void {
  let dbPath = "";

  beforeEach(() => {
    dbPath = path.join(
      os.tmpdir(),
      `volleyball-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    );
    setDbPathForTests(dbPath);
    getDb();
  });

  afterEach(() => {
    closeDb();
    setDbPathForTests(null);
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });
}
