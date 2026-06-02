import { requireJoinedNamespaceForPage } from "@/lib/namespace-access";

export default async function ScorerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ namespace: string }>;
}) {
  const { namespace: slug } = await params;
  await requireJoinedNamespaceForPage(slug, "scorer");
  return children;
}
