import { getDb } from "./db";

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

export function handleExists(handle: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM users WHERE handle = ?").get(handle);
  return Boolean(row);
}

export function generateUniqueHandle(firstName: string, lastName: string): string {
  let candidate = buildBaseHandle(firstName, lastName);
  if (!isValidHandle(candidate)) {
    candidate = `user_${randomSuffix()}`;
  }
  if (!handleExists(candidate)) return candidate;

  for (let i = 2; i < 100; i++) {
    const suffix = `_${i}`;
    const trimmed = candidate.slice(0, 30 - suffix.length) + suffix;
    if (!handleExists(trimmed)) return trimmed;
  }

  return `${candidate.slice(0, 22)}_${randomSuffix()}`;
}

export function resolveSignupHandle(
  firstName: string,
  lastName: string,
  optionalHandle?: string | null
): { handle: string } | { error: string } {
  const trimmed = optionalHandle?.trim();
  if (!trimmed) {
    return { handle: generateUniqueHandle(firstName, lastName) };
  }
  const handle = normalizeHandle(trimmed);
  if (!isValidHandle(handle)) {
    return {
      error:
        "Handle must be 3–30 characters: lowercase letters, numbers, and underscores (not at start/end).",
    };
  }
  if (handleExists(handle)) {
    return { error: "That handle is already taken." };
  }
  return { handle };
}
