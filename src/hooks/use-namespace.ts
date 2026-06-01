"use client";

import { useParams } from "next/navigation";
import { namespaceApiPath, namespaceAppPath } from "@/lib/namespace-paths";

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
    api: (path = "") => namespaceApiPath(slug, path),
  };
}
