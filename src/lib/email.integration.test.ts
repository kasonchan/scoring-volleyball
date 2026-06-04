/**
 * Live Gmail SMTP integration test (opt-in, hits the network).
 *
 * Not run by `npm test`. Run manually:
 *
 *   SMTP_INTEGRATION=1 \
 *   GMAIL_USER=you@gmail.com \
 *   GMAIL_APP_PASSWORD=your-app-password \
 *   EMAIL_FROM=you@gmail.com \
 *   SMTP_INTEGRATION_TO=you@gmail.com \
 *   npm run test:integration
 *
 * GMAIL_APP_PASSWORD: https://myaccount.google.com/apppasswords
 * SMTP_INTEGRATION_TO: recipient inbox to verify (often the same Gmail account).
 *
 * Aliases: SMTP_USER, SMTP_PASS instead of GMAIL_* ; APP_URL optional.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sendLoginTokenEmail, setTestEmailSink } from "@/lib/email";

function smtpUser(): string | undefined {
  return process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
}

function smtpPass(): string | undefined {
  return (
    process.env.SMTP_PASS?.trim() ||
    process.env.SMTP_APP_PASSWORD?.trim() ||
    process.env.GMAIL_APP_PASSWORD?.trim()
  );
}

function integrationEnabled(): boolean {
  if (process.env.SMTP_INTEGRATION !== "1") return false;
  const user = smtpUser();
  const pass = smtpPass();
  const from = process.env.EMAIL_FROM?.trim() || user;
  const to = process.env.SMTP_INTEGRATION_TO?.trim() || user;
  return Boolean(user && pass && from && to);
}

function missingIntegrationHint(): string {
  const parts = ["SMTP_INTEGRATION=1"];
  if (!smtpUser()) parts.push("GMAIL_USER or SMTP_USER");
  if (!smtpPass()) parts.push("GMAIL_APP_PASSWORD or SMTP_PASS");
  if (!process.env.SMTP_INTEGRATION_TO?.trim() && !smtpUser()) {
    parts.push("SMTP_INTEGRATION_TO (or use same address as GMAIL_USER)");
  }
  return parts.join(", ");
}

describe.skipIf(!integrationEnabled())("email SMTP integration (Gmail)", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    setTestEmailSink(null);
    const user = smtpUser()!;
    if (!process.env.EMAIL_FROM?.trim()) {
      process.env.EMAIL_FROM = user;
    }
    if (!process.env.SMTP_INTEGRATION_TO?.trim()) {
      process.env.SMTP_INTEGRATION_TO = user;
    }
    process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
    setTestEmailSink(null);
  });

  it("sends a login token email through Gmail SMTP", async () => {
    const to = process.env.SMTP_INTEGRATION_TO!.trim();
    const token = `INT-${Date.now().toString(36).toUpperCase()}`;

    await expect(sendLoginTokenEmail(to, token, "login")).resolves.toBeUndefined();
  });

  it("sends signup and email_change messages through Gmail SMTP", async () => {
    const to = process.env.SMTP_INTEGRATION_TO!.trim();

    await expect(sendLoginTokenEmail(to, "SIGN-UP1", "signup")).resolves.toBeUndefined();
    await expect(
      sendLoginTokenEmail(to, "EMAL-CHNG", "email_change")
    ).resolves.toBeUndefined();
  });
});

describe("email SMTP integration (Gmail)", () => {
  it.skipIf(integrationEnabled())("prints setup hint when live Gmail credentials are absent", () => {
    console.info(`[email integration] Skipped live send. Set: ${missingIntegrationHint()}`);
    expect(integrationEnabled()).toBe(false);
  });
});
