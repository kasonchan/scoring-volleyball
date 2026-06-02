"use client";

import { useParams } from "next/navigation";
import { namespaceFetch } from "@/lib/namespace-fetch";
import { apiResourcePath, namespaceAppPath } from "@/lib/namespace-paths";

export function useNamespaceSlug(): string {
  const params = useParams();
  const slug = params.namespace;
  if (typeof slug !== "string" || !slug) {
    throw new Error("Namespace slug missing from route");
  }
  return slug;
}

export function useNamespacePaths() {
  const slug = useNamespaceSlug();
  return {
    slug,
    app: (path = "") => namespaceAppPath(slug, path),
    /** Path under /api, e.g. api("/matches") → "/matches" for use with apiFetch. */
    api: (path = "") => apiResourcePath(path),
    apiFetch: (path: string, init?: RequestInit) => namespaceFetch(slug, path, init),
  };
}
