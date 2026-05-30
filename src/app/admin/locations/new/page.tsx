"use client";

import { LocationForm } from "@/components/LocationForm";
import { LocationInput } from "@/lib/types";

export default function NewLocationPage() {
  async function handleSubmit(location: LocationInput) {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = "/admin/locations";
  }

  return (
    <LocationForm
      title="Add Location"
      description="Enter the venue name and address."
      submitLabel="Create Location"
      cancelHref="/admin/locations"
      onSubmit={handleSubmit}
    />
  );
}
