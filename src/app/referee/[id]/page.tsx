"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { CurrentTimeClock } from "@/components/CurrentTimeClock";
import { CompletedSetsSummary } from "@/components/scoring/completed-sets-summary";
import { CourtPanel } from "@/components/scoring/court-panel";
import { MatchScoreboard, getRallyState } from "@/components/scoring/match-scoreboard";
import { SetHistoryCard } from "@/components/scoring/set-history-card";
import { Badge, Card } from "@/components/ui";
import {
  CourtTeamConfig,
  getCourtSwappedForMatch,
  getCourtTeams,
} from "@/lib/court-layout";
import { isRallyInProgress } from "@/lib/rally";
import { Match, formatMatchDateTime } from "@/lib/types";

const POLL_MS = 2000;

function RefereeCourtTeam({
  match,
  courtTeam,
  currentSetRow,
}: {
  match: Match;
  courtTeam: CourtTeamConfig;
  currentSetRow: NonNullable<ReturnType<typeof getRallyState>["summary"]["currentSet"]>;
}) {
  const { teamId, teamName, color, side, serving } = courtTeam;
  const players =
    teamId === match.homeTeamId
      ? match.homeTeam?.players ?? []
      : match.awayTeam?.players ?? [];
  const gameCaptainId =
    teamId === match.homeTeamId
      ? currentSetRow.homeGameCaptainId ?? null
      : currentSetRow.awayGameCaptainId ?? null;
  const setLiberoIds =
    teamId === match.homeTeamId
      ? currentSetRow.homeLiberoIds ?? []
      : currentSetRow.awayLiberoIds ?? [];
  const teamSubstitutions =
    match.substitutions?.filter(
      (s) => s.teamId === teamId && s.setNumber === match.currentSet
    ) ?? [];
  const teamTimeouts =
    match.timeouts?.filter((t) => t.teamId === teamId && t.setNumber === match.currentSet) ??
    [];
  const teamLiberoReplacements =
    match.liberoReplacements?.filter(
      (r) => r.teamId === teamId && r.setNumber === match.currentSet
    ) ?? [];
  const { homeScore, awayScore, rallies } = getRallyState(match);
  const rallyInProgress = isRallyInProgress(rallies, homeScore, awayScore);

  return (
    <CourtPanel
      teamName={teamName}
      rotations={match.rotations?.filter((r) => r.teamId === teamId)}
      serving={serving}
      color={color}
      side={side}
      players={players}
      gameCaptainId={gameCaptainId}
      setLiberoIds={setLiberoIds}
      substitutions={teamSubstitutions}
      liberoReplacements={teamLiberoReplacements}
      timeouts={teamTimeouts}
      rallyInProgress={rallyInProgress}
      compact
      readOnly
      showRoster={false}
    />
  );
}

function RefereeLiveView({ match, courtSwapped }: { match: Match; courtSwapped: boolean }) {
  const courtTeams = getCourtTeams(match, courtSwapped);
  const leftCourtTeam = courtTeams[0];
  const rightCourtTeam = courtTeams[1];
  const { summary } = getRallyState(match);
  const currentSetRow = summary.currentSet;

  if (!currentSetRow) {
    return (
      <Card className="text-center">
        <p className="text-slate-600">Set data is not available yet.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(240px,20rem)_minmax(0,1fr)]">
      <div className="order-2 xl:order-1">
        <RefereeCourtTeam match={match} courtTeam={leftCourtTeam} currentSetRow={currentSetRow} />
      </div>

      <div className="order-1 flex flex-col gap-2 xl:order-2">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
          <CurrentTimeClock className="mx-auto w-fit text-xs" />
          <CompletedSetsSummary match={match} compact />
        </div>
        <MatchScoreboard match={match} ultraCompact />
        <SetHistoryCard
          setNumber={match.currentSet}
          leftTeamId={leftCourtTeam.teamId}
          rightTeamId={rightCourtTeam.teamId}
          leftTeamName={leftCourtTeam.teamName}
          rightTeamName={rightCourtTeam.teamName}
          homeTeamId={match.homeTeamId}
          homeTeamName={match.homeTeam?.name ?? "Home"}
          awayTeamName={match.awayTeam?.name ?? "Away"}
          rallies={match.rallies ?? []}
          scoreEvents={match.scoreEvents ?? []}
          substitutions={
            match.substitutions?.filter((s) => s.setNumber === match.currentSet) ?? []
          }
          timeouts={match.timeouts?.filter((t) => t.setNumber === match.currentSet) ?? []}
          liberoReplacements={
            match.liberoReplacements?.filter((r) => r.setNumber === match.currentSet) ?? []
          }
          compact
        />
      </div>

      <div className="order-3">
        <RefereeCourtTeam match={match} courtTeam={rightCourtTeam} currentSetRow={currentSetRow} />
      </div>
    </div>
  );
}

export default function RefereeMatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [courtSwapped, setCourtSwapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        <main className="mx-auto max-w-7xl flex-1 px-4 py-6">
          <p className="text-slate-500">Connecting to match...</p>
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
          <Link href="/referee" className="mt-4 inline-block text-violet-600 hover:underline">
            ← Back to matches
          </Link>
        </main>
      </>
    );
  }

  const when = formatMatchDateTime(match.scheduledAt);
  const isLive = match.status === "in_progress";

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-4">
        <div className="mb-4">
          <Link href="/referee" className="text-sm text-slate-500 hover:text-slate-700">
            ← All matches
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900">
                {match.homeTeam?.name} vs {match.awayTeam?.name}
              </h1>
              {(when || match.location) && (
                <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {when && <p>{when}</p>}
                  {match.location && (
                    <p>
                      {match.location.name}
                      {match.location.address ? ` · ${match.location.address}` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="animate-pulse">
                  <Badge color="green">Live · synced</Badge>
                </span>
              )}
              <Badge color="slate">Read-only</Badge>
            </div>
          </div>
        </div>

        {match.status === "completed" ? (
          <Card className="text-center">
            <p className="text-lg font-semibold text-slate-900">Match completed</p>
            <p className="mt-2 text-sm text-slate-600">
              Final sets:{" "}
              {match.sets?.filter((s) => s.status === "completed" && s.homeScore > s.awayScore)
                .length ?? 0}{" "}
              –{" "}
              {match.sets?.filter((s) => s.status === "completed" && s.awayScore > s.homeScore)
                .length ?? 0}
            </p>
          </Card>
        ) : match.status === "scheduled" ? (
          <Card className="text-center">
            <p className="text-slate-600">This match has not started yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Connect again once the scorer begins set rotation or live scoring.
            </p>
          </Card>
        ) : match.status === "setup" ? (
          <Card className="text-center">
            <p className="text-slate-600">Scorer is setting rotations for Set {match.currentSet}.</p>
            <p className="mt-2 text-sm text-slate-500">
              The live court view will appear when scoring begins.
            </p>
          </Card>
        ) : (
          <RefereeLiveView match={match} courtSwapped={courtSwapped} />
        )}
      </main>
    </>
  );
}
