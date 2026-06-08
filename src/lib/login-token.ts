import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { execute, queryOne } from "./db";
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
  const normalizedEmail = email.trim().toLowerCase();
  const token = generateLoginToken();
  const tokenHash = hashToken(normalizeLoginTokenInput(token));
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await execute(
    `UPDATE login_tokens SET used_at = UTC_TIMESTAMP(3)
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)`,
    [userId, purpose]
  );

  await execute(
    `INSERT INTO login_tokens (id, email, user_id, token_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), normalizedEmail, userId, tokenHash, purpose, expiresAt]
  );

  await sendLoginTokenEmail(normalizedEmail, token, purpose);
  return token;
}

export async function verifyAndConsumeLoginToken(
  email: string,
  tokenInput: string
): Promise<PublicUser | null> {
  const normalizedToken = normalizeLoginTokenInput(tokenInput);
  if (!isTokenFormatValid(normalizedToken)) return null;

  const user = await getUserByEmail(email);
  if (!user) return null;

  const tokenHash = hashToken(normalizedToken);
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM login_tokens
     WHERE user_id = ? AND token_hash = ? AND purpose IN ('signup', 'login')
       AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, tokenHash]
  );

  if (!row) return null;

  await execute("UPDATE login_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ?", [row.id]);
  return user;
}

/** Sends a login token when the user exists. Returns false if there is no account (no email sent). */
export async function requestLoginTokenForEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address");
  }

  const user = await getUserByEmail(normalizedEmail);
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

  const current = await queryOne<{ email: string }>(
    "SELECT email FROM users WHERE id = ?",
    [userId]
  );
  if (!current) throw new Error("User not found");
  if (normalizeEmail(current.email) === normalizedNew) {
    throw new Error("New email must be different from your current email");
  }

  const taken = await queryOne(
    "SELECT id FROM users WHERE LOWER(email) = ? AND id != ?",
    [normalizedNew, userId]
  );
  if (taken) throw new Error("An account with this email already exists");

  await issueLoginToken(normalizedNew, userId, "email_change");
}

export async function verifyAndConsumeEmailChangeToken(
  userId: string,
  newEmail: string,
  tokenInput: string
): Promise<boolean> {
  const normalizedToken = normalizeLoginTokenInput(tokenInput);
  if (!isTokenFormatValid(normalizedToken)) return false;

  const normalizedNew = normalizeEmail(newEmail);
  const tokenHash = hashToken(normalizedToken);
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM login_tokens
     WHERE user_id = ? AND LOWER(email) = ? AND token_hash = ?
       AND purpose = 'email_change' AND used_at IS NULL
       AND expires_at > UTC_TIMESTAMP(3)
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, normalizedNew, tokenHash]
  );

  if (!row) return false;

  await execute("UPDATE login_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ?", [row.id]);
  return true;
}
