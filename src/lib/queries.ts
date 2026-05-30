import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import {
  CreateMatchInput,
  CreateTeamInput,
  Match,
  MatchSet,
  Player,
  RotationEntry,
  ServingTeam,
  SetRotationInput,
  Team,
  getSetTargetScore,
  isSetWon,
  rotateClockwise,
  SETS_TO_WIN,
} from "./types";

function rowToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    name: row.name as string,
    jerseyNumber: row.jersey_number as number,
  };
}

function rowToTeam(row: Record<string, unknown>, players: Player[] = []): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    players,
  };
}

function rowToSet(row: Record<string, unknown>): MatchSet {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    setNumber: row.set_number as number,
    homeScore: row.home_score as number,
    awayScore: row.away_score as number,
    status: row.status as MatchSet["status"],
  };
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

export function getAllTeams(): Team[] {
  const db = getDb();
  const teams = db.prepare("SELECT * FROM teams ORDER BY name").all() as Record<string, unknown>[];
  const players = db.prepare("SELECT * FROM players ORDER BY jersey_number").all() as Record<string, unknown>[];
  const playersByTeam = new Map<string, Player[]>();
  for (const row of players) {
    const p = rowToPlayer(row);
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }
  return teams.map((t) => rowToTeam(t, playersByTeam.get(t.id as string) ?? []));
}

export function getTeam(id: string): Team | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const players = db
    .prepare("SELECT * FROM players WHERE team_id = ? ORDER BY jersey_number")
    .all(id) as Record<string, unknown>[];
  return rowToTeam(row, players.map(rowToPlayer));
}

export function createTeam(input: CreateTeamInput): Team {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO teams (id, name) VALUES (?, ?)").run(id, input.name.trim());
  const insertPlayer = db.prepare(
    "INSERT INTO players (id, team_id, name, jersey_number) VALUES (?, ?, ?, ?)"
  );
  for (const p of input.players) {
    insertPlayer.run(uuidv4(), id, p.name.trim(), p.jerseyNumber);
  }
  return getTeam(id)!;
}

export function deleteTeam(id: string): boolean {
  const db = getDb();
  db.prepare("DELETE FROM players WHERE team_id = ?").run(id);
  const result = db.prepare("DELETE FROM teams WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getAllMatches(): Match[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM matches ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map((row) => enrichMatch(row));
}

export function getMatch(id: string): Match | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM matches WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return enrichMatch(row);
}

function enrichMatch(row: Record<string, unknown>): Match {
  const match: Match = {
    id: row.id as string,
    homeTeamId: row.home_team_id as string,
    awayTeamId: row.away_team_id as string,
    status: row.status as Match["status"],
    servingTeam: (row.serving_team as ServingTeam | null) ?? null,
    currentSet: row.current_set as number,
    createdAt: row.created_at as string,
  };
  match.homeTeam = getTeam(match.homeTeamId) ?? undefined;
  match.awayTeam = getTeam(match.awayTeamId) ?? undefined;
  match.sets = getMatchSets(match.id);
  match.rotations = getMatchRotations(match.id, match.currentSet);
  return match;
}

function getMatchSets(matchId: string): MatchSet[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM match_sets WHERE match_id = ? ORDER BY set_number")
    .all(matchId) as Record<string, unknown>[];
  return rows.map(rowToSet);
}

function getMatchRotations(matchId: string, setNumber: number): RotationEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT r.*, p.name, p.jersey_number, p.team_id as p_team_id FROM rotations r JOIN players p ON r.player_id = p.id WHERE r.match_id = ? AND r.set_number = ? ORDER BY r.position"
    )
    .all(matchId, setNumber) as Record<string, unknown>[];
  return rows.map((row) =>
    rowToRotation(row, {
      id: row.player_id as string,
      teamId: row.p_team_id as string,
      name: row.name as string,
      jerseyNumber: row.jersey_number as number,
    })
  );
}

export function createMatch(input: CreateMatchInput): Match {
  const db = getDb();
  if (input.homeTeamId === input.awayTeamId) {
    throw new Error("Home and away teams must be different");
  }
  const id = uuidv4();
  db.prepare(
    "INSERT INTO matches (id, home_team_id, away_team_id, status) VALUES (?, ?, ?, 'scheduled')"
  ).run(id, input.homeTeamId, input.awayTeamId);
  return getMatch(id)!;
}

