import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "./constants";
import { generateUniqueHandle } from "./handle";

const DEFAULT_NAMESPACE_NAME = "Global";
const DEFAULT_NAMESPACE_DESCRIPTION =
  "Default volleyball league and tournament scoring.";
const PUBLIC_NAMESPACE_NAME = "Public";
const PUBLIC_NAMESPACE_DESCRIPTION =
  "Open public volleyball league and tournament scoring.";
const HAIKYU_NAMESPACE_NAME = "Haikyu";
const HAIKYU_NAMESPACE_DESCRIPTION = "Haikyu volleyball league and tournament scoring.";

const DATA_DIR = path.join(process.cwd(), "data");

let dbPathOverride: string | null = null;
let db: Database.Database | null = null;

function resolveDbPath(): string {
  return dbPathOverride ?? path.join(DATA_DIR, "volleyball.db");
}

/** Point getDb() at a file (tests). Pass null to restore default. */
export function setDbPathForTests(dbPath: string | null): void {
  if (db) {
    db.close();
    db = null;
  }
  dbPathOverride = dbPath;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

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

    CREATE TABLE IF NOT EXISTS substitutions (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 6),
      player_out_id TEXT NOT NULL,
      player_in_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (player_out_id) REFERENCES players(id),
      FOREIGN KEY (player_in_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS timeouts (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS libero_replacements (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      libero_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('in', 'out')),
      position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 6),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (libero_id) REFERENCES players(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS rallies (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      serving_team TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS score_events (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      team_id TEXT NOT NULL,
      scoring_team TEXT NOT NULL CHECK(scoring_team IN ('home', 'away')),
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      side_out INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id)
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

  const setColumns = database.prepare("PRAGMA table_info(match_sets)").all() as { name: string }[];
  const setNames = new Set(setColumns.map((c) => c.name));
  if (!setNames.has("home_game_captain_id")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN home_game_captain_id TEXT REFERENCES players(id)");
  }
  if (!setNames.has("away_game_captain_id")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN away_game_captain_id TEXT REFERENCES players(id)");
  }
  if (!setNames.has("court_swapped")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN court_swapped INTEGER NOT NULL DEFAULT 0");
  }
  if (!setNames.has("started_at")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN started_at TEXT");
  }
  if (!setNames.has("ended_at")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN ended_at TEXT");
  }
  if (!setNames.has("home_libero_id")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN home_libero_id TEXT REFERENCES players(id)");
  }
  if (!setNames.has("away_libero_id")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN away_libero_id TEXT REFERENCES players(id)");
  }
  if (!setNames.has("home_libero_ids")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN home_libero_ids TEXT");
  }
  if (!setNames.has("away_libero_ids")) {
    database.exec("ALTER TABLE match_sets ADD COLUMN away_libero_ids TEXT");
  }

  database.exec(`
    UPDATE match_sets
    SET home_libero_ids = json_array(home_libero_id)
    WHERE home_libero_id IS NOT NULL
      AND (home_libero_ids IS NULL OR home_libero_ids = '' OR home_libero_ids = '[]')
  `);
  database.exec(`
    UPDATE match_sets
    SET away_libero_ids = json_array(away_libero_id)
    WHERE away_libero_id IS NOT NULL
      AND (away_libero_ids IS NULL OR away_libero_ids = '' OR away_libero_ids = '[]')
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS substitutions (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 6),
      player_out_id TEXT NOT NULL,
      player_in_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (player_out_id) REFERENCES players(id),
      FOREIGN KEY (player_in_id) REFERENCES players(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS timeouts (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS libero_replacements (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      libero_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('in', 'out')),
      position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 6),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (libero_id) REFERENCES players(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS rallies (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      serving_team TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS score_events (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      team_id TEXT NOT NULL,
      scoring_team TEXT NOT NULL CHECK(scoring_team IN ('home', 'away')),
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      side_out INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS namespaces (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const teamColumns = database.prepare("PRAGMA table_info(teams)").all() as { name: string }[];
  if (!new Set(teamColumns.map((c) => c.name)).has("namespace_id")) {
    database.exec("ALTER TABLE teams ADD COLUMN namespace_id TEXT REFERENCES namespaces(id)");
  }
  const locationColumns = database
    .prepare("PRAGMA table_info(locations)")
    .all() as { name: string }[];
  if (!new Set(locationColumns.map((c) => c.name)).has("namespace_id")) {
    database.exec(
      "ALTER TABLE locations ADD COLUMN namespace_id TEXT REFERENCES namespaces(id)"
    );
  }
  const matchColumns = database.prepare("PRAGMA table_info(matches)").all() as { name: string }[];
  if (!new Set(matchColumns.map((c) => c.name)).has("namespace_id")) {
    database.exec(
      "ALTER TABLE matches ADD COLUMN namespace_id TEXT REFERENCES namespaces(id)"
    );
  }

  migratePublicNamespaceToGlobal(database);

  ensureNamespace(
    database,
    HAIKYU_NAMESPACE_SLUG,
    HAIKYU_NAMESPACE_NAME,
    HAIKYU_NAMESPACE_DESCRIPTION
  );

  ensureNamespace(
    database,
    PUBLIC_NAMESPACE_SLUG,
    PUBLIC_NAMESPACE_NAME,
    PUBLIC_NAMESPACE_DESCRIPTION
  );

  let namespaceId = ensureNamespace(
    database,
    DEFAULT_NAMESPACE_SLUG,
    DEFAULT_NAMESPACE_NAME,
    DEFAULT_NAMESPACE_DESCRIPTION
  );

  database.prepare("UPDATE teams SET namespace_id = ? WHERE namespace_id IS NULL").run(namespaceId);
  database
    .prepare("UPDATE locations SET namespace_id = ? WHERE namespace_id IS NULL")
    .run(namespaceId);
  database.prepare("UPDATE matches SET namespace_id = ? WHERE namespace_id IS NULL").run(namespaceId);

  migrateUsersTable(database);
  migrateLoginTokensTable(database);
  migrateNamespaceMembersTable(database, namespaceId);
}

function migrateNamespaceMembersTable(database: Database.Database, globalNamespaceId: string) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS namespace_members (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      namespace_id TEXT NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, namespace_id)
    );
    CREATE INDEX IF NOT EXISTS idx_namespace_members_user ON namespace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_namespace_members_namespace ON namespace_members(namespace_id);
  `);
  database
    .prepare(
      `INSERT OR IGNORE INTO namespace_members (user_id, namespace_id)
       SELECT u.id, ? FROM users u`
    )
    .run(globalNamespaceId);
}

/** Rename legacy default slug `public` → `global` without losing data. */
function migratePublicNamespaceToGlobal(database: Database.Database) {
  const publicNs = database
    .prepare("SELECT id FROM namespaces WHERE slug = ?")
    .get("public") as { id: string } | undefined;
  if (!publicNs) return;

  const globalNs = database
    .prepare("SELECT id FROM namespaces WHERE slug = ?")
    .get("global") as { id: string } | undefined;

  if (globalNs) {
    database.prepare("UPDATE teams SET namespace_id = ? WHERE namespace_id = ?").run(globalNs.id, publicNs.id);
    database
      .prepare("UPDATE locations SET namespace_id = ? WHERE namespace_id = ?")
      .run(globalNs.id, publicNs.id);
    database
      .prepare("UPDATE matches SET namespace_id = ? WHERE namespace_id = ?")
      .run(globalNs.id, publicNs.id);
    database.prepare("DELETE FROM namespaces WHERE slug = ?").run("public");
  } else {
    database
      .prepare("UPDATE namespaces SET slug = ?, name = ? WHERE slug = ?")
      .run("global", DEFAULT_NAMESPACE_NAME, "public");
  }
}

function ensureNamespace(
  database: Database.Database,
  slug: string,
  name: string,
  description: string
): string {
  const existing = database
    .prepare("SELECT id FROM namespaces WHERE slug = ?")
    .get(slug) as { id: string } | undefined;

  if (existing) {
    database
      .prepare("UPDATE namespaces SET name = ?, description = ? WHERE slug = ?")
      .run(name, description, slug);
    return existing.id;
  }

  const id = uuidv4();
  database
    .prepare("INSERT INTO namespaces (id, slug, name, description) VALUES (?, ?, ?, ?)")
    .run(id, slug, name, description);
  return id;
}

function migrateLoginTokensTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS login_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_login_tokens_user ON login_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email);
  `);
}

function migrateUsersTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const userColumns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (userColumns.length === 0) return;

  const columnNames = new Set(userColumns.map((c) => c.name));
  if (!columnNames.has("first_name")) {
    database.exec("ALTER TABLE users ADD COLUMN first_name TEXT");
  }
  if (!columnNames.has("last_name")) {
    database.exec("ALTER TABLE users ADD COLUMN last_name TEXT");
  }
  if (!columnNames.has("handle")) {
    database.exec("ALTER TABLE users ADD COLUMN handle TEXT");
  }

  const hasLegacyName = columnNames.has("name");
  const selectSql = hasLegacyName
    ? "SELECT id, email, name, first_name, last_name, handle FROM users"
    : "SELECT id, email, first_name, last_name, handle FROM users";

  const rows = database.prepare(selectSql).all() as Array<{
    id: string;
    email: string;
    name?: string | null;
    first_name: string | null;
    last_name: string | null;
    handle: string | null;
  }>;

  for (const row of rows) {
    let firstName = row.first_name?.trim() ?? "";
    let lastName = row.last_name?.trim() ?? "";
    if ((!firstName || !lastName) && row.name) {
      const parts = String(row.name).trim().split(/\s+/);
      firstName = firstName || parts[0] || "User";
      lastName = lastName || parts.slice(1).join(" ") || "User";
    }
    if (!firstName) firstName = "User";
    if (!lastName) lastName = "User";

    const needsNames = !row.first_name?.trim() || !row.last_name?.trim();
    const needsHandle = !row.handle?.trim();

    const displayName = `${firstName} ${lastName}`.trim();

    if (needsHandle) {
      const handle = generateUniqueHandle(firstName, lastName);
      if (needsNames) {
        if (hasLegacyName) {
          database
            .prepare(
              "UPDATE users SET first_name = ?, last_name = ?, handle = ?, name = ? WHERE id = ?"
            )
            .run(firstName, lastName, handle, displayName, row.id);
        } else {
          database
            .prepare("UPDATE users SET first_name = ?, last_name = ?, handle = ? WHERE id = ?")
            .run(firstName, lastName, handle, row.id);
        }
      } else {
        database.prepare("UPDATE users SET handle = ? WHERE id = ?").run(handle, row.id);
        if (hasLegacyName) {
          database.prepare("UPDATE users SET name = ? WHERE id = ?").run(displayName, row.id);
        }
      }
    } else if (needsNames) {
      if (hasLegacyName) {
        database
          .prepare("UPDATE users SET first_name = ?, last_name = ?, name = ? WHERE id = ?")
          .run(firstName, lastName, displayName, row.id);
      } else {
        database
          .prepare("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?")
          .run(firstName, lastName, row.id);
      }
    } else if (hasLegacyName && row.name !== displayName) {
      database.prepare("UPDATE users SET name = ? WHERE id = ?").run(displayName, row.id);
    }
  }

  if (hasLegacyName) {
    database.exec(`
      UPDATE users
      SET name = trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      WHERE name IS NULL OR trim(name) = ''
    `);
  }

  database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle ON users(handle)`);
}

export function usersTableHasColumn(column: string): boolean {
  const database = getDb();
  const columns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = resolveDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}
