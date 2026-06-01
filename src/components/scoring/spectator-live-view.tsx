"use client";

import { CurrentTimeClock } from "@/components/CurrentTimeClock";
import { CompletedSetsSummary } from "@/components/scoring/completed-sets-summary";
import { CourtPanel } from "@/components/scoring/court-panel";
import { SetHistoryCard } from "@/components/scoring/set-history-card";
import { SpectatorScorePanel } from "@/components/scoring/spectator-score-panel";
import { Card } from "@/components/ui";
import { getCourtTeams } from "@/lib/court-layout";
import { isRallyInProgress } from "@/lib/rally";
import { Match, getMatchSummary } from "@/lib/types";

function SpectatorCourtTeam({
  match,
  courtTeam,
  compact,
}: {
  match: Match;
  courtTeam: ReturnType<typeof getCourtTeams>[number];
  compact: boolean;
}) {
  const { teamId, teamName, color, side, serving } = courtTeam;
  const summary = getMatchSummary(match);
  const currentSetRow = summary.currentSet;
  const players =
    teamId === match.homeTeamId
      ? match.homeTeam?.players ?? []
      : match.awayTeam?.players ?? [];
  const gameCaptainId =
    teamId === match.homeTeamId
      ? currentSetRow?.homeGameCaptainId ?? null
      : currentSetRow?.awayGameCaptainId ?? null;
  const setLiberoIds =
    teamId === match.homeTeamId
      ? currentSetRow?.homeLiberoIds ?? []
      : currentSetRow?.awayLiberoIds ?? [];
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
  const homeScore = summary.currentSet?.homeScore ?? 0;
  const awayScore = summary.currentSet?.awayScore ?? 0;
  const rallies = match.rallies ?? [];
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
      compact={compact}
      readOnly
      showRoster
    />
  );
}

export function SpectatorLiveView({
  match,
  courtSwapped,
  compactMode,
}: {
  match: Match;
  courtSwapped: boolean;
  compactMode: boolean;
}) {
  const summary = getMatchSummary(match);

  if (match.status === "completed") {
    return (
      <Card className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Match Complete</h2>
        <p className="mt-2 text-4xl font-bold text-sky-600">
          {summary.homeSets} – {summary.awaySets}
        </p>
        <p className="mt-1 text-slate-600">
          {summary.homeSets > summary.awaySets
            ? match.homeTeam?.name
            : match.awayTeam?.name}{" "}
          wins!
        </p>
      </Card>
    );
  }

  if (match.status === "scheduled") {
    return (
      <Card className="text-center">
        <p className="text-slate-600">This match has not started yet.</p>
        <p className="mt-2 text-sm text-slate-500">
          Check back when the scorer begins set rotation or live scoring.
        </p>
      </Card>
    );
  }

  if (match.status === "setup") {
    return (
      <Card className="text-center">
        <p className="text-slate-600">Scorer is setting rotations for Set {match.currentSet}.</p>
        <p className="mt-2 text-sm text-slate-500">
          The live view will appear when scoring begins.
        </p>
      </Card>
    );
  }

  const courtTeams = getCourtTeams(match, courtSwapped);
  const leftCourtTeam = courtTeams[0];
  const rightCourtTeam = courtTeams[1];

  function renderSetHistory(compact: boolean) {
    return (
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
        compact={compact}
      />
    );
  }

  function renderCenterPanel(compact: boolean) {
    return (
      <>
        {compact && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
            <CurrentTimeClock className="mx-auto w-fit" />
            <CompletedSetsSummary match={match} compact />
          </div>
        )}
        <SpectatorScorePanel match={match} compact={compact} />
        {compact && renderSetHistory(true)}
      </>
    );
  }

  if (compactMode) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)_minmax(0,1fr)]">
        <div className="order-2 xl:order-1">
          <SpectatorCourtTeam match={match} courtTeam={leftCourtTeam} compact />
        </div>
        <div className="order-1 flex flex-col gap-3 xl:order-2">{renderCenterPanel(true)}</div>
        <div className="order-3">
          <SpectatorCourtTeam match={match} courtTeam={rightCourtTeam} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SpectatorScorePanel match={match} compact={false} />
      <div className="grid gap-4 lg:grid-cols-2">
        {courtTeams.map((courtTeam) => (
          <div key={courtTeam.teamId}>
            <SpectatorCourtTeam match={match} courtTeam={courtTeam} compact={false} />
          </div>
        ))}
      </div>
      {renderSetHistory(false)}
    </div>
  );
}
