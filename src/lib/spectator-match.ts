import type { Match, Player } from "@/lib/types";

function redactPlayer(player: Player): Player {
  return {
    ...player,
    /** Cleared for display; court UI shows jersey from jerseyNumber. */
    name: "",
  };
}

function redactOptionalPlayer(player: Player | undefined): Player | undefined {
  return player ? redactPlayer(player) : undefined;
}

/** Strip player names for anonymous / link-only spectator views (keep jersey numbers). */
export function redactMatchForSpectator(match: Match): Match {
  return {
    ...match,
    homeTeam: match.homeTeam
      ? {
          ...match.homeTeam,
          players: match.homeTeam.players?.map(redactPlayer),
        }
      : undefined,
    awayTeam: match.awayTeam
      ? {
          ...match.awayTeam,
          players: match.awayTeam.players?.map(redactPlayer),
        }
      : undefined,
    rotations: match.rotations?.map((r) => ({
      ...r,
      player: redactOptionalPlayer(r.player),
    })),
    substitutions: match.substitutions?.map((s) => ({
      ...s,
      playerIn: redactOptionalPlayer(s.playerIn),
      playerOut: redactOptionalPlayer(s.playerOut),
    })),
    liberoReplacements: match.liberoReplacements?.map((r) => ({
      ...r,
      libero: redactOptionalPlayer(r.libero),
      player: redactOptionalPlayer(r.player),
    })),
  };
}

export function applySpectatorMatchView(match: Match, redacted: boolean): Match {
  return redacted ? redactMatchForSpectator(match) : match;
}
