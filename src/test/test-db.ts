import { beforeEach } from "vitest";
import { resetTestDatabase } from "@/lib/db";

let resetChain: Promise<void> = Promise.resolve();

/** Reset MySQL between tests. Serializes resets when hooks overlap. */
export function setupTestDatabase(): void {
  beforeEach(async () => {
    const run = resetChain.then(() => resetTestDatabase());
    resetChain = run;
    await run;
  });
}
