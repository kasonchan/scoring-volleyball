"use client";

import { Nav } from "@/components/Nav";
import { useNamespaceSlug } from "@/hooks/use-namespace";

interface NamespaceNavProps {
  namespaceName?: string;
}

export function NamespaceNav({ namespaceName }: NamespaceNavProps) {
  const slug = useNamespaceSlug();
  return <Nav namespaceSlug={slug} namespaceName={namespaceName} />;
}
