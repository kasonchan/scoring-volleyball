import { timingSafeEqual } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne, execute } from "./db";
import {
  CreateMatchInput,
  CreateTeamInput,
  UpdateMatchInput,
  UpdateTeamInput,
  Location,
  LocationInput,
  Match,
  MatchSet,
  Player,
  PlayerRole,
  RotationEntry,
  ServingTeam,
  SetRotationInput,
  SubstituteInput,
  Substitution,
  Timeout,
  TimeoutInput,
  Rally,
  ScoreEvent,
  LiberoReplacement,
  LiberoInInput,
  LiberoOutInput,
  Team,
  MAX_TIMEOUTS_PER_SET,
  rotateClockwise,
} from "./types";
import {
  isTeamCaptainOnCourt,
  needsGameCaptainAssignment,
  normalizeGameCaptainId,
} from "./captains";
import { getAllowedSubstitutesIn } from "./substitutions";
import { isRallyInProgress } from "./rally";
import {
  canLiberoOutAtP4,
  getLiberoInOptions,
  isLiberoInPositionAllowed,
  isLiberoInPosition,
  isLiberoPlayer,
  liberoInPositionLabel,
  LIBERO_IN_POSITIONS,
  LIBERO_OUT_POSITION,
  resolveLiberoReplacementPlayer,
} from "./libero";

function normalizePlayerRole(role: unknown): PlayerRole | null {
  return role === "team_captain" || role === "libero" ? role : null;
}

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    name: row.name as string,
    jerseyNumber: row.jersey_number as number,
    role: normalizePlayerRole(row.role),
  };
}

function validatePlayerRoles(players: { role?: PlayerRole | null }[]) {
  const teamCaptains = players.filter((p) => p.role === "team_captain").length;
  if (teamCaptains > 1) throw new Error("Only one Team Captain can be assigned");
}

function rowToTeam(row: Record<string, unknown>, players: Player[] = []): Team {
  return {
    id: row.id as string,
    namespaceId: row.namespace_id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    players,
  };
}

function parseLiberoIds(row: Record<string, unknown>, pluralKey: string, singularKey: string): string[] {
  const raw = row[pluralKey];
  if (raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))];
      }
    } catch {
      /* fall through to legacy column */
    }
  }
  const single = row[singularKey] as string | null | undefined;
  return single ? [single] : [];
}

function rowToSet(row: Record<string, unknown>): MatchSet {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    setNumber: row.set_number as number,
    homeScore: row.home_score as number,
    awayScore: row.away_score as number,
    status: row.status as MatchSet["status"],
    homeGameCaptainId: (row.home_game_captain_id as string | null) ?? null,
    awayGameCaptainId: (row.away_game_captain_id as string | null) ?? null,
    courtSwapped: Boolean(row.court_swapped),
    startedAt: (row.started_at as string | null) ?? null,
    endedAt: (row.ended_at as string | null) ?? null,
    homeLiberoIds: parseLiberoIds(row, "home_libero_ids", "home_libero_id"),
    awayLiberoIds: parseLiberoIds(row, "away_libero_ids", "away_libero_id"),
  };
}

async function markSetStarted(matchId: string, setNumber: number) {
  await execute(
    "UPDATE match_sets SET started_at = UTC_TIMESTAMP(3) WHERE match_id = ? AND set_number = ? AND started_at IS NULL",
    [matchId, setNumber]
  );
}

async function markSetEnded(matchId: string, setNumber: number) {
  await execute(
    "UPDATE match_sets SET ended_at = UTC_TIMESTAMP(3) WHERE match_id = ? AND set_number = ? AND ended_at IS NULL",
    [matchId, setNumber]
  );
}

function validateSetGameCaptains(
  match: Match,
  homeRotation: string[],
  awayRotation: string[],
  homeGameCaptainId: string | null,
  awayGameCaptainId: string | null
) {
  const homePlayers = match.homeTeam?.players ?? [];
  const awayPlayers = match.awayTeam?.players ?? [];

  const homeGc = normalizeGameCaptainId(homePlayers, homeRotation, homeGameCaptainId);
  const awayGc = normalizeGameCaptainId(awayPlayers, awayRotation, awayGameCaptainId);

  if (needsGameCaptainAssignment(homePlayers, homeRotation, homeGc)) {
    throw new Error(`Select a Game Captain on court for ${match.homeTeam?.name ?? "home team"}`);
  }
  if (needsGameCaptainAssignment(awayPlayers, awayRotation, awayGc)) {
    throw new Error(`Select a Game Captain on court for ${match.awayTeam?.name ?? "away team"}`);
  }
  if (homeGc && !homeRotation.includes(homeGc)) {
    throw new Error("Home Game Captain must be on court");
  }
  if (awayGc && !awayRotation.includes(awayGc)) {
    throw new Error("Away Game Captain must be on court");
  }

  return { homeGc, awayGc };
}

function validateSetLiberos(
  match: Match,
  homeRotation: string[],
  awayRotation: string[],
  homeLiberoIds: string[],
  awayLiberoIds: string[]
) {
  const checks: [Player[], string[], string[], string][] = [
    [match.homeTeam?.players ?? [], homeRotation, homeLiberoIds, "Home"],
    [match.awayTeam?.players ?? [], awayRotation, awayLiberoIds, "Away"],
  ];

  for (const [players, rotation, liberoIds, label] of checks) {
    const uniqueIds = [...new Set(liberoIds)];
    for (const liberoId of uniqueIds) {
      const player = players.find((p) => p.id === liberoId);
      if (!player) throw new Error(`${label} libero must be on the team roster`);
      if (rotation.includes(liberoId)) {
        throw new Error(`${label} libero cannot be in the starting rotation`);
      }
      if (player.role === "team_captain") {
        throw new Error(`${label} libero cannot be the Team Captain`);
      }
    }
  }

  return {
    homeLiberos: [...new Set(homeLiberoIds)],
    awayLiberos: [...new Set(awayLiberoIds)],
  };
}

