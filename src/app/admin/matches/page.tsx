"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import {
  MatchFormFields,
  emptyMatchFormValues,
  matchFormValuesToPayload,
} from "@/components/MatchFormFields";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { Location, Match, Team, formatMatchDateTime } from "@/lib/types";

export default function MatchesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [formValues, setFormValues] = useState(emptyMatchFormValues);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/matches").then((r) => r.json()),
    ])
      .then(([t, l, m]) => {
        setTeams(t);
        setLocations(l);
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
        body: JSON.stringify(matchFormValuesToPayload(formValues)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches((prev) => [data, ...prev]);
      setFormValues(emptyMatchFormValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(match: Match) {
    const label = `${match.homeTeam?.name ?? "Home"} vs ${match.awayTeam?.name ?? "Away"}`;
    if (!confirm(`Delete match "${label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/matches/${match.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to delete match");
      return;
    }
    setMatches((prev) => prev.filter((m) => m.id !== match.id));
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
          description="Schedule matches with teams, location, and date/time."
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
              <MatchFormFields
                teams={teams}
                locations={locations}
                values={formValues}
                onChange={setFormValues}
              />
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
            {matches.map((match) => {
              const when = formatMatchDateTime(match.scheduledAt);
              return (
                <Card key={match.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {match.homeTeam?.name ?? "Home"} vs {match.awayTeam?.name ?? "Away"}
                    </p>
                    <div className="mt-1">{statusBadge(match.status)}</div>
                    {(when || match.location) && (
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        {when && <p>{when}</p>}
                        {match.location && <p>{match.location.name}</p>}
                      </div>
                    )}
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
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(match)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
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
