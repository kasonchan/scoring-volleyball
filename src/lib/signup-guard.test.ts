import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertSignupEmailAllowed,
  assertSignupInviteCode,
  getSignupConfig,
  isSignupDisabled,
  isSignupHoneypotTriggered,
} from "@/lib/signup-guard";

describe("signup-guard", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("blocks disposable email domains", () => {
    expect(() => assertSignupEmailAllowed("bot@mailinator.com")).toThrow(/not allowed/i);
  });

  it("enforces allowlist when SIGNUP_ALLOWED_EMAIL_DOMAINS is set", () => {
    process.env.SIGNUP_ALLOWED_EMAIL_DOMAINS = "example.com,volleyball.org";
    expect(() => assertSignupEmailAllowed("user@gmail.com")).toThrow(/approved email domains/i);
    expect(() => assertSignupEmailAllowed("user@example.com")).not.toThrow();
  });

  it("requires invite code when SIGNUP_INVITE_CODES is set", () => {
    process.env.SIGNUP_INVITE_CODES = "haikyu-2026,secret";
    expect(() => assertSignupInviteCode(undefined)).toThrow(/invite code/i);
    expect(() => assertSignupInviteCode("wrong")).toThrow(/invite code/i);
    expect(() => assertSignupInviteCode("haikyu-2026")).not.toThrow();
  });

  it("detects honeypot submissions", () => {
    expect(isSignupHoneypotTriggered("")).toBe(false);
    expect(isSignupHoneypotTriggered("https://spam.example")).toBe(true);
  });

  it("reports signup disabled when SIGNUP_DISABLED is set", () => {
    process.env.SIGNUP_DISABLED = "true";
    expect(isSignupDisabled()).toBe(true);
    expect(getSignupConfig().enabled).toBe(false);
  });
});
