"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { CurrentTimeClock } from "@/components/CurrentTimeClock";
import { CompletedSetsSummary } from "@/components/scoring/completed-sets-summary";
import { CourtPanel } from "@/components/scoring/court-panel";
import { MatchScoreboard, getRallyState } from "@/components/scoring/match-scoreboard";
import { Badge, Card } from "@/components/ui";
import {
  CourtTeamConfig,
  getCourtSwappedForMatch,
  getCourtTeams,
} from "@/lib/court-layout";
import { isRallyInProgress } from "@/lib/rally";
import { Match, formatMatchDateTime } from "@/lib/types";

const POLL_MS = 2000;
const REFEREE_FIT_SCREEN_KEY = "referee-fit-screen";

function FitScreenToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Fit screen mode"
      onClick={() => onChange(!enabled)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors sm:text-xs ${
        enabled
          ? "border-violet-300 bg-violet-50 text-violet-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-violet-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-2.5" : "translate-x-0.5"
          }`}
        />
      </span>
      Fit screen
    </button>
  );
}

function RefereeCourtTeam({
  match,
  courtTeam,
  currentSetRow,
  fitScreen,
}: {
  match: Match;
  courtTeam: CourtTeamConfig;
  currentSetRow: NonNullable<ReturnType<typeof getRallyState>["summary"]["currentSet"]>;
  fitScreen: boolean;
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
      compact={!fitScreen}
      ultraCompact={fitScreen}
      readOnly
      showRoster={false}
    />
  );
}

function RefereeFitScreenView({
  match,
  courtSwapped,
}: {
  match: Match;
  courtSwapped: boolean;
}) {
  const courtTeams = getCourtTeams(match, courtSwapped);
  const leftCourtTeam = courtTeams[0];
  const rightCourtTeam = courtTeams[1];
  const leftIsHome = leftCourtTeam.team === "home";
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
    <div className="grid h-full min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(5.5rem,6.5rem)_minmax(0,1fr)] gap-1">
      <div className="min-h-0">
        <RefereeCourtTeam
          match={match}
          courtTeam={leftCourtTeam}
          currentSetRow={currentSetRow}
          fitScreen
        />
      </div>

      <div className="flex min-h-0 flex-col justify-start gap-1 overflow-hidden">
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-center">
          <CurrentTimeClock className="mx-auto w-fit text-[9px]" />
        </div>
        <MatchScoreboard
          match={match}
          fitScreen
          leftTeamName={leftCourtTeam.teamName}
          rightTeamName={rightCourtTeam.teamName}
          leftIsHome={leftIsHome}
        />
      </div>

      <div className="min-h-0">
        <RefereeCourtTeam
          match={match}
          courtTeam={rightCourtTeam}
          currentSetRow={currentSetRow}
          fitScreen
        />
      </div>
    </div>
  );
}

function RefereeLiveView({
  match,
  courtSwapped,
  fitScreen,
}: {
  match: Match;
  courtSwapped: boolean;
  fitScreen: boolean;
}) {
  if (fitScreen) {
    return <RefereeFitScreenView match={match} courtSwapped={courtSwapped} />;
  }

  const courtTeams = getCourtTeams(match, courtSwapped);
  const leftCourtTeam = courtTeams[0];
  const rightCourtTeam = courtTeams[1];
  const leftIsHome = leftCourtTeam.team === "home";
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
        <RefereeCourtTeam
          match={match}
          courtTeam={leftCourtTeam}
          currentSetRow={currentSetRow}
          fitScreen={false}
        />
      </div>

      <div className="order-1 flex flex-col gap-2 xl:order-2">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
          <CurrentTimeClock className="mx-auto w-fit text-xs" />
          <CompletedSetsSummary match={match} compact />
        </div>
        <MatchScoreboard
          match={match}
          ultraCompact
          leftTeamName={leftCourtTeam.teamName}
          rightTeamName={rightCourtTeam.teamName}
          leftIsHome={leftIsHome}
        />
      </div>

      <div className="order-3">
        <RefereeCourtTeam
          match={match}
          courtTeam={rightCourtTeam}
          currentSetRow={currentSetRow}
          fitScreen={false}
        />
      </div>
    </div>
  );
}

export default function RefereeMatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [viewCourtSwapped, setViewCourtSwapped] = useState(false);
  const [hasManualCourtSwap, setHasManualCourtSwap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fitScreen, setFitScreen] = useState(false);

  useEffect(() => {
    try {
      setFitScreen(localStorage.getItem(REFEREE_FIT_SCREEN_KEY) === "true");
    } catch {
      // ignore storage errors
    }
  }, []);

  const setFitScreenPersisted = useCallback((next: boolean) => {
    setFitScreen(next);
    try {
      localStorage.setItem(REFEREE_FIT_SCREEN_KEY, String(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const applyMatch = useCallback(
    (m: Match) => {
      setMatch(m);
      const swapped = getCourtSwappedForMatch(m);
      if (!hasManualCourtSwap) {
        setViewCourtSwapped(swapped);
      }
    },
    [hasManualCourtSwap]
  );

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

  useEffect(() => {
    if (!fitScreen || match?.status !== "in_progress") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fitScreen, match?.status]);

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
  const showFitScreen = isLive && fitScreen;

  return (
    <>
      <Nav />
      <main
        className={
          showFitScreen
            ? "mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-1 py-0"
            : "mx-auto max-w-7xl flex-1 px-4 py-4"
        }
      >
        <div className={showFitScreen ? "mb-0.5 shrink-0" : "mb-4"}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {!showFitScreen && (
                <Link href="/referee" className="text-sm text-slate-500 hover:text-slate-700">
                  ← All matches
                </Link>
              )}
              <h1
                className={`truncate font-bold text-slate-900 ${
                  showFitScreen ? "text-xs leading-tight" : "mt-2 text-lg"
                }`}
              >
                {match.homeTeam?.name} vs {match.awayTeam?.name}
              </h1>
              {!showFitScreen && (when || match.location) && (
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
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {isLive && (
                <button
                  type="button"
                  onClick={() => {
                    setHasManualCourtSwap(true);
                    setViewCourtSwapped((prev) => !prev);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:text-xs"
                >
                  Switch Team
                </button>
              )}
              {isLive && (
                <>
                  <FitScreenToggle enabled={fitScreen} onChange={setFitScreenPersisted} />
                  <span className="animate-pulse">
                    <Badge color="green">{showFitScreen ? "Live" : "Live · synced"}</Badge>
                  </span>
                </>
              )}
              {!showFitScreen && <Badge color="slate">Read-only</Badge>}
            </div>
          </div>
        </div>

        <div className={showFitScreen ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined}>
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
              <p className="text-slate-600">
                Scorer is setting rotations for Set {match.currentSet}.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                The live court view will appear when scoring begins.
              </p>
            </Card>
          ) : (
            <RefereeLiveView
              match={match}
              courtSwapped={viewCourtSwapped}
              fitScreen={fitScreen}
            />
          )}
        </div>
      </main>
    </>
  );
}
