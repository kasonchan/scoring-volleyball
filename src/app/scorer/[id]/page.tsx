"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { CurrentTimeClock } from "@/components/CurrentTimeClock";
import { Badge, Button, Card } from "@/components/ui";
import {
  benchPlayers,
  getCaptainLabel,
  needsGameCaptainAssignment,
} from "@/lib/captains";
import { getAllowedSubstitutesIn } from "@/lib/substitutions";
import {
  canLiberoOutAtP4,
  getLiberoInOptions,
  getLiberoOutPrompt,
  isLiberoPlayer,
  LIBERO_IN_POSITIONS,
  LIBERO_OUT_POSITION,
  type LiberoInOption,
} from "@/lib/libero";
import { Match, Player, PLAYER_ROLE_LABELS, ServingTeam, Substitution, Timeout, LiberoReplacement, formatMatchDateTime, formatSetDuration, getMatchSummary, MAX_TIMEOUTS_PER_SET, TIMEOUT_SECONDS } from "@/lib/types";

const LEFT_COURT_POSITIONS = [5, 4, 6, 3, 1, 2] as const;
const RIGHT_COURT_POSITIONS = [2, 1, 3, 6, 4, 5] as const;

function TeamRosterList({
  players,
  color,
  onCourtPositionByPlayerId,
  gameCaptainId = null,
  setLiberoIds = [],
}: {
  players: Player[];
  color: "blue" | "teal";
  onCourtPositionByPlayerId: (playerId: string) => number | null;
  gameCaptainId?: string | null;
  setLiberoIds?: string[];
}) {
  return (
    <div className="mt-4 border-t border-white/70 pt-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Roster</h4>
      {players.length === 0 ? (
        <p className="text-sm text-slate-500">No players on roster.</p>
      ) : (
        <div className="space-y-1">
          {[...players]
            .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
            .map((p) => {
              const courtPosition = onCourtPositionByPlayerId(p.id);
              const onCourt = courtPosition !== null;
              const captainLabel = onCourt ? getCaptainLabel(players, p.id, gameCaptainId) : null;
              const isSetLibero = setLiberoIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    onCourt ? "bg-white font-medium text-slate-900" : "text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      color === "blue" ? "bg-blue-500" : "bg-teal-500"
                    }`}
                  >
                    {p.jerseyNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.role && (
                    <span className="hidden shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-600 sm:inline">
                      {PLAYER_ROLE_LABELS[p.role]}
                    </span>
                  )}
                  {captainLabel === "Game Captain" && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Game Captain
                    </span>
                  )}
                  {isSetLibero && (
                    <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                      Libero
                    </span>
                  )}
                  {onCourt && (
                    <span className="shrink-0 text-xs font-medium text-orange-600">
                      P{courtPosition}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function getPreviousSetLiberos(match: Match, team: "home" | "away"): string[] {
  const prev = match.sets?.find((s) => s.setNumber === match.currentSet - 1);
  if (!prev) return [];
  return team === "home" ? prev.homeLiberoIds ?? [] : prev.awayLiberoIds ?? [];
}

function liberoCandidates(players: Player[], rotation: (string | null)[]): Player[] {
  const onCourt = rotation.filter((id): id is string => !!id);
  const bench = benchPlayers(players, onCourt);
  return [...bench].sort((a, b) => {
    const aLibero = a.role === "libero" ? 0 : 1;
    const bLibero = b.role === "libero" ? 0 : 1;
    if (aLibero !== bLibero) return aLibero - bLibero;
    return a.jerseyNumber - b.jerseyNumber;
  });
}

function RotationSetup({
  match,
  onComplete,
  courtSwapped,
  onSwitchCourt,
}: {
  match: Match;
  onComplete: (m: Match) => void;
  courtSwapped: boolean;
  onSwitchCourt: () => void;
}) {
  const [homeRotation, setHomeRotation] = useState<(string | null)[]>(Array(6).fill(null));
  const [awayRotation, setAwayRotation] = useState<(string | null)[]>(Array(6).fill(null));
  const [homeGameCaptain, setHomeGameCaptain] = useState<string | null>(null);
  const [awayGameCaptain, setAwayGameCaptain] = useState<string | null>(null);
  const [homeLiberos, setHomeLiberos] = useState<string[]>(() => getPreviousSetLiberos(match, "home"));
  const [awayLiberos, setAwayLiberos] = useState<string[]>(() => getPreviousSetLiberos(match, "away"));
  const [servingTeam, setServingTeam] = useState<ServingTeam>("home");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onCourtPlayers(players: Player[], rotation: (string | null)[]) {
    return players.filter((p) => rotation.includes(p.id));
  }

  function needsGameCaptainPrompt(
    players: Player[],
    rotation: (string | null)[],
    gameCaptainId: string | null
  ) {
    const onCourt = rotation.filter((id): id is string => !!id);
    return needsGameCaptainAssignment(players, onCourt, gameCaptainId);
  }

  function setPlayer(
    team: "home" | "away",
    position: number,
    playerId: string
  ) {
    const setter = team === "home" ? setHomeRotation : setAwayRotation;
    const rotation = team === "home" ? homeRotation : awayRotation;
    const gameCaptain = team === "home" ? homeGameCaptain : awayGameCaptain;
    const setGameCaptain = team === "home" ? setHomeGameCaptain : setAwayGameCaptain;
    const liberos = team === "home" ? homeLiberos : awayLiberos;
    const setLiberos = team === "home" ? setHomeLiberos : setAwayLiberos;
    const updated = [...rotation];
    updated[position] = playerId;
    setter(updated);
    if (gameCaptain && !updated.includes(gameCaptain)) {
      setGameCaptain(null);
    }
    if (liberos.some((id) => updated.includes(id))) {
      setLiberos(liberos.filter((id) => !updated.includes(id)));
    }
  }

  async function handleSubmit() {
    if (homeRotation.some((p) => !p) || awayRotation.some((p) => !p)) {
      setError("Select a player for all 6 positions on each team");
      return;
    }

    const homePlayers = match.homeTeam?.players ?? [];
    const awayPlayers = match.awayTeam?.players ?? [];
    if (needsGameCaptainPrompt(homePlayers, homeRotation, homeGameCaptain)) {
      setError(`Select a Game Captain on court for ${match.homeTeam?.name ?? "home team"}`);
      return;
    }
    if (needsGameCaptainPrompt(awayPlayers, awayRotation, awayGameCaptain)) {
      setError(`Select a Game Captain on court for ${match.awayTeam?.name ?? "away team"}`);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/rotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeRotation,
          awayRotation,
          servingTeam,
          homeGameCaptainId: homeGameCaptain,
          awayGameCaptainId: awayGameCaptain,
          homeLiberoIds: homeLiberos,
          awayLiberoIds: awayLiberos,
          courtSwapped,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onComplete(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rotation");
    } finally {
      setLoading(false);
    }
  }

  function renderTeamRotation(
    team: "home" | "away",
    teamName: string,
    players: Player[],
    rotation: (string | null)[],
    side: "left" | "right",
    color: "blue" | "teal",
    gameCaptain: string | null,
    onGameCaptainChange: (playerId: string | null) => void,
    setLiberos: string[],
    onSetLiberosChange: (playerIds: string[]) => void
  ) {
    const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-teal-50 border-teal-200";
    const accent = color === "blue" ? "text-blue-700" : "text-teal-700";
    const positions = side === "left" ? LEFT_COURT_POSITIONS : RIGHT_COURT_POSITIONS;
    const benchLiberos = liberoCandidates(players, rotation);

    return (
      <div className={`rounded-xl border p-4 ${bg}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className={`font-semibold ${accent}`}>{teamName}</h3>
          <Button variant="secondary" type="button" onClick={onSwitchCourt} className="shrink-0 text-xs">
            Switch Court
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {positions.map((pos) => {
            const i = pos - 1;
            return (
              <div key={pos} className="rounded-lg bg-white p-2 shadow-sm">
                <div className="mb-1 text-xs text-slate-400">P{pos}</div>
                <select
                  value={rotation[i] ?? ""}
                  onChange={(e) => setPlayer(team, i, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  {players.map((p) => {
                    const usedElsewhere = rotation.includes(p.id) && rotation[i] !== p.id;
                    return (
                      <option key={p.id} value={p.id} disabled={usedElsewhere}>
                        #{p.jerseyNumber} {p.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
        {needsGameCaptainPrompt(players, rotation, gameCaptain) && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              Team Captain is not on court. Assign a Game Captain from players on court.
            </p>
            <select
              value={gameCaptain ?? ""}
              onChange={(e) => onGameCaptainChange(e.target.value || null)}
              className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="">Select Game Captain...</option>
              {onCourtPlayers(players, rotation)
                .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber} {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
          <p className="text-sm font-medium text-violet-900">Liberos for this set</p>
          <p className="mt-0.5 text-xs text-violet-700">
            Select one or more bench players. Liberos cannot start on court.
          </p>
          {benchLiberos.length === 0 ? (
            <p className="mt-2 text-sm text-violet-800">No bench players available.</p>
          ) : (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {benchLiberos.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm text-slate-700 hover:border-violet-300"
                >
                  <input
                    type="checkbox"
                    checked={setLiberos.includes(p.id)}
                    onChange={(e) => {
                      onSetLiberosChange(
                        e.target.checked
                          ? [...setLiberos, p.id]
                          : setLiberos.filter((id) => id !== p.id)
                      );
                    }}
                    className="rounded border-violet-300 text-violet-600 focus:ring-orange-500"
                  />
                  <span className="font-medium">#{p.jerseyNumber}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.role === "libero" && (
                    <span className="shrink-0 text-xs text-violet-600">Roster Libero</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
        <TeamRosterList
          players={players}
          color={color}
          gameCaptainId={gameCaptain}
          setLiberoIds={setLiberos}
          onCourtPositionByPlayerId={(playerId) => {
            const positionIndex = rotation.indexOf(playerId);
            return positionIndex === -1 ? null : positionIndex + 1;
          }}
        />
      </div>
    );
  }

  const courtTeams = courtSwapped
    ? ([
        { team: "away" as const, side: "left" as const },
        { team: "home" as const, side: "right" as const },
      ] as const)
    : ([
        { team: "home" as const, side: "left" as const },
        { team: "away" as const, side: "right" as const },
      ] as const);

  return (
    <Card>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Set {match.currentSet} — Starting Rotation
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Assign 6 players to court positions for each team. Position 1 is the server position.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Serving Team</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setServingTeam("home")}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
              servingTeam === "home"
                ? "border-blue-500 bg-blue-50 text-blue-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {match.homeTeam?.name} serves
          </button>
          <button
            type="button"
            onClick={() => setServingTeam("away")}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
              servingTeam === "away"
                ? "border-teal-500 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {match.awayTeam?.name} serves
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {courtTeams.map(({ team, side }) => {
          const isHome = team === "home";
          return (
            <Fragment key={team}>
              {renderTeamRotation(
                team,
                isHome ? match.homeTeam?.name ?? "Home" : match.awayTeam?.name ?? "Away",
                isHome ? match.homeTeam?.players ?? [] : match.awayTeam?.players ?? [],
                isHome ? homeRotation : awayRotation,
                side,
                isHome ? "blue" : "teal",
                isHome ? homeGameCaptain : awayGameCaptain,
                isHome ? setHomeGameCaptain : setAwayGameCaptain,
                isHome ? homeLiberos : awayLiberos,
                isHome ? setHomeLiberos : setAwayLiberos
              )}
            </Fragment>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button className="mt-6 w-full sm:w-auto" onClick={handleSubmit} disabled={loading}>
        {loading ? "Starting..." : "Start Set"}
      </Button>
    </Card>
  );
}

function SetHistory({ match }: { match: Match }) {
  const completedSets = match.sets?.filter((s) => s.status === "completed") ?? [];
  if (completedSets.length === 0) return null;

  return (
    <div className="mt-4 text-center">
      <h3 className="mb-2 text-sm font-medium text-slate-500">Set History</h3>
      <div className="flex flex-wrap justify-center gap-2">
        {completedSets.map((s) => {
          const duration = formatSetDuration(s.startedAt, s.endedAt);
          return (
            <div key={s.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              <div>
                Set {s.setNumber}: {s.homeScore} – {s.awayScore}
              </div>
              {duration && <div className="text-xs text-slate-500">{duration}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CourtRotation({
  teamName,
  rotations,
  serving,
  color,
  side,
  players,
  gameCaptainId,
  setLiberoIds,
  substitutions,
  liberoReplacements,
  timeouts,
  onOpenSubstitute,
  onLiberoIn,
  onLiberoOut,
  onTimeout,
  timeoutLoading,
  liberoLoading,
}: {
  teamName: string;
  rotations: Match["rotations"];
  serving: boolean;
  color: "blue" | "teal";
  side: "left" | "right";
  players: Player[];
  gameCaptainId: string | null;
  setLiberoIds: string[];
  substitutions: Substitution[];
  liberoReplacements: LiberoReplacement[];
  timeouts: Timeout[];
  onOpenSubstitute?: () => void;
  onLiberoIn?: () => void;
  onLiberoOut?: () => void;
  onTimeout?: () => void;
  timeoutLoading?: boolean;
  liberoLoading?: boolean;
}) {
  const teamRotations = rotations?.slice().sort((a, b) => a.position - b.position) ?? [];
  const onCourtPlayerIds = teamRotations.map((r) => r.playerId);
  const playerAtP4Id = teamRotations.find((r) => r.position === LIBERO_OUT_POSITION)?.playerId;
  const benchLiberos = setLiberoIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p && !onCourtPlayerIds.includes(p.id));
  const liberoInOptions = getLiberoInOptions(teamRotations, benchLiberos);
  const liberoOutReady = !!canLiberoOutAtP4(
    playerAtP4Id,
    setLiberoIds,
    players,
    liberoReplacements
  );
  const liberoInCount = liberoReplacements.filter((r) => r.eventType === "in").length;
  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-teal-50 border-teal-200";
  const accent = color === "blue" ? "text-blue-700" : "text-teal-700";
  const positions = side === "left" ? LEFT_COURT_POSITIONS : RIGHT_COURT_POSITIONS;

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={`font-semibold ${accent}`}>{teamName}</h3>
        {serving && <Badge color="orange">Serving</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {positions.map((pos) => {
          const entry = teamRotations.find((r) => r.position === pos);
          const isServer = pos === 1 && serving;
          const captainLabel = entry?.player
            ? getCaptainLabel(players, entry.player.id, gameCaptainId)
            : null;
          const isActiveLibero =
            !!entry?.player && isLiberoPlayer(entry.player, setLiberoIds) && onCourtPlayerIds.includes(entry.player.id);
          return (
            <div
              key={pos}
              className={`rounded-lg bg-white p-2 shadow-sm ${isServer ? "ring-2 ring-orange-400" : ""}`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="text-xs text-slate-400">P{pos}</div>
                <div className="flex items-center gap-1">
                  {isActiveLibero && (
                    <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                      L
                    </span>
                  )}
                  {captainLabel && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      {captainLabel === "Team Captain" ? "TC" : "GC"}
                    </span>
                  )}
                </div>
              </div>
              <div className="font-bold text-slate-900">
                {entry?.player ? `#${entry.player.jerseyNumber}` : "—"}
              </div>
              <div className="truncate text-xs text-slate-600">
                {entry?.player?.name ?? ""}
              </div>
            </div>
          );
        })}
      </div>
      {!needsGameCaptainAssignment(players, onCourtPlayerIds, gameCaptainId) ? null : (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No Team Captain or Game Captain on court. Substitute to assign a Game Captain.
        </p>
      )}
      {(onTimeout || onOpenSubstitute || onLiberoIn || onLiberoOut) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onLiberoIn && (
            <Button
              variant="secondary"
              type="button"
              onClick={onLiberoIn}
              disabled={liberoLoading || setLiberoIds.length === 0 || liberoInOptions.length === 0}
              className="text-xs"
              title={`Libero in at P${LIBERO_IN_POSITIONS.join(", P")} only`}
            >
              Libero In ({liberoInCount})
            </Button>
          )}
          {onLiberoOut && (
            <Button
              variant="secondary"
              type="button"
              onClick={onLiberoOut}
              disabled={liberoLoading || !liberoOutReady}
              className="text-xs"
              title="Libero out at P4 (returns replaced player)"
            >
              Libero Out
            </Button>
          )}
          {onTimeout && (
            <Button
              variant="secondary"
              type="button"
              onClick={onTimeout}
              disabled={timeoutLoading || timeouts.length >= MAX_TIMEOUTS_PER_SET}
              className="text-xs"
              title={`Timeouts this set (max ${MAX_TIMEOUTS_PER_SET})`}
            >
              Timeout ({timeouts.length})
            </Button>
          )}
          {onOpenSubstitute && (
            <Button
              variant="secondary"
              type="button"
              onClick={onOpenSubstitute}
              className="text-xs"
              title="Substitutions this set"
            >
              Substitute ({substitutions.length})
            </Button>
          )}
        </div>
      )}
      <TeamRosterList
        players={players}
        color={color}
        gameCaptainId={gameCaptainId}
        setLiberoIds={setLiberoIds}
        onCourtPositionByPlayerId={(playerId) => {
          const entry = teamRotations.find((r) => r.playerId === playerId);
          return entry?.position ?? null;
        }}
      />
      {liberoReplacements.length > 0 && (
        <div className="mt-4 border-t border-white/70 pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Libero History
          </h4>
          <div className="space-y-1">
            {liberoReplacements.map((entry) => (
              <div key={entry.id} className="rounded-lg bg-white/80 px-2 py-1.5 text-xs text-slate-700">
                {entry.eventType === "in" ? "In" : "Out"} P{entry.position}: #
                {entry.libero?.jerseyNumber} {entry.libero?.name} ↔ #{entry.player?.jerseyNumber}{" "}
                {entry.player?.name}
              </div>
            ))}
          </div>
        </div>
      )}
      {substitutions.length > 0 && (
        <div className="mt-4 border-t border-white/70 pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Substitution History
          </h4>
          <div className="space-y-1">
            {substitutions.map((sub) => (
              <div key={sub.id} className="rounded-lg bg-white/80 px-2 py-1.5 text-xs text-slate-700">
                P{sub.position}: #{sub.playerOut?.jerseyNumber} {sub.playerOut?.name} → #
                {sub.playerIn?.jerseyNumber} {sub.playerIn?.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LiberoInModal({
  teamName,
  options,
  onClose,
  onConfirm,
  loading,
}: {
  teamName: string;
  options: LiberoInOption[];
  onClose: () => void;
  onConfirm: (position: number, liberoId: string) => void;
  loading: boolean;
}) {
  const [position, setPosition] = useState<number | null>(
    options.length === 1 ? options[0].position : null
  );
  const selectedOption = options.find((o) => o.position === position) ?? null;
  const eligibleLiberos = selectedOption?.eligibleLiberos ?? [];
  const [liberoId, setLiberoId] = useState(() => {
    if (options.length === 1 && options[0].eligibleLiberos.length === 1) {
      return options[0].eligibleLiberos[0].id;
    }
    return "";
  });

  function selectPosition(pos: number) {
    setPosition(pos);
    setLiberoId("");
    const option = options.find((o) => o.position === pos);
    if (option?.eligibleLiberos.length === 1) {
      setLiberoId(option.eligibleLiberos[0].id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <h3 className="text-lg font-semibold text-slate-900">Libero In — {teamName}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Choose a back-row player or libero at P1, P5, or P6 to replace, then select a bench libero.
          Any bench libero can replace any eligible player, including switching between liberos.
        </p>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Out at P1, P5, or P6
          </label>
          {options.length === 0 ? (
            <p className="text-sm text-slate-500">No eligible back-row positions available.</p>
          ) : (
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.position}
                type="button"
                onClick={() => selectPosition(option.position)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  position === option.position
                    ? "border-violet-500 bg-violet-50 font-medium text-violet-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                }`}
              >
                <span className="font-medium text-slate-500">P{option.position}</span>
                <span className="font-medium">#{option.player.jerseyNumber}</span>
                <span className="min-w-0 flex-1 truncate">{option.player.name}</span>
              </button>
            ))}
          </div>
          )}
        </div>
        {selectedOption && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Libero in</label>
            <div className="space-y-1">
              {eligibleLiberos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLiberoId(p.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    liberoId === p.id
                      ? "border-violet-500 bg-violet-50 font-medium text-violet-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                  }`}
                >
                  <span className="font-medium">#{p.jerseyNumber}</span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={() => position && onConfirm(position, liberoId)}
            disabled={loading || !position || !liberoId}
          >
            {loading ? "Saving..." : "Confirm Libero In"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LiberoOutModal({
  teamName,
  libero,
  player,
  autoTriggered,
  onClose,
  onConfirm,
  loading,
}: {
  teamName: string;
  libero: Player;
  player: Player;
  autoTriggered?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <h3 className="text-lg font-semibold text-slate-900">Libero Out — {teamName}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {autoTriggered
            ? "Rotation placed the libero at P4 (front row). Confirm libero out to restore the replaced player."
            : "Replace the libero at P4 with the player they replaced."}
        </p>
        <div className="mt-4 space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-medium text-slate-500">P4 out</span>
            <span className="font-medium">#{libero.jerseyNumber}</span>
            <span className="truncate">{libero.name}</span>
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
              L
            </span>
          </div>
          <div className="text-center text-slate-400">↓</div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-medium text-slate-500">P4 in</span>
            <span className="font-medium">#{player.jerseyNumber}</span>
            <span className="truncate">{player.name}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Saving..." : "Confirm Libero Out"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TimeoutTimerModal({
  teamName,
  onClose,
}: {
  teamName: string;
  onClose: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);

  useEffect(() => {
    const endAt = Date.now() + TIMEOUT_SECONDS * 1000;
    const intervalId = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(intervalId);
    }, 200);
    return () => clearInterval(intervalId);
  }, []);

  const done = secondsLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <h3 className="text-lg font-semibold text-slate-900">Timeout — {teamName}</h3>
        <p className="mt-1 text-sm text-slate-600">{TIMEOUT_SECONDS}-second timeout</p>
        <p
          className={`mt-6 font-mono text-6xl font-bold tabular-nums ${
            done ? "text-emerald-600" : "text-orange-600"
          }`}
        >
          {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
          {String(secondsLeft % 60).padStart(2, "0")}
        </p>
        <p className="mt-2 text-sm text-slate-500">{done ? "Timeout complete" : "Time remaining"}</p>
        <div className="mt-6">
          <Button variant="secondary" onClick={onClose}>
            {done ? "Close" : "Dismiss"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SubstitutionCourtGrid({
  rotations,
  players,
  gameCaptainId,
  side,
  color,
  serving,
  selectedPosition,
  playerInId,
  onSelectPosition,
}: {
  rotations: Match["rotations"];
  players: Player[];
  gameCaptainId: string | null;
  side: "left" | "right";
  color: "blue" | "teal";
  serving: boolean;
  selectedPosition: number | null;
  playerInId: string | null;
  onSelectPosition: (position: number) => void;
}) {
  const teamRotations = rotations?.slice().sort((a, b) => a.position - b.position) ?? [];
  const positions = side === "left" ? LEFT_COURT_POSITIONS : RIGHT_COURT_POSITIONS;
  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-teal-50 border-teal-200";
  const accent = color === "blue" ? "text-blue-700" : "text-teal-700";
  const playerIn = playerInId ? players.find((p) => p.id === playerInId) : null;

  return (
    <div className={`rounded-xl border p-3 ${bg}`}>
      <p className={`mb-2 text-xs font-medium ${accent}`}>Tap a position to substitute</p>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {positions.map((pos) => {
          const entry = teamRotations.find((r) => r.position === pos);
          const isServer = pos === 1 && serving;
          const isSelected = selectedPosition === pos;
          const isPreview = isSelected && !!playerIn;
          const displayPlayer = isPreview ? playerIn : entry?.player;
          const captainLabel = displayPlayer
            ? getCaptainLabel(players, displayPlayer.id, gameCaptainId)
            : null;

          return (
            <button
              key={pos}
              type="button"
              onClick={() => onSelectPosition(pos)}
              className={`rounded-lg bg-white p-2 shadow-sm transition ring-offset-1 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                isServer ? "ring-2 ring-orange-400" : ""
              } ${isSelected ? "ring-2 ring-orange-500" : ""} ${
                isPreview ? "bg-emerald-50 ring-2 ring-emerald-500" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="text-xs text-slate-400">P{pos}</div>
                {captainLabel && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                    {captainLabel === "Team Captain" ? "TC" : "GC"}
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-900">
                {displayPlayer ? `#${displayPlayer.jerseyNumber}` : "—"}
              </div>
              <div className="truncate text-xs text-slate-600">{displayPlayer?.name ?? ""}</div>
              {isPreview && (
                <div className="mt-0.5 text-[10px] font-medium text-emerald-700">Sub in</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubstitutionModal({
  teamName,
  rotations,
  players,
  substitutions,
  currentGameCaptainId,
  setLiberoIds,
  side,
  color,
  serving,
  initialPosition,
  onClose,
  onConfirm,
  loading,
}: {
  teamName: string;
  rotations: Match["rotations"];
  players: Player[];
  substitutions: Substitution[];
  currentGameCaptainId: string | null;
  setLiberoIds: string[];
  side: "left" | "right";
  color: "blue" | "teal";
  serving: boolean;
  initialPosition?: number;
  onClose: () => void;
  onConfirm: (position: number, playerInId: string, gameCaptainId: string | null) => void;
  loading: boolean;
}) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(initialPosition ?? null);
  const [playerInId, setPlayerInId] = useState("");
  const [selectedGameCaptainId, setSelectedGameCaptainId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const teamRotations = rotations?.slice().sort((a, b) => a.position - b.position) ?? [];
  const onCourtPlayerIds = teamRotations.map((r) => r.playerId);
  const currentEntry = selectedPosition
    ? teamRotations.find((r) => r.position === selectedPosition)
    : undefined;
  const currentPlayer = currentEntry?.player;
  const bench = benchPlayers(players, onCourtPlayerIds);
  const allowedBench = currentPlayer
    ? getAllowedSubstitutesIn(currentPlayer.id, bench, substitutions, setLiberoIds)
    : [];

  const projectedOnCourt =
    currentPlayer && playerInId
      ? onCourtPlayerIds.map((id) => (id === currentPlayer.id ? playerInId : id))
      : [];
  const showGameCaptainPicker =
    !!playerInId &&
    needsGameCaptainAssignment(players, projectedOnCourt, currentGameCaptainId);

  function selectPosition(pos: number) {
    setSelectedPosition(pos);
    setPlayerInId("");
    setSelectedGameCaptainId(null);
    setError("");
  }

  function handleSubmit() {
    if (!selectedPosition || !currentPlayer) {
      setError("Select a court position");
      return;
    }
    if (!playerInId) {
      setError("Select a substitute player");
      return;
    }
    if (showGameCaptainPicker && !selectedGameCaptainId) {
      setError("Assign a Game Captain from players on court");
      return;
    }
    setError("");
    onConfirm(selectedPosition, playerInId, showGameCaptainPicker ? selectedGameCaptainId : null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-900">Substitution — {teamName}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Paired substitutions only: once two players swap, only they can substitute for each other.
          Regular subs use non-libero bench players.
        </p>
        <div className="mt-4 space-y-4">
          <SubstitutionCourtGrid
            rotations={rotations}
            players={players}
            gameCaptainId={currentGameCaptainId}
            side={side}
            color={color}
            serving={serving}
            selectedPosition={selectedPosition}
            playerInId={playerInId || null}
            onSelectPosition={selectPosition}
          />
          {currentPlayer && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Substitute in for #{currentPlayer.jerseyNumber} {currentPlayer.name}
              </label>
              {allowedBench.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No eligible non-libero substitute available for this player.
                </p>
              ) : (
                <div className="space-y-1">
                  {allowedBench.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPlayerInId(p.id);
                        setSelectedGameCaptainId(null);
                        setError("");
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        playerInId === p.id
                          ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          color === "blue" ? "bg-blue-500" : "bg-teal-500"
                        }`}
                      >
                        {p.jerseyNumber}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {allowedBench.length === 1 && (
                <p className="mt-1 text-xs text-slate-500">
                  Only #{allowedBench[0].jerseyNumber} {allowedBench[0].name} can sub for this player.
                </p>
              )}
            </div>
          )}
          {showGameCaptainPicker && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                No Team Captain or Game Captain on court. Assign a Game Captain.
              </p>
              <select
                value={selectedGameCaptainId ?? ""}
                onChange={(e) => setSelectedGameCaptainId(e.target.value || null)}
                className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              >
                <option value="">Select Game Captain...</option>
                {projectedOnCourt.map((id) => {
                  const player = players.find((p) => p.id === id);
                  if (!player) return null;
                  return (
                    <option key={id} value={id}>
                      #{player.jerseyNumber} {player.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading || !currentPlayer || allowedBench.length === 0}
          >
            {loading ? "Saving..." : "Confirm Substitution"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LiveScoring({
  match,
  onUpdate,
  courtSwapped,
  onSwitchCourt,
}: {
  match: Match;
  onUpdate: (m: Match) => void;
  courtSwapped: boolean;
  onSwitchCourt: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [liberoLoadingTeam, setLiberoLoadingTeam] = useState<ServingTeam | null>(null);
  const [timeoutLoadingTeam, setTimeoutLoadingTeam] = useState<ServingTeam | null>(null);
  const [timeoutModal, setTimeoutModal] = useState<{ teamName: string } | null>(null);
  const [liberoInModal, setLiberoInModal] = useState<{
    team: ServingTeam;
    teamName: string;
    options: LiberoInOption[];
  } | null>(null);
  const [liberoOutModal, setLiberoOutModal] = useState<{
    team: ServingTeam;
    teamName: string;
    libero: Player;
    player: Player;
    autoTriggered?: boolean;
  } | null>(null);
  const [subModal, setSubModal] = useState<{
    team: ServingTeam;
    teamId: string;
    teamName: string;
    players: Player[];
    rotations: Match["rotations"];
    substitutions: Substitution[];
    gameCaptainId: string | null;
    setLiberoIds: string[];
    side: "left" | "right";
    color: "blue" | "teal";
    serving: boolean;
  } | null>(null);
  const summary = getMatchSummary(match);
  const homeScore = summary.currentSet?.homeScore ?? 0;
  const awayScore = summary.currentSet?.awayScore ?? 0;

  async function score(team: ServingTeam) {
    const receivingTeam: ServingTeam = match.servingTeam === "home" ? "away" : "home";
    const sideOut = team === receivingTeam;

    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data);
      if (sideOut) {
        openLiberoOutPrompt(data, team, true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to score");
    } finally {
      setLoading(false);
    }
  }

  async function addNextSet() {
    if (!confirm(`End Set ${match.currentSet} and start Set ${match.currentSet + 1}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/next-set`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add next set");
    } finally {
      setLoading(false);
    }
  }

  async function finishMatch() {
    if (!confirm("End this match?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/end`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end match");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSubstitution(
    position: number,
    playerInId: string,
    gameCaptainId: string | null
  ) {
    if (!subModal) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/substitute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: subModal.team,
          position,
          playerInId,
          gameCaptainId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubModal(null);
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to substitute");
    } finally {
      setLoading(false);
    }
  }

  function openSubstitution(
    team: ServingTeam,
    teamId: string,
    teamName: string,
    players: Player[],
    gameCaptainId: string | null,
    setLiberoIds: string[],
    side: "left" | "right",
    color: "blue" | "teal",
    serving: boolean
  ) {
    const teamRotations = match.rotations?.filter((r) => r.teamId === teamId) ?? [];
    const teamSubstitutions =
      match.substitutions?.filter(
        (s) => s.teamId === teamId && s.setNumber === match.currentSet
      ) ?? [];

    setSubModal({
      team,
      teamId,
      teamName,
      players,
      rotations: teamRotations,
      substitutions: teamSubstitutions,
      gameCaptainId,
      setLiberoIds,
      side,
      color,
      serving,
    });
  }

  async function callTeamTimeout(team: ServingTeam, teamName: string) {
    setTimeoutLoadingTeam(team);
    try {
      const res = await fetch(`/api/matches/${match.id}/timeout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data);
      setTimeoutModal({ teamName });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to call timeout");
    } finally {
      setTimeoutLoadingTeam(null);
    }
  }

  function openLiberoIn(
    team: ServingTeam,
    teamId: string,
    teamName: string,
    players: Player[],
    setLiberoIds: string[]
  ) {
    const teamRotations = match.rotations?.filter((r) => r.teamId === teamId) ?? [];
    const onCourtIds = teamRotations.map((r) => r.playerId);
    const benchLiberos = setLiberoIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => !!p && !onCourtIds.includes(p.id));
    const options = getLiberoInOptions(teamRotations, benchLiberos);
    if (options.length === 0) return;
    setLiberoInModal({ team, teamName, options });
  }

  function openLiberoOutPrompt(updatedMatch: Match, team: ServingTeam, autoTriggered = false) {
    const teamId = team === "home" ? updatedMatch.homeTeamId : updatedMatch.awayTeamId;
    const teamName =
      team === "home" ? updatedMatch.homeTeam?.name ?? "Home" : updatedMatch.awayTeam?.name ?? "Away";
    const players =
      team === "home"
        ? updatedMatch.homeTeam?.players ?? []
        : updatedMatch.awayTeam?.players ?? [];
    const currentSet = updatedMatch.sets?.find((s) => s.setNumber === updatedMatch.currentSet);
    const setLiberoIds =
      team === "home" ? currentSet?.homeLiberoIds ?? [] : currentSet?.awayLiberoIds ?? [];
    const teamRotations = updatedMatch.rotations?.filter((r) => r.teamId === teamId) ?? [];
    const playerAtP4Id = teamRotations.find((r) => r.position === LIBERO_OUT_POSITION)?.playerId;
    const teamLiberoReplacements =
      updatedMatch.liberoReplacements?.filter(
        (r) => r.teamId === teamId && r.setNumber === updatedMatch.currentSet
      ) ?? [];
    const prompt = getLiberoOutPrompt(
      playerAtP4Id,
      setLiberoIds,
      players,
      teamLiberoReplacements
    );
    if (!prompt) return;
    setLiberoOutModal({ team, teamName, ...prompt, autoTriggered });
  }

  async function confirmLiberoIn(team: ServingTeam, position: number, liberoId: string) {
    setLiberoLoadingTeam(team);
    try {
      const res = await fetch(`/api/matches/${match.id}/libero-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, liberoId, position }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLiberoInModal(null);
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed libero in");
    } finally {
      setLiberoLoadingTeam(null);
    }
  }

  async function confirmLiberoOut() {
    if (!liberoOutModal) return;
    const team = liberoOutModal.team;
    setLiberoLoadingTeam(team);
    try {
      const res = await fetch(`/api/matches/${match.id}/libero-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLiberoOutModal(null);
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed libero out");
    } finally {
      setLiberoLoadingTeam(null);
    }
  }

  if (match.status === "completed") {
    return (
      <Card className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Match Complete</h2>
        <p className="mt-2 text-4xl font-bold text-orange-600">
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

  if (match.status === "setup") {
    return (
      <RotationSetup
        match={match}
        onComplete={onUpdate}
        courtSwapped={courtSwapped}
        onSwitchCourt={onSwitchCourt}
      />
    );
  }

  const courtTeams = courtSwapped
    ? ([
        {
          team: "away" as const,
          side: "left" as const,
          teamId: match.awayTeamId,
          teamName: match.awayTeam?.name ?? "Away",
          color: "teal" as const,
          serving: match.servingTeam === "away",
        },
        {
          team: "home" as const,
          side: "right" as const,
          teamId: match.homeTeamId,
          teamName: match.homeTeam?.name ?? "Home",
          color: "blue" as const,
          serving: match.servingTeam === "home",
        },
      ] as const)
    : ([
        {
          team: "home" as const,
          side: "left" as const,
          teamId: match.homeTeamId,
          teamName: match.homeTeam?.name ?? "Home",
          color: "blue" as const,
          serving: match.servingTeam === "home",
        },
        {
          team: "away" as const,
          side: "right" as const,
          teamId: match.awayTeamId,
          teamName: match.awayTeam?.name ?? "Away",
          color: "teal" as const,
          serving: match.servingTeam === "away",
        },
      ] as const);

  const currentSetRow = summary.currentSet;

  return (
    <div className="space-y-6">
      {timeoutModal && (
        <TimeoutTimerModal
          teamName={timeoutModal.teamName}
          onClose={() => setTimeoutModal(null)}
        />
      )}
      {liberoInModal && (
        <LiberoInModal
          teamName={liberoInModal.teamName}
          options={liberoInModal.options}
          onClose={() => setLiberoInModal(null)}
          onConfirm={(position, liberoId) =>
            confirmLiberoIn(liberoInModal.team, position, liberoId)
          }
          loading={liberoLoadingTeam === liberoInModal.team}
        />
      )}
      {liberoOutModal && (
        <LiberoOutModal
          teamName={liberoOutModal.teamName}
          libero={liberoOutModal.libero}
          player={liberoOutModal.player}
          autoTriggered={liberoOutModal.autoTriggered}
          onClose={() => setLiberoOutModal(null)}
          onConfirm={confirmLiberoOut}
          loading={liberoLoadingTeam === liberoOutModal.team}
        />
      )}
      {subModal && (
        <SubstitutionModal
          teamName={subModal.teamName}
          rotations={subModal.rotations}
          players={subModal.players}
          substitutions={subModal.substitutions}
          currentGameCaptainId={subModal.gameCaptainId}
          setLiberoIds={subModal.setLiberoIds}
          side={subModal.side}
          color={subModal.color}
          serving={subModal.serving}
          onClose={() => setSubModal(null)}
          onConfirm={confirmSubstitution}
          loading={loading}
        />
      )}
      <Card>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">Set {match.currentSet}</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">{match.homeTeam?.name}</p>
              <p className="text-6xl font-bold text-blue-600">{homeScore}</p>
              <p className="text-sm text-slate-500">Sets won: {summary.homeSets}</p>
            </div>
            <span className="text-3xl font-light text-slate-300">:</span>
            <div className="text-center">
              <p className="text-sm font-medium text-teal-700">{match.awayTeam?.name}</p>
              <p className="text-6xl font-bold text-teal-600">{awayScore}</p>
              <p className="text-sm text-slate-500">Sets won: {summary.awaySets}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Button
          variant="score-home"
          className="w-full"
          disabled={loading}
          onClick={() => score("home")}
        >
          +1 {match.homeTeam?.name}
        </Button>
        <Button
          variant="score-away"
          className="w-full"
          disabled={loading}
          onClick={() => score("away")}
        >
          +1 {match.awayTeam?.name}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={loading} onClick={addNextSet}>
          End Set
        </Button>
        <Button variant="secondary" disabled={loading} onClick={finishMatch}>
          End Match
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {courtTeams.map(({ team, teamId, teamName, color, side, serving }) => {
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
            match.timeouts?.filter(
              (t) => t.teamId === teamId && t.setNumber === match.currentSet
            ) ?? [];
          const teamLiberoReplacements =
            match.liberoReplacements?.filter(
              (r) => r.teamId === teamId && r.setNumber === match.currentSet
            ) ?? [];

          return (
            <CourtRotation
              key={teamId}
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
              liberoLoading={liberoLoadingTeam === team}
              timeoutLoading={timeoutLoadingTeam === team}
              onLiberoIn={() => openLiberoIn(team, teamId, teamName, players, setLiberoIds)}
              onLiberoOut={() => openLiberoOutPrompt(match, team)}
              onTimeout={() => callTeamTimeout(team, teamName)}
              onOpenSubstitute={() =>
                openSubstitution(
                  team,
                  teamId,
                  teamName,
                  players,
                  gameCaptainId,
                  setLiberoIds,
                  side,
                  color,
                  serving
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function getCourtSwappedForMatch(m: Match): boolean {
  return m.sets?.find((s) => s.setNumber === m.currentSet)?.courtSwapped ?? false;
}

export default function MatchScorerPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courtSwapped, setCourtSwapped] = useState(false);

  const applyMatch = useCallback((m: Match) => {
    setMatch(m);
    setCourtSwapped(getCourtSwappedForMatch(m));
  }, []);

  const handleSwitchCourt = useCallback(async () => {
    const next = !courtSwapped;
    try {
      const res = await fetch(`/api/matches/${matchId}/court`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtSwapped: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyMatch(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to switch court");
    }
  }, [matchId, courtSwapped, applyMatch]);

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
          <Link href="/scorer" className="mt-4 inline-block text-orange-600 hover:underline">
            ← Back to matches
          </Link>
        </main>
      </>
    );
  }

  const needsRotation = match.status === "scheduled" || match.status === "setup";
  const when = formatMatchDateTime(match.scheduledAt);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
        <div className="mb-6">
          <Link href="/scorer" className="text-sm text-slate-500 hover:text-slate-700">
            ← All matches
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {match.homeTeam?.name} vs {match.awayTeam?.name}
          </h1>
          {(when || match.location) && (
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              {when && <p>{when}</p>}
              {match.location && (
                <p>
                  {match.location.name}
                  {match.location.address ? ` · ${match.location.address}` : ""}
                </p>
              )}
            </div>
          )}
          <div className="mt-2 text-center">
            <CurrentTimeClock />
            <SetHistory match={match} />
          </div>
        </div>

        {needsRotation && match.status === "scheduled" ? (
          <RotationSetup
            match={match}
            onComplete={applyMatch}
            courtSwapped={courtSwapped}
            onSwitchCourt={handleSwitchCourt}
          />
        ) : (
          <LiveScoring
            match={match}
            onUpdate={applyMatch}
            courtSwapped={courtSwapped}
            onSwitchCourt={handleSwitchCourt}
          />
        )}
      </main>
    </>
  );
}
