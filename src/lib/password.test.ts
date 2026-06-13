import { describe, expect, it } from "vitest";
import { hashPassword, isPasswordHash, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashes and verifies a password", () => {
    const hash = hashPassword("admin");
    expect(isPasswordHash(hash)).toBe(true);
    expect(verifyPassword("admin", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects legacy email-token-only placeholder hashes", () => {
    expect(isPasswordHash("email-token-only")).toBe(false);
    expect(verifyPassword("admin", "email-token-only")).toBe(false);
  });
});
