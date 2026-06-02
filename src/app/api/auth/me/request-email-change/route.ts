import { NextResponse } from "next/server";
import { authRateLimitResponse } from "@/lib/auth-rate-limit";
import { issueEmailChangeToken } from "@/lib/login-token";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = (await request.json()) as { newEmail?: string };
    if (!body.newEmail?.trim()) {
      return NextResponse.json({ error: "New email is required" }, { status: 400 });
    }

    const limited = authRateLimitResponse(request, "email-change", body.newEmail);
    if (limited) return limited;

    await issueEmailChangeToken(sessionUser.id, body.newEmail);

    return NextResponse.json({
      message: "A verification token was sent to your new email address.",
      email: body.newEmail.trim().toLowerCase(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send verification" },
      { status: 400 }
    );
  }
}
