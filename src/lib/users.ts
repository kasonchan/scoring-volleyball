import { v4 as uuidv4 } from "uuid";
import { getDb, usersTableHasColumn } from "./db";
import { resolveProfileHandle, resolveSignupHandle } from "./handle";
import { ensurePublicMembership } from "./namespace-members";

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

export function getUserById(id: string): PublicUser | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToPublicUser(row) : null;
}

export function getUserByEmail(email: string): PublicUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
  return row ? rowToPublicUser(row) : null;
}

export function createUser(input: SignupInput): PublicUser {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();

  if (!firstName) throw new Error("First name is required");
  if (!lastName) throw new Error("Last name is required");
  if (!email) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as { id: string } | undefined;
  if (existing) throw new Error("An account with this email already exists");

  const handleResult = resolveSignupHandle(firstName, lastName, input.handle);
  if ("error" in handleResult) throw new Error(handleResult.error);

  const id = uuidv4();
  const displayName = `${firstName} ${lastName}`.trim();

  if (usersTableHasColumn("name")) {
    db.prepare(
      `INSERT INTO users (id, first_name, last_name, email, handle, password_hash, name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      firstName,
      lastName,
      email,
      handleResult.handle,
      UNUSED_PASSWORD_HASH,
      displayName
    );
  } else {
    db.prepare(
      `INSERT INTO users (id, first_name, last_name, email, handle, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, firstName, lastName, email, handleResult.handle, UNUSED_PASSWORD_HASH);
  }

  const user = getUserById(id);
  if (!user) throw new Error("Failed to create user");
  ensurePublicMembership(user.id);
  return user;
}

export function updateUserProfile(userId: string, input: UpdateProfileInput): PublicUser {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();

  if (!firstName) throw new Error("First name is required");
  if (!lastName) throw new Error("Last name is required");
  if (!email) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");

  const handleResult = resolveProfileHandle(userId, input.handle);
  if ("error" in handleResult) throw new Error(handleResult.error);

  const db = getDb();
  const emailTaken = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?")
    .get(email, userId) as { id: string } | undefined;
  if (emailTaken) throw new Error("An account with this email already exists");

  const displayName = `${firstName} ${lastName}`.trim();

  if (usersTableHasColumn("name")) {
    db.prepare(
      `UPDATE users SET first_name = ?, last_name = ?, email = ?, handle = ?, name = ? WHERE id = ?`
    ).run(firstName, lastName, email, handleResult.handle, displayName, userId);
  } else {
    db.prepare(
      `UPDATE users SET first_name = ?, last_name = ?, email = ?, handle = ? WHERE id = ?`
    ).run(firstName, lastName, email, handleResult.handle, userId);
  }

  const user = getUserById(userId);
  if (!user) throw new Error("Failed to update profile");
  return user;
}
