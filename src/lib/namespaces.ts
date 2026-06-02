import { getDb } from "./db";
import {
  AUTO_JOIN_NAMESPACE_SLUG,
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "./constants";

export {
  AUTO_JOIN_NAMESPACE_SLUG,
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "./constants";

export interface Namespace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
}

function rowToNamespace(row: Record<string, unknown>): Namespace {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function getAllNamespaces(): Namespace[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM namespaces
       ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, name`
    )
    .all(DEFAULT_NAMESPACE_SLUG) as Record<string, unknown>[];
  return rows.map(rowToNamespace);
}

/** Hidden from the public home namespace directory (still reachable by direct URL). */
export function isNamespaceHiddenFromPublicDirectory(slug: string): boolean {
  return slug === HAIKYU_NAMESPACE_SLUG || slug === DEFAULT_NAMESPACE_SLUG;
}

export function filterNamespacesForPublicDirectory<T extends { slug: string }>(
  namespaces: T[]
): T[] {
  return namespaces.filter((ns) => !isNamespaceHiddenFromPublicDirectory(ns.slug));
}

/** Namespaces shown on the marketing home page. */
export function getNamespacesForHomepage(): Namespace[] {
  return filterNamespacesForPublicDirectory(getAllNamespaces());
}

export function getDefaultNamespace(): Namespace | null {
  return getNamespaceBySlug(DEFAULT_NAMESPACE_SLUG);
}

export function getAutoJoinNamespace(): Namespace | null {
  return getNamespaceBySlug(AUTO_JOIN_NAMESPACE_SLUG);
}

export function getNamespaceBySlug(slug: string): Namespace | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM namespaces WHERE slug = ?")
    .get(slug) as Record<string, unknown> | undefined;
  return row ? rowToNamespace(row) : null;
}

export function getNamespaceById(id: string): Namespace | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM namespaces WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToNamespace(row) : null;
}

export function requireNamespaceBySlug(slug: string): Namespace {
  const ns = getNamespaceBySlug(slug);
  if (!ns) throw new Error("Namespace not found");
  return ns;
}
