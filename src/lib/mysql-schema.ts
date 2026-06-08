/** MySQL DDL for a fresh database (final schema; no SQLite-era migrations). */
export const MYSQL_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS namespaces (
    id CHAR(36) PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    spectator_access VARCHAR(16) NOT NULL DEFAULT 'members',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    handle VARCHAR(64) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY idx_users_email (email),
    UNIQUE KEY idx_users_handle (handle)
  )`,

  `CREATE TABLE IF NOT EXISTS teams (
    id CHAR(36) PRIMARY KEY,
    namespace_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id)
  )`,

  `CREATE TABLE IF NOT EXISTS players (
    id CHAR(36) PRIMARY KEY,
    team_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    jersey_number INT NOT NULL,
    role VARCHAR(32),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS locations (
    id CHAR(36) PRIMARY KEY,
    namespace_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE,
    longitude DOUBLE,
    place_id VARCHAR(255),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id)
  )`,

  `CREATE TABLE IF NOT EXISTS matches (
    id CHAR(36) PRIMARY KEY,
    namespace_id CHAR(36) NOT NULL,
    home_team_id CHAR(36) NOT NULL,
    away_team_id CHAR(36) NOT NULL,
    location_id CHAR(36),
    scheduled_at DATETIME(3),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    serving_team VARCHAR(8),
    current_set INT NOT NULL DEFAULT 1,
    spectator_token VARCHAR(64) UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id),
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_matches_spectator_token ON matches(spectator_token)`,

  `CREATE TABLE IF NOT EXISTS match_sets (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    home_score INT NOT NULL DEFAULT 0,
    away_score INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    home_game_captain_id CHAR(36),
    away_game_captain_id CHAR(36),
    court_swapped TINYINT(1) NOT NULL DEFAULT 0,
    started_at DATETIME(3),
    ended_at DATETIME(3),
    home_libero_id CHAR(36),
    away_libero_id CHAR(36),
    home_libero_ids JSON,
    away_libero_ids JSON,
    UNIQUE KEY match_set_unique (match_id, set_number),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (home_game_captain_id) REFERENCES players(id),
    FOREIGN KEY (away_game_captain_id) REFERENCES players(id),
    FOREIGN KEY (home_libero_id) REFERENCES players(id),
    FOREIGN KEY (away_libero_id) REFERENCES players(id)
  )`,

  `CREATE TABLE IF NOT EXISTS rotations (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    position INT NOT NULL CHECK (position BETWEEN 1 AND 6),
    player_id CHAR(36) NOT NULL,
    UNIQUE KEY rotation_unique (match_id, team_id, set_number, position),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
  )`,

  `CREATE TABLE IF NOT EXISTS substitutions (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    position INT NOT NULL CHECK (position BETWEEN 1 AND 6),
    player_out_id CHAR(36) NOT NULL,
    player_in_id CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (player_out_id) REFERENCES players(id),
    FOREIGN KEY (player_in_id) REFERENCES players(id)
  )`,

  `CREATE TABLE IF NOT EXISTS timeouts (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )`,

  `CREATE TABLE IF NOT EXISTS libero_replacements (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    libero_id CHAR(36) NOT NULL,
    player_id CHAR(36) NOT NULL,
    event_type VARCHAR(8) NOT NULL CHECK (event_type IN ('in', 'out')),
    position INT NOT NULL CHECK (position BETWEEN 1 AND 6),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (libero_id) REFERENCES players(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
  )`,

  `CREATE TABLE IF NOT EXISTS rallies (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    home_score INT NOT NULL,
    away_score INT NOT NULL,
    serving_team VARCHAR(8),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS score_events (
    id CHAR(36) PRIMARY KEY,
    match_id CHAR(36) NOT NULL,
    set_number INT NOT NULL,
    team_id CHAR(36) NOT NULL,
    scoring_team VARCHAR(8) NOT NULL CHECK (scoring_team IN ('home', 'away')),
    home_score INT NOT NULL,
    away_score INT NOT NULL,
    side_out TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )`,

  `CREATE TABLE IF NOT EXISTS namespace_members (
    user_id CHAR(36) NOT NULL,
    namespace_id CHAR(36) NOT NULL,
    joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id, namespace_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_namespace_members_user ON namespace_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_namespace_members_namespace ON namespace_members(namespace_id)`,

  `CREATE TABLE IF NOT EXISTS login_tokens (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    user_id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_login_tokens_user ON login_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email)`,
];

/** All application tables created by MYSQL_SCHEMA_STATEMENTS. */
export const MYSQL_APPLICATION_TABLES = [
  "libero_replacements",
  "locations",
  "login_tokens",
  "match_sets",
  "matches",
  "namespace_members",
  "namespaces",
  "players",
  "rallies",
  "rotations",
  "score_events",
  "substitutions",
  "teams",
  "timeouts",
  "users",
] as const;

/** Tables cleared between tests (dependency order). */
export const MYSQL_TRUNCATE_TABLES = [
  "score_events",
  "rallies",
  "libero_replacements",
  "timeouts",
  "substitutions",
  "rotations",
  "match_sets",
  "matches",
  "players",
  "teams",
  "locations",
  "login_tokens",
  "namespace_members",
  "users",
  "namespaces",
];
