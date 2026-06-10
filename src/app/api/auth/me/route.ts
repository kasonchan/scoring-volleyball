import { NextResponse } from "next/server";
import { verifyAndConsumeEmailChangeToken } from "@/lib/login-token";
import { getSessionUser } from "@/lib/session";
import { updateUserProfile, UpdateProfileInput } from "@/lib/users";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = (await request.json()) as UpdateProfileInput;
    const newEmail = body.email?.trim().toLowerCase() ?? "";
    const currentEmail = sessionUser.email.trim().toLowerCase();

    if (newEmail !== currentEmail) {
      if (!body.emailVerificationToken?.trim()) {
        return NextResponse.json(
          {
            error:
              "A verification token is required to change your email. Request one at your new address first.",
          },
          { status: 400 }
        );
      }
      const verified = await verifyAndConsumeEmailChangeToken(
        sessionUser.id,
        newEmail,
        body.emailVerificationToken
      );
      if (!verified) {
        return NextResponse.json(
          { error: "Invalid or expired email verification token" },
          { status: 400 }
        );
      }
    }

    const user = await updateUserProfile(sessionUser.id, body);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 400 }
    );
  }
}
