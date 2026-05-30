"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { Match, Team } from "@/lib/types";

export default function MatchesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/teams").then((r) => r.json()), fetch("/api/matches").then((r) => r.json())])
      .then(([t, m]) => {
        setTeams(t);
        setMatches(m);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeamId, awayTeamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches((prev) => [data, ...prev]);
      setHomeTeamId("");
      setAwayTeamId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setCreating(false);
    }
  }

  function statusBadge(status: Match["status"]) {
    const map: Record<Match["status"], { label: string; color: string }> = {
      scheduled: { label: "Scheduled", color: "slate" },
      setup: { label: "Setup Rotation", color: "orange" },
      in_progress: { label: "In Progress", color: "green" },
      completed: { label: "Completed", color: "blue" },
    };
    const { label, color } = map[status];
    return <Badge color={color}>{label}</Badge>;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Matches"
          description="Create matches between registered teams."
        />

        <Card className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create Match</h2>
          {teams.length < 2 ? (
            <p className="text-slate-600">
              You need at least 2 teams.{" "}
              <Link href="/admin/teams/new" className="text-orange-600 hover:underline">
                Create teams first
              </Link>
            </p>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Home Team</label>
                  <select
                    required
                    value={homeTeamId}
                    onChange={(e) => setHomeTeamId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Select team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Away Team</label>
                  <select
                    required
                    value={awayTeamId}
                    onChange={(e) => setAwayTeamId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Select team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Match"}
              </Button>
            </form>
          )}
        </Card>

        <h2 className="mb-4 text-lg font-semibold text-slate-900">All Matches</h2>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : matches.length === 0 ? (
          <Card className="text-center text-slate-600">No matches yet.</Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <Card key={match.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {match.homeTeam?.name ?? "Home"} vs {match.awayTeam?.name ?? "Away"}
                  </p>
                  <div className="mt-1">{statusBadge(match.status)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {match.status === "scheduled" && (
                    <Link href={`/admin/matches/${match.id}/edit`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                  )}
                  <Link href={`/scorer/${match.id}`}>
                    <Button variant="secondary">Open in Scorer</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Admin
          </Link>
        </div>
      </main>
    </>
  );
}
