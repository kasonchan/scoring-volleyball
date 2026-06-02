import { DEFAULT_NAMESPACE_SLUG } from "./constants";
import { getDb } from "./db";
import {
  getAllNamespaces,
  getDefaultNamespace,
  getNamespaceBySlug,
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
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    createdAt: row.created_at as string,
    joined: Boolean(row.joined),
    joinedAt: (row.joined_at as string | null) ?? null,
  };
}

export function isNamespaceMember(userId: string, namespaceId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT 1 FROM namespace_members WHERE user_id = ? AND namespace_id = ? LIMIT 1"
    )
    .get(userId, namespaceId);
  return Boolean(row);
}

export function addNamespaceMember(userId: string, namespaceId: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO namespace_members (user_id, namespace_id) VALUES (?, ?)`
  ).run(userId, namespaceId);
}

export function ensureGlobalMembership(userId: string): void {
  const global = getDefaultNamespace();
  if (!global) return;
  addNamespaceMember(userId, global.id);
}

export function joinNamespace(userId: string, slug: string): Namespace {
  const ns = getNamespaceBySlug(slug);
  if (!ns) throw new Error("Namespace not found");
  addNamespaceMember(userId, ns.id);
  return ns;
}

export function joinAllNamespaces(userId: string): Namespace[] {
  const joined: Namespace[] = [];
  for (const ns of getAllNamespaces()) {
    addNamespaceMember(userId, ns.id);
    joined.push(ns);
  }
  return joined;
}

export function getJoinedNamespaces(userId: string): Namespace[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT n.* FROM namespaces n
       INNER JOIN namespace_members m ON m.namespace_id = n.id
       WHERE m.user_id = ?
       ORDER BY CASE WHEN n.slug = ? THEN 0 ELSE 1 END, n.name`
    )
    .all(userId, DEFAULT_NAMESPACE_SLUG) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export function listNamespacesWithMembership(
  userId: string | null
): NamespaceWithMembership[] {
  const db = getDb();
  if (!userId) {
    return getAllNamespaces().map((ns) => ({ ...ns, joined: false, joinedAt: null }));
  }

  const rows = db
    .prepare(
      `SELECT n.*,
              CASE WHEN m.user_id IS NOT NULL THEN 1 ELSE 0 END AS joined,
              m.joined_at
       FROM namespaces n
       LEFT JOIN namespace_members m
         ON m.namespace_id = n.id AND m.user_id = ?
       ORDER BY CASE WHEN n.slug = ? THEN 0 ELSE 1 END, n.name`
    )
    .all(userId, DEFAULT_NAMESPACE_SLUG) as Record<string, unknown>[];

  return rows.map(rowToNamespaceWithMembership);
}

export function backfillGlobalMembershipForAllUsers(globalNamespaceId: string): void {
  const db = getDb();
  const users = db.prepare("SELECT id FROM users").all() as { id: string }[];
  for (const user of users) {
    addNamespaceMember(user.id, globalNamespaceId);
  }
}

/** Ensure existing session users have at least Global membership. */
export function syncUserNamespaceMembership(userId: string): void {
  ensureGlobalMembership(userId);
}
