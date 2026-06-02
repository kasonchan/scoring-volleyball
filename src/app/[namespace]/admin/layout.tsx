import { requireJoinedNamespaceForPage } from "@/lib/namespace-access";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ namespace: string }>;
}) {
  const { namespace: slug } = await params;
  await requireJoinedNamespaceForPage(slug, "admin");
  return children;
}
