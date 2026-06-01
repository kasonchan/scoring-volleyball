import { NextResponse } from "next/server";
import { verifyAndConsumeLoginToken } from "@/lib/login-token";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; token?: string };
    if (!body.email?.trim() || !body.token?.trim()) {
      return NextResponse.json(
        { error: "Email and login token are required" },
        { status: 400 }
      );
    }

    const user = verifyAndConsumeLoginToken(body.email, body.token);
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
