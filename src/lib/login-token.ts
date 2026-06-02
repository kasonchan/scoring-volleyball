import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { getUserByEmail, PublicUser } from "./users";
import { sendLoginTokenEmail } from "./email";

export const LOGIN_TOKEN_EXPIRY_MINUTES = 15;
const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type LoginTokenPurpose = "signup" | "login" | "email_change";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Human-readable code, e.g. ABCD-EFGH */
export function generateLoginToken(): string {
  let raw = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    raw += TOKEN_CHARS[bytes[i]! % TOKEN_CHARS.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizeLoginTokenInput(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function isTokenFormatValid(normalized: string): boolean {
  const compact = normalized.replace(/-/g, "");
  return compact.length === 8 && /^[A-Z2-9]+$/.test(compact);
}

export async function issueLoginToken(
  email: string,
  userId: string,
  purpose: LoginTokenPurpose
): Promise<string> {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const token = generateLoginToken();
  const tokenHash = hashToken(normalizeLoginTokenInput(token));
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

  db.prepare(
    `UPDATE login_tokens SET used_at = datetime('now')
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL AND expires_at > datetime('now')`
  ).run(userId, purpose);

  db.prepare(
    `INSERT INTO login_tokens (id, email, user_id, token_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), normalizedEmail, userId, tokenHash, purpose, expiresAt);

  await sendLoginTokenEmail(normalizedEmail, token, purpose);
  return token;
}

export function verifyAndConsumeLoginToken(
  email: string,
  tokenInput: string
): PublicUser | null {
  const normalizedToken = normalizeLoginTokenInput(tokenInput);
  if (!isTokenFormatValid(normalizedToken)) return null;

  const user = getUserByEmail(email);
  if (!user) return null;

  const db = getDb();
  const tokenHash = hashToken(normalizedToken);
  const row = db
    .prepare(
      `SELECT id FROM login_tokens
       WHERE user_id = ? AND token_hash = ? AND purpose IN ('signup', 'login')
         AND used_at IS NULL AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(user.id, tokenHash) as { id: string } | undefined;

  if (!row) return null;

  db.prepare("UPDATE login_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);
  return user;
}

/** Sends a login token when the user exists. Returns false if there is no account (no email sent). */
export async function requestLoginTokenForEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address");
  }

  const user = getUserByEmail(normalizedEmail);
  if (!user) return false;

  await issueLoginToken(normalizedEmail, user.id, "login");
  return true;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Send a verification token to the new email address before an email change is applied. */
export async function issueEmailChangeToken(
  userId: string,
  newEmail: string
): Promise<void> {
  const normalizedNew = normalizeEmail(newEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNew)) {
    throw new Error("Invalid email address");
  }

  const db = getDb();
  const current = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as
    | { email: string }
    | undefined;
  if (!current) throw new Error("User not found");
  if (normalizeEmail(current.email) === normalizedNew) {
    throw new Error("New email must be different from your current email");
  }

  const taken = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?")
    .get(normalizedNew, userId) as { id: string } | undefined;
  if (taken) throw new Error("An account with this email already exists");

  await issueLoginToken(normalizedNew, userId, "email_change");
}

export function verifyAndConsumeEmailChangeToken(
  userId: string,
  newEmail: string,
  tokenInput: string
): boolean {
  const normalizedToken = normalizeLoginTokenInput(tokenInput);
  if (!isTokenFormatValid(normalizedToken)) return false;

  const normalizedNew = normalizeEmail(newEmail);
  const db = getDb();
  const tokenHash = hashToken(normalizedToken);
  const row = db
    .prepare(
      `SELECT id FROM login_tokens
       WHERE user_id = ? AND email = ? COLLATE NOCASE AND token_hash = ?
         AND purpose = 'email_change' AND used_at IS NULL
         AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(userId, normalizedNew, tokenHash) as { id: string } | undefined;

  if (!row) return false;

  db.prepare("UPDATE login_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);
  return true;
}
