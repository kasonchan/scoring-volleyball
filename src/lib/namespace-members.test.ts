import { describe, expect, it } from "vitest";
import { AUTO_JOIN_NAMESPACE_SLUG, DEFAULT_NAMESPACE_SLUG } from "@/lib/constants";
import {
  ensurePublicMembership,
  joinAllNamespaces,
  joinNamespace,
  listNamespacesWithMembership,
} from "@/lib/namespace-members";
import { filterNamespacesForPublicDirectory } from "@/lib/namespaces";
import { getNamespaceBySlug } from "@/lib/namespaces";
import { createUser } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("namespace-members", () => {
  setupTestDatabase();

  it("auto-joins public on signup", () => {
    const user = createUser({
      firstName: "Member",
      lastName: "Test",
      email: "member@example.com",
    });
    const list = listNamespacesWithMembership(user.id);
    const pub = list.find((ns) => ns.slug === AUTO_JOIN_NAMESPACE_SLUG);
    expect(pub?.joined).toBe(true);
    const global = list.find((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG);
    expect(global?.joined).toBe(false);
  });

  it("hides global and haikyu from public directory list", () => {
    const user = createUser({
      firstName: "Dir",
      lastName: "Test",
      email: "dir@example.com",
    });
    const list = listNamespacesWithMembership(user.id, { publicDirectory: true });
    expect(list.some((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG)).toBe(false);
    expect(list.some((ns) => ns.slug === "haikyu")).toBe(false);
    expect(list.some((ns) => ns.slug === "public")).toBe(true);
  });

  it("allows joining any namespace", () => {
    const user = createUser({
      firstName: "Join",
      lastName: "All",
      email: "joinall@example.com",
    });
    const haikyu = getNamespaceBySlug("haikyu");
    expect(haikyu).toBeTruthy();

    joinNamespace(user.id, "haikyu");
    const list = listNamespacesWithMembership(user.id);
    expect(list.find((ns) => ns.slug === "haikyu")?.joined).toBe(true);
  });

  it("includes the public namespace in full list", () => {
    const list = listNamespacesWithMembership(null);
    expect(list.some((ns) => ns.slug === "public" && ns.name === "Public")).toBe(true);
  });

  it("joinAllNamespaces joins every namespace", () => {
    const user = createUser({
      firstName: "Full",
      lastName: "Member",
      email: "full@example.com",
    });
    joinAllNamespaces(user.id);
    const list = listNamespacesWithMembership(user.id);
    expect(list.every((ns) => ns.joined)).toBe(true);
  });

  it("ensurePublicMembership is idempotent", () => {
    const user = createUser({
      firstName: "Public",
      lastName: "Twice",
      email: "public2@example.com",
    });
    ensurePublicMembership(user.id);
    ensurePublicMembership(user.id);
    const list = listNamespacesWithMembership(user.id);
    const pub = list.find((ns) => ns.slug === AUTO_JOIN_NAMESPACE_SLUG);
    expect(pub?.joined).toBe(true);
  });

  it("filterNamespacesForPublicDirectory removes hidden slugs", () => {
    const all = listNamespacesWithMembership(null);
    const visible = filterNamespacesForPublicDirectory(all);
    expect(visible.length).toBeLessThan(all.length);
    expect(visible.every((ns) => ns.slug !== DEFAULT_NAMESPACE_SLUG)).toBe(true);
  });
});
