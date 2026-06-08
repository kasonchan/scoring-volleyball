import { describe, expect, it, vi } from "vitest";
import { NAMESPACE_SLUG_HEADER } from "@/lib/constants";
import { createUser } from "@/lib/users";
import { joinNamespace } from "@/lib/namespace-members";
import { setupTestDatabase } from "@/test/test-db";

const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe("namespace-access", () => {
  setupTestDatabase();

  function request(path: string, method = "GET", slug = "public") {
    return new Request(`http://localhost${path}`, {
      method,
      headers: { [NAMESPACE_SLUG_HEADER]: slug },
    });
  }

  it("allows public GET /api/matches without session", async () => {
    const { GET } = await import("@/app/api/matches/route");
    cookieGet.mockReturnValue(undefined);
    const res = await GET(request("/api/matches"));
    expect(res.status).toBe(200);
  });

  it("blocks POST /api/matches without session", async () => {
    const { POST } = await import("@/app/api/matches/route");
    cookieGet.mockReturnValue(undefined);
    const res = await POST(
      request("/api/matches", "POST", "public"),
      undefined as never
    );
    expect(res.status).toBe(401);
  });

  it("blocks GET /api/teams without session", async () => {
    const { GET } = await import("@/app/api/teams/route");
    cookieGet.mockReturnValue(undefined);
    const res = await GET(request("/api/teams"));
    expect(res.status).toBe(401);
  });

  it("allows member POST /api/teams", async () => {
    const user = await createUser({
      firstName: "Staff",
      lastName: "User",
      email: "staff@example.com",
    });
    await joinNamespace(user.id, "public");

    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const { POST } = await import("@/app/api/teams/route");
    const res = await POST(
      new Request("http://localhost/api/teams", {
        method: "POST",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Eagles",
          players: [{ name: "A", jerseyNumber: 1 }],
        }),
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

    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const { POST } = await import("@/app/api/teams/route");
    const createRes = await POST(
      new Request("http://localhost/api/teams", {
        method: "POST",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Public Only",
          players: [{ name: "P1", jerseyNumber: 1 }],
        }),
      })
    );
    const created = await createRes.json();
    expect(createRes.status).toBe(201);

    const { PUT } = await import("@/app/api/teams/[id]/route");
    const putRes = await PUT(
      new Request(`http://localhost/api/teams/${created.id}`, {
        method: "PUT",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "haikyu",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Hijacked",
          players: [{ name: "X", jerseyNumber: 99 }],
        }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(putRes.status).toBe(404);

    const { GET } = await import("@/app/api/teams/[id]/route");
    const getRes = await GET(request(`/api/teams/${created.id}`, "GET", "public"), {
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

    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const { POST } = await import("@/app/api/teams/route");
    const createRes = await POST(
      new Request("http://localhost/api/teams", {
        method: "POST",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Before",
          players: [{ name: "P1", jerseyNumber: 1 }],
        }),
      })
    );
    const created = await createRes.json();

    const { PUT } = await import("@/app/api/teams/[id]/route");
    const putRes = await PUT(
      new Request(`http://localhost/api/teams/${created.id}`, {
        method: "PUT",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "After",
          players: [{ name: "P1", jerseyNumber: 1 }],
        }),
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

    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const { POST } = await import("@/app/api/locations/route");
    const createRes = await POST(
      new Request("http://localhost/api/locations", {
        method: "POST",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Public Gym", address: "1 Main St" }),
      })
    );
    const created = await createRes.json();
    expect(createRes.status).toBe(201);

    const { PUT } = await import("@/app/api/locations/[id]/route");
    const putRes = await PUT(
      new Request(`http://localhost/api/locations/${created.id}`, {
        method: "PUT",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "haikyu",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hijacked", address: "Elsewhere" }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(putRes.status).toBe(404);

    const { GET } = await import("@/app/api/locations/[id]/route");
    const getRes = await GET(request(`/api/locations/${created.id}`, "GET", "public"), {
      params: Promise.resolve({ id: created.id }),
    });
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

    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const { POST } = await import("@/app/api/locations/route");
    const createRes = await POST(
      new Request("http://localhost/api/locations", {
        method: "POST",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Old Gym", address: "1 Main St" }),
      })
    );
    const created = await createRes.json();

    const { PUT } = await import("@/app/api/locations/[id]/route");
    const putRes = await PUT(
      new Request(`http://localhost/api/locations/${created.id}`, {
        method: "PUT",
        headers: {
          [NAMESPACE_SLUG_HEADER]: "public",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "New Gym", address: "2 Main St" }),
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
    const { createSessionToken } = await import("@/lib/session");
    cookieGet.mockReturnValue({ value: createSessionToken(user.id) });

    const { GET } = await import("@/app/api/teams/route");
    const res = await GET(request("/api/teams", "GET", "haikyu"));
    expect(res.status).toBe(403);
  });
});
