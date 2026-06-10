import "@/test/mock-nodemailer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTransport, sendMail } from "@/test/mock-nodemailer";
import { sendLoginTokenEmail, setTestEmailSink } from "@/lib/email";

function clearSmtpEnv(): void {
  delete process.env.EMAIL_FROM;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  delete process.env.SMTP_APP_PASSWORD;
}

describe("email", () => {
  const initialNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "test-id" });
    createTransport.mockClear();
    setTestEmailSink(null);
    clearSmtpEnv();
    delete process.env.APP_URL;
    if (initialNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = initialNodeEnv;
  });

  it("delivers to testEmailSink without calling SMTP", async () => {
    const sink = vi.fn();
    setTestEmailSink(sink);

    await sendLoginTokenEmail("user@example.com", "ABCD-EFGH", "login");

    expect(sink).toHaveBeenCalledWith({
      to: "user@example.com",
      token: "ABCD-EFGH",
      purpose: "login",
    });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends login token via SMTP when configured", async () => {
    process.env.EMAIL_FROM = "Scoring <sender@gmail.com>";
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password";
    delete process.env.SMTP_HOST;
    process.env.APP_URL = "https://scoring.example.com";

    await sendLoginTokenEmail("user@example.com", "WXYZ-1234", "login");

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "sender@gmail.com", pass: "app-password" },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "Scoring <sender@gmail.com>",
      to: "user@example.com",
      subject: "Your Volleyball Scoring login token",
      text: expect.stringContaining("WXYZ-1234"),
    });
    expect(sendMail.mock.calls[0][0].text).toContain("https://scoring.example.com/login");
  });

  it("accepts GMAIL_USER and GMAIL_APP_PASSWORD aliases", async () => {
    process.env.EMAIL_FROM = "sender@gmail.com";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    process.env.GMAIL_USER = "sender@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "gmail-app-pass";

    await sendLoginTokenEmail("user@example.com", "ABCD-EFGH", "signup");

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        auth: { user: "sender@gmail.com", pass: "gmail-app-pass" },
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your Volleyball Scoring signup token",
      })
    );
  });

  it("uses explicit SMTP host for non-Gmail accounts", async () => {
    process.env.EMAIL_FROM = "noreply@example.com";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";

    await sendLoginTokenEmail("user@example.com", "ABCD-EFGH", "login");

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "smtp-user", pass: "secret" },
    });
  });

  it("sends email_change message with profile link", async () => {
    process.env.EMAIL_FROM = "sender@gmail.com";
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password";
    process.env.APP_URL = "https://scoring.example.com";

    await sendLoginTokenEmail("new@example.com", "MNOP-5678", "email_change");

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@example.com",
        subject: "Confirm your new email for Volleyball Scoring",
        text: expect.stringContaining("https://scoring.example.com/profile"),
      })
    );
  });

  it("logs token when SMTP is not configured", async () => {
    process.env.NODE_ENV = "test";

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendLoginTokenEmail("user@example.com", "ABCD-EFGH", "login");

    expect(createTransport).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[auth-email]"));
    expect(infoSpy.mock.calls[0][0]).toContain("ABCD-EFGH");
  });

  it("warns in production when SMTP is not configured", async () => {
    process.env.NODE_ENV = "production";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    await sendLoginTokenEmail("user@example.com", "ABCD-EFGH", "login");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("SMTP is not configured")
    );
  });

  it("throws when SMTP send fails", async () => {
    process.env.EMAIL_FROM = "sender@gmail.com";
    process.env.SMTP_USER = "sender@gmail.com";
    process.env.SMTP_PASS = "app-password";
    sendMail.mockRejectedValue(new Error("SMTP connection refused"));

    await expect(
      sendLoginTokenEmail("user@example.com", "ABCD-EFGH", "login")
    ).rejects.toThrow("Failed to send email: SMTP connection refused");
  });
});
