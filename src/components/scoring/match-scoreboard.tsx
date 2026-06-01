import { Card } from "@/components/ui";
import { needsRallyStart as matchNeedsRallyStart } from "@/lib/rally";
import { Match, Rally, formatRallyTime, getMatchSummary } from "@/lib/types";

export function MatchScoreboard({
  match,
  ultraCompact = false,
  fitScreen = false,
  leftTeamName,
  rightTeamName,
  leftIsHome = true,
}: {
  match: Match;
  ultraCompact?: boolean;
  fitScreen?: boolean;
  leftTeamName?: string;
  rightTeamName?: string;
  leftIsHome?: boolean;
}) {
  const summary = getMatchSummary(match);
  const homeScore = summary.currentSet?.homeScore ?? 0;
  const awayScore = summary.currentSet?.awayScore ?? 0;
  const leftScore = leftIsHome ? homeScore : awayScore;
  const rightScore = leftIsHome ? awayScore : homeScore;
  const leftSets = leftIsHome ? summary.homeSets : summary.awaySets;
  const rightSets = leftIsHome ? summary.awaySets : summary.homeSets;
  const leftName = leftTeamName ?? (leftIsHome ? match.homeTeam?.name : match.awayTeam?.name);
  const rightName = rightTeamName ?? (leftIsHome ? match.awayTeam?.name : match.homeTeam?.name);
  const leftTeamColor = leftIsHome ? "text-blue-700" : "text-teal-700";
  const rightTeamColor = leftIsHome ? "text-teal-700" : "text-blue-700";
  const leftScoreColor = leftIsHome ? "text-blue-600" : "text-teal-600";
  const rightScoreColor = leftIsHome ? "text-teal-600" : "text-blue-600";
  const rallies = match.rallies ?? [];
  const latestRally = rallies.length > 0 ? rallies[rallies.length - 1] : null;
  const needsRallyStart = matchNeedsRallyStart(rallies, homeScore, awayScore);

  if (fitScreen) {
    return (
      <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center shadow-sm">
        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
          Set {match.currentSet}
        </p>
        <div className="mt-0.5 flex items-center justify-center gap-2">
          <div className="min-w-0 text-center">
            <p className={`truncate text-[9px] font-medium ${leftTeamColor}`}>
              {leftName}
            </p>
            <p className={`text-2xl font-bold leading-none ${leftScoreColor}`}>{leftScore}</p>
            <p className="text-[8px] text-slate-500">{leftSets}</p>
          </div>
          <span className="text-lg font-light text-slate-300">:</span>
          <div className="min-w-0 text-center">
            <p className={`truncate text-[9px] font-medium ${rightTeamColor}`}>
              {rightName}
            </p>
            <p className={`text-2xl font-bold leading-none ${rightScoreColor}`}>{rightScore}</p>
            <p className="text-[8px] text-slate-500">{rightSets}</p>
          </div>
        </div>
        <p className="mt-0.5 truncate text-[8px] leading-tight text-slate-600">
          {needsRallyStart
            ? rallies.length === 0
              ? "Awaiting rally"
              : "Between rallies"
            : latestRally
              ? `R${rallies.length} · ${formatRallyTime(latestRally.createdAt)}`
              : null}
        </p>
      </div>
    );
  }

  return (
    <Card className={ultraCompact ? "!p-3" : "!p-4"}>
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Set {match.currentSet}
        </p>
        <div className={`flex items-center justify-center ${ultraCompact ? "mt-1.5 gap-3" : "mt-2 gap-4"}`}>
          <div className="min-w-0 text-center">
            <p className={`truncate font-medium ${leftTeamColor} ${ultraCompact ? "text-[11px]" : "text-xs"}`}>
              {leftName}
            </p>
            <p className={`font-bold leading-none ${leftScoreColor} ${ultraCompact ? "text-3xl" : "text-4xl"}`}>
              {leftScore}
            </p>
            <p className={`text-slate-500 ${ultraCompact ? "text-[10px]" : "text-xs"}`}>
              Sets {leftSets}
            </p>
          </div>
          <span className={`font-light text-slate-300 ${ultraCompact ? "text-xl" : "text-2xl"}`}>
            :
          </span>
          <div className="min-w-0 text-center">
            <p className={`truncate font-medium ${rightTeamColor} ${ultraCompact ? "text-[11px]" : "text-xs"}`}>
              {rightName}
            </p>
            <p className={`font-bold leading-none ${rightScoreColor} ${ultraCompact ? "text-3xl" : "text-4xl"}`}>
              {rightScore}
            </p>
            <p className={`text-slate-500 ${ultraCompact ? "text-[10px]" : "text-xs"}`}>
              Sets {rightSets}
            </p>
          </div>
        </div>
        {needsRallyStart ? (
          <p
            className={`rounded-lg bg-amber-50 font-medium text-amber-900 ${
              ultraCompact ? "mt-1.5 px-2 py-1 text-[10px]" : "mt-2 px-2 py-1.5 text-xs"
            }`}
          >
            {rallies.length === 0 ? "Waiting for rally start" : "Between rallies"}
          </p>
        ) : latestRally ? (
          <p className={`text-slate-600 ${ultraCompact ? "mt-1.5 text-[10px]" : "mt-2 text-xs"}`}>
            Rally {rallies.length} · {formatRallyTime(latestRally.createdAt)} ·{" "}
            {latestRally.homeScore}–{latestRally.awayScore}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export function getRallyState(match: Match) {
  const summary = getMatchSummary(match);
  const homeScore = summary.currentSet?.homeScore ?? 0;
  const awayScore = summary.currentSet?.awayScore ?? 0;
  const rallies: Rally[] = match.rallies ?? [];
  return {
    summary,
    homeScore,
    awayScore,
    rallies,
    needsRallyStart: matchNeedsRallyStart(rallies, homeScore, awayScore),
  };
}
