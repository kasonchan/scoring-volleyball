export type MatchStatus = "scheduled" | "setup" | "in_progress" | "completed";
export type SetStatus = "in_progress" | "completed";
export type ServingTeam = "home" | "away";

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  players?: Player[];
}

export interface MatchSet {
  id: string;
  matchId: string;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  status: SetStatus;
}

export interface RotationEntry {
  id: string;
  matchId: string;
  teamId: string;
  setNumber: number;
  position: number;
  playerId: string;
  player?: Player;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  servingTeam: ServingTeam | null;
  currentSet: number;
  createdAt: string;
  homeTeam?: Team;
  awayTeam?: Team;
  sets?: MatchSet[];
  rotations?: RotationEntry[];
}

export interface CreateTeamInput {
  name: string;
  players: { name: string; jerseyNumber: number }[];
}

export interface CreateMatchInput {
  homeTeamId: string;
  awayTeamId: string;
}

export interface SetRotationInput {
  homeRotation: string[];
  awayRotation: string[];
  servingTeam: ServingTeam;
}

export const SET_WIN_SCORE = [25, 25, 25, 25, 15] as const;
export const SETS_TO_WIN = 3;

export function getSetTargetScore(setNumber: number): number {
  return SET_WIN_SCORE[Math.min(setNumber - 1, 4)];
}

export function isSetWon(
  homeScore: number,
  awayScore: number,
  setNumber: number
): "home" | "away" | null {
  const target = getSetTargetScore(setNumber);
  if (homeScore >= target && homeScore - awayScore >= 2) return "home";
  if (awayScore >= target && awayScore - homeScore >= 2) return "away";
  return null;
}

export function rotateClockwise(rotation: string[]): string[] {
  return [rotation[5], rotation[0], rotation[1], rotation[2], rotation[3], rotation[4]];
}

export function getMatchSummary(match: Match) {
  const homeSets =
    match.sets?.filter((s) => s.status === "completed" && s.homeScore > s.awayScore).length ?? 0;
  const awaySets =
    match.sets?.filter((s) => s.status === "completed" && s.awayScore > s.homeScore).length ?? 0;
  const currentSet = match.sets?.find((s) => s.setNumber === match.currentSet);
  return {
    homeSets,
    awaySets,
    currentSet,
    targetScore: getSetTargetScore(match.currentSet),
  };
}
