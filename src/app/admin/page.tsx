import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Card, PageHeader } from "@/components/ui";

export default function AdminPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Admin Dashboard"
          description="Set up teams and matches before scoring begins."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/teams" className="group">
            <Card className="transition-shadow hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                Manage Teams
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Create teams with player names and jersey numbers.
              </p>
            </Card>
          </Link>

          <Link href="/admin/locations" className="group">
            <Card className="transition-shadow hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600">
                Manage Locations
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Add and edit venues with name and address.
              </p>
            </Card>
          </Link>

          <Link href="/admin/matches" className="group">
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
