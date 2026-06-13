"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Nav } from "@/components/Nav";
import { AuthField, AuthForm } from "@/components/AuthForm";
import { TurnstileChallenge } from "@/components/TurnstileChallenge";
import { Card } from "@/components/ui";
import { useSignupConfig } from "@/hooks/use-signup-config";

export default function SignupPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const config = useSignupConfig();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    if (config?.turnstileSiteKey && !turnstileToken) {
      throw new Error("Complete the verification challenge before signing up");
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        handle: form.get("handle") || null,
        inviteCode: form.get("inviteCode") || undefined,
        turnstileToken: turnstileToken ?? undefined,
        website: form.get("website"),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Signup failed");
    setSentTo(data.email as string);
  }

  const loadingConfig = config === null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md flex-1 px-4 py-12">
        {sentTo ? (
          <Card>
            <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
            <p className="mt-2 text-sm text-slate-600">
              We sent a login token to <span className="font-medium">{sentTo}</span>. Use it on
              the log in page with that email address. The token expires in 15 minutes.
            </p>
            <p className="mt-6 text-center text-sm text-slate-600">
              <Link href="/login" className="font-medium text-orange-600 hover:underline">
                Go to log in
              </Link>
            </p>
          </Card>
        ) : loadingConfig ? (
          <Card>
            <p className="text-slate-600">Loading sign up…</p>
          </Card>
        ) : config.enabled === false ? (
          <Card>
            <h1 className="text-2xl font-bold text-slate-900">Sign up closed</h1>
            <p className="mt-2 text-sm text-slate-600">
              New account registration is not available right now. If you already have an account,
              log in with your email and a one-time token.
            </p>
            <p className="mt-6 text-center text-sm text-slate-600">
              <Link href="/login" className="font-medium text-orange-600 hover:underline">
                Go to log in
              </Link>
            </p>
          </Card>
        ) : (
          <AuthForm
            title="Create account"
            description="Sign up with your email. We will send you a one-time login token — no password needed."
            submitLabel="Sign up"
            onSubmit={onSubmit}
            footer={
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-orange-600 hover:underline">
                  Log in
                </Link>
              </>
            }
          >
            <AuthField label="First name" name="firstName" required autoComplete="given-name" />
            <AuthField label="Last name" name="lastName" required autoComplete="family-name" />
            <AuthField
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            {config.inviteRequired ? (
              <AuthField
                label="Invite code"
                name="inviteCode"
                required
                autoComplete="off"
                hint="Ask your league organizer for a code."
              />
            ) : null}
            <AuthField
              label="Handle (optional)"
              name="handle"
              autoComplete="username"
              placeholder="e.g. kason_chan"
              hint="Leave blank to auto-generate from your name (e.g. jane_doe)."
            />
            <div
              className="absolute -left-[9999px] h-px w-px overflow-hidden"
              aria-hidden
              tabIndex={-1}
            >
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" autoComplete="off" tabIndex={-1} />
            </div>
            {config.turnstileSiteKey ? (
              <TurnstileChallenge
                siteKey={config.turnstileSiteKey}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
              />
            ) : null}
          </AuthForm>
        )}
      </main>
    </>
  );
}
