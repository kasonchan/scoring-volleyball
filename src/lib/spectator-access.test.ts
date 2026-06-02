import { beforeEach, describe, expect, it, vi } from "vitest";
import { NAMESPACE_SLUG_HEADER } from "@/lib/constants";
import { createTeam, createMatch } from "@/lib/queries";
import { getNamespaceBySlug } from "@/lib/namespaces";
import { createUser } from "@/lib/users";
import { joinNamespace } from "@/lib/namespace-members";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { setupTestDatabase } from "@/test/test-db";

const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe("spectator match access", () => {
  setupTestDatabase();

  beforeEach(() => {
    resetRateLimitStore();
    cookieGet.mockReturnValue(undefined);
  });

  function request(path: string, slug: string, query = "") {
    return new Request(`http://localhost${path}${query}`, {
      method: "GET",
      headers: { [NAMESPACE_SLUG_HEADER]: slug },
    });
  }

  it("public namespace returns redacted matches without session", async () => {
    const ns = getNamespaceBySlug("public")!;
    const home = createTeam(ns.id, {
      name: "Pub Home",
      players: [{ name: "Secret Player", jerseyNumber: 3, role: null }],
    });
    const away = createTeam(ns.id, {
      name: "Pub Away",
      players: [{ name: "Other", jerseyNumber: 4, role: null }],
    });
    createMatch(ns.id, { homeTeamId: home.id, awayTeamId: away.id });

    const { GET } = await import("@/app/api/matches/route");
    const res = await GET(request("/api/matches", "public"));
    expect(res.status).toBe(200);
    const matches = await res.json();
    expect(matches[0].homeTeam.players[0].name).toBe("#3");
  });

  it("haikyu namespace blocks unauthenticated match list", async () => {
    const { GET } = await import("@/app/api/matches/route");
    const res = await GET(request("/api/matches", "haikyu"));
    expect(res.status).toBe(401);
  });

  it("haikyu allows match read with spectator token", async () => {
    const ns = getNamespaceBySlug("haikyu")!;
    const user = createUser({
      firstName: "Link",
      lastName: "Viewer",
      email: "linkviewer@example.com",
    });
    joinNamespace(user.id, "haikyu");

    const home = createTeam(ns.id, {
      name: "Crows",
      players: [{ name: "Hidden Name", jerseyNumber: 10, role: null }],
    });
    const away = createTeam(ns.id, {
      name: "Cats",
      players: [{ name: "Other", jerseyNumber: 11, role: null }],
    });
    const match = createMatch(ns.id, { homeTeamId: home.id, awayTeamId: away.id });

    const { GET: linkGet } = await import("@/app/api/matches/[id]/spectator-link/route");
    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const linkRes = await linkGet(
      request(`/api/matches/${match.id}/spectator-link`, "haikyu"),
      { params: Promise.resolve({ id: match.id }) }
    );
    const linkData = await linkRes.json();
    expect(linkRes.status).toBe(200);

    cookieGet.mockReturnValue(undefined);
    const { GET } = await import("@/app/api/matches/[id]/route");
    const res = await GET(
      request(`/api/matches/${match.id}`, "haikyu", `?t=${linkData.token}`),
      { params: Promise.resolve({ id: match.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.homeTeam.players[0].name).toBe("#10");
  });

  it("members namespace requires login for match read", async () => {
    const ns = getNamespaceBySlug("global")!;
    const home = createTeam(ns.id, {
      name: "G1",
      players: [{ name: "X", jerseyNumber: 1, role: null }],
    });
    const away = createTeam(ns.id, {
      name: "G2",
      players: [{ name: "Y", jerseyNumber: 2, role: null }],
    });
    const match = createMatch(ns.id, { homeTeamId: home.id, awayTeamId: away.id });

    const { GET } = await import("@/app/api/matches/[id]/route");
    const res = await GET(request(`/api/matches/${match.id}`, "global"), {
      params: Promise.resolve({ id: match.id }),
    });
    expect(res.status).toBe(401);
  });
});
