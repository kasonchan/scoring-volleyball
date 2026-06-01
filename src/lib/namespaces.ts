import { getDb } from "./db";
import { HAIKYU_NAMESPACE_SLUG } from "./constants";

export { HAIKYU_NAMESPACE_SLUG };

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
  const rows = db.prepare("SELECT * FROM namespaces ORDER BY name").all() as Record<
    string,
    unknown
  >[];
  return rows.map(rowToNamespace);
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
