import { describe, expect, it } from "vitest";
import { DEFAULT_NAMESPACE_SLUG } from "@/lib/constants";
import {
  ensureGlobalMembership,
  joinAllNamespaces,
  joinNamespace,
  listNamespacesWithMembership,
} from "@/lib/namespace-members";
import { getNamespaceBySlug } from "@/lib/namespaces";
import { createUser } from "@/lib/users";
import { setupTestDatabase } from "@/test/test-db";

describe("namespace-members", () => {
  setupTestDatabase();

  it("auto-joins global on signup", () => {
    const user = createUser({
      firstName: "Member",
      lastName: "Test",
      email: "member@example.com",
    });
    const list = listNamespacesWithMembership(user.id);
    const global = list.find((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG);
    expect(global?.joined).toBe(true);
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

  it("ensureGlobalMembership is idempotent", () => {
    const user = createUser({
      firstName: "Global",
      lastName: "Twice",
      email: "global2@example.com",
    });
    ensureGlobalMembership(user.id);
    ensureGlobalMembership(user.id);
    const list = listNamespacesWithMembership(user.id);
    const global = list.find((ns) => ns.slug === DEFAULT_NAMESPACE_SLUG);
    expect(global?.joined).toBe(true);
  });
});
