"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { CurrentTimeClock } from "@/components/CurrentTimeClock";
import { CompletedSetsSummary } from "@/components/scoring/completed-sets-summary";
import { SpectatorLiveView } from "@/components/scoring/spectator-live-view";
import { Badge } from "@/components/ui";
import { getCourtSwappedForMatch } from "@/lib/court-layout";
import { Match, formatMatchDateTime } from "@/lib/types";

const POLL_MS = 2000;
const SPECTATOR_COMPACT_MODE_KEY = "spectator-compact-mode";

function CompactModeToggle({
  compactMode,
  onChange,
}: {
  compactMode: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={compactMode}
      aria-label="Compact mode"
      onClick={() => onChange(!compactMode)}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        compactMode
          ? "border-sky-300 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${
          compactMode ? "bg-sky-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
            compactMode ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
      Compact mode
    </button>
  );
}

export default function SpectatorMatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [courtSwapped, setCourtSwapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    try {
      setCompactMode(localStorage.getItem(SPECTATOR_COMPACT_MODE_KEY) === "true");
    } catch {
      // ignore storage errors
    }
  }, []);

  const setCompactModePersisted = useCallback((next: boolean) => {
    setCompactMode(next);
    try {
      localStorage.setItem(SPECTATOR_COMPACT_MODE_KEY, String(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const applyMatch = useCallback((m: Match) => {
    setMatch(m);
    setCourtSwapped(getCourtSwappedForMatch(m));
  }, []);

  const loadMatch = useCallback(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Match not found");
        return r.json();
      })
      .then(applyMatch)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchId, applyMatch]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    if (!match || match.status !== "in_progress") return;
    const id = setInterval(() => {
      fetch(`/api/matches/${matchId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) applyMatch(data);
        })
        .catch(() => {
          // ignore transient poll errors
        });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [match?.status, matchId, applyMatch]);

  if (loading) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
          <p className="text-slate-500">Loading match...</p>
        </main>
      </>
    );
  }

  if (error || !match) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
          <p className="text-red-600">{error || "Match not found"}</p>
          <Link href="/spectator" className="mt-4 inline-block text-sky-600 hover:underline">
            ← Back to matches
          </Link>
        </main>
      </>
    );
  }

  const when = formatMatchDateTime(match.scheduledAt);
  const isLive = match.status === "in_progress";
  const showClockInHeader = !isLive || !compactMode;

  return (
    <>
      <Nav />
      <main
        className={`mx-auto flex-1 px-4 py-6 ${isLive && compactMode ? "max-w-7xl" : "max-w-4xl"}`}
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Link href="/spectator" className="text-sm text-slate-500 hover:text-slate-700">
              ← All matches
            </Link>
            <h1
              className={`mt-2 font-bold text-slate-900 ${
                isLive && compactMode ? "truncate text-lg" : "text-2xl"
              }`}
            >
              {match.homeTeam?.name} vs {match.awayTeam?.name}
            </h1>
            {(when || match.location) && (
              <div
                className={`mt-2 space-y-1 text-slate-600 ${
                  isLive && compactMode ? "text-xs" : "text-sm"
                }`}
              >
                {when && <p>{when}</p>}
                {match.location && (
                  <p>
                    {match.location.name}
                    {match.location.address ? ` · ${match.location.address}` : ""}
                  </p>
                )}
              </div>
            )}
            {showClockInHeader && (
              <div className="mt-2 text-center">
                <CurrentTimeClock className="mx-auto w-fit" />
                <CompletedSetsSummary match={match} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isLive && (
              <>
                <CompactModeToggle compactMode={compactMode} onChange={setCompactModePersisted} />
                <span className="animate-pulse">
                  <Badge color="green">Live · synced</Badge>
                </span>
              </>
            )}
            <Badge color="slate">Read-only</Badge>
          </div>
        </div>

        <SpectatorLiveView match={match} courtSwapped={courtSwapped} compactMode={compactMode} />
      </main>
    </>
  );
}
