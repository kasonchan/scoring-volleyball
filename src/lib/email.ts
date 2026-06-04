import nodemailer from "nodemailer";
import type { LoginTokenPurpose } from "./login-token";

export type LoginTokenEmailPayload = {
  to: string;
  token: string;
  purpose: LoginTokenPurpose;
};

let testEmailSink: ((payload: LoginTokenEmailPayload) => void) | null = null;

/** Capture outbound auth emails in tests. */
export function setTestEmailSink(sink: ((payload: LoginTokenEmailPayload) => void) | null): void {
  testEmailSink = sink;
}

function appOrigin(): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ??
    process.env.VERCEL_URL?.replace(/^(?!https?:\/\/)/, "https://") ??
    "http://localhost:3000"
  );
}

function buildMessage(payload: LoginTokenEmailPayload): { subject: string; text: string } {
  if (payload.purpose === "email_change") {
    const subject = "Confirm your new email for Volleyball Scoring";
    const text = [
      "Use this token to confirm your new email address:",
      "",
      `  ${payload.token}`,
      "",
      `Open ${appOrigin()}/profile, enter this token, and save your profile.`,
      "The token expires in 15 minutes and can only be used once.",
      "",
      "If you did not request this change, you can ignore this email.",
    ].join("\n");
    return { subject, text };
  }

  const action = payload.purpose === "signup" ? "finish signing up" : "log in";
  const subject =
    payload.purpose === "signup"
      ? "Your Volleyball Scoring signup token"
      : "Your Volleyball Scoring login token";

  const text = [
    `Use this token to ${action} to Volleyball Scoring:`,
    "",
    `  ${payload.token}`,
    "",
    `Open ${appOrigin()}/login and enter your email plus this token.`,
    "The token expires in 15 minutes and can only be used once.",
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return { subject, text };
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const from = process.env.EMAIL_FROM?.trim();
  const user = process.env.SMTP_USER?.trim() ?? process.env.GMAIL_USER?.trim();
  const pass =
    process.env.SMTP_PASS?.trim() ??
    process.env.SMTP_APP_PASSWORD?.trim() ??
    process.env.GMAIL_APP_PASSWORD?.trim();

  if (!from || !user || !pass) return null;

  const host =
    process.env.SMTP_HOST?.trim() ??
    (user.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : "");
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure =
    process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && port === 465);

  return { host, port, secure, user, pass, from };
}

async function sendViaSmtp(to: string, subject: string, text: string): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) return false;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
  });
  return true;
}

export async function sendLoginTokenEmail(
  to: string,
  token: string,
  purpose: LoginTokenPurpose
): Promise<void> {
  const payload: LoginTokenEmailPayload = { to, token, purpose };

  if (testEmailSink) {
    testEmailSink(payload);
    return;
  }

  const { subject, text } = buildMessage(payload);

  try {
    if (await sendViaSmtp(to, subject, text)) return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to send email: ${message}`);
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth-email] SMTP is not configured (EMAIL_FROM, SMTP_USER, SMTP_PASS); login token was not emailed."
    );
  }

  console.info(`[auth-email] To: ${to}\nSubject: ${subject}\n\n${text}`);
}