async function updateSetGameCaptains(
  matchId: string,
  setNumber: number,
  homeGameCaptainId: string | null,
  awayGameCaptainId: string | null
) {
  await execute(
    "UPDATE match_sets SET home_game_captain_id = ?, away_game_captain_id = ? WHERE match_id = ? AND set_number = ?",
    [homeGameCaptainId, awayGameCaptainId, matchId, setNumber]
  );
}

async function updateSetLiberos(
  matchId: string,
  setNumber: number,
  homeLiberoIds: string[],
  awayLiberoIds: string[]
) {
  await execute(
    "UPDATE match_sets SET home_libero_ids = ?, away_libero_ids = ?, home_libero_id = NULL, away_libero_id = NULL WHERE match_id = ? AND set_number = ?",
    [JSON.stringify(homeLiberoIds), JSON.stringify(awayLiberoIds), matchId, setNumber]
  );
}

async function ensureSetRow(matchId: string, setNumber: number, courtSwapped = false) {
  const existingSet = await queryOne(
    "SELECT id FROM match_sets WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );
  if (!existingSet) {
    await execute(
      "INSERT INTO match_sets (id, match_id, set_number, home_score, away_score, court_swapped) VALUES (?, ?, ?, 0, 0, ?)",
      [uuidv4(), matchId, setNumber, courtSwapped ? 1 : 0]
    );
  }
}

async function updateSetCourtSwapped(matchId: string, setNumber: number, courtSwapped: boolean) {
  await execute(
    "UPDATE match_sets SET court_swapped = ? WHERE match_id = ? AND set_number = ?",
    [courtSwapped ? 1 : 0, matchId, setNumber]
  );
}

async function getOnCourtPlayerIds(matchId: string, teamId: string, setNumber: number): Promise<string[]> {
  const rows = await query(
    "SELECT player_id FROM rotations WHERE match_id = ? AND team_id = ? AND set_number = ? ORDER BY position",
    [matchId, teamId, setNumber]
  );
  return rows.map((row) => row.player_id as string);
}

function rowToRotation(row: Record<string, unknown>, player?: Player): RotationEntry {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    teamId: row.team_id as string,
    setNumber: row.set_number as number,
    position: row.position as number,
    playerId: row.player_id as string,
    player,
  };
}

export async function getAllTeams(namespaceId: string): Promise<Team[]> {
  const teams = await query(
    "SELECT * FROM teams WHERE namespace_id = ? ORDER BY name",
    [namespaceId]
  );
  const players = await query("SELECT * FROM players ORDER BY jersey_number");
  const playersByTeam = new Map<string, Player[]>();
  for (const row of players) {
    const p = rowToPlayer(row);
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }
  return teams.map((t) => rowToTeam(t, playersByTeam.get(t.id as string) ?? []));
}

export async function getTeam(id: string, namespaceId?: string): Promise<Team | null> {
  const row = namespaceId
    ? await queryOne("SELECT * FROM teams WHERE id = ? AND namespace_id = ?", [id, namespaceId])
    : await queryOne("SELECT * FROM teams WHERE id = ?", [id]);
  if (!row) return null;
  const players = await query(
    "SELECT * FROM players WHERE team_id = ? ORDER BY jersey_number",
    [id]
  );
  return rowToTeam(row, players.map(rowToPlayer));
}

export async function createTeam(namespaceId: string, input: CreateTeamInput): Promise<Team> {
  validatePlayerRoles(input.players);
  const id = uuidv4();
  await execute("INSERT INTO teams (id, namespace_id, name) VALUES (?, ?, ?)", [
    id,
    namespaceId,
    input.name.trim(),
  ]);
  for (const p of input.players) {
    await execute(
      "INSERT INTO players (id, team_id, name, jersey_number, role) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), id, p.name.trim(), p.jerseyNumber, p.role ?? null]
    );
  }
  return (await getTeam(id))!;
}

export async function updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
  const existing = await getTeam(id);
  if (!existing) throw new Error("Team not found");

  if (!input.name?.trim()) throw new Error("Team name is required");
  if (!input.players?.length) throw new Error("At least one player is required");
  validatePlayerRoles(input.players);

  await execute("UPDATE teams SET name = ? WHERE id = ?", [input.name.trim(), id]);

  const existingIds = new Set(existing.players?.map((p) => p.id) ?? []);
  const submittedIds = new Set(input.players.filter((p) => p.id).map((p) => p.id!));

  for (const p of input.players) {
    const name = p.name.trim();
    if (!name) throw new Error("All players must have a name");
    if (isNaN(p.jerseyNumber)) throw new Error("All players must have a valid jersey number");
    const role = p.role ?? null;

    if (p.id && existingIds.has(p.id)) {
      await execute(
        "UPDATE players SET name = ?, jersey_number = ?, role = ? WHERE id = ? AND team_id = ?",
        [name, p.jerseyNumber, role, p.id, id]
      );
    } else {
      await execute(
        "INSERT INTO players (id, team_id, name, jersey_number, role) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), id, name, p.jerseyNumber, role]
      );
    }
  }

  for (const playerId of existingIds) {
    if (!submittedIds.has(playerId)) {
      const inRotation = await queryOne(
        "SELECT id FROM rotations WHERE player_id = ? LIMIT 1",
        [playerId]
      );
      if (inRotation) {
        const player = existing.players?.find((p) => p.id === playerId);
        throw new Error(
          `Cannot remove ${player?.name ?? "player"} — they are assigned to a match rotation`
        );
      }
      await execute("DELETE FROM players WHERE id = ? AND team_id = ?", [playerId, id]);
    }
  }

  return (await getTeam(id))!;
}

