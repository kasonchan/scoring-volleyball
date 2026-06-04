#!/usr/bin/env node
/**
 * Send one email via SMTP (defaults to Gmail when SMTP_HOST is unset and user is @gmail.com).
 *
 * Uses the same env vars as the app (src/lib/email.ts):
 *   EMAIL_FROM, SMTP_USER, SMTP_PASS
 *   Optional: SMTP_HOST, SMTP_PORT, SMTP_SECURE
 *   Aliases: GMAIL_USER, GMAIL_APP_PASSWORD
 *
 * Gmail: enable 2-Step Verification and create an App Password:
 *   https://myaccount.google.com/apppasswords
 *
 * Usage:
 *   EMAIL_FROM=you@gmail.com SMTP_USER=you@gmail.com SMTP_PASS=app-password npm run send-gmail -- \\
 *     --to recipient@example.com --subject "Hello" --text "Message body"
 */

import nodemailer from "nodemailer";

function usage() {
  console.error(`Usage:
  EMAIL_FROM=... SMTP_USER=... SMTP_PASS=... npm run send-gmail -- \\
    --to recipient@example.com --subject "Subject" --text "Body"

Options: --to, --subject, --text, --html, --from`);
  process.exit(1);
}

function readArg(name) {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function getSmtpConfig(fromOverride) {
  const from = fromOverride ?? process.env.EMAIL_FROM?.trim();
  const user = process.env.SMTP_USER?.trim() ?? process.env.GMAIL_USER?.trim();
  const pass =
    process.env.SMTP_PASS?.trim() ??
    process.env.SMTP_APP_PASSWORD?.trim() ??
    process.env.GMAIL_APP_PASSWORD?.trim();

  if (!from || !user || !pass) {
    console.error("Missing EMAIL_FROM, SMTP_USER (or GMAIL_USER), and SMTP_PASS (or GMAIL_APP_PASSWORD).");
    process.exit(1);
  }

  const host =
    process.env.SMTP_HOST?.trim() ??
    (user.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : "");
  if (!host) {
    console.error("Set SMTP_HOST for non-Gmail SMTP accounts.");
    process.exit(1);
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure =
    process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && port === 465);

  return { host, port, secure, user, pass, from };
}

const to = readArg("to");
const subject = readArg("subject");
const text = readArg("text");
const html = readArg("html");
const fromArg = readArg("from");

if (!to || !subject || (!text && !html)) usage();

const config = getSmtpConfig(fromArg);

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: { user: config.user, pass: config.pass },
});

const mail = {
  from: config.from,
  to,
  subject,
  ...(text ? { text } : {}),
  ...(html ? { html } : {}),
};

try {
  const info = await transporter.sendMail(mail);
  console.log("Sent:", info.messageId);
  if (info.response) console.log(info.response);
} catch (err) {
  console.error("Send failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
