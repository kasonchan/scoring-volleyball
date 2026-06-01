import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import { getUserByEmail, PublicUser } from "./users";
import { sendLoginTokenEmail } from "./email";

export const LOGIN_TOKEN_EXPIRY_MINUTES = 15;
const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type LoginTokenPurpose = "signup" | "login";

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
     WHERE user_id = ? AND used_at IS NULL AND expires_at > datetime('now')`
  ).run(userId);

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
       WHERE user_id = ? AND token_hash = ? AND used_at IS NULL
         AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(user.id, tokenHash) as { id: string } | undefined;

  if (!row) return null;

  db.prepare("UPDATE login_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);
  return user;
}

export async function requestLoginTokenForEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address");
  }

  const user = getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error("No account found for this email. Sign up first.");
  }

  await issueLoginToken(normalizedEmail, user.id, "login");
}
