import "@/test/mock-cookies";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getMatches, POST as postMatches } from "@/app/api/matches/route";
import { POST as postLocations } from "@/app/api/locations/route";
import {
  GET as getLocationById,
  PUT as putLocationById,
} from "@/app/api/locations/[id]/route";
import { GET as getTeams, POST as postTeams } from "@/app/api/teams/route";
import { GET as getTeamById, PUT as putTeamById } from "@/app/api/teams/[id]/route";
import { NAMESPACE_SLUG_HEADER } from "@/lib/constants";
import { joinNamespace } from "@/lib/namespace-members";
import { createSessionToken } from "@/lib/session";
import { createUser } from "@/lib/users";
import { cookieGet } from "@/test/mock-cookies";
import { setupTestDatabase } from "@/test/test-db";

describe("namespace-access", () => {
  setupTestDatabase();

  beforeEach(() => {
    cookieGet.mockReset();
  });

  function request(path: string, method = "GET", slug = "public") {
    return new Request(`http://localhost${path}`, {
      method,
      headers: { [NAMESPACE_SLUG_HEADER]: slug },
    });
  }

  function authedRequest(
    path: string,
    method: string,
    slug: string,
    userId: string,
    body?: unknown
  ) {
    cookieGet.mockReturnValue({ value: createSessionToken(userId) });
    return new Request(`http://localhost${path}`, {
      method,
      headers: {
        [NAMESPACE_SLUG_HEADER]: slug,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it("allows public GET /api/matches without session", async () => {
    cookieGet.mockReturnValue(undefined);
    const res = await getMatches(request("/api/matches"));
    expect(res.status).toBe(200);
  });

  it("blocks POST /api/matches without session", async () => {
    cookieGet.mockReturnValue(undefined);
    const res = await postMatches(
      request("/api/matches", "POST", "public"),
      undefined as never
    );
    expect(res.status).toBe(401);
  });

  it("blocks GET /api/teams without session", async () => {
    cookieGet.mockReturnValue(undefined);
    const res = await getTeams(request("/api/teams"));
    expect(res.status).toBe(401);
  });

  it("allows member POST /api/teams", async () => {
    const user = await createUser({
      firstName: "Staff",
      lastName: "User",
      email: "staff@example.com",
    });
    await joinNamespace(user.id, "public");

    const res = await postTeams(
      authedRequest("/api/teams", "POST", "public", user.id, {
        name: "Eagles",
        players: [{ name: "A", jerseyNumber: 1 }],
      })
    );
    expect(res.status).toBe(201);
  });

  it("PUT /api/teams/:id rejects cross-namespace updates", async () => {
    const user = await createUser({
      firstName: "Cross",
      lastName: "Ns",
      email: "crossns@example.com",
    });
    await joinNamespace(user.id, "public");
    await joinNamespace(user.id, "haikyu");

    const createRes = await postTeams(
      authedRequest("/api/teams", "POST", "public", user.id, {
        name: "Public Only",
        players: [{ name: "P1", jerseyNumber: 1 }],
      })
    );
    const created = await createRes.json();
    expect(createRes.status).toBe(201);

    const putRes = await putTeamById(
      authedRequest(`/api/teams/${created.id}`, "PUT", "haikyu", user.id, {
        name: "Hijacked",
        players: [{ name: "X", jerseyNumber: 99 }],
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(putRes.status).toBe(404);

    const getRes = await getTeamById(request(`/api/teams/${created.id}`, "GET", "public"), {
      params: Promise.resolve({ id: created.id }),
    });
    const team = await getRes.json();
    expect(team.name).toBe("Public Only");
  });

  it("PUT /api/teams/:id updates team in the same namespace", async () => {
    const user = await createUser({
      firstName: "Same",
      lastName: "Ns",
      email: "samens@example.com",
    });
    await joinNamespace(user.id, "public");

    const createRes = await postTeams(
      authedRequest("/api/teams", "POST", "public", user.id, {
        name: "Before",
        players: [{ name: "P1", jerseyNumber: 1 }],
      })
    );
    const created = await createRes.json();

    const putRes = await putTeamById(
      authedRequest(`/api/teams/${created.id}`, "PUT", "public", user.id, {
        name: "After",
        players: [{ name: "P1", jerseyNumber: 1 }],
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(putRes.status).toBe(200);
    const updated = await putRes.json();
    expect(updated.name).toBe("After");
  });

  it("PUT /api/locations/:id rejects cross-namespace updates", async () => {
    const user = await createUser({
      firstName: "Loc",
      lastName: "Cross",
      email: "loccross@example.com",
    });
    await joinNamespace(user.id, "public");
    await joinNamespace(user.id, "haikyu");

    const createRes = await postLocations(
      authedRequest("/api/locations", "POST", "public", user.id, {
        name: "Public Gym",
        address: "1 Main St",
      })
    );
    const created = await createRes.json();
    expect(createRes.status).toBe(201);

    const putRes = await putLocationById(
      authedRequest(`/api/locations/${created.id}`, "PUT", "haikyu", user.id, {
        name: "Hijacked",
        address: "Elsewhere",
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(putRes.status).toBe(404);

    const getRes = await getLocationById(
      request(`/api/locations/${created.id}`, "GET", "public"),
      { params: Promise.resolve({ id: created.id }) }
    );
    const location = await getRes.json();
    expect(location.name).toBe("Public Gym");
  });

  it("PUT /api/locations/:id updates location in the same namespace", async () => {
    const user = await createUser({
      firstName: "Loc",
      lastName: "Same",
      email: "locsame@example.com",
    });
    await joinNamespace(user.id, "public");

    const createRes = await postLocations(
      authedRequest("/api/locations", "POST", "public", user.id, {
        name: "Old Gym",
        address: "1 Main St",
      })
    );
    const created = await createRes.json();

    const putRes = await putLocationById(
      authedRequest(`/api/locations/${created.id}`, "PUT", "public", user.id, {
        name: "New Gym",
        address: "2 Main St",
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(putRes.status).toBe(200);
    const updated = await putRes.json();
    expect(updated.name).toBe("New Gym");
    expect(updated.address).toBe("2 Main St");
  });

  it("returns 403 for signed-in user who has not joined namespace", async () => {
    const user = await createUser({
      firstName: "Guest",
      lastName: "Only",
      email: "guestonly@example.com",
    });
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const res = await getTeams(request("/api/teams", "GET", "haikyu"));
    expect(res.status).toBe(403);
  });
});
