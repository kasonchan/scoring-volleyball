"use client";

import { useNamespacePaths } from "@/hooks/use-namespace";
import { useState } from "react";
import Link from "next/link";
import { NamespaceNav } from "@/components/NamespaceNav";
import {
  PlayerRow,
  TeamPlayerFields,
  emptyPlayerRow,
  playerRowsToPayload,
} from "@/components/TeamPlayerFields";
import { Button, Card, PageHeader } from "@/components/ui";

export default function NewTeamPage() {
  const { api, app, apiFetch } = useNamespacePaths();
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>(Array.from({ length: 6 }, emptyPlayerRow));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validPlayers = playerRowsToPayload(players);

    if (validPlayers.length === 0) {
      setError("At least one player is required");
      setLoading(false);
      return;
    }

    if (validPlayers.some((p) => isNaN(p.jerseyNumber))) {
      setError("All players must have a valid jersey number");
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch(api("/teams"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, players: validPlayers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = app("/admin/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NamespaceNav />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <PageHeader
          title="Create Team"
          description="Enter the team name, roster, jersey numbers, and player roles."
        />

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Team Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. Thunder Volleyball"
              />
            </div>

            <TeamPlayerFields players={players} onChange={setPlayers} />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Team"}
              </Button>
              <Link href={app("/admin/teams")}>
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
