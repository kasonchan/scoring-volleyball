import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "volleyball.db");

let db: Database.Database | null = null;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      jersey_number INTEGER NOT NULL,
      role TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      home_team_id TEXT NOT NULL,
      away_team_id TEXT NOT NULL,
      location_id TEXT,
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      serving_team TEXT,
      current_set INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (home_team_id) REFERENCES teams(id),
      FOREIGN KEY (away_team_id) REFERENCES teams(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS match_sets (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      home_score INTEGER NOT NULL DEFAULT 0,
      away_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      UNIQUE(match_id, set_number)
    );

    CREATE TABLE IF NOT EXISTS rotations (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 6),
      player_id TEXT NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(match_id, team_id, set_number, position)
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      place_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  migrateSchema(database);
}

function migrateSchema(database: Database.Database) {
  const columns = database.prepare("PRAGMA table_info(matches)").all() as { name: string }[];
  const names = new Set(columns.map((c) => c.name));
  if (!names.has("location_id")) {
    database.exec("ALTER TABLE matches ADD COLUMN location_id TEXT REFERENCES locations(id)");
  }
  if (!names.has("scheduled_at")) {
    database.exec("ALTER TABLE matches ADD COLUMN scheduled_at TEXT");
  }

  const playerColumns = database.prepare("PRAGMA table_info(players)").all() as { name: string }[];
  const playerNames = new Set(playerColumns.map((c) => c.name));
  if (!playerNames.has("role")) {
    database.exec("ALTER TABLE players ADD COLUMN role TEXT");
  }
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}
