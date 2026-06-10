import { query, queryOne } from "./db";
import {
  AUTO_JOIN_NAMESPACE_SLUG,
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "./constants";
import type { SpectatorAccess } from "./types";

export {
  AUTO_JOIN_NAMESPACE_SLUG,
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "./constants";

export type { SpectatorAccess } from "./types";

export interface Namespace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  spectatorAccess: SpectatorAccess;
  createdAt: string;
}

function normalizeSpectatorAccess(value: unknown): SpectatorAccess {
  if (value === "public" || value === "members" || value === "link") return value;
  return "members";
}

export function namespaceFromRow(row: Record<string, unknown>): Namespace {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    spectatorAccess: normalizeSpectatorAccess(row.spectator_access),
    createdAt: row.created_at as string,
  };
}

export function namespaceAllowsAnonymousSpectator(ns: Namespace): boolean {
  return ns.spectatorAccess === "public";
}

export function namespaceRequiresSpectatorLink(ns: Namespace): boolean {
  return ns.spectatorAccess === "link";
}

export async function getAllNamespaces(): Promise<Namespace[]> {
  const rows = await query(
    `SELECT * FROM namespaces
     ORDER BY CASE WHEN slug = ? THEN 0 ELSE 1 END, name`,
    [DEFAULT_NAMESPACE_SLUG]
  );
  return rows.map((row) => namespaceFromRow(row as Record<string, unknown>));
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
export async function getNamespacesForHomepage(): Promise<Namespace[]> {
  return filterNamespacesForPublicDirectory(await getAllNamespaces());
}

export async function getDefaultNamespace(): Promise<Namespace | null> {
  return await getNamespaceBySlug(DEFAULT_NAMESPACE_SLUG);
}

export async function getAutoJoinNamespace(): Promise<Namespace | null> {
  return await getNamespaceBySlug(AUTO_JOIN_NAMESPACE_SLUG);
}

export async function getNamespaceBySlug(slug: string): Promise<Namespace | null> {
  const row = await queryOne("SELECT * FROM namespaces WHERE slug = ?", [slug]);
  return row ? namespaceFromRow(row as Record<string, unknown>) : null;
}

export async function getNamespaceById(id: string): Promise<Namespace | null> {
  const row = await queryOne("SELECT * FROM namespaces WHERE id = ?", [id]);
  return row ? namespaceFromRow(row as Record<string, unknown>) : null;
}

export async function requireNamespaceBySlug(slug: string): Promise<Namespace> {
  const ns = await getNamespaceBySlug(slug);
  if (!ns) throw new Error("Namespace not found");
  return ns;
}
