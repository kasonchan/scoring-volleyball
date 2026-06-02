import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NAMESPACE_SLUG, PUBLIC_NAMESPACE_SLUG } from "@/lib/constants";
import { setTestEmailSink } from "@/lib/email";
import { setupTestDatabase } from "@/test/test-db";

const cookieSet = vi.fn();
const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: cookieSet,
    delete: vi.fn(),
    get: cookieGet,
  })),
}));

describe("auth namespaces API routes", () => {
  setupTestDatabase();

  beforeEach(() => {
    cookieSet.mockClear();
    cookieGet.mockClear();
    setTestEmailSink(() => {});
  });

  async function loginAs(email: string) {
    let signupToken = "";
    setTestEmailSink((p) => {
      signupToken = p.token;
    });
    const { POST: signup } = await import("@/app/api/auth/signup/route");
    const signupRes = await signup(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Ns",
          lastName: "Api",
          email,
        }),
      })
    );
    expect(signupRes.status).toBe(201);
    expect(signupToken).toBeTruthy();

    cookieSet.mockClear();
    const { POST: login } = await import("@/app/api/auth/login/route");
    const loginRes = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: signupToken }),
      })
    );
    expect(loginRes.status).toBe(200);
    const sessionToken = cookieSet.mock.calls.at(-1)?.[1] as string;
    cookieGet.mockReturnValue({ value: sessionToken });
  }

  it("GET /api/auth/namespaces omits global and haikyu from public directory", async () => {
    const { GET } = await import("@/app/api/auth/namespaces/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    const slugs = data.namespaces.map((ns: { slug: string }) => ns.slug);
    expect(slugs).not.toContain(DEFAULT_NAMESPACE_SLUG);
    expect(slugs).not.toContain("haikyu");
    expect(slugs).toContain(PUBLIC_NAMESPACE_SLUG);
  });

  it("GET /api/auth/namespaces marks public as joined after signup", async () => {
    await loginAs("nsapi@example.com");
    const { GET } = await import("@/app/api/auth/namespaces/route");
    const res = await GET();
    const data = await res.json();
    const pub = data.namespaces.find((ns: { slug: string }) => ns.slug === PUBLIC_NAMESPACE_SLUG);
    const global = data.namespaces.find(
      (ns: { slug: string }) => ns.slug === DEFAULT_NAMESPACE_SLUG
    );
    expect(pub?.joined).toBe(true);
    expect(global).toBeUndefined();
  });

  it("POST /api/auth/namespaces/join adds membership and returns filtered list", async () => {
    await loginAs("joinns@example.com");
    const { POST } = await import("@/app/api/auth/namespaces/join/route");
    const res = await POST(
      new Request("http://localhost/api/auth/namespaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "haikyu" }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const slugs = data.namespaces.map((ns: { slug: string }) => ns.slug);
    expect(slugs).not.toContain(DEFAULT_NAMESPACE_SLUG);
    expect(slugs).not.toContain("haikyu");
  });
});
