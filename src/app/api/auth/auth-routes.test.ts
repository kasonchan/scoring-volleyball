import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTestEmailSink, type LoginTokenEmailPayload } from "@/lib/email";
import { setupTestDatabase } from "@/test/test-db";

const cookieSet = vi.fn();
const cookieDelete = vi.fn();
const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: cookieSet,
    delete: cookieDelete,
    get: cookieGet,
  })),
}));

describe("auth API routes", () => {
  setupTestDatabase();

  let lastEmail: LoginTokenEmailPayload | null = null;

  beforeEach(() => {
    cookieSet.mockClear();
    cookieDelete.mockClear();
    cookieGet.mockClear();
    lastEmail = null;
    setTestEmailSink((payload) => {
      lastEmail = payload;
    });
  });

  async function signupAndGetToken(email = "api@example.com") {
    const { POST: signup } = await import("@/app/api/auth/signup/route");
    const res = await signup(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Api",
          lastName: "User",
          email,
        }),
      })
    );
    expect(res.status).toBe(201);
    expect(lastEmail?.token).toBeTruthy();
    return lastEmail!.token;
  }

  it("POST /api/auth/signup creates user and emails token (no session)", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Api",
          lastName: "User",
          email: "api@example.com",
        }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe("api@example.com");
    expect(data.message).toMatch(/email/i);
    expect(cookieSet).not.toHaveBeenCalled();
    expect(lastEmail?.purpose).toBe("signup");
  });

  it("POST /api/auth/signup returns 400 for duplicate email", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const body = JSON.stringify({
      firstName: "Dup",
      lastName: "User",
      email: "dupapi@example.com",
    });
    await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
    );
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email already exists/i);
  });

  it("POST /api/auth/login authenticates with token and sets cookie", async () => {
    const token = await signupAndGetToken("loginapi@example.com");
    cookieSet.mockClear();

    const { POST: login } = await import("@/app/api/auth/login/route");
    const res = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "loginapi@example.com",
          token,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.handle).toBeTruthy();
    expect(cookieSet).toHaveBeenCalled();
  });

  it("POST /api/auth/login returns 401 for bad token", async () => {
    await signupAndGetToken("badtoken@example.com");
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "badtoken@example.com",
          token: "ZZZZ-ZZZZ",
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/request-token emails login token", async () => {
    await signupAndGetToken("request@example.com");
    lastEmail = null;

    const { POST } = await import("@/app/api/auth/request-token/route");
    const res = await POST(
      new Request("http://localhost/api/auth/request-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "request@example.com" }),
      })
    );
    expect(res.status).toBe(200);
    expect(lastEmail?.purpose).toBe("login");
  });

  it("POST /api/auth/logout clears session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(cookieDelete).toHaveBeenCalledWith("vb_session");
  });

  it("GET /api/auth/me returns user when session cookie is valid", async () => {
    const token = await signupAndGetToken("me@example.com");
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "me@example.com", token }),
      })
    );
    const sessionToken = cookieSet.mock.calls.at(-1)?.[1] as string;
    cookieGet.mockReturnValue({ value: sessionToken });

    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("me@example.com");
  });

  it("GET /api/auth/me returns 401 without session", async () => {
    cookieGet.mockReturnValue(undefined);
    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
