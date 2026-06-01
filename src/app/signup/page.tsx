"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Nav } from "@/components/Nav";
import { AuthField, AuthForm } from "@/components/AuthForm";
import { Card } from "@/components/ui";

export default function SignupPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        handle: form.get("handle") || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Signup failed");
    setSentTo(data.email as string);
  }

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
            <AuthField
              label="Handle (optional)"
              name="handle"
              autoComplete="username"
              placeholder="e.g. kason_chan"
              hint="Leave blank to auto-generate from your name (e.g. jane_doe)."
            />
          </AuthForm>
        )}
      </main>
    </>
  );
}
