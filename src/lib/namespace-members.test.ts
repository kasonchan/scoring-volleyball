import { describe, expect, it } from "vitest";
import { AUTO_JOIN_NAMESPACE_SLUG, DEFAULT_NAMESPACE_SLUG } from "@/lib/constants";
import {
  ensurePublicMembership,
  joinAllNamespaces,
  joinNamespace,
  listNamespacesWithMembership,
  syncUserNamespaceMembership,
} from "@/lib/namespace-members";
import { execute } from "@/lib/db";
import { UNUSED_PASSWORD_HASH } from "@/lib/users";
import { v4 as uuidv4 } from "uuid";
import { filterNamespacesForPublicDirectory } from "@/lib/namespaces";
import { getNamespaceBySlug } from "@/lib/namespaces";
import { createUser } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("namespace-members", () => {
  setupTestDatabase();

  it("auto-joins public on signup", async () => {
    const user = await createUser({
      firstName: "Member",
      lastName: "Test",
      email: "member@example.com",
    });
    const list = await listNamespacesWithMembership(user.id);
    const pub = list.find((ns) => ns.slug === AUTO_JOIN_NAMESPACE_SLUG);
    expect(pub?.joined).toBe(true);
    const global = list.find((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG);
    expect(global?.joined).toBe(false);
  });

  it("hides global and haikyu from public directory list", async () => {
    const user = await createUser({
      firstName: "Dir",
      lastName: "Test",
      email: "dir@example.com",
    });
    const list = await listNamespacesWithMembership(user.id, { publicDirectory: true });
    expect(list.some((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG)).toBe(false);
    expect(list.some((ns) => ns.slug === "haikyu")).toBe(false);
    expect(list.some((ns) => ns.slug === "public")).toBe(true);
  });

  it("allows joining any namespace", async () => {
    const user = await createUser({
      firstName: "Join",
      lastName: "All",
      email: "joinall@example.com",
    });
    const haikyu = await getNamespaceBySlug("haikyu");
    expect(haikyu).toBeTruthy();

    await joinNamespace(user.id, "haikyu");
    const list = await listNamespacesWithMembership(user.id);
    expect(list.find((ns) => ns.slug === "haikyu")?.joined).toBe(true);
  });

  it("includes the public namespace in full list", async () => {
    const list = await listNamespacesWithMembership(null);
    expect(list.some((ns) => ns.slug === "public" && ns.name === "Public")).toBe(true);
  });

  it("joinAllNamespaces joins every namespace", async () => {
    const user = await createUser({
      firstName: "Full",
      lastName: "Member",
      email: "full@example.com",
    });
    await joinAllNamespaces(user.id);
    const list = await listNamespacesWithMembership(user.id);
    expect(list.every((ns) => ns.joined)).toBe(true);
  });

  it("ensurePublicMembership is idempotent", async () => {
    const user = await createUser({
      firstName: "Public",
      lastName: "Twice",
      email: "public2@example.com",
    });
    await ensurePublicMembership(user.id);
    await ensurePublicMembership(user.id);
    const list = await listNamespacesWithMembership(user.id);
    const pub = list.find((ns) => ns.slug === AUTO_JOIN_NAMESPACE_SLUG);
    expect(pub?.joined).toBe(true);
  });

  it("syncUserNamespaceMembership backfills public for existing users", async () => {
    const userId = uuidv4();
    await execute(
      `INSERT INTO users (id, first_name, last_name, email, handle, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, "Legacy", "User", "legacy@example.com", "legacy_user", UNUSED_PASSWORD_HASH]
    );

    await syncUserNamespaceMembership(userId);
    const list = await listNamespacesWithMembership(userId);
    expect(list.find((ns) => ns.slug === AUTO_JOIN_NAMESPACE_SLUG)?.joined).toBe(true);
    expect(list.find((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG)?.joined).toBe(false);
  });

  it("filterNamespacesForPublicDirectory removes hidden slugs", async () => {
    const all = await listNamespacesWithMembership(null);
    const visible = filterNamespacesForPublicDirectory(all);
    expect(visible.length).toBeLessThan(all.length);
    expect(visible.every((ns) => ns.slug !== DEFAULT_NAMESPACE_SLUG)).toBe(true);
  });
});
