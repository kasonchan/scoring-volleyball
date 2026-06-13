import { v4 as uuidv4 } from "uuid";
import { execute, queryOne } from "./db";
import { resolveProfileHandle, resolveSignupHandle } from "./handle";
import { ensurePublicMembership } from "./namespace-members";
import { isPasswordHash, verifyPassword } from "./password";

/** Legacy column placeholder; auth uses email tokens only. */
export const UNUSED_PASSWORD_HASH = "email-token-only";

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  handle: string;
  createdAt: string;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  handle?: string | null;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  handle: string;
  /** Required when `email` differs from the signed-in user's current email. */
  emailVerificationToken?: string;
}

function rowToPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    handle: row.handle as string,
    createdAt: row.created_at as string,
  };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
  return row ? rowToPublicUser(row as Record<string, unknown>) : null;
}

export function normalizeUserEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<PublicUser | null> {
  const normalized = normalizeUserEmail(email);
  const row = await queryOne("SELECT * FROM users WHERE LOWER(email) = ?", [normalized]);
  if (!row) return null;
  return rowToPublicUser(row as Record<string, unknown>);
}

export async function getUserByHandle(handle: string): Promise<PublicUser | null> {
  const normalized = handle.trim().toLowerCase();
  const row = await queryOne("SELECT * FROM users WHERE handle = ?", [normalized]);
  if (!row) return null;
  return rowToPublicUser(row as Record<string, unknown>);
}

export async function authenticateWithPassword(
  username: string,
  password: string
): Promise<PublicUser | null> {
  const trimmed = username.trim();
  if (!trimmed || !password) return null;

  const user =
    trimmed.includes("@")
      ? await getUserByEmail(trimmed)
      : await getUserByHandle(trimmed);
  if (!user) return null;

  const row = await queryOne<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = ?",
    [user.id]
  );
  if (!row || !isPasswordHash(row.password_hash)) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return user;
}

export async function createUser(input: SignupInput): Promise<PublicUser> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = normalizeUserEmail(input.email);

  if (!firstName) throw new Error("First name is required");
  if (!lastName) throw new Error("Last name is required");
  if (!email) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");

  const existing = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) throw new Error("An account with this email already exists");

  const handleResult = await resolveSignupHandle(firstName, lastName, input.handle);
  if ("error" in handleResult) throw new Error(handleResult.error);

  const id = uuidv4();
  await execute(
    `INSERT INTO users (id, first_name, last_name, email, handle, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, firstName, lastName, email, handleResult.handle, UNUSED_PASSWORD_HASH]
  );

  const user = await getUserById(id);
  if (!user) throw new Error("Failed to create user");
  await ensurePublicMembership(user.id);
  return user;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<PublicUser> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = normalizeUserEmail(input.email);

  if (!firstName) throw new Error("First name is required");
  if (!lastName) throw new Error("Last name is required");
  if (!email) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");

  const handleResult = await resolveProfileHandle(userId, input.handle);
  if ("error" in handleResult) throw new Error(handleResult.error);

  const emailTaken = await queryOne(
    "SELECT id FROM users WHERE email = ? AND id != ?",
    [email, userId]
  );
  if (emailTaken) throw new Error("An account with this email already exists");

  await execute(
    `UPDATE users SET first_name = ?, last_name = ?, email = ?, handle = ? WHERE id = ?`,
    [firstName, lastName, email, handleResult.handle, userId]
  );

  const user = await getUserById(userId);
  if (!user) throw new Error("Failed to update profile");
  return user;
}
