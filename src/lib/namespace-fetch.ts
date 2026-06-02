import { NAMESPACE_SLUG_HEADER } from "./constants";
import { apiPath } from "./namespace-paths";

export function namespaceFetch(
  namespaceSlug: string,
  path: string,
  init?: RequestInit,
  query?: Record<string, string | null | undefined>
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set(NAMESPACE_SLUG_HEADER, namespaceSlug);
  let url = apiPath(path);
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") params.set(key, value);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return fetch(url, { ...init, headers });
}