export async function deleteTeam(id: string): Promise<boolean> {
  await execute("DELETE FROM players WHERE team_id = ?", [id]);
  const result = await execute("DELETE FROM teams WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function getAllMatches(namespaceId: string): Promise<Match[]> {
  const rows = await query(
    "SELECT * FROM matches WHERE namespace_id = ? ORDER BY created_at DESC",
    [namespaceId]
  );
  return Promise.all(rows.map((row) => enrichMatch(row)));
}

export async function getMatch(id: string, namespaceId?: string): Promise<Match | null> {
  const row = namespaceId
    ? await queryOne("SELECT * FROM matches WHERE id = ? AND namespace_id = ?", [id, namespaceId])
    : await queryOne("SELECT * FROM matches WHERE id = ?", [id]);
  if (!row) return null;
  return enrichMatch(row);
}

export async function assertMatchInNamespace(matchId: string, namespaceId: string): Promise<Match> {
  const match = await getMatch(matchId, namespaceId);
  if (!match) throw new Error("Match not found");
  return match;
}

async function enrichMatch(row: Record<string, unknown>): Promise<Match> {
  const locationId = (row.location_id as string | null) ?? null;
  const match: Match = {
    id: row.id as string,
    namespaceId: row.namespace_id as string,
    homeTeamId: row.home_team_id as string,
    awayTeamId: row.away_team_id as string,
    locationId,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    status: row.status as Match["status"],
    servingTeam: (row.serving_team as ServingTeam | null) ?? null,
    currentSet: row.current_set as number,
    createdAt: row.created_at as string,
  };
  match.homeTeam = (await getTeam(match.homeTeamId)) ?? undefined;
  match.awayTeam = (await getTeam(match.awayTeamId)) ?? undefined;
  match.location = locationId ? (await getLocation(locationId)) ?? undefined : undefined;
  match.sets = await getMatchSets(match.id);
  match.rotations = await getMatchRotations(match.id, match.currentSet);
  match.substitutions = await getMatchSubstitutions(match.id, match.currentSet);
  match.timeouts = await getMatchTimeouts(match.id, match.currentSet);
  match.liberoReplacements = await getMatchLiberoReplacements(match.id, match.currentSet);
  match.rallies = await getMatchRallies(match.id, match.currentSet);
  match.scoreEvents = await getMatchScoreEvents(match.id, match.currentSet);
  return match;
}

async function validateMatchInput(namespaceId: string, input: CreateMatchInput | UpdateMatchInput) {
  if (input.homeTeamId === input.awayTeamId) {
    throw new Error("Home and away teams must be different");
  }
  if (!(await getTeam(input.homeTeamId, namespaceId)) || !(await getTeam(input.awayTeamId, namespaceId))) {
    throw new Error("Both teams must exist in this namespace");
  }
  const locationId = input.locationId || null;
  if (locationId && !(await getLocation(locationId, namespaceId))) {
    throw new Error("Location not found");
  }
}

async function getMatchSets(matchId: string): Promise<MatchSet[]> {
  const rows = await query(
    "SELECT * FROM match_sets WHERE match_id = ? ORDER BY set_number",
    [matchId]
  );
  return rows.map(rowToSet);
}

async function getMatchRotations(matchId: string, setNumber: number): Promise<RotationEntry[]> {
  const rows = await query(
    "SELECT r.*, p.name, p.jersey_number, p.role, p.team_id as p_team_id FROM rotations r JOIN players p ON r.player_id = p.id WHERE r.match_id = ? AND r.set_number = ? ORDER BY r.position",
    [matchId, setNumber]
  );
  return rows.map((row) =>
    rowToRotation(row, {
      id: row.player_id as string,
      teamId: row.p_team_id as string,
      name: row.name as string,
      jerseyNumber: row.jersey_number as number,
      role: normalizePlayerRole(row.role),
    })
  );
}

function rowToSubstitution(row: Record<string, unknown>): Substitution {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    teamId: row.team_id as string,
    setNumber: row.set_number as number,
    position: row.position as number,
    playerOutId: row.player_out_id as string,
    playerInId: row.player_in_id as string,
    createdAt: row.created_at as string,
  };
}

async function getMatchSubstitutions(matchId: string, setNumber: number): Promise<Substitution[]> {
  const rows = await query(
    `SELECT s.*,
        po.name as out_name, po.jersey_number as out_jersey, po.role as out_role, po.team_id as out_team_id,
        pi.name as in_name, pi.jersey_number as in_jersey, pi.role as in_role, pi.team_id as in_team_id
       FROM substitutions s
       JOIN players po ON s.player_out_id = po.id
       JOIN players pi ON s.player_in_id = pi.id
       WHERE s.match_id = ? AND s.set_number = ?
       ORDER BY s.created_at`,
    [matchId, setNumber]
  );

  return rows.map((row) => {
    const sub = rowToSubstitution(row);
    sub.playerOut = {
      id: sub.playerOutId,
      teamId: row.out_team_id as string,
      name: row.out_name as string,
      jerseyNumber: row.out_jersey as number,
      role: normalizePlayerRole(row.out_role),
    };
    sub.playerIn = {
      id: sub.playerInId,
      teamId: row.in_team_id as string,
      name: row.in_name as string,
      jerseyNumber: row.in_jersey as number,
      role: normalizePlayerRole(row.in_role),
    };
    return sub;
  });
}

