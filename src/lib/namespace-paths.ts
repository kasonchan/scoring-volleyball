/** URL helpers for multi-tenant namespaces (e.g. /haikyu/admin). */

export function namespaceAppPath(namespaceSlug: string, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${namespaceSlug}${suffix}`;
}

/** API path without namespace segment (namespace is sent via X-Namespace-Slug header). */
export function apiPath(path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/api${suffix}`;
}
