import { playerOptionLabel } from "@/lib/player-display";
import {
  LiberoReplacement,
  Player,
  Rally,
  ScoreEvent,
  Substitution,
  Timeout,
  formatRallyTime,
} from "./types";

function historyPlayerLabel(player: Player | undefined): string {
  return player ? playerOptionLabel(player) : "—";
}

export type SetHistoryEventKind =
  | "rally_start"
  | "point"
  | "substitution"
  | "timeout"
  | "libero_in"
  | "libero_out";

export interface SetHistoryEvent {
  id: string;
  kind: SetHistoryEventKind;
  createdAt: string;
  teamId: string | null;
  summary: string;
  homeScore?: number;
  awayScore?: number;
}

const KIND_LABELS: Record<SetHistoryEventKind, string> = {
  rally_start: "Rally",
  point: "Point",
  substitution: "Sub",
  timeout: "Timeout",
  libero_in: "Libero In",
  libero_out: "Libero Out",
};

export function getSetHistoryKindLabel(kind: SetHistoryEventKind): string {
  return KIND_LABELS[kind];
}

export function buildSetHistoryEvents(input: {
  rallies: Rally[];
  scoreEvents: ScoreEvent[];
  substitutions: Substitution[];
  timeouts: Timeout[];
  liberoReplacements: LiberoReplacement[];
  homeTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}): SetHistoryEvent[] {
  const events: SetHistoryEvent[] = [];

  for (const rally of input.rallies) {
    events.push({
      id: rally.id,
      kind: "rally_start",
      createdAt: rally.createdAt,
      teamId: null,
      homeScore: rally.homeScore,
      awayScore: rally.awayScore,
      summary: "Rally started",
    });
  }

  for (const point of input.scoreEvents) {
    events.push({
      id: point.id,
      kind: "point",
      createdAt: point.createdAt,
      teamId: point.teamId,
      homeScore: point.homeScore,
      awayScore: point.awayScore,
      summary: point.sideOut ? "+1 · side-out" : "+1",
    });
  }

  for (const sub of input.substitutions) {
    events.push({
      id: sub.id,
      kind: "substitution",
      createdAt: sub.createdAt,
      teamId: sub.teamId,
      summary: `P${sub.position}: ${historyPlayerLabel(sub.playerOut)} → ${historyPlayerLabel(sub.playerIn)}`,
    });
  }

  for (const timeout of input.timeouts) {
    events.push({
      id: timeout.id,
      kind: "timeout",
      createdAt: timeout.createdAt,
      teamId: timeout.teamId,
      summary: "Team timeout",
    });
  }

  for (const entry of input.liberoReplacements) {
    events.push({
      id: entry.id,
      kind: entry.eventType === "in" ? "libero_in" : "libero_out",
      createdAt: entry.createdAt,
      teamId: entry.teamId,
      summary: `P${entry.position}: ${historyPlayerLabel(entry.libero)} ↔ ${historyPlayerLabel(entry.player)}`,
    });
  }

  return events.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function filterSetHistoryForTeam(
  events: SetHistoryEvent[],
  teamId: string
): SetHistoryEvent[] {
  return events.filter(
    (event) =>
      event.teamId === null || event.teamId === teamId
  );
}

export function formatSetHistoryTime(iso: string): string {
  return formatRallyTime(iso);
}
