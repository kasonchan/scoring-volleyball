import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Card, PageHeader } from "@/components/ui";
import { namespaceAppPath } from "@/lib/namespace-paths";
import { getNamespaceBySlug } from "@/lib/namespaces";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ namespace: string }>;
}) {
  const { namespace: slug } = await params;
  const ns = await getNamespaceBySlug(slug);
  if (!ns) return null;
  const base = namespaceAppPath(slug);

  return (
    <>
      <Nav namespaceSlug={slug} namespaceName={ns.name} />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Admin Dashboard"
          description="Set up teams and matches before scoring begins."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`${base}/admin/teams`} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                Manage Teams
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Create teams with player names and jersey numbers.
              </p>
            </Card>
          </Link>

          <Link href={`${base}/admin/locations`} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                Manage Locations
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Add and edit venues with name and address.
              </p>
            </Card>
          </Link>

          <Link href={`${base}/admin/matches`} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                Manage Matches
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Schedule matches between two teams.
              </p>
            </Card>
          </Link>
        </div>
      </main>
    </>
  );
}
