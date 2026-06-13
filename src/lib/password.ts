import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `${SCRYPT_PREFIX}$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith(`${SCRYPT_PREFIX}$`)) return false;
  const [, salt, hashHex] = storedHash.split("$");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, KEY_LENGTH);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function isPasswordHash(storedHash: string): boolean {
  return storedHash.startsWith(`${SCRYPT_PREFIX}$`);
}