function rowToTimeout(row: Record<string, unknown>): Timeout {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    teamId: row.team_id as string,
    setNumber: row.set_number as number,
    createdAt: row.created_at as string,
  };
}

async function getMatchTimeouts(matchId: string, setNumber: number): Promise<Timeout[]> {
  const rows = await query(
    "SELECT * FROM timeouts WHERE match_id = ? AND set_number = ? ORDER BY created_at",
    [matchId, setNumber]
  );
  return rows.map(rowToTimeout);
}

function rowToRally(row: Record<string, unknown>): Rally {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    setNumber: row.set_number as number,
    homeScore: row.home_score as number,
    awayScore: row.away_score as number,
    servingTeam: (row.serving_team as ServingTeam | null) ?? null,
    createdAt: row.created_at as string,
  };
}

async function getMatchRallies(matchId: string, setNumber: number): Promise<Rally[]> {
  const rows = await query(
    "SELECT * FROM rallies WHERE match_id = ? AND set_number = ? ORDER BY created_at",
    [matchId, setNumber]
  );
  return rows.map(rowToRally);
}

function rowToScoreEvent(row: Record<string, unknown>): ScoreEvent {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    setNumber: row.set_number as number,
    teamId: row.team_id as string,
    scoringTeam: row.scoring_team as ServingTeam,
    homeScore: row.home_score as number,
    awayScore: row.away_score as number,
    sideOut: Boolean(row.side_out),
    createdAt: row.created_at as string,
  };
}

async function getMatchScoreEvents(matchId: string, setNumber: number): Promise<ScoreEvent[]> {
  const rows = await query(
    "SELECT * FROM score_events WHERE match_id = ? AND set_number = ? ORDER BY created_at",
    [matchId, setNumber]
  );
  return rows.map(rowToScoreEvent);
}

