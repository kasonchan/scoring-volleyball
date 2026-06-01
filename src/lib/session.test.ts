import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("session", () => {
  it("creates a verifiable session token", () => {
    const token = createSessionToken("user-123");
    const session = verifySessionToken(token);
    expect(session).toEqual({ userId: "user-123" });
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken("user-123");
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("not-a-valid-token")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });
});
