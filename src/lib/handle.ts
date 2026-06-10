import { queryOne } from "./db";

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/;

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

function slugPart(value: string, maxLen: number): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, maxLen);
  return slug || "user";
}

export function buildBaseHandle(firstName: string, lastName: string): string {
  const first = slugPart(firstName, 12);
  const last = slugPart(lastName, 12);
  let handle = `${first}_${last}`.replace(/_+/g, "_");
  if (handle.length < 3) {
    handle = `user_${randomSuffix()}`;
  }
  return handle.slice(0, 30);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export async function handleExists(
  handle: string,
  exceptUserId?: string
): Promise<boolean> {
  const row = exceptUserId
    ? await queryOne("SELECT 1 AS ok FROM users WHERE handle = ? AND id != ? LIMIT 1", [
        handle,
        exceptUserId,
      ])
    : await queryOne("SELECT 1 AS ok FROM users WHERE handle = ? LIMIT 1", [handle]);
  return Boolean(row);
}

export async function generateUniqueHandle(
  firstName: string,
  lastName: string
): Promise<string> {
  let candidate = buildBaseHandle(firstName, lastName);
  if (!isValidHandle(candidate)) {
    candidate = `user_${randomSuffix()}`;
  }
  if (!(await handleExists(candidate))) return candidate;

  for (let i = 2; i < 100; i++) {
    const suffix = `_${i}`;
    const trimmed = candidate.slice(0, 30 - suffix.length) + suffix;
    if (!(await handleExists(trimmed))) return trimmed;
  }

  return `${candidate.slice(0, 22)}_${randomSuffix()}`;
}

export async function resolveSignupHandle(
  firstName: string,
  lastName: string,
  optionalHandle?: string | null
): Promise<{ handle: string } | { error: string }> {
  const trimmed = optionalHandle?.trim();
  if (!trimmed) {
    return { handle: await generateUniqueHandle(firstName, lastName) };
  }
  const handle = normalizeHandle(trimmed);
  if (!isValidHandle(handle)) {
    return {
      error:
        "Handle must be 3–30 characters: lowercase letters, numbers, and underscores (not at start/end).",
    };
  }
  if (await handleExists(handle)) {
    return { error: "That handle is already taken." };
  }
  return { handle };
}

export async function resolveProfileHandle(
  userId: string,
  handleInput: string
): Promise<{ handle: string } | { error: string }> {
  const handle = normalizeHandle(handleInput);
  if (!isValidHandle(handle)) {
    return {
      error:
        "Handle must be 3–30 characters: lowercase letters, numbers, and underscores (not at start/end).",
    };
  }
  const current = await queryOne<{ handle: string }>(
    "SELECT handle FROM users WHERE id = ?",
    [userId]
  );
  if (current && normalizeHandle(current.handle) === handle) {
    return { handle: current.handle };
  }
  if (await handleExists(handle, userId)) {
    return { error: "That handle is already taken." };
  }
  return { handle };
}
