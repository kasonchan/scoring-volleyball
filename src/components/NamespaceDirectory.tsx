"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card } from "@/components/ui";
import { DEFAULT_NAMESPACE_SLUG } from "@/lib/constants";
import { namespaceAppPath } from "@/lib/namespace-paths";
import type { NamespaceWithMembership } from "@/lib/namespace-members";

export function NamespaceDirectory() {
  const { user } = useAuth();
  const [namespaces, setNamespaces] = useState<NamespaceWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadNamespaces = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/auth/namespaces?t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load namespaces");
    setNamespaces(data.namespaces ?? []);
  }, []);

  useEffect(() => {
    loadNamespaces()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [loadNamespaces, user]);

  async function joinNamespace(slug: string) {
    setBusySlug(slug);
    setError("");
    try {
      const res = await fetch("/api/auth/namespaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join");
      setNamespaces(data.namespaces ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setBusySlug(null);
    }
  }

  if (loading) {
    return <p className="text-center text-slate-500">Loading namespaces…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

      {namespaces.length === 0 ? (
        <p className="text-center text-slate-500">No namespaces configured yet.</p>
      ) : (
        <div className="mx-auto grid max-w-3xl gap-4">
          {namespaces.map((ns) => (
            <Card key={ns.id} className="transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {ns.name}
                    {ns.slug === DEFAULT_NAMESPACE_SLUG ? (
                      <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                        Default
                      </span>
                    ) : null}
                    {ns.joined ? (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Joined
                      </span>
                    ) : null}
                  </h3>
                  {ns.description ? (
                    <p className="mt-1 text-slate-600">{ns.description}</p>
                  ) : (
                    <p className="mt-1 text-slate-500">/{ns.slug}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {ns.joined ? (
                    <Link
                      href={namespaceAppPath(ns.slug)}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                    >
                      Open
                    </Link>
                  ) : user ? (
                    <button
                      type="button"
                      onClick={() => joinNamespace(ns.slug)}
                      disabled={busySlug !== null}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busySlug === ns.slug ? "Joining…" : "Join"}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Log in to join
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {user ? (
        <p className="text-center text-sm text-slate-500">
          You are automatically a member of Global when you sign up. Join any other namespace to
          access it from your account.
        </p>
      ) : (
        <p className="text-center text-sm text-slate-500">
          Sign up or log in to join namespaces. New accounts are automatically added to Global.
        </p>
      )}
    </div>
  );
}
