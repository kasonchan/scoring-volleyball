import { LiberoReplacement, Player } from "./types";

export const LIBERO_IN_POSITIONS = [1, 5, 6] as const;
export const LIBERO_OUT_POSITION = 4;

export function isLiberoInPosition(position: number): boolean {
  return (LIBERO_IN_POSITIONS as readonly number[]).includes(position);
}

export function isLiberoInPositionAllowed(position: number, teamServing: boolean): boolean {
  if (!isLiberoInPosition(position)) return false;
  if (teamServing && position === 1) return false;
  return true;
}

export function liberoInPositionLabel(teamServing: boolean): string {
  return teamServing ? "P5, P6" : "P1, P5, P6";
}

export function getActiveLiberoIns(replacements: LiberoReplacement[]): Map<string, string> {
  const active = new Map<string, string>();
  for (const entry of replacements) {
    if (entry.eventType === "in") {
      active.set(entry.liberoId, entry.playerId);
    } else {
      active.delete(entry.liberoId);
    }
  }
  return active;
}

export function isLiberoPlayer(player: Player, setLiberoIds: string[]): boolean {
  return player.role === "libero" || setLiberoIds.includes(player.id);
}

export function resolveLiberoReplacementPlayer(
  playerOutId: string,
  setLiberoIds: string[],
  players: Player[],
  replacements: LiberoReplacement[]
): string | null {
  const playerOut = players.find((p) => p.id === playerOutId);
  if (!playerOut || !isLiberoPlayer(playerOut, setLiberoIds)) {
    return playerOutId;
  }
  return getActiveLiberoIns(replacements).get(playerOutId) ?? null;
}

export interface LiberoInOption {
  position: number;
  player: Player;
  eligiblePlayersIn: Player[];
}

export function getEligiblePlayersWhenLiberoOnCourt(
  onCourtLibero: Player,
  replacements: LiberoReplacement[],
  benchLiberos: Player[],
  onCourtIds: Set<string>,
  players: Player[]
): Player[] {
  const active = getActiveLiberoIns(replacements);
  const replacedPlayerId = active.get(onCourtLibero.id);
  const eligible: Player[] = [];
  const seen = new Set<string>();

  const add = (player: Player | undefined) => {
    if (player && !onCourtIds.has(player.id) && !seen.has(player.id)) {
      eligible.push(player);
      seen.add(player.id);
    }
  };

  for (const libero of benchLiberos) {
    add(libero);
  }

  if (replacedPlayerId) {
    add(players.find((p) => p.id === replacedPlayerId));
  }

  return eligible;
}

export function getLiberoInOptions(
  rotations: { position: number; player?: Player }[],
  benchLiberos: Player[],
  setLiberoIds: string[],
  replacements: LiberoReplacement[] = [],
  allPlayers: Player[] = [],
  teamServing = false
): LiberoInOption[] {
  const liberoOnCourt = rotations.some(
    (r) => r.player && isLiberoPlayer(r.player, setLiberoIds)
  );

  if (liberoOnCourt) {
    const onCourtIds = new Set(
      rotations.map((r) => r.player?.id).filter((id): id is string => !!id)
    );
    const options: LiberoInOption[] = [];

    for (const entry of rotations) {
      if (!isLiberoInPositionAllowed(entry.position, teamServing)) continue;
      const player = entry.player;
      if (!player || !isLiberoPlayer(player, setLiberoIds)) continue;

      const eligiblePlayersIn = getEligiblePlayersWhenLiberoOnCourt(
        player,
        replacements,
        benchLiberos,
        onCourtIds,
        allPlayers
      );
      if (eligiblePlayersIn.length > 0) {
        options.push({ position: entry.position, player, eligiblePlayersIn });
      }
    }

    return options.sort((a, b) => a.position - b.position);
  }

  if (benchLiberos.length === 0) return [];

  const regularPlayerOptions: LiberoInOption[] = [];
  for (const entry of rotations) {
    if (!isLiberoInPositionAllowed(entry.position, teamServing)) continue;
    const player = entry.player;
    if (!player || isLiberoPlayer(player, setLiberoIds)) continue;
    regularPlayerOptions.push({
      position: entry.position,
      player,
      eligiblePlayersIn: benchLiberos,
    });
  }

  return regularPlayerOptions.sort((a, b) => a.position - b.position);
}

export function isLiberoOnCourt(
  rotations: { position: number; player?: Player }[],
  setLiberoIds: string[]
): boolean {
  return rotations.some((r) => r.player && isLiberoPlayer(r.player, setLiberoIds));
}

export function canLiberoOutAtP4(
  playerAtP4Id: string | undefined,
  setLiberoIds: string[],
  players: Player[],
  replacements: LiberoReplacement[]
): { liberoId: string; playerId: string } | null {
  if (!playerAtP4Id) return null;
  const player = players.find((p) => p.id === playerAtP4Id);
  if (!player || !isLiberoPlayer(player, setLiberoIds)) return null;

  const active = getActiveLiberoIns(replacements);
  const replacedPlayerId = active.get(playerAtP4Id);
  if (!replacedPlayerId) return null;

  return { liberoId: playerAtP4Id, playerId: replacedPlayerId };
}

export interface LiberoOutPrompt {
  libero: Player;
  player: Player;
}

export function getLiberoOutPrompt(
  playerAtP4Id: string | undefined,
  setLiberoIds: string[],
  players: Player[],
  replacements: LiberoReplacement[]
): LiberoOutPrompt | null {
  const swap = canLiberoOutAtP4(playerAtP4Id, setLiberoIds, players, replacements);
  if (!swap) return null;
  const libero = players.find((p) => p.id === swap.liberoId);
  const player = players.find((p) => p.id === swap.playerId);
  if (!libero || !player) return null;
  return { libero, player };
}
