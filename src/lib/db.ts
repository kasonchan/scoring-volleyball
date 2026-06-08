import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

type SqlParam = string | number | boolean | null | Date | Buffer;
type SqlParams = SqlParam[];
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "./constants";
import { getMysqlPoolOptions } from "./mysql-config";
import {
  MYSQL_SCHEMA_STATEMENTS,
  MYSQL_TRUNCATE_TABLES,
} from "./mysql-schema";

const DEFAULT_NAMESPACE_NAME = "Global";
const DEFAULT_NAMESPACE_DESCRIPTION =
  "Default volleyball league and tournament scoring.";
const PUBLIC_NAMESPACE_NAME = "Public";
const PUBLIC_NAMESPACE_DESCRIPTION =
  "Open public volleyball league and tournament scoring.";
const HAIKYU_NAMESPACE_NAME = "Haikyu";
const HAIKYU_NAMESPACE_DESCRIPTION =
  "Haikyu volleyball league and tournament scoring.";

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = mysql.createPool(getMysqlPoolOptions());
    initPromise = initSchema(pool);
  }
  await initPromise;
  return pool;
}

export async function query<T = RowDataPacket>(
  sql: string,
  params: SqlParams = []
): Promise<T[]> {
  const p = await getPool();
  const [rows] = await p.execute(sql, params as never);
  return rows as T[];
}

export async function queryOne<T = RowDataPacket>(
  sql: string,
  params: SqlParams = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params: SqlParams = []
): Promise<ResultSetHeader> {
  const p = await getPool();
  const [result] = await p.execute<ResultSetHeader>(sql, params as never);
  return result;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initPromise = null;
  }
}

/** Clear all application tables (tests). */
export async function resetTestDatabase(): Promise<void> {
  const p = await getPool();
  await p.execute("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of MYSQL_TRUNCATE_TABLES) {
    await p.execute(`TRUNCATE TABLE \`${table}\``);
  }
  await p.execute("SET FOREIGN_KEY_CHECKS = 1");
  await seedNamespaces(p);
}

async function initSchema(p: Pool): Promise<void> {
  for (const statement of MYSQL_SCHEMA_STATEMENTS) {
    await p.execute(statement);
  }
  await seedNamespaces(p);
}

async function ensureNamespace(
  p: Pool,
  slug: string,
  name: string,
  description: string,
  spectatorAccess: "public" | "members" | "link"
): Promise<string> {
  const existing = await queryOne<RowDataPacket>(
    "SELECT id FROM namespaces WHERE slug = ?",
    [slug]
  );

  if (existing) {
    await execute(
      "UPDATE namespaces SET name = ?, description = ?, spectator_access = ? WHERE slug = ?",
      [name, description, spectatorAccess, slug]
    );
    return existing.id as string;
  }

  const id = uuidv4();
  await execute(
    "INSERT INTO namespaces (id, slug, name, description, spectator_access) VALUES (?, ?, ?, ?, ?)",
    [id, slug, name, description, spectatorAccess]
  );
  return id;
}

async function seedNamespaces(p: Pool): Promise<void> {
  await ensureNamespace(
    p,
    HAIKYU_NAMESPACE_SLUG,
    HAIKYU_NAMESPACE_NAME,
    HAIKYU_NAMESPACE_DESCRIPTION,
    "link"
  );
  await ensureNamespace(
    p,
    PUBLIC_NAMESPACE_SLUG,
    PUBLIC_NAMESPACE_NAME,
    PUBLIC_NAMESPACE_DESCRIPTION,
    "public"
  );
  await ensureNamespace(
    p,
    DEFAULT_NAMESPACE_SLUG,
    DEFAULT_NAMESPACE_NAME,
    DEFAULT_NAMESPACE_DESCRIPTION,
    "members"
  );
}

/** Legacy SQLite column; not present on MySQL schema. */
export function usersTableHasColumn(_column: string): boolean {
  return false;
}
