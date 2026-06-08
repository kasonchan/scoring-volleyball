import { AUTO_JOIN_NAMESPACE_SLUG } from "./constants";
import { execute, query } from "./db";
import {
  filterNamespacesForPublicDirectory,
  getAllNamespaces,
  getNamespaceBySlug,
  namespaceFromRow,
  Namespace,
} from "./namespaces";

export type NamespaceWithMembership = Namespace & {
  joined: boolean;
  joinedAt: string | null;
};

function rowToNamespaceWithMembership(
  row: Record<string, unknown>
): NamespaceWithMembership {
  return {
    ...namespaceFromRow(row),
    joined: Boolean(row.joined),
    joinedAt: (row.joined_at as string | null) ?? null,
  };
}

export async function isNamespaceMember(
  userId: string,
  namespaceId: string
): Promise<boolean> {
  const row = await query(
    "SELECT 1 AS ok FROM namespace_members WHERE user_id = ? AND namespace_id = ? LIMIT 1",
    [userId, namespaceId]
  );
  return row.length > 0;
}

export async function addNamespaceMember(
  userId: string,
  namespaceId: string
): Promise<void> {
  await execute(
    `INSERT IGNORE INTO namespace_members (user_id, namespace_id) VALUES (?, ?)`,
    [userId, namespaceId]
  );
}

export async function ensurePublicMembership(userId: string): Promise<void> {
  const ns = await getNamespaceBySlug(AUTO_JOIN_NAMESPACE_SLUG);
  if (!ns) return;
  await addNamespaceMember(userId, ns.id);
}

export async function joinNamespace(userId: string, slug: string): Promise<Namespace> {
  const ns = await getNamespaceBySlug(slug);
  if (!ns) throw new Error("Namespace not found");
  await addNamespaceMember(userId, ns.id);
  return ns;
}

export async function joinAllNamespaces(userId: string): Promise<Namespace[]> {
  const joined: Namespace[] = [];
  for (const ns of await getAllNamespaces()) {
    await addNamespaceMember(userId, ns.id);
    joined.push(ns);
  }
  return joined;
}

export async function getJoinedNamespaces(userId: string): Promise<Namespace[]> {
  const rows = await query(
    `SELECT n.* FROM namespaces n
     INNER JOIN namespace_members m ON m.namespace_id = n.id
     WHERE m.user_id = ?
     ORDER BY CASE WHEN n.slug = ? THEN 0 ELSE 1 END, n.name`,
    [userId, AUTO_JOIN_NAMESPACE_SLUG]
  );
  return rows.map((row) => namespaceFromRow(row as Record<string, unknown>));
}

export async function listNamespacesWithMembership(
  userId: string | null,
  options?: { publicDirectory?: boolean }
): Promise<NamespaceWithMembership[]> {
  let list: NamespaceWithMembership[];

  if (!userId) {
    list = (await getAllNamespaces()).map((ns) => ({
      ...ns,
      joined: false,
      joinedAt: null,
    }));
  } else {
    const rows = await query(
      `SELECT n.*,
              CASE WHEN m.user_id IS NOT NULL THEN 1 ELSE 0 END AS joined,
              m.joined_at
       FROM namespaces n
       LEFT JOIN namespace_members m
         ON m.namespace_id = n.id AND m.user_id = ?
       ORDER BY CASE WHEN n.slug = ? THEN 0 ELSE 1 END, n.name`,
      [userId, AUTO_JOIN_NAMESPACE_SLUG]
    );
    list = rows.map((row) =>
      rowToNamespaceWithMembership(row as Record<string, unknown>)
    );
  }

  if (options?.publicDirectory) {
    return filterNamespacesForPublicDirectory(list);
  }
  return list;
}

export async function backfillPublicMembershipForAllUsers(
  publicNamespaceId: string
): Promise<void> {
  const users = await query<{ id: string }>("SELECT id FROM users");
  for (const user of users) {
    await addNamespaceMember(user.id, publicNamespaceId);
  }
}

/** Ensure existing session users have at least Public membership. */
export async function syncUserNamespaceMembership(userId: string): Promise<void> {
  await ensurePublicMembership(userId);
}
