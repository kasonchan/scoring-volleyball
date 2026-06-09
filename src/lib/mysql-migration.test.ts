import { describe, expect, it } from "vitest";
import {
  DEFAULT_NAMESPACE_SLUG,
  HAIKYU_NAMESPACE_SLUG,
  PUBLIC_NAMESPACE_SLUG,
} from "@/lib/constants";
import { query } from "@/lib/db";
import { MYSQL_APPLICATION_TABLES } from "@/lib/mysql-schema";
import { addNamespaceMember } from "@/lib/namespace-members";
import { getAllNamespaces, getNamespaceBySlug } from "@/lib/namespaces";
import {
  createMatch,
  createTeam,
  getMatch,
  getMatchSpectatorToken,
  scorePoint,
  setMatchRotation,
  startRally,
} from "@/lib/queries";
import { createUser, getUserByEmail } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

function testDatabaseName(): string {
  return process.env.MYSQL_DATABASE ?? "volleyball_test";
}

async function listApplicationTables(): Promise<string[]> {
  const rows = await query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [testDatabaseName()]
  );
  return rows.map((row) => row.TABLE_NAME);
}

async function listTableColumns(table: string): Promise<string[]> {
  const rows = await query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [testDatabaseName(), table]
  );
  return rows.map((row) => row.COLUMN_NAME);
}

function roster(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix} Player ${i + 1}`,
    jerseyNumber: i + 1,
  }));
}

describe("MySQL migration", () => {
  setupTestDatabase();

  describe("schema", () => {
    it("creates every application table", async () => {
      const tables = await listApplicationTables();
      expect(tables).toEqual([...MYSQL_APPLICATION_TABLES]);
    });

    it("includes migrated match columns (namespace, spectator token, scheduling)", async () => {
      const columns = await listTableColumns("matches");
      expect(columns).toEqual(
        expect.arrayContaining([
          "namespace_id",
          "spectator_token",
          "location_id",
          "scheduled_at",
          "serving_team",
          "current_set",
        ])
      );
    });

    it("includes JSON libero columns on match_sets", async () => {
      const columns = await listTableColumns("match_sets");
      expect(columns).toEqual(
        expect.arrayContaining([
          "home_libero_ids",
          "away_libero_ids",
          "court_swapped",
          "started_at",
          "ended_at",
        ])
      );
    });

    it("uses the final users schema without legacy SQLite name column", async () => {
      const columns = await listTableColumns("users");
      expect(columns).toEqual(
        expect.arrayContaining(["first_name", "last_name", "email", "handle"])
      );
      expect(columns).not.toContain("name");
    });

    it("seeds default namespaces on init", async () => {
      const namespaces = await getAllNamespaces();
      const slugs = namespaces.map((ns) => ns.slug).sort();
      expect(slugs).toEqual(
        [DEFAULT_NAMESPACE_SLUG, HAIKYU_NAMESPACE_SLUG, PUBLIC_NAMESPACE_SLUG].sort()
      );

      const publicNs = await getNamespaceBySlug(PUBLIC_NAMESPACE_SLUG);
      const haikyuNs = await getNamespaceBySlug(HAIKYU_NAMESPACE_SLUG);
      expect(publicNs?.spectatorAccess).toBe("public");
      expect(haikyuNs?.spectatorAccess).toBe("link");
    });
  });

  describe("data layer", () => {
    it("persists users with case-insensitive email lookup", async () => {
      await createUser({
        firstName: "Migration",
        lastName: "Test",
        email: "Migrate@Example.COM",
      });

      const found = await getUserByEmail("migrate@example.com");
      expect(found?.email).toBe("migrate@example.com");
    });

    it("supports INSERT IGNORE for namespace membership", async () => {
      const user = await createUser({
        firstName: "Member",
        lastName: "Twice",
        email: "member-twice@example.com",
      });
      const ns = (await getNamespaceBySlug(PUBLIC_NAMESPACE_SLUG))!;

      await addNamespaceMember(user.id, ns.id);
      await expect(addNamespaceMember(user.id, ns.id)).resolves.toBeUndefined();
    });

    it("runs match setup and live scoring against MySQL", async () => {
      const ns = (await getNamespaceBySlug(PUBLIC_NAMESPACE_SLUG))!;
      const home = await createTeam(ns.id, {
        name: "Migration Home",
        players: [
          ...roster("Home", 6),
          { name: "Home Libero", jerseyNumber: 99, role: "libero" as const },
        ],
      });
      const away = await createTeam(ns.id, {
        name: "Migration Away",
        players: roster("Away", 6),
      });

      const match = await createMatch(ns.id, {
        homeTeamId: home.id,
        awayTeamId: away.id,
      });
      expect(await getMatchSpectatorToken(match.id, ns.id)).toBeTruthy();

      const starters = home.players!.filter((p) => p.role !== "libero");
      const homeIds = starters.map((p) => p.id);
      const awayIds = away.players!.map((p) => p.id);
      const liberoPlayer = home.players!.find((p) => p.role === "libero")!;

      await setMatchRotation(match.id, {
        homeRotation: homeIds,
        awayRotation: awayIds,
        servingTeam: "home",
        homeLiberoIds: [liberoPlayer.id],
        homeGameCaptainId: homeIds[0],
        awayGameCaptainId: awayIds[0],
      });

      await startRally(match.id);
      const scored = await scorePoint(match.id, "home");

      expect(scored.status).toBe("in_progress");
      expect(scored.sets?.[0]?.homeScore).toBe(1);
      expect(scored.sets?.[0]?.awayScore).toBe(0);
      expect(scored.sets?.[0]?.homeLiberoIds).toContain(liberoPlayer.id);
      expect(scored.scoreEvents?.length).toBe(1);

      const reloaded = await getMatch(match.id, ns.id);
      expect(reloaded?.homeTeam?.name).toBe("Migration Home");
      expect(reloaded?.sets?.[0]?.homeScore).toBe(1);
    });
  });
});