export function setMatchRotation(matchId: string, input: SetRotationInput): Match {
  const db = getDb();
  const match = getMatch(matchId);
  if (!match) throw new Error("Match not found");

  if (input.homeRotation.length !== 6 || input.awayRotation.length !== 6) {
    throw new Error("Each team must have exactly 6 players in rotation");
  }

  const setNumber = match.currentSet;

  db.prepare("DELETE FROM rotations WHERE match_id = ? AND set_number = ?").run(matchId, setNumber);

  const insert = db.prepare(
    "INSERT INTO rotations (id, match_id, team_id, set_number, position, player_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  input.homeRotation.forEach((playerId, i) => {
    insert.run(uuidv4(), matchId, match.homeTeamId, setNumber, i + 1, playerId);
  });
  input.awayRotation.forEach((playerId, i) => {
    insert.run(uuidv4(), matchId, match.awayTeamId, setNumber, i + 1, playerId);
  });

  const existingSet = db
    .prepare("SELECT id FROM match_sets WHERE match_id = ? AND set_number = ?")
    .get(matchId, setNumber);

  if (!existingSet) {
    db.prepare(
      "INSERT INTO match_sets (id, match_id, set_number, home_score, away_score) VALUES (?, ?, ?, 0, 0)"
    ).run(uuidv4(), matchId, setNumber);
  }

  db.prepare(
    "UPDATE matches SET status = 'in_progress', serving_team = ? WHERE id = ?"
  ).run(input.servingTeam, matchId);

  return getMatch(matchId)!;
}

export function scorePoint(matchId: string, team: ServingTeam): Match {
  const db = getDb();
  const match = getMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match is not in progress");

  const setNumber = match.currentSet;
  const setRow = db
    .prepare("SELECT * FROM match_sets WHERE match_id = ? AND set_number = ?")
    .get(matchId, setNumber) as Record<string, unknown> | undefined;

  if (!setRow) throw new Error("Current set not found");

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
    rotateTeam(matchId, setNumber, scoringTeam);
  } else {
    servingTeam = scoringTeam;
  }

  db.prepare(
    "UPDATE match_sets SET home_score = ?, away_score = ? WHERE match_id = ? AND set_number = ?"
  ).run(homeScore, awayScore, matchId, setNumber);

  db.prepare("UPDATE matches SET serving_team = ? WHERE id = ?").run(servingTeam, matchId);

  const winner = isSetWon(homeScore, awayScore, setNumber);
  if (winner) {
    db.prepare(
      "UPDATE match_sets SET status = 'completed' WHERE match_id = ? AND set_number = ?"
    ).run(matchId, setNumber);

    const completedSets = db
      .prepare(
        "SELECT * FROM match_sets WHERE match_id = ? AND status = 'completed'"
      )
      .all(matchId) as Record<string, unknown>[];

    let homeSetsWon = 0;
    let awaySetsWon = 0;
    for (const s of completedSets) {
      if ((s.home_score as number) > (s.away_score as number)) homeSetsWon++;
      else awaySetsWon++;
    }

    if (homeSetsWon >= SETS_TO_WIN || awaySetsWon >= SETS_TO_WIN) {
      db.prepare("UPDATE matches SET status = 'completed' WHERE id = ?").run(matchId);
    } else {
      const nextSet = setNumber + 1;
      db.prepare("UPDATE matches SET current_set = ? WHERE id = ?").run(nextSet, matchId);
      db.prepare("UPDATE matches SET status = 'setup' WHERE id = ?").run(matchId);
    }
  }

  return getMatch(matchId)!;
}

function rotateTeam(matchId: string, setNumber: number, team: ServingTeam) {
  const db = getDb();
  const match = getMatch(matchId);
  if (!match) return;

  const teamId = team === "home" ? match.homeTeamId : match.awayTeamId;
  const rows = db
    .prepare(
      "SELECT * FROM rotations WHERE match_id = ? AND team_id = ? AND set_number = ? ORDER BY position"
    )
    .all(matchId, teamId, setNumber) as Record<string, unknown>[];

  const playerIds = rows.map((r) => r.player_id as string);
  const rotated = rotateClockwise(playerIds);

  const update = db.prepare(
    "UPDATE rotations SET player_id = ? WHERE match_id = ? AND team_id = ? AND set_number = ? AND position = ?"
  );
  rotated.forEach((playerId, i) => {
    update.run(playerId, matchId, teamId, setNumber, i + 1);
  });
}