async function assertRallyInProgress(matchId: string, setNumber: number) {
  const setRow = await queryOne(
    "SELECT home_score, away_score FROM match_sets WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );
  if (!setRow) throw new Error("Current set not found");
  const rallies = await getMatchRallies(matchId, setNumber);
  if (
    !isRallyInProgress(
      rallies,
      setRow.home_score as number,
      setRow.away_score as number
    )
  ) {
    throw new Error("Start a rally before scoring");
  }
}

async function assertRallyNotInProgress(matchId: string, setNumber: number) {
  const setRow = await queryOne(
    "SELECT home_score, away_score FROM match_sets WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );
  if (!setRow) throw new Error("Current set not found");
  const rallies = await getMatchRallies(matchId, setNumber);
  if (
    isRallyInProgress(
      rallies,
      setRow.home_score as number,
      setRow.away_score as number
    )
  ) {
    throw new Error("Not allowed during an active rally — wait until the rally ends");
  }
}

function rowToLiberoReplacement(row: Record<string, unknown>): LiberoReplacement {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    teamId: row.team_id as string,
    setNumber: row.set_number as number,
    liberoId: row.libero_id as string,
    playerId: row.player_id as string,
    eventType: row.event_type as LiberoReplacement["eventType"],
    position: row.position as number,
    createdAt: row.created_at as string,
  };
}

async function getMatchLiberoReplacements(matchId: string, setNumber: number): Promise<LiberoReplacement[]> {
  const rows = await query(
    `SELECT lr.*,
        l.name as libero_name, l.jersey_number as libero_jersey, l.role as libero_role, l.team_id as libero_team_id,
        pl.name as player_name, pl.jersey_number as player_jersey, pl.role as player_role, pl.team_id as player_team_id
       FROM libero_replacements lr
       JOIN players l ON lr.libero_id = l.id
       JOIN players pl ON lr.player_id = pl.id
       WHERE lr.match_id = ? AND lr.set_number = ?
       ORDER BY lr.created_at`,
    [matchId, setNumber]
  );

  return rows.map((row) => {
    const entry = rowToLiberoReplacement(row);
    entry.libero = {
      id: entry.liberoId,
      teamId: row.libero_team_id as string,
      name: row.libero_name as string,
      jerseyNumber: row.libero_jersey as number,
      role: normalizePlayerRole(row.libero_role),
    };
    entry.player = {
      id: entry.playerId,
      teamId: row.player_team_id as string,
      name: row.player_name as string,
      jerseyNumber: row.player_jersey as number,
      role: normalizePlayerRole(row.player_role),
    };
    return entry;
  });
}

function generateSpectatorToken(): string {
  return uuidv4().replace(/-/g, "");
}

export async function verifyMatchSpectatorToken(
  matchId: string,
  namespaceId: string,
  token: string
): Promise<boolean> {
  const row = await queryOne<{ spectator_token: string | null }>(
    "SELECT spectator_token FROM matches WHERE id = ? AND namespace_id = ?",
    [matchId, namespaceId]
  );
  if (!row?.spectator_token || !token.trim()) return false;
  try {
    const a = Buffer.from(row.spectator_token);
    const b = Buffer.from(token.trim());
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getMatchSpectatorToken(matchId: string, namespaceId: string): Promise<string | null> {
  const row = await queryOne<{ spectator_token: string | null }>(
    "SELECT spectator_token FROM matches WHERE id = ? AND namespace_id = ?",
    [matchId, namespaceId]
  );
  return row?.spectator_token ?? null;
}

export async function ensureMatchSpectatorToken(matchId: string, namespaceId: string): Promise<string> {
  const existing = await getMatchSpectatorToken(matchId, namespaceId);
  if (existing) return existing;
  const token = generateSpectatorToken();
  await execute("UPDATE matches SET spectator_token = ? WHERE id = ? AND namespace_id = ?", [
    token,
    matchId,
    namespaceId,
  ]);
  return token;
}

export async function createMatch(namespaceId: string, input: CreateMatchInput): Promise<Match> {
  await validateMatchInput(namespaceId, input);
  const id = uuidv4();
  const locationId = input.locationId || null;
  const scheduledAt = input.scheduledAt || null;
  const spectatorToken = generateSpectatorToken();
  await execute(
    `INSERT INTO matches (
      id, namespace_id, home_team_id, away_team_id, location_id, scheduled_at, status, spectator_token
    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
    [
      id,
      namespaceId,
      input.homeTeamId,
      input.awayTeamId,
      locationId,
      scheduledAt,
      spectatorToken,
    ]
  );
  return (await getMatch(id))!;
}

export async function updateMatch(namespaceId: string, id: string, input: UpdateMatchInput): Promise<Match> {
  const match = await getMatch(id, namespaceId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "scheduled") {
    throw new Error("Only scheduled matches can be edited");
  }
  await validateMatchInput(namespaceId, input);
  const locationId = input.locationId || null;
  const scheduledAt = input.scheduledAt || null;

  await execute(
    "UPDATE matches SET home_team_id = ?, away_team_id = ?, location_id = ?, scheduled_at = ? WHERE id = ?",
    [input.homeTeamId, input.awayTeamId, locationId, scheduledAt, id]
  );

  return (await getMatch(id))!;
}

export async function deleteMatch(id: string): Promise<boolean> {
  const result = await execute("DELETE FROM matches WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function setMatchRotation(matchId: string, input: SetRotationInput): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  if (input.homeRotation.length !== 6 || input.awayRotation.length !== 6) {
    throw new Error("Each team must have exactly 6 players in rotation");
  }

  const setNumber = match.currentSet;
  const { homeGc, awayGc } = validateSetGameCaptains(
    match,
    input.homeRotation,
    input.awayRotation,
    input.homeGameCaptainId ?? null,
    input.awayGameCaptainId ?? null
  );
  const { homeLiberos, awayLiberos } = validateSetLiberos(
    match,
    input.homeRotation,
    input.awayRotation,
    input.homeLiberoIds ?? [],
    input.awayLiberoIds ?? []
  );
  const courtSwapped = input.courtSwapped ?? false;

  await execute("DELETE FROM rotations WHERE match_id = ? AND set_number = ?", [matchId, setNumber]);

  for (let i = 0; i < input.homeRotation.length; i++) {
    await execute(
      "INSERT INTO rotations (id, match_id, team_id, set_number, position, player_id) VALUES (?, ?, ?, ?, ?, ?)",
      [uuidv4(), matchId, match.homeTeamId, setNumber, i + 1, input.homeRotation[i]]
    );
  }
  for (let i = 0; i < input.awayRotation.length; i++) {
    await execute(
      "INSERT INTO rotations (id, match_id, team_id, set_number, position, player_id) VALUES (?, ?, ?, ?, ?, ?)",
      [uuidv4(), matchId, match.awayTeamId, setNumber, i + 1, input.awayRotation[i]]
    );
  }

  const existingSet = await queryOne(
    "SELECT id FROM match_sets WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );

  if (!existingSet) {
    await execute(
      "INSERT INTO match_sets (id, match_id, set_number, home_score, away_score, home_game_captain_id, away_game_captain_id, home_libero_ids, away_libero_ids, court_swapped) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?)",
      [
        uuidv4(),
        matchId,
        setNumber,
        homeGc,
        awayGc,
        JSON.stringify(homeLiberos),
        JSON.stringify(awayLiberos),
        courtSwapped ? 1 : 0,
      ]
    );
  } else {
    await updateSetGameCaptains(matchId, setNumber, homeGc, awayGc);
    await updateSetLiberos(matchId, setNumber, homeLiberos, awayLiberos);
    await updateSetCourtSwapped(matchId, setNumber, courtSwapped);
  }

  await execute(
    "UPDATE matches SET status = 'in_progress', serving_team = ? WHERE id = ?",
    [input.servingTeam, matchId]
  );

  await markSetStarted(matchId, setNumber);

  return (await getMatch(matchId))!;
}

export async function setSetCourtSwapped(matchId: string, courtSwapped: boolean): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "scheduled" && match.status !== "setup") {
    throw new Error("Court layout can only be changed during set setup");
  }

  const setNumber = match.currentSet;
  await ensureSetRow(matchId, setNumber, courtSwapped);
  await updateSetCourtSwapped(matchId, setNumber, courtSwapped);

  return (await getMatch(matchId))!;
}

export async function substitutePlayer(matchId: string, input: SubstituteInput): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");
  if (input.position < 1 || input.position > 6) throw new Error("Position must be between 1 and 6");

  const setNumber = match.currentSet;
  await assertRallyNotInProgress(matchId, setNumber);
  const teamId = input.team === "home" ? match.homeTeamId : match.awayTeamId;
  const players = input.team === "home" ? match.homeTeam?.players ?? [] : match.awayTeam?.players ?? [];
  const currentSet = match.sets?.find((s) => s.setNumber === setNumber);
  if (!currentSet) throw new Error("Current set not found");

  const rosterPlayer = players.find((p) => p.id === input.playerInId);
  if (!rosterPlayer) throw new Error("Substitute player must be on the team roster");

  const onCourtIds = await getOnCourtPlayerIds(matchId, teamId, setNumber);
  const currentEntry = await queryOne(
    "SELECT player_id FROM rotations WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
    [matchId, teamId, setNumber, input.position]
  );
  if (!currentEntry) throw new Error("Court position not found");
  const playerOutId = currentEntry.player_id as string;

  if (onCourtIds.includes(input.playerInId)) {
    throw new Error("Substitute player is already on court");
  }

  const setLiberoIds =
    input.team === "home" ? currentSet.homeLiberoIds ?? [] : currentSet.awayLiberoIds ?? [];
  const setSubstitutions = (await getMatchSubstitutions(matchId, setNumber)).filter((s) => s.teamId === teamId);
  const bench = players.filter((p) => !onCourtIds.includes(p.id));
  const allowed = getAllowedSubstitutesIn(playerOutId, bench, setSubstitutions, setLiberoIds);
  if (!allowed.some((p) => p.id === input.playerInId)) {
    const partner = allowed[0];
    if (partner) {
      throw new Error(`Only #${partner.jerseyNumber} ${partner.name} can substitute for this player`);
    }
    throw new Error("This player cannot be substituted with the selected bench player");
  }

  await execute(
    "UPDATE rotations SET player_id = ? WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
    [input.playerInId, matchId, teamId, setNumber, input.position]
  );

  await execute(
    "INSERT INTO substitutions (id, match_id, team_id, set_number, position, player_out_id, player_in_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [uuidv4(), matchId, teamId, setNumber, input.position, playerOutId, input.playerInId]
  );

  const updatedOnCourtIds = await getOnCourtPlayerIds(matchId, teamId, setNumber);
  const currentGameCaptainId =
    input.team === "home" ? currentSet.homeGameCaptainId ?? null : currentSet.awayGameCaptainId ?? null;

  let nextGameCaptainId = normalizeGameCaptainId(players, updatedOnCourtIds, currentGameCaptainId);
  if (nextGameCaptainId && !updatedOnCourtIds.includes(nextGameCaptainId)) {
    nextGameCaptainId = null;
  }

  if (needsGameCaptainAssignment(players, updatedOnCourtIds, nextGameCaptainId)) {
    if (!input.gameCaptainId) {
      throw new Error("Assign a Game Captain from players on court");
    }
    if (!updatedOnCourtIds.includes(input.gameCaptainId)) {
      throw new Error("Game Captain must be one of the players on court");
    }
    if (isTeamCaptainOnCourt(players, updatedOnCourtIds)) {
      throw new Error("Team Captain is on court; a Game Captain is not required");
    }
    nextGameCaptainId = input.gameCaptainId;
  }

  if (input.team === "home") {
    await updateSetGameCaptains(matchId, setNumber, nextGameCaptainId, currentSet.awayGameCaptainId ?? null);
  } else {
    await updateSetGameCaptains(matchId, setNumber, currentSet.homeGameCaptainId ?? null, nextGameCaptainId);
  }

  return (await getMatch(matchId))!;
}

export async function liberoIn(matchId: string, input: LiberoInInput): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");
  if (input.position < 1 || input.position > 6) throw new Error("Position must be between 1 and 6");
  if (!isLiberoInPosition(input.position)) {
    throw new Error(`Libero in is only allowed at P${LIBERO_IN_POSITIONS.join(", P")}`);
  }
  const teamServing = match.servingTeam === input.team;
  if (!isLiberoInPositionAllowed(input.position, teamServing)) {
    throw new Error("Libero in at P1 is not allowed while serving");
  }

  const setNumber = match.currentSet;
  await assertRallyNotInProgress(matchId, setNumber);
  const teamId = input.team === "home" ? match.homeTeamId : match.awayTeamId;
  const players = input.team === "home" ? match.homeTeam?.players ?? [] : match.awayTeam?.players ?? [];
  const currentSet = match.sets?.find((s) => s.setNumber === setNumber);
  if (!currentSet) throw new Error("Current set not found");

  const setLiberoIds =
    input.team === "home" ? currentSet.homeLiberoIds ?? [] : currentSet.awayLiberoIds ?? [];

  const playerIn = players.find((p) => p.id === input.playerInId);
  if (!playerIn) throw new Error("Player must be on the team roster");

  const onCourtIds = await getOnCourtPlayerIds(matchId, teamId, setNumber);
  if (onCourtIds.includes(input.playerInId)) {
    throw new Error("Player is already on court");
  }

  const positionEntry = await queryOne(
    "SELECT player_id FROM rotations WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
    [matchId, teamId, setNumber, input.position]
  );
  if (!positionEntry) throw new Error("Court position not found");
  const playerOutId = positionEntry.player_id as string;
  const playerOut = players.find((p) => p.id === playerOutId);
  if (!playerOut) throw new Error("Player not found at selected position");

  const teamReplacements = (await getMatchLiberoReplacements(matchId, setNumber)).filter((r) => r.teamId === teamId);
  const benchLiberos = setLiberoIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p && !onCourtIds.includes(p.id));

  const teamRotations = (await getMatchRotations(matchId, setNumber)).filter((r) => r.teamId === teamId);
  const allowedOptions = getLiberoInOptions(
    teamRotations,
    benchLiberos,
    setLiberoIds,
    teamReplacements,
    players,
    teamServing
  );
  const selectedOption = allowedOptions.find((o) => o.position === input.position);
  if (!selectedOption) {
    const liberoOnCourt = teamRotations.some(
      (r) => r.player && isLiberoPlayer(r.player, setLiberoIds)
    );
    if (liberoOnCourt) {
      throw new Error("No eligible bench libero or original replaced player for this libero");
    }
    throw new Error("No eligible back-row position for libero in");
  }
  if (!selectedOption.eligiblePlayersIn.some((p) => p.id === input.playerInId)) {
    throw new Error("Selected player cannot replace at this position");
  }

  const playerInIsLibero = isLiberoPlayer(playerIn, setLiberoIds);
  const playerOutIsLibero = isLiberoPlayer(playerOut, setLiberoIds);

  if (playerOutIsLibero) {
    const replacedPlayerId = resolveLiberoReplacementPlayer(
      playerOutId,
      setLiberoIds,
      players,
      teamReplacements
    );
    if (!replacedPlayerId) {
      throw new Error("Cannot determine replaced player for this libero swap");
    }

    await execute(
      "INSERT INTO libero_replacements (id, match_id, team_id, set_number, libero_id, player_id, event_type, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), matchId, teamId, setNumber, playerOutId, replacedPlayerId, "out", input.position]
    );

    await execute(
      "UPDATE rotations SET player_id = ? WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
      [input.playerInId, matchId, teamId, setNumber, input.position]
    );

    if (playerInIsLibero) {
      if (!setLiberoIds.includes(input.playerInId)) {
        throw new Error("Libero must be assigned for this set");
      }
      await execute(
        "INSERT INTO libero_replacements (id, match_id, team_id, set_number, libero_id, player_id, event_type, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [uuidv4(), matchId, teamId, setNumber, input.playerInId, replacedPlayerId, "in", input.position]
      );
    }

    return (await getMatch(matchId))!;
  }

  if (!playerInIsLibero) {
    throw new Error("Only a libero can replace a regular player");
  }
  if (!setLiberoIds.includes(input.playerInId)) {
    throw new Error("Libero must be assigned for this set");
  }

  await execute(
    "UPDATE rotations SET player_id = ? WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
    [input.playerInId, matchId, teamId, setNumber, input.position]
  );

  await execute(
    "INSERT INTO libero_replacements (id, match_id, team_id, set_number, libero_id, player_id, event_type, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [uuidv4(), matchId, teamId, setNumber, input.playerInId, playerOutId, "in", input.position]
  );

  return (await getMatch(matchId))!;
}

