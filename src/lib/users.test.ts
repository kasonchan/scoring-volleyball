import { describe, expect, it } from "vitest";
import { createUser, getUserByEmail } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("users", () => {
  setupTestDatabase();

  it("creates a user with required fields and auto-generated handle", () => {
    const user = createUser({
      firstName: "Kason",
      lastName: "Chan",
      email: "kason@example.com",
    });
    expect(user.firstName).toBe("Kason");
    expect(user.lastName).toBe("Chan");
    expect(user.email).toBe("kason@example.com");
    expect(user.handle).toMatch(/^kason_chan/);
  });

  it("creates a user with a custom handle", () => {
    const user = createUser({
      firstName: "Taylor",
      lastName: "Swift",
      email: "taylor@example.com",
      handle: "tswift",
    });
    expect(user.handle).toBe("tswift");
  });

  it("rejects duplicate email", () => {
    createUser({
      firstName: "A",
      lastName: "B",
      email: "dup@example.com",
    });
    expect(() =>
      createUser({
        firstName: "C",
        lastName: "D",
        email: "dup@example.com",
      })
    ).toThrow(/email already exists/i);
  });

  it("rejects missing first name", () => {
    expect(() =>
      createUser({
        firstName: "  ",
        lastName: "Doe",
        email: "x@example.com",
      })
    ).toThrow(/first name/i);
  });

  it("stores email case-insensitively", () => {
    createUser({
      firstName: "Case",
      lastName: "Test",
      email: "Mixed@Example.COM",
    });
    expect(getUserByEmail("mixed@example.com")?.email).toBe("mixed@example.com");
  });
});
