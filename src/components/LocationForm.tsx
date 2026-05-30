"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Button, Card, PageHeader } from "@/components/ui";
import { LocationInput } from "@/lib/types";

const emptyLocation: LocationInput = {
  name: "",
  address: "",
};

interface LocationFormProps {
  title: string;
  description: string;
  initialValue?: LocationInput;
  submitLabel: string;
  onSubmit: (value: LocationInput) => Promise<void>;
  cancelHref: string;
}

export function LocationForm({
  title,
  description,
  initialValue = emptyLocation,
  submitLabel,
  onSubmit,
  cancelHref,
}: LocationFormProps) {
  const [location, setLocation] = useState<LocationInput>(initialValue);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(location);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <PageHeader title={title} description={description} />

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Location Name</label>
              <input
                type="text"
                required
                value={location.name}
                onChange={(e) => setLocation({ ...location, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. Central Sports Hall"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <textarea
                required
                rows={3}
                value={location.address}
                onChange={(e) => setLocation({ ...location, address: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. 123 Main Street, Hong Kong"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : submitLabel}
              </Button>
              <Link href={cancelHref}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