export async function liberoOut(matchId: string, input: LiberoOutInput): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");

  const setNumber = match.currentSet;
  await assertRallyNotInProgress(matchId, setNumber);

  const teamId = input.team === "home" ? match.homeTeamId : match.awayTeamId;
  const players = input.team === "home" ? match.homeTeam?.players ?? [] : match.awayTeam?.players ?? [];
  const currentSet = match.sets?.find((s) => s.setNumber === setNumber);
  if (!currentSet) throw new Error("Current set not found");

  const setLiberoIds =
    input.team === "home" ? currentSet.homeLiberoIds ?? [] : currentSet.awayLiberoIds ?? [];

  const p4Entry = await queryOne(
    "SELECT player_id FROM rotations WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
    [matchId, teamId, setNumber, LIBERO_OUT_POSITION]
  );
  if (!p4Entry) throw new Error("Court position P4 not found");
  const playerAtP4Id = p4Entry.player_id as string;

  const teamReplacements = (await getMatchLiberoReplacements(matchId, setNumber)).filter((r) => r.teamId === teamId);
  const swap = canLiberoOutAtP4(playerAtP4Id, setLiberoIds, players, teamReplacements);
  if (!swap) {
    throw new Error("No active libero at P4 to replace out");
  }

  await execute(
    "UPDATE rotations SET player_id = ? WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
    [swap.playerId, matchId, teamId, setNumber, LIBERO_OUT_POSITION]
  );

  await execute(
    "INSERT INTO libero_replacements (id, match_id, team_id, set_number, libero_id, player_id, event_type, position) VALUES (?, ?, ?, ?, ?, ?, 'out', ?)",
    [uuidv4(), matchId, teamId, setNumber, swap.liberoId, swap.playerId, LIBERO_OUT_POSITION]
  );

  return (await getMatch(matchId))!;
}

