import type { Pool, RowDataPacket } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "@/lib/password";

export type SeedUserSpec = {
  handle: string;
  password: string;
  firstName: string;
  lastName: string;
};

export const DEFAULT_SEED_USERS: SeedUserSpec[] = [
  { handle: "admin", password: "admin", firstName: "Admin", lastName: "User" },
  { handle: "scorer", password: "scorer", firstName: "Scorer", lastName: "User" },
  {
    handle: "referee1",
    password: "referee1",
    firstName: "Referee",
    lastName: "One",
  },
  {
    handle: "referee2",
    password: "referee2",
    firstName: "Referee",
    lastName: "Two",
  },
];

function seedEmail(handle: string): string {
  return `${handle}@scoring.local`;
}

/** Idempotent default users for app startup (uses pool directly — safe during initSchema). */
export async function seedUsers(p: Pool): Promise<void> {
  await p.execute("DELETE FROM users WHERE handle = ? AND email = ?", [
    "score",
    "score@scoring.local",
  ]);

  const [namespaceRows] = await p.execute<RowDataPacket[]>("SELECT id FROM namespaces");
  const namespaceIds = namespaceRows.map((row) => row.id as string);

  for (const spec of DEFAULT_SEED_USERS) {
    const email = seedEmail(spec.handle);
    const passwordHash = hashPassword(spec.password);

    const [existingRows] = await p.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE handle = ? OR email = ? LIMIT 1",
      [spec.handle, email]
    );
    const existing = existingRows[0];

    let userId: string;
    if (existing) {
      userId = existing.id as string;
      await p.execute(
        `UPDATE users
         SET first_name = ?, last_name = ?, email = ?, handle = ?, password_hash = ?
         WHERE id = ?`,
        [spec.firstName, spec.lastName, email, spec.handle, passwordHash, userId]
      );
    } else {
      userId = uuidv4();
      await p.execute(
        `INSERT INTO users (id, first_name, last_name, email, handle, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, spec.firstName, spec.lastName, email, spec.handle, passwordHash]
      );
    }

    for (const namespaceId of namespaceIds) {
      await p.execute(
        "INSERT IGNORE INTO namespace_members (user_id, namespace_id) VALUES (?, ?)",
        [userId, namespaceId]
      );
    }
  }
}
