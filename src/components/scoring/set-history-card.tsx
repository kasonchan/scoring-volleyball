import { Card } from "@/components/ui";
import {
  buildSetHistoryEvents,
  formatSetHistoryTime,
  getSetHistoryKindLabel,
  type SetHistoryEvent,
  type SetHistoryEventKind,
} from "@/lib/set-history";
import {
  LiberoReplacement,
  Rally,
  ScoreEvent,
  Substitution,
  Timeout,
} from "@/lib/types";

const SET_HISTORY_KIND_COLORS: Record<SetHistoryEventKind, string> = {
  rally_start: "bg-slate-100 text-slate-700",
  point: "bg-emerald-100 text-emerald-800",
  substitution: "bg-amber-100 text-amber-800",
  timeout: "bg-orange-100 text-orange-800",
  libero_in: "bg-violet-100 text-violet-800",
  libero_out: "bg-violet-50 text-violet-700",
};

function SetHistorySideScore({
  score,
  highlight,
}: {
  score: number;
  highlight?: boolean;
}) {
  return (
    <span
      className={`shrink-0 tabular-nums text-base leading-none ${
        highlight ? "font-bold text-emerald-700" : "font-semibold text-slate-500"
      }`}
    >
      {score}
    </span>
  );
}

function getSideScores(
  event: SetHistoryEvent,
  leftTeamId: string,
  homeTeamId: string
): { left: number; right: number } | null {
  if (event.homeScore == null || event.awayScore == null) return null;
  const leftIsHome = leftTeamId === homeTeamId;
  return {
    left: leftIsHome ? event.homeScore : event.awayScore,
    right: leftIsHome ? event.awayScore : event.homeScore,
  };
}

function SetHistoryEventBubble({ event }: { event: SetHistoryEvent }) {
  return (
    <div className="inline-flex max-w-full flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 shadow-sm">
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${SET_HISTORY_KIND_COLORS[event.kind]}`}
      >
        {getSetHistoryKindLabel(event.kind)}
      </span>
      <span className="leading-snug">{event.summary}</span>
    </div>
  );
}

export function SetHistoryCard({
  setNumber,
  leftTeamId,
  rightTeamId,
  leftTeamName,
  rightTeamName,
  homeTeamId,
  homeTeamName,
  awayTeamName,
  rallies,
  scoreEvents,
  substitutions,
  timeouts,
  liberoReplacements,
  compact = false,
}: {
  setNumber: number;
  leftTeamId: string;
  rightTeamId: string;
  leftTeamName: string;
  rightTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  rallies: Rally[];
  scoreEvents: ScoreEvent[];
  substitutions: Substitution[];
  timeouts: Timeout[];
  liberoReplacements: LiberoReplacement[];
  compact?: boolean;
}) {
  const events = buildSetHistoryEvents({
    rallies,
    scoreEvents,
    substitutions,
    timeouts,
    liberoReplacements,
    homeTeamId,
    homeTeamName,
    awayTeamName,
  });

  if (events.length === 0) return null;

  return (
    <Card className={compact ? "!p-4" : undefined}>
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 ${compact ? "mb-2" : "mb-3"}`}
      >
        <div className="truncate pr-1 text-left text-xs font-semibold text-slate-700 sm:text-sm">
          {leftTeamName}
        </div>
        <h3 className="whitespace-nowrap px-1 text-center text-sm font-medium text-slate-500">
          Set History — Set {setNumber}
        </h3>
        <div className="truncate pl-1 text-right text-xs font-semibold text-slate-700 sm:text-sm">
          {rightTeamName}
        </div>
      </div>
      <div
        className={
          compact ? "max-h-64 space-y-2 overflow-y-auto" : "max-h-72 space-y-2 overflow-y-auto"
        }
      >
        {events.map((event) => {
          const onLeft = event.teamId === leftTeamId;
          const onRight = event.teamId === rightTeamId;
          const isNeutral = event.teamId === null;
          const sideScores = getSideScores(event, leftTeamId, homeTeamId);

          return (
            <div
              key={event.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
            >
              <div className="flex w-full min-w-0 items-center justify-end gap-2 pr-1">
                {onLeft && (
                  <div className="min-w-0 shrink-0">
                    <SetHistoryEventBubble event={event} />
                  </div>
                )}
                {sideScores && (
                  <SetHistorySideScore
                    score={sideScores.left}
                    highlight={onLeft && event.kind === "point"}
                  />
                )}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1 px-1">
                <span className="whitespace-nowrap tabular-nums text-left text-xs font-medium text-slate-500">
                  {formatSetHistoryTime(event.createdAt)}
                </span>
                {isNeutral && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-left text-[10px] font-medium uppercase ${SET_HISTORY_KIND_COLORS[event.kind]}`}
                  >
                    {getSetHistoryKindLabel(event.kind)}
                  </span>
                )}
                {isNeutral && (
                  <span className="max-w-[8rem] text-left text-[11px] leading-snug text-slate-600">
                    {event.summary}
                  </span>
                )}
              </div>
              <div className="flex w-full min-w-0 items-center justify-start gap-2 pl-1">
                {sideScores && (
                  <SetHistorySideScore
                    score={sideScores.right}
                    highlight={onRight && event.kind === "point"}
                  />
                )}
                {onRight && (
                  <div className="min-w-0 shrink-0">
                    <SetHistoryEventBubble event={event} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
