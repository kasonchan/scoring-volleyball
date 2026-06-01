"use client";

import { useNamespacePaths } from "@/hooks/use-namespace";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LocationForm } from "@/components/LocationForm";
import { NamespaceNav } from "@/components/NamespaceNav";
import { Location, LocationInput } from "@/lib/types";

export default function EditLocationPage() {
  const { api, app } = useNamespacePaths();
  const params = useParams();
  const locationId = params.id as string;
  const [initial, setInitial] = useState<LocationInput | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api(`/locations/${locationId}`))
      .then((r) => {
        if (!r.ok) throw new Error("Location not found");
        return r.json();
      })
      .then((loc: Location) => {
        setInitial({
          name: loc.name,
          address: loc.address,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [locationId]);

  async function handleSubmit(location: LocationInput) {
    const res = await fetch(api(`/locations/${locationId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = "/admin/locations";
  }

  if (loading) {
    return (
      <>
        <NamespaceNav />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
          <p className="text-slate-500">Loading location...</p>
        </main>
      </>
    );
  }

  if (error || !initial) {
    return (
      <>
        <NamespaceNav />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
          <p className="text-red-600">{error || "Location not found"}</p>
          <Link href={app("/admin/locations")} className="mt-4 inline-block text-orange-600 hover:underline">
            ← Back to locations
          </Link>
        </main>
      </>
    );
  }

  return (
    <LocationForm
      title="Edit Location"
      description="Update the location name and address."
      initialValue={initial}
      submitLabel="Save Changes"
      cancelHref="/admin/locations"
      onSubmit={handleSubmit}
    />
  );
}