export async function callTimeout(matchId: string, input: TimeoutInput): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");

  const setNumber = match.currentSet;
  await assertRallyNotInProgress(matchId, setNumber);

  const teamId = input.team === "home" ? match.homeTeamId : match.awayTeamId;
  const teamTimeouts = (await getMatchTimeouts(matchId, setNumber)).filter((t) => t.teamId === teamId);

  if (teamTimeouts.length >= MAX_TIMEOUTS_PER_SET) {
    throw new Error(`Maximum ${MAX_TIMEOUTS_PER_SET} timeouts per set`);
  }

  await execute(
    "INSERT INTO timeouts (id, match_id, team_id, set_number) VALUES (?, ?, ?, ?)",
    [uuidv4(), matchId, teamId, setNumber]
  );

  return (await getMatch(matchId))!;
}

export async function startRally(matchId: string): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");

  const setNumber = match.currentSet;
  const setRow = await queryOne(
    "SELECT * FROM match_sets WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );
  if (!setRow) throw new Error("Current set not found");

  const rallies = await getMatchRallies(matchId, setNumber);
  if (
    isRallyInProgress(
      rallies,
      setRow.home_score as number,
      setRow.away_score as number
    )
  ) {
    throw new Error("Rally already in play");
  }

  await execute(
    "INSERT INTO rallies (id, match_id, set_number, home_score, away_score, serving_team) VALUES (?, ?, ?, ?, ?, ?)",
    [
      uuidv4(),
      matchId,
      setNumber,
      setRow.home_score as number,
      setRow.away_score as number,
      match.servingTeam,
    ]
  );

  return (await getMatch(matchId))!;
}

