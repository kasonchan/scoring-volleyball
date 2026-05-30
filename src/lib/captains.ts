import { Player } from "./types";

export function getTeamCaptain(players: Player[]): Player | undefined {
  return players.find((p) => p.role === "team_captain");
}

export function isTeamCaptainOnCourt(players: Player[], onCourtPlayerIds: string[]): boolean {
  const teamCaptain = getTeamCaptain(players);
  return teamCaptain ? onCourtPlayerIds.includes(teamCaptain.id) : false;
}

export function isGameCaptainOnCourt(
  gameCaptainId: string | null,
  onCourtPlayerIds: string[]
): boolean {
  return !!gameCaptainId && onCourtPlayerIds.includes(gameCaptainId);
}

export function hasCaptainOnCourt(
  players: Player[],
  onCourtPlayerIds: string[],
  gameCaptainId: string | null
): boolean {
  return (
    isTeamCaptainOnCourt(players, onCourtPlayerIds) ||
    isGameCaptainOnCourt(gameCaptainId, onCourtPlayerIds)
  );
}

export function needsGameCaptainAssignment(
  players: Player[],
  onCourtPlayerIds: string[],
  gameCaptainId: string | null
): boolean {
  if (onCourtPlayerIds.length < 6) return false;
  return !hasCaptainOnCourt(players, onCourtPlayerIds, gameCaptainId);
}

export function normalizeGameCaptainId(
  players: Player[],
  onCourtPlayerIds: string[],
  gameCaptainId: string | null
): string | null {
  if (isTeamCaptainOnCourt(players, onCourtPlayerIds)) return null;
  return gameCaptainId;
}

export function getCaptainLabel(
  players: Player[],
  playerId: string,
  gameCaptainId: string | null
): "Team Captain" | "Game Captain" | null {
  const teamCaptain = getTeamCaptain(players);
  if (teamCaptain?.id === playerId) return "Team Captain";
  if (gameCaptainId === playerId) return "Game Captain";
  return null;
}

export function benchPlayers(players: Player[], onCourtPlayerIds: string[]): Player[] {
  return players.filter((p) => !onCourtPlayerIds.includes(p.id));
}
