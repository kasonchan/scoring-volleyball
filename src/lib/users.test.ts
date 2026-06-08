import { describe, expect, it } from "vitest";
import { createUser, getUserByEmail, updateUserProfile } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("users", () => {
  setupTestDatabase();

  it("creates a user with required fields and auto-generated handle", async () => {
    const user = await createUser({
      firstName: "Kason",
      lastName: "Chan",
      email: "kason@example.com",
    });
    expect(user.firstName).toBe("Kason");
    expect(user.lastName).toBe("Chan");
    expect(user.email).toBe("kason@example.com");
    expect(user.handle).toMatch(/^kason_chan/);
  });

  it("creates a user with a custom handle", async () => {
    const user = await createUser({
      firstName: "Taylor",
      lastName: "Swift",
      email: "taylor@example.com",
      handle: "tswift",
    });
    expect(user.handle).toBe("tswift");
  });

  it("rejects duplicate email", async () => {
    await createUser({
      firstName: "A",
      lastName: "B",
      email: "dup@example.com",
    });
    await expect(
      createUser({
        firstName: "C",
        lastName: "D",
        email: "dup@example.com",
      })
    ).rejects.toThrow(/email already exists/i);
  });

  it("rejects missing first name", async () => {
    await expect(
      createUser({
        firstName: "  ",
        lastName: "Doe",
        email: "x@example.com",
      })
    ).rejects.toThrow(/first name/i);
  });

  it("updates profile fields", async () => {
    const user = await createUser({
      firstName: "Old",
      lastName: "Name",
      email: "old@example.com",
      handle: "old_name",
    });
    const updated = await updateUserProfile(user.id, {
      firstName: "New",
      lastName: "Person",
      email: "new@example.com",
      handle: "new_person",
    });
    expect(updated.firstName).toBe("New");
    expect(updated.email).toBe("new@example.com");
    expect(updated.handle).toBe("new_person");
  });

  it("rejects duplicate email on profile update", async () => {
    const a = await createUser({
      firstName: "A",
      lastName: "One",
      email: "a@example.com",
    });
    await createUser({
      firstName: "B",
      lastName: "Two",
      email: "b@example.com",
    });
    await expect(
      updateUserProfile(a.id, {
        firstName: "A",
        lastName: "One",
        email: "b@example.com",
        handle: a.handle,
      })
    ).rejects.toThrow(/email already exists/i);
  });

  it("stores email case-insensitively", async () => {
    await createUser({
      firstName: "Case",
      lastName: "Test",
      email: "Mixed@Example.COM",
    });
    expect(await getUserByEmail("mixed@example.com")?.email).toBe("mixed@example.com");
  });
});
