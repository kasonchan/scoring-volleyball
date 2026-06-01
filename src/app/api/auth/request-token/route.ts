import { NextResponse } from "next/server";
import { requestLoginTokenForEmail } from "@/lib/login-token";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await requestLoginTokenForEmail(body.email);
    return NextResponse.json({
      message: "If an account exists for this email, a login token was sent.",
      email: body.email.trim().toLowerCase(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message.includes("No account found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
