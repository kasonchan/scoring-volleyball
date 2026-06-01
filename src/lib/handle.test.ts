import { describe, expect, it } from "vitest";
import {
  buildBaseHandle,
  generateUniqueHandle,
  isValidHandle,
  normalizeHandle,
  resolveSignupHandle,
} from "@/lib/handle";
import { getDb } from "@/lib/db";
import { UNUSED_PASSWORD_HASH } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("handle (no database)", () => {
  it("normalizes handles", () => {
    expect(normalizeHandle("Jane-Doe")).toBe("jane_doe");
    expect(normalizeHandle("  UPPER  ")).toBe("upper");
  });

  it("validates handle format", () => {
    expect(isValidHandle("jane_doe")).toBe(true);
    expect(isValidHandle("ab")).toBe(false);
    expect(isValidHandle("_invalid")).toBe(false);
    expect(isValidHandle("valid123")).toBe(true);
  });

  it("builds base handle from names", () => {
    expect(buildBaseHandle("Jane", "Doe")).toBe("jane_doe");
    expect(buildBaseHandle("Mary-Jane", "O'Brien")).toMatch(/maryjane/);
  });
});

describe("handle (database)", () => {
  setupTestDatabase();

  it("auto-generates a unique handle when optional handle is omitted", () => {
    const result = resolveSignupHandle("Alice", "Smith");
    expect("handle" in result).toBe(true);
    if ("handle" in result) {
      expect(isValidHandle(result.handle)).toBe(true);
      expect(result.handle).toMatch(/^alice_smith/);
    }
  });

  it("rejects duplicate custom handles", () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO users (id, first_name, last_name, email, handle, password_hash) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("u1", "Bob", "Lee", "bob@example.com", "bob_lee", UNUSED_PASSWORD_HASH);

    const second = resolveSignupHandle("Other", "Person", "bob_lee");
    expect(second).toEqual({ error: "That handle is already taken." });
  });

  it("generateUniqueHandle appends suffix when base is taken", () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO users (id, first_name, last_name, email, handle, password_hash) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("u1", "Jane", "Doe", "jane@example.com", "jane_doe", UNUSED_PASSWORD_HASH);

    const handle = generateUniqueHandle("Jane", "Doe");
    expect(handle).not.toBe("jane_doe");
    expect(isValidHandle(handle)).toBe(true);
  });
});
