"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui";

type Props = {
  namespaceSlug: string;
  namespaceName: string;
  returnTo?: string;
};

export function NamespaceJoinPrompt({ namespaceSlug, namespaceName, returnTo }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function onJoin() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/namespaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: namespaceSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join");
      if (returnTo) {
        router.push(returnTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mb-8 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Join {namespaceName} to use Admin, Scorer, and Referee</p>
      <p className="mt-1 text-amber-900/80">
        Spectator viewing does not require membership.{" "}
        <Link href={`/${namespaceSlug}/spectator`} className="font-medium underline">
          Watch as spectator
        </Link>
      </p>
      {error ? <p className="mt-2 text-red-600">{error}</p> : null}
      <Button type="button" className="mt-3" onClick={onJoin} disabled={busy}>
        {busy ? "Joining…" : `Join ${namespaceName}`}
      </Button>
    </div>
  );
}
