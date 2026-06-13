import { describe, expect, it } from "vitest";
import { DEFAULT_SEED_USERS } from "@/lib/seed-users";
import {
  authenticateWithPassword,
  getUserByHandle,
} from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("seed-users", () => {
  setupTestDatabase();

  it("creates default users on database init", async () => {
    for (const spec of DEFAULT_SEED_USERS) {
      const user = await getUserByHandle(spec.handle);
      expect(user).not.toBeNull();
      expect(user?.handle).toBe(spec.handle);
      expect(user?.email).toBe(`${spec.handle}@scoring.local`);
    }
  });

  it("authenticates seeded users with username and password", async () => {
    const user = await authenticateWithPassword("admin", "admin");
    expect(user?.handle).toBe("admin");

    const referee = await authenticateWithPassword("referee2", "referee2");
    expect(referee?.handle).toBe("referee2");
  });
});