export async function scorePoint(matchId: string, team: ServingTeam): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");

  const setNumber = match.currentSet;
  const setRow = await queryOne(
    "SELECT * FROM match_sets WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );

  if (!setRow) throw new Error("Current set not found");

  await assertRallyInProgress(matchId, setNumber);

  let homeScore = setRow.home_score as number;
  let awayScore = setRow.away_score as number;
  let servingTeam = match.servingTeam!;
  const scoringTeam = team;

  const receivingTeam: ServingTeam = servingTeam === "home" ? "away" : "home";
  const sideOut = scoringTeam === receivingTeam;

  if (scoringTeam === "home") homeScore++;
  else awayScore++;

  if (sideOut) {
    servingTeam = scoringTeam;
    await rotateTeam(matchId, setNumber, scoringTeam);
  } else {
    servingTeam = scoringTeam;
  }

  await execute(
    "UPDATE match_sets SET home_score = ?, away_score = ? WHERE match_id = ? AND set_number = ?",
    [homeScore, awayScore, matchId, setNumber]
  );

  await execute("UPDATE matches SET serving_team = ? WHERE id = ?", [servingTeam, matchId]);

  const scoringTeamId =
    scoringTeam === "home" ? match.homeTeamId : match.awayTeamId;
  await execute(
    `INSERT INTO score_events (
      id, match_id, set_number, team_id, scoring_team, home_score, away_score, side_out
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      matchId,
      setNumber,
      scoringTeamId,
      scoringTeam,
      homeScore,
      awayScore,
      sideOut ? 1 : 0,
    ]
  );

  return (await getMatch(matchId))!;
}

export async function startNextSet(matchId: string): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");

  const setNumber = match.currentSet;
  await markSetEnded(matchId, setNumber);
  await execute(
    "UPDATE match_sets SET status = 'completed' WHERE match_id = ? AND set_number = ?",
    [matchId, setNumber]
  );

  const nextSet = setNumber + 1;
  await execute("UPDATE matches SET current_set = ?, status = 'setup' WHERE id = ?", [
    nextSet,
    matchId,
  ]);

  return (await getMatch(matchId))!;
}

export async function endMatch(matchId: string): Promise<Match> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress" && match.status !== "setup") {
    throw new Error("Match cannot be ended");
  }

  if (match.status === "in_progress") {
    await markSetEnded(matchId, match.currentSet);
    await execute(
      "UPDATE match_sets SET status = 'completed' WHERE match_id = ? AND set_number = ?",
      [matchId, match.currentSet]
    );
  }

  await execute("UPDATE matches SET status = 'completed' WHERE id = ?", [matchId]);
  return (await getMatch(matchId))!;
}

async function rotateTeam(matchId: string, setNumber: number, team: ServingTeam) {
  const match = await getMatch(matchId);
  if (!match) return;

  const teamId = team === "home" ? match.homeTeamId : match.awayTeamId;
  const rows = await query(
    "SELECT * FROM rotations WHERE match_id = ? AND team_id = ? AND set_number = ? ORDER BY position",
    [matchId, teamId, setNumber]
  );

  const playerIds = rows.map((r) => r.player_id as string);
  const rotated = rotateClockwise(playerIds);

  for (let i = 0; i < rotated.length; i++) {
    await execute(
      "UPDATE rotations SET player_id = ? WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?",
      [rotated[i], matchId, teamId, setNumber, i + 1]
    );
  }
}

function rowToLocation(row: Record<string, unknown>): Location {
  return {
    id: row.id as string,
    namespaceId: row.namespace_id as string,
    name: row.name as string,
    address: row.address as string,
    createdAt: row.created_at as string,
  };
}

function validateLocationInput(input: LocationInput) {
  if (!input.name?.trim()) throw new Error("Location name is required");
  if (!input.address?.trim()) throw new Error("Address is required");
}

export async function getAllLocations(namespaceId: string): Promise<Location[]> {
  const rows = await query(
    "SELECT * FROM locations WHERE namespace_id = ? ORDER BY name",
    [namespaceId]
  );
  return rows.map(rowToLocation);
}

export async function getLocation(id: string, namespaceId?: string): Promise<Location | null> {
  const row = namespaceId
    ? await queryOne("SELECT * FROM locations WHERE id = ? AND namespace_id = ?", [id, namespaceId])
    : await queryOne("SELECT * FROM locations WHERE id = ?", [id]);
  if (!row) return null;
  return rowToLocation(row);
}

export async function createLocation(namespaceId: string, input: LocationInput): Promise<Location> {
  validateLocationInput(input);
  const id = uuidv4();
  await execute("INSERT INTO locations (id, namespace_id, name, address) VALUES (?, ?, ?, ?)", [
    id,
    namespaceId,
    input.name.trim(),
    input.address.trim(),
  ]);
  return (await getLocation(id))!;
}

export async function updateLocation(id: string, input: LocationInput): Promise<Location> {
  if (!(await getLocation(id))) throw new Error("Location not found");
  validateLocationInput(input);
  await execute(
    "UPDATE locations SET name = ?, address = ? WHERE id = ?",
    [input.name.trim(), input.address.trim(), id]
  );
  return (await getLocation(id))!;
}

export async function deleteLocation(id: string): Promise<boolean> {
  const result = await execute("DELETE FROM locations WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
