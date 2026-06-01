"use client";

import { useNamespacePaths } from "@/hooks/use-namespace";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NamespaceNav } from "@/components/NamespaceNav";
import { Button, Card, PageHeader } from "@/components/ui";
import { Location } from "@/lib/types";

export default function LocationsPage() {
  const { api, app } = useNamespacePaths();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/locations"))
      .then((r) => r.json())
      .then(setLocations)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete location "${name}"? This cannot be undone.`)) return;
    await fetch(api(`/locations/${id}`), { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <>
      <NamespaceNav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Locations"
          description="Manage venues where matches are played."
          action={
            <Link href={app("/admin/locations/new")}>
              <Button>+ Add Location</Button>
            </Link>
          }
        />

        {loading ? (
          <p className="text-slate-500">Loading locations...</p>
        ) : locations.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-600">No locations yet.</p>
            <Link href={app("/admin/locations/new")} className="mt-4 inline-block">
              <Button>Add your first location</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">{location.name}</h2>
                    <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{location.address}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/admin/locations/${location.id}/edit`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                    <Button variant="danger" onClick={() => handleDelete(location.id, location.name)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href={app("/admin")} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Admin
          </Link>
        </div>
      </main>
    </>
  );
}
