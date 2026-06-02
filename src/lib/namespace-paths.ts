/** URL helpers for multi-tenant namespaces (e.g. /global/admin). */

export function namespaceAppPath(namespaceSlug: string, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${namespaceSlug}${suffix}`;
}

/** Resource path segment for API routes (e.g. "/matches"). */
export function apiResourcePath(path = ""): string {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Full API URL (namespace is sent via X-Namespace-Slug header, not in the path). */
export function apiPath(path = ""): string {
  return `/api${apiResourcePath(path)}`;
}
