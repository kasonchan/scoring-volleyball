import { Badge, Button } from "@/components/ui";
import { getCaptainLabel, needsGameCaptainAssignment } from "@/lib/captains";
import { LEFT_COURT_POSITIONS, RIGHT_COURT_POSITIONS } from "@/lib/court-layout";
import {
  getLiberoInOptions,
  isLiberoOnCourt,
  isLiberoPlayer,
  liberoInPositionLabel,
} from "@/lib/libero";
import {
  LiberoReplacement,
  Match,
  MAX_TIMEOUTS_PER_SET,
  Player,
  PLAYER_ROLE_LABELS,
  Substitution,
  Timeout,
} from "@/lib/types";

export function TeamRosterList({
  players,
  color,
  onCourtPositionByPlayerId,
  gameCaptainId = null,
  setLiberoIds = [],
  compact = false,
}: {
  players: Player[];
  color: "blue" | "teal";
  onCourtPositionByPlayerId: (playerId: string) => number | null;
  gameCaptainId?: string | null;
  setLiberoIds?: string[];
  compact?: boolean;
}) {
  return (
    <div className={`border-t border-white/70 ${compact ? "mt-3 pt-3" : "mt-4 pt-4"}`}>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Roster</h4>
      {players.length === 0 ? (
        <p className="text-sm text-slate-500">No players on roster.</p>
      ) : (
        <div className={`space-y-1 ${compact ? "max-h-52 overflow-y-auto pr-1" : ""}`}>
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
                  className={`flex items-center gap-2 rounded-lg px-2 ${
                    compact ? "py-1 text-xs" : "py-1.5 text-sm"
                  } ${onCourt ? "bg-white font-medium text-slate-900" : "text-slate-600"}`}
                >
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
                      compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs"
                    } ${color === "blue" ? "bg-blue-500" : "bg-teal-500"}`}
                  >
                    {p.jerseyNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {!compact && p.role && (
                    <span className="hidden shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-600 sm:inline">
                      {PLAYER_ROLE_LABELS[p.role]}
                    </span>
                  )}
                  {captainLabel && (
                    <span
                      className={`shrink-0 rounded-full bg-amber-100 font-medium text-amber-800 ${
                        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
                      }`}
                    >
                      {compact
                        ? captainLabel === "Team Captain"
                          ? "TC"
                          : "GC"
                        : captainLabel}
                    </span>
                  )}
                  {isSetLibero && (
                    <span
                      className={`shrink-0 rounded-full bg-violet-100 font-medium text-violet-800 ${
                        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
                      }`}
                    >
                      {compact ? "L" : "Libero"}
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

function ReadOnlyActionBadges({
  liberoInCount,
  timeoutCount,
  substitutionCount,
}: {
  liberoInCount: number;
  timeoutCount: number;
  substitutionCount: number;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <span className="rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        Libero ({liberoInCount})
      </span>
      <span className="rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        TO ({timeoutCount}/{MAX_TIMEOUTS_PER_SET})
      </span>
      <span className="rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        Sub ({substitutionCount})
      </span>
    </div>
  );
}

export function CourtPanel({
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
  onTimeout,
  timeoutLoading,
  liberoLoading,
  rallyInProgress,
  compact = false,
  readOnly = false,
  showRoster = true,
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
  onTimeout?: () => void;
  timeoutLoading?: boolean;
  liberoLoading?: boolean;
  rallyInProgress: boolean;
  compact?: boolean;
  readOnly?: boolean;
  showRoster?: boolean;
}) {
  const teamRotations = rotations?.slice().sort((a, b) => a.position - b.position) ?? [];
  const onCourtPlayerIds = teamRotations.map((r) => r.playerId);
  const benchLiberos = setLiberoIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p && !onCourtPlayerIds.includes(p.id));
  const liberoInOptions = getLiberoInOptions(
    teamRotations,
    benchLiberos,
    setLiberoIds,
    liberoReplacements,
    players,
    serving
  );
  const liberoInCount = liberoReplacements.filter((r) => r.eventType === "in").length;
  const liberoOnCourt = isLiberoOnCourt(teamRotations, setLiberoIds);
  const liberoInTitle = rallyInProgress
    ? "Libero changes allowed between rallies only"
    : liberoOnCourt && liberoInOptions.length === 0
      ? "No bench libero or original replaced player available"
      : liberoOnCourt
        ? "Switch bench libero or restore the original replaced player"
        : setLiberoIds.length === 0 || benchLiberos.length === 0
          ? "Assign liberos and keep one on the bench"
          : serving
            ? `Libero in at ${liberoInPositionLabel(true)} only (not P1 while serving)`
            : `Libero in at ${liberoInPositionLabel(false)} only`;
  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-teal-50 border-teal-200";
  const accent = color === "blue" ? "text-blue-700" : "text-teal-700";
  const positions = side === "left" ? LEFT_COURT_POSITIONS : RIGHT_COURT_POSITIONS;

  return (
    <div className={`rounded-xl border ${compact ? "p-3" : "p-4"} ${bg}`}>
      <div className={`flex items-center justify-between gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <h3 className={`font-semibold ${compact ? "text-sm" : ""} ${accent}`}>{teamName}</h3>
        {serving && <Badge color="orange">Serving</Badge>}
      </div>
      <div
        className={`grid grid-cols-2 text-center ${compact ? "gap-1.5 text-xs" : "gap-2 text-sm"}`}
      >
        {positions.map((pos) => {
          const entry = teamRotations.find((r) => r.position === pos);
          const isServer = pos === 1 && serving;
          const captainLabel = entry?.player
            ? getCaptainLabel(players, entry.player.id, gameCaptainId)
            : null;
          const isActiveLibero =
            !!entry?.player &&
            isLiberoPlayer(entry.player, setLiberoIds) &&
            onCourtPlayerIds.includes(entry.player.id);
          return (
            <div
              key={pos}
              className={`rounded-lg bg-white shadow-sm ${compact ? "p-1.5" : "p-2"} ${isServer ? "ring-2 ring-orange-400" : ""}`}
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
              <div className="truncate text-xs text-slate-600">{entry?.player?.name ?? ""}</div>
            </div>
          );
        })}
      </div>
      {!needsGameCaptainAssignment(players, onCourtPlayerIds, gameCaptainId) ? null : (
        <p
          className={`rounded-lg border border-amber-200 bg-amber-50 text-amber-900 ${
            compact ? "mt-2 px-2 py-1 text-[10px] leading-snug" : "mt-3 px-3 py-2 text-xs"
          }`}
        >
          No Team Captain or Game Captain on court. Substitute to assign a Game Captain.
        </p>
      )}
      {readOnly ? (
        <ReadOnlyActionBadges
          liberoInCount={liberoInCount}
          timeoutCount={timeouts.length}
          substitutionCount={substitutions.length}
        />
      ) : (
        (onTimeout || onOpenSubstitute || onLiberoIn) && (
          <div className={`flex flex-wrap ${compact ? "mt-2 gap-1" : "mt-3 gap-2"}`}>
            {onLiberoIn && (
              <Button
                variant="secondary"
                type="button"
                onClick={onLiberoIn}
                disabled={
                  rallyInProgress ||
                  liberoLoading ||
                  setLiberoIds.length === 0 ||
                  liberoInOptions.length === 0
                }
                className={compact ? "!px-2 !py-1 text-[10px]" : "text-xs"}
                title={liberoInTitle}
              >
                {compact ? `Libero (${liberoInCount})` : `Libero In (${liberoInCount})`}
              </Button>
            )}
            {onTimeout && (
              <Button
                variant="secondary"
                type="button"
                onClick={onTimeout}
                disabled={
                  rallyInProgress || timeoutLoading || timeouts.length >= MAX_TIMEOUTS_PER_SET
                }
                className={compact ? "!px-2 !py-1 text-[10px]" : "text-xs"}
                title={
                  rallyInProgress
                    ? "Timeouts allowed between rallies only"
                    : `Timeouts this set (max ${MAX_TIMEOUTS_PER_SET})`
                }
              >
                {compact ? `TO (${timeouts.length})` : `Timeout (${timeouts.length})`}
              </Button>
            )}
            {onOpenSubstitute && (
              <Button
                variant="secondary"
                type="button"
                onClick={onOpenSubstitute}
                disabled={rallyInProgress}
                className={compact ? "!px-2 !py-1 text-[10px]" : "text-xs"}
                title={
                  rallyInProgress
                    ? "Substitutions allowed between rallies only"
                    : "Substitutions this set"
                }
              >
                {compact ? `Sub (${substitutions.length})` : `Substitute (${substitutions.length})`}
              </Button>
            )}
          </div>
        )
      )}
      {showRoster && (
        <TeamRosterList
          players={players}
          color={color}
          gameCaptainId={gameCaptainId}
          setLiberoIds={setLiberoIds}
          compact={compact}
          onCourtPositionByPlayerId={(playerId) => {
            const entry = teamRotations.find((r) => r.playerId === playerId);
            return entry?.position ?? null;
          }}
        />
      )}
    </div>
  );
}

/** @deprecated Use CourtPanel */
export const CourtRotation = CourtPanel;
