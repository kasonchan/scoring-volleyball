import { NextResponse } from "next/server";
import { authRateLimitResponse } from "@/lib/auth-rate-limit";
import { requestLoginTokenForEmail } from "@/lib/login-token";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const limited = authRateLimitResponse(request, "request-token", body.email);
    if (limited) return limited;

    await requestLoginTokenForEmail(body.email);

    return NextResponse.json({
      message: "If an account exists for this email, a login token was sent.",
      email: body.email.trim().toLowerCase(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
