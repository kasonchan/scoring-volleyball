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

async function sendViaResend(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email (${res.status}): ${body}`);
  }
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

  if (await sendViaResend(to, subject, text)) return;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth-email] RESEND_API_KEY and EMAIL_FROM are not set; login token was not emailed."
    );
  }

  console.info(`[auth-email] To: ${to}\nSubject: ${subject}\n\n${text}`);
}
