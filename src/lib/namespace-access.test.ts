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
    const user = createUser({
      firstName: "Staff",
      lastName: "User",
      email: "staff@example.com",
    });
    joinNamespace(user.id, "public");

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

  it("returns 403 for signed-in user who has not joined namespace", async () => {
    const user = createUser({
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
