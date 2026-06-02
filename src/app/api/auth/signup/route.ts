import { NextResponse } from "next/server";
import { authRateLimitResponse } from "@/lib/auth-rate-limit";
import { issueLoginToken } from "@/lib/login-token";
import {
  assertSignupEmailAllowed,
  assertSignupInviteCode,
  isSignupHoneypotTriggered,
  verifySignupTurnstile,
} from "@/lib/signup-guard";
import { createUser, SignupInput } from "@/lib/users";

type SignupRequestBody = SignupInput & {
  turnstileToken?: string;
  inviteCode?: string;
  /** Honeypot — must stay empty. */
  website?: string;
};

const SIGNUP_OK_MESSAGE =
  "Account created. Check your email for a login token.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupRequestBody;

    if (isSignupHoneypotTriggered(body.website)) {
      return NextResponse.json(
        {
          message: SIGNUP_OK_MESSAGE,
          email: body.email?.trim().toLowerCase() ?? "",
        },
        { status: 201 }
      );
    }

    const limited = authRateLimitResponse(request, "signup", body.email);
    if (limited) return limited;

    await verifySignupTurnstile(request, body.turnstileToken);
    assertSignupEmailAllowed(body.email ?? "");
    assertSignupInviteCode(body.inviteCode);

    const user = createUser({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      handle: body.handle,
    });
    await issueLoginToken(user.email, user.id, "signup");
    return NextResponse.json(
      {
        message: SIGNUP_OK_MESSAGE,
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}
