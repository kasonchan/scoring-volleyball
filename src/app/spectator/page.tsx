"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Match, formatMatchDateTime, getMatchSummary } from "@/lib/types";

function statusBadge(status: Match["status"]) {
  const map: Record<Match["status"], { label: string; color: string }> = {
    scheduled: { label: "Ready to Start", color: "slate" },
    setup: { label: "Set Rotation", color: "orange" },
    in_progress: { label: "Live", color: "green" },
    completed: { label: "Final", color: "blue" },
  };
  const { label, color } = map[status];
  return <Badge color={color}>{label}</Badge>;
}

function sortMatches(matches: Match[]): Match[] {
  const order: Record<Match["status"], number> = {
    in_progress: 0,
    setup: 1,
    scheduled: 2,
    completed: 3,
  };
  return [...matches].sort((a, b) => {
    const byStatus = order[a.status] - order[b.status];
    if (byStatus !== 0) return byStatus;
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return bTime - aTime;
  });
}

export default function SpectatorPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((data: Match[]) => setMatches(sortMatches(data)))
      .finally(() => setLoading(false));
  }, []);

  const liveMatches = matches.filter((m) => m.status === "in_progress");

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Spectator"
          description="Watch any match live with the same view as the scorer — read-only."
        />

        {loading ? (
          <p className="text-slate-500">Loading matches...</p>
        ) : matches.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-600">No matches available.</p>
            <p className="mt-2 text-sm text-slate-500">
              Matches will appear here once an admin schedules them.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {liveMatches.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Live now
                </h2>
                <div className="space-y-3">
                  {liveMatches.map((match) => (
                    <SpectatorMatchCard key={match.id} match={match} highlight />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {liveMatches.length > 0 ? "All matches" : "Matches"}
              </h2>
              <div className="space-y-3">
                {matches
                  .filter((m) => m.status !== "in_progress")
                  .map((match) => (
                    <SpectatorMatchCard key={match.id} match={match} />
                  ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function SpectatorMatchCard({
  match,
  highlight = false,
}: {
  match: Match;
  highlight?: boolean;
}) {
  const summary = getMatchSummary(match);
  const when = formatMatchDateTime(match.scheduledAt);

  return (
    <Link href={`/spectator/${match.id}`} className="block group">
      <Card
        className={`transition-shadow hover:shadow-md ${
          highlight ? "border-emerald-200 bg-emerald-50/40" : ""
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900 group-hover:text-sky-600">
              {match.homeTeam?.name} vs {match.awayTeam?.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {statusBadge(match.status)}
              {match.status !== "scheduled" && (
                <span className="text-sm text-slate-500">
                  Sets: {summary.homeSets} – {summary.awaySets}
                </span>
              )}
            </div>
            {(when || match.location) && (
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {when && <p>{when}</p>}
                {match.location && <p>{match.location.name}</p>}
              </div>
            )}
          </div>
          <span className="font-medium text-sm text-sky-600">Watch →</span>
        </div>
      </Card>
    </Link>
  );
}
