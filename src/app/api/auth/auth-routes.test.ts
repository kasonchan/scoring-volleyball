import "@/test/mock-cookies";
import { beforeEach, describe, expect, it } from "vitest";
import { setTestEmailSink, type LoginTokenEmailPayload } from "@/lib/email";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { cookieDelete, cookieGet, cookieSet } from "@/test/mock-cookies";
import { setupTestDatabase } from "@/test/test-db";

describe("auth API routes", () => {
  setupTestDatabase();

  let lastEmail: LoginTokenEmailPayload | null = null;

  beforeEach(() => {
    resetRateLimitStore();
    cookieSet.mockClear();
    cookieDelete.mockClear();
    cookieGet.mockClear();
    lastEmail = null;
    setTestEmailSink((payload) => {
      lastEmail = payload;
    });
  });

  function authPost(
    path: string,
    body: unknown,
    clientIp = "203.0.113.50"
  ): Request {
    return new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp,
      },
      body: JSON.stringify(body),
    });
  }

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
      authPost("/api/auth/request-token", { email: "request@example.com" })
    );
    expect(res.status).toBe(200);
    expect(lastEmail?.purpose).toBe("login");
  });

  it("POST /api/auth/request-token returns same response when email is unknown", async () => {
    const { POST } = await import("@/app/api/auth/request-token/route");

    const unknownRes = await POST(
      authPost("/api/auth/request-token", { email: "unknown@example.com" })
    );
    expect(unknownRes.status).toBe(200);
    expect(lastEmail).toBeNull();
    const unknownBody = await unknownRes.json();

    await signupAndGetToken("known@example.com");
    lastEmail = null;

    const knownRes = await POST(
      authPost("/api/auth/request-token", { email: "known@example.com" })
    );
    expect(knownRes.status).toBe(200);
    expect(lastEmail?.purpose).toBe("login");
    const knownBody = await knownRes.json();

    expect(unknownBody.message).toBe(knownBody.message);
    expect(unknownBody).not.toHaveProperty("error");
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

  it("PATCH /api/auth/me updates profile when signed in", async () => {
    const token = await signupAndGetToken("profile@example.com");
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "profile@example.com", token }),
      })
    );
    const sessionToken = cookieSet.mock.calls.at(-1)?.[1] as string;
    cookieGet.mockReturnValue({ value: sessionToken });

    const { PATCH } = await import("@/app/api/auth/me/route");
    const res = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Updated",
          lastName: "User",
          email: "profile@example.com",
          handle: "updated_user",
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.firstName).toBe("Updated");
    expect(data.user.handle).toBe("updated_user");
  });

  it("PATCH /api/auth/me requires token to change email", async () => {
    const token = await signupAndGetToken("emailchange@example.com");
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(
      authPost("/api/auth/login", { email: "emailchange@example.com", token })
    );
    const sessionToken = cookieSet.mock.calls.at(-1)?.[1] as string;
    cookieGet.mockReturnValue({ value: sessionToken });

    const { PATCH } = await import("@/app/api/auth/me/route");
    const blocked = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Email",
          lastName: "Change",
          email: "newaddr@example.com",
          handle: "email_change",
        }),
      })
    );
    expect(blocked.status).toBe(400);
    const blockedData = await blocked.json();
    expect(blockedData.error).toMatch(/verification token/i);
  });

  it("PATCH /api/auth/me changes email with verification token", async () => {
    const token = await signupAndGetToken("verifiedchange@example.com");
    const { POST: login } = await import("@/app/api/auth/login/route");
    await login(
      authPost("/api/auth/login", { email: "verifiedchange@example.com", token })
    );
    const sessionToken = cookieSet.mock.calls.at(-1)?.[1] as string;
    cookieGet.mockReturnValue({ value: sessionToken });

    const { POST: requestChange } = await import(
      "@/app/api/auth/me/request-email-change/route"
    );
    lastEmail = null;
    const sendRes = await requestChange(
      new Request("http://localhost/api/auth/me/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "verifiednew@example.com" }),
      })
    );
    expect(sendRes.status).toBe(200);
    expect(lastEmail?.purpose).toBe("email_change");

    const { PATCH } = await import("@/app/api/auth/me/route");
    const res = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Verified",
          lastName: "Change",
          email: "verifiednew@example.com",
          handle: "verified_change",
          emailVerificationToken: lastEmail!.token,
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("verifiednew@example.com");
  });

  it("PATCH /api/auth/me returns 401 without session", async () => {
    cookieGet.mockReturnValue(undefined);
    const { PATCH } = await import("@/app/api/auth/me/route");
    const res = await PATCH(
      new Request("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "A",
          lastName: "B",
          email: "x@example.com",
          handle: "ab_user",
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/request-token returns 429 when email limit exceeded", async () => {
    await signupAndGetToken("ratelimit@example.com");
    const { POST } = await import("@/app/api/auth/request-token/route");

    for (let i = 0; i < 5; i++) {
      const res = await POST(
        authPost("/api/auth/request-token", { email: "ratelimit@example.com" })
      );
      expect(res.status).toBe(200);
    }

    const blocked = await POST(
      authPost("/api/auth/request-token", { email: "ratelimit@example.com" })
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    const data = await blocked.json();
    expect(data.error).toMatch(/too many requests/i);
  });

  it("POST /api/auth/login returns 429 when email limit exceeded", async () => {
    const { POST: login } = await import("@/app/api/auth/login/route");
    for (let i = 0; i < 15; i++) {
      const res = await login(
        authPost("/api/auth/login", {
          email: "nobody@example.com",
          token: "AAAA-BBBB",
        })
      );
      expect(res.status).toBe(401);
    }

    const blocked = await login(
      authPost("/api/auth/login", {
        email: "nobody@example.com",
        token: "AAAA-BBBB",
      })
    );
    expect(blocked.status).toBe(429);
  });

  it("POST /api/auth/signup returns 429 when IP limit exceeded", async () => {
    const { POST: signup } = await import("@/app/api/auth/signup/route");
    const ip = "198.51.100.99";

    for (let i = 0; i < 5; i++) {
      const res = await signup(
        authPost(
          "/api/auth/signup",
          {
            firstName: "Rate",
            lastName: `User${i}`,
            email: `rateip${i}@example.com`,
          },
          ip
        )
      );
      expect(res.status).toBe(201);
    }

    const blocked = await signup(
      authPost(
        "/api/auth/signup",
        {
          firstName: "Blocked",
          lastName: "User",
          email: "rateip6@example.com",
        },
        ip
      )
    );
    expect(blocked.status).toBe(429);
  });

  it("POST /api/auth/signup rejects disposable email domains", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      authPost("/api/auth/signup", {
        firstName: "Spam",
        lastName: "Bot",
        email: "spam@mailinator.com",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/not allowed/i);
  });

  it("POST /api/auth/signup honeypot returns success without creating user", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(
      authPost("/api/auth/signup", {
        firstName: "Bot",
        lastName: "Field",
        email: "honeypot@example.com",
        website: "https://spam.example",
      })
    );
    expect(res.status).toBe(201);
    lastEmail = null;
    const { getUserByEmail } = await import("@/lib/users");
    expect(await getUserByEmail("honeypot@example.com")).toBeNull();
  });
});
