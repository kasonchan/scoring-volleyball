"use client";

import { useNamespacePaths } from "@/hooks/use-namespace";
import { LocationForm } from "@/components/LocationForm";
import { LocationInput } from "@/lib/types";

export default function NewLocationPage() {
  const { api, app, apiFetch } = useNamespacePaths();
  async function handleSubmit(location: LocationInput) {
    const res = await apiFetch(api("/locations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = app("/admin/locations");
  }

  return (
    <LocationForm
      title="Add Location"
      description="Enter the venue name and address."
      submitLabel="Create Location"
      cancelHref={app("/admin/locations")}
      onSubmit={handleSubmit}
    />
  );
}
