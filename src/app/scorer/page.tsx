"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Match, getMatchSummary } from "@/lib/types";

export default function ScorerPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then(setMatches)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title="Scorer"
          description="Select a match to set rotations and enter live scores."
        />

        {loading ? (
          <p className="text-slate-500">Loading matches...</p>
        ) : matches.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-600">No matches available.</p>
            <p className="mt-2 text-sm text-slate-500">
              Ask an admin to create teams and schedule a match first.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const summary = getMatchSummary(match);
              return (
                <Link key={match.id} href={`/scorer/${match.id}`} className="block group">
                  <Card className="transition-shadow hover:shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-slate-900 group-hover:text-orange-600">
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
                      </div>
                      <span className="text-orange-500 font-medium text-sm">Score match →</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
