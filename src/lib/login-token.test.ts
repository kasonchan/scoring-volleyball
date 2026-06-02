import { beforeEach, describe, expect, it } from "vitest";
import { setTestEmailSink, type LoginTokenEmailPayload } from "@/lib/email";
import {
  generateLoginToken,
  issueEmailChangeToken,
  issueLoginToken,
  normalizeLoginTokenInput,
  requestLoginTokenForEmail,
  verifyAndConsumeEmailChangeToken,
  verifyAndConsumeLoginToken,
} from "@/lib/login-token";
import { createUser } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("login-token", () => {
  setupTestDatabase();

  let lastEmail: LoginTokenEmailPayload | null = null;

  beforeEach(() => {
    lastEmail = null;
    setTestEmailSink((payload) => {
      lastEmail = payload;
    });
  });

  it("generates tokens in XXXX-XXXX format", () => {
    const token = generateLoginToken();
    expect(token).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("normalizes token input", () => {
    expect(normalizeLoginTokenInput(" abcd-efgh ")).toBe("ABCD-EFGH");
  });

  it("issues and verifies a signup token once", async () => {
    const user = createUser({
      firstName: "Token",
      lastName: "User",
      email: "token@example.com",
    });
    await issueLoginToken(user.email, user.id, "signup");
    expect(lastEmail?.token).toBeTruthy();

    const loggedIn = verifyAndConsumeLoginToken(user.email, lastEmail!.token);
    expect(loggedIn?.email).toBe("token@example.com");

    expect(verifyAndConsumeLoginToken(user.email, lastEmail!.token)).toBeNull();
  });

  it("requestLoginTokenForEmail sends token for existing user", async () => {
    createUser({
      firstName: "Req",
      lastName: "User",
      email: "req@example.com",
    });
    const sent = await requestLoginTokenForEmail("req@example.com");
    expect(sent).toBe(true);
    expect(lastEmail?.purpose).toBe("login");
  });

  it("requestLoginTokenForEmail does not send when user missing", async () => {
    const sent = await requestLoginTokenForEmail("missing@example.com");
    expect(sent).toBe(false);
    expect(lastEmail).toBeNull();
  });

  it("issueEmailChangeToken sends to new email and verifies once", async () => {
    const user = createUser({
      firstName: "Change",
      lastName: "Email",
      email: "old@example.com",
    });
    await issueEmailChangeToken(user.id, "new@example.com");
    expect(lastEmail?.to).toBe("new@example.com");
    expect(lastEmail?.purpose).toBe("email_change");

    expect(
      verifyAndConsumeEmailChangeToken(user.id, "new@example.com", lastEmail!.token)
    ).toBe(true);
    expect(
      verifyAndConsumeEmailChangeToken(user.id, "new@example.com", lastEmail!.token)
    ).toBe(false);
  });
});
