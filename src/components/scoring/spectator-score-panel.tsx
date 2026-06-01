import { Card } from "@/components/ui";
import { needsRallyStart as matchNeedsRallyStart } from "@/lib/rally";
import { Match, formatRallyTime, getMatchSummary } from "@/lib/types";

/** Read-only scoreboard matching the scorer live scoring panel (without action buttons). */
export function SpectatorScorePanel({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const summary = getMatchSummary(match);
  const homeScore = summary.currentSet?.homeScore ?? 0;
  const awayScore = summary.currentSet?.awayScore ?? 0;
  const rallies = match.rallies ?? [];
  const latestRally = rallies.length > 0 ? rallies[rallies.length - 1] : null;
  const needsRallyStart = matchNeedsRallyStart(rallies, homeScore, awayScore);

  return (
    <Card className={compact ? "!p-4" : undefined}>
      <div className="text-center">
        <p
          className={
            compact
              ? "text-xs font-medium uppercase tracking-wide text-slate-500"
              : "text-sm font-medium text-slate-500"
          }
        >
          Set {match.currentSet}
        </p>
        <div
          className={`flex items-center justify-center ${compact ? "mt-2 gap-4" : "mt-4 gap-6"}`}
        >
          <div className="min-w-0 text-center">
            <p
              className={`truncate font-medium text-blue-700 ${compact ? "text-xs" : "text-sm"}`}
            >
              {match.homeTeam?.name}
            </p>
            <p
              className={`font-bold leading-none text-blue-600 ${compact ? "text-4xl" : "text-6xl"}`}
            >
              {homeScore}
            </p>
            <p className={`text-slate-500 ${compact ? "mt-0.5 text-xs" : "text-sm"}`}>
              {compact ? `Sets ${summary.homeSets}` : `Sets won: ${summary.homeSets}`}
            </p>
          </div>
          <span className={`font-light text-slate-300 ${compact ? "text-2xl" : "text-3xl"}`}>
            :
          </span>
          <div className="min-w-0 text-center">
            <p
              className={`truncate font-medium text-teal-700 ${compact ? "text-xs" : "text-sm"}`}
            >
              {match.awayTeam?.name}
            </p>
            <p
              className={`font-bold leading-none text-teal-600 ${compact ? "text-4xl" : "text-6xl"}`}
            >
              {awayScore}
            </p>
            <p className={`text-slate-500 ${compact ? "mt-0.5 text-xs" : "text-sm"}`}>
              {compact ? `Sets ${summary.awaySets}` : `Sets won: ${summary.awaySets}`}
            </p>
          </div>
        </div>
        {needsRallyStart ? (
          <p
            className={`rounded-lg bg-amber-50 font-medium text-amber-900 ${
              compact ? "mt-2 px-2 py-1.5 text-xs" : "mt-3 px-3 py-2 text-sm"
            }`}
          >
            {rallies.length === 0 ? "Waiting for rally start" : "Between rallies"}
          </p>
        ) : latestRally ? (
          <p className={`text-slate-600 ${compact ? "mt-2 text-xs" : "mt-3 text-sm"}`}>
            Rally {rallies.length}
            {compact ? " · " : " in play · started "}
            {formatRallyTime(latestRally.createdAt)}
            {compact ? " · " : " at "}
            {latestRally.homeScore}–{latestRally.awayScore}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
