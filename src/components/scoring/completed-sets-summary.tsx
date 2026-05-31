import { Match, formatSetDuration } from "@/lib/types";

export function CompletedSetsSummary({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const completedSets = match.sets?.filter((s) => s.status === "completed") ?? [];
  if (completedSets.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-1 flex flex-wrap justify-center gap-1">
        {completedSets.map((s) => {
          const duration = formatSetDuration(s.startedAt, s.endedAt);
          return (
            <span
              key={s.id}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              title={duration ?? undefined}
            >
              Set {s.setNumber}: {s.homeScore}–{s.awayScore}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-4 text-center">
      <h3 className="mb-2 text-sm font-medium text-slate-500">Completed Sets</h3>
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
