import { NextResponse } from "next/server";
import { authRateLimitResponse } from "@/lib/auth-rate-limit";
import { issueLoginToken } from "@/lib/login-token";
import { createUser, SignupInput } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupInput;
    const limited = authRateLimitResponse(request, "signup", body.email);
    if (limited) return limited;
    const user = createUser(body);
    await issueLoginToken(user.email, user.id, "signup");
    return NextResponse.json(
      {
        message: "Account created. Check your email for a login token.",
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
