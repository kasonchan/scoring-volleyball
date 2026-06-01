import { NAMESPACE_SLUG_HEADER } from "./constants";
import { apiPath } from "./namespace-paths";

export function namespaceFetch(
  namespaceSlug: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set(NAMESPACE_SLUG_HEADER, namespaceSlug);
  return fetch(apiPath(path), { ...init, headers });
}
