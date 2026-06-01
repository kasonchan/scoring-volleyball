/** URL helpers for multi-tenant namespaces (e.g. /haikyu/admin). */

export function namespaceAppPath(namespaceSlug: string, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${namespaceSlug}${suffix}`;
}

export function namespaceApiPath(namespaceSlug: string, path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/api/${namespaceSlug}${suffix}`;
}
