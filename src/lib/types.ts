export type MatchStatus = "scheduled" | "setup" | "in_progress" | "completed";
export type SetStatus = "in_progress" | "completed";
export type ServingTeam = "home" | "away";

export type PlayerRole = "team_captain" | "libero";

export const PLAYER_ROLE_LABELS: Record<PlayerRole, string> = {
  team_captain: "Team Captain",
  libero: "Libero",
};

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number;
  role: PlayerRole | null;
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
  homeGameCaptainId?: string | null;
  awayGameCaptainId?: string | null;
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

export interface Substitution {
  id: string;
  matchId: string;
  teamId: string;
  setNumber: number;
  position: number;
  playerOutId: string;
  playerInId: string;
  createdAt: string;
  playerOut?: Player;
  playerIn?: Player;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  locationId: string | null;
  scheduledAt: string | null;
  status: MatchStatus;
  servingTeam: ServingTeam | null;
  currentSet: number;
  createdAt: string;
  homeTeam?: Team;
  awayTeam?: Team;
  location?: Location;
  sets?: MatchSet[];
  rotations?: RotationEntry[];
  substitutions?: Substitution[];
}

export interface CreateTeamInput {
  name: string;
  players: { name: string; jerseyNumber: number; role?: PlayerRole | null }[];
}

export interface UpdateTeamInput {
  name: string;
  players: { id?: string; name: string; jerseyNumber: number; role?: PlayerRole | null }[];
}

export interface CreateMatchInput {
  homeTeamId: string;
  awayTeamId: string;
  locationId?: string | null;
  scheduledAt?: string | null;
}

export interface UpdateMatchInput {
  homeTeamId: string;
  awayTeamId: string;
  locationId?: string | null;
  scheduledAt?: string | null;
}

export interface SetRotationInput {
  homeRotation: string[];
  awayRotation: string[];
  servingTeam: ServingTeam;
  homeGameCaptainId?: string | null;
  awayGameCaptainId?: string | null;
}

export interface SubstituteInput {
  team: ServingTeam;
  position: number;
  playerInId: string;
  gameCaptainId?: string | null;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface LocationInput {
  name: string;
  address: string;
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
  };
}

export function rotateClockwise(rotation: string[]): string[] {
  return [rotation[5], rotation[0], rotation[1], rotation[2], rotation[3], rotation[4]];
}

export function formatMatchDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
