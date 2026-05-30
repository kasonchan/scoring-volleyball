"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { CurrentTimeClock } from "@/components/CurrentTimeClock";
import { Badge, Button, Card } from "@/components/ui";
import { Match, Player, ServingTeam, formatMatchDateTime, getMatchSummary } from "@/lib/types";

const LEFT_COURT_POSITIONS = [5, 4, 6, 3, 1, 2] as const;
const RIGHT_COURT_POSITIONS = [2, 1, 3, 6, 4, 5] as const;

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
  const [servingTeam, setServingTeam] = useState<ServingTeam>("home");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setPlayer(
    team: "home" | "away",
    position: number,
    playerId: string
  ) {
    const setter = team === "home" ? setHomeRotation : setAwayRotation;
    const rotation = team === "home" ? homeRotation : awayRotation;
    const updated = [...rotation];
    updated[position] = playerId;
    setter(updated);
  }

  async function handleSubmit() {
    if (homeRotation.some((p) => !p) || awayRotation.some((p) => !p)) {
      setError("Select a player for all 6 positions on each team");
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
    color: "blue" | "teal"
  ) {
    const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-teal-50 border-teal-200";
    const accent = color === "blue" ? "text-blue-700" : "text-teal-700";
    const positions = side === "left" ? LEFT_COURT_POSITIONS : RIGHT_COURT_POSITIONS;

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
          return renderTeamRotation(
            team,
            isHome ? match.homeTeam?.name ?? "Home" : match.awayTeam?.name ?? "Away",
            isHome ? match.homeTeam?.players ?? [] : match.awayTeam?.players ?? [],
            isHome ? homeRotation : awayRotation,
            side,
            isHome ? "blue" : "teal"
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button className="mt-6 w-full sm:w-auto" onClick={handleSubmit} disabled={loading}>
        {loading ? "Starting..." : "Start Scoring"}
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
        {completedSets.map((s) => (
          <div key={s.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            Set {s.setNumber}: {s.homeScore} – {s.awayScore}
          </div>
        ))}
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
}: {
  teamName: string;
  rotations: Match["rotations"];
  serving: boolean;
  color: "blue" | "teal";
  side: "left" | "right";
}) {
  const teamRotations = rotations?.slice().sort((a, b) => a.position - b.position) ?? [];
  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-teal-50 border-teal-200";
  const accent = color === "blue" ? "text-blue-700" : "text-teal-700";
  const positions = side === "left" ? LEFT_COURT_POSITIONS : RIGHT_COURT_POSITIONS;

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-semibold ${accent}`}>{teamName}</h3>
        {serving && <Badge color="orange">Serving</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {positions.map((pos) => {
          const entry = teamRotations.find((r) => r.position === pos);
          const isServer = pos === 1 && serving;
          return (
            <div
              key={pos}
              className={`rounded-lg bg-white p-2 shadow-sm ${isServer ? "ring-2 ring-orange-400" : ""}`}
            >
              <div className="text-xs text-slate-400">P{pos}</div>
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
  const summary = getMatchSummary(match);
  const homeScore = summary.currentSet?.homeScore ?? 0;
  const awayScore = summary.currentSet?.awayScore ?? 0;

  async function score(team: ServingTeam) {
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

  return (
    <div className="space-y-6">
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
          Add Next Set
        </Button>
        <Button variant="secondary" disabled={loading} onClick={finishMatch}>
          End Match
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {courtTeams.map(({ teamId, teamName, color, side, serving }) => (
          <CourtRotation
            key={teamId}
            teamName={teamName}
            rotations={match.rotations?.filter((r) => r.teamId === teamId)}
            serving={serving}
            color={color}
            side={side}
          />
        ))}
      </div>
    </div>
  );
}

export default function MatchScorerPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courtSwapped, setCourtSwapped] = useState(false);

  const loadMatch = useCallback(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Match not found");
        return r.json();
      })
      .then(setMatch)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchId]);

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
            onComplete={setMatch}
            courtSwapped={courtSwapped}
            onSwitchCourt={() => setCourtSwapped((s) => !s)}
          />
        ) : (
          <LiveScoring
            match={match}
            onUpdate={setMatch}
            courtSwapped={courtSwapped}
            onSwitchCourt={() => setCourtSwapped((s) => !s)}
          />
        )}
      </main>
    </>
  );
}
