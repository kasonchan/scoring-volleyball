import { NextResponse } from "next/server";
import { authRateLimitResponse } from "@/lib/auth-rate-limit";
import { verifyAndConsumeLoginToken } from "@/lib/login-token";
import { setSessionCookie } from "@/lib/session";
import { authenticateWithPassword } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      handle?: string;
      token?: string;
      password?: string;
    };

    if (body.password?.trim()) {
      const username = (body.username ?? body.handle ?? body.email ?? "").trim();
      if (!username) {
        return NextResponse.json(
          { error: "Username and password are required" },
          { status: 400 }
        );
      }
      const user = await authenticateWithPassword(username, body.password);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }
      await setSessionCookie(user.id);
      return NextResponse.json({ user });
    }

    const limited = authRateLimitResponse(request, "login", body.email);
    if (limited) return limited;
    if (!body.email?.trim() || !body.token?.trim()) {
      return NextResponse.json(
        { error: "Email and login token are required" },
        { status: 400 }
      );
    }

    const user = await verifyAndConsumeLoginToken(body.email, body.token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired login token" },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 }
    );
  }
}
