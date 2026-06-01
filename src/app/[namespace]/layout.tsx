import { notFound } from "next/navigation";
import { getNamespaceBySlug } from "@/lib/namespaces";

export default async function NamespaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ namespace: string }>;
}) {
  const { namespace: slug } = await params;
  const ns = getNamespaceBySlug(slug);
  if (!ns) notFound();
  return children;
}
