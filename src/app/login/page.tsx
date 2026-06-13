"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { AuthField, AuthForm } from "@/components/AuthForm";
import { Button, Card } from "@/components/ui";
import { useSignupConfig } from "@/hooks/use-signup-config";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <>
          <Nav />
          <main className="mx-auto max-w-md flex-1 px-4 py-12">
            <p className="text-center text-slate-500">Loading…</p>
          </main>
        </>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const { setUser } = useAuth();
  const signupConfig = useSignupConfig();
  const [tokenSent, setTokenSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSendToken(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSendError("");
    setSending(true);
    const email = new FormData(e.currentTarget).get("email");
    try {
      const res = await fetch("/api/auth/request-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send token");
      setTokenSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send token");
    } finally {
      setSending(false);
    }
  }

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        token: form.get("token"),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    if (data.user) setUser(data.user);
    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
    router.push(destination);
    router.refresh();
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md flex-1 space-y-6 px-4 py-12">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Log in with username</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use a seeded account (admin, scorer, referee1, referee2) and its password.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError("");
              const form = new FormData(e.currentTarget);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    username: form.get("username"),
                    password: form.get("password"),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Login failed");
                if (data.user) setUser(data.user);
                const destination =
                  nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
                    ? nextPath
                    : "/";
                router.push(destination);
                router.refresh();
              } catch (err) {
                setPasswordError(err instanceof Error ? err.message : "Login failed");
              }
            }}
            className="mt-4 space-y-3"
          >
            <AuthField
              label="Username"
              name="username"
              required
              autoComplete="username"
              placeholder="e.g. admin"
            />
            <AuthField
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">1. Get a login token</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter your email and we will send a one-time token (also sent when you sign up).
          </p>
          <form onSubmit={onSendToken} className="mt-4 space-y-3">
            <AuthField label="Email" name="email" type="email" required autoComplete="email" />
            {sendError ? <p className="text-sm text-red-600">{sendError}</p> : null}
            {tokenSent ? (
              <p className="text-sm text-green-700">
                Token sent. Check your email, then enter it below.
              </p>
            ) : null}
            <Button type="submit" variant="secondary" className="w-full" disabled={sending}>
              {sending ? "Sending…" : "Send login token"}
            </Button>
          </form>
        </Card>

        <AuthForm
          title="2. Log in"
          description="Enter the same email and the token from your inbox."
          submitLabel="Log in"
          onSubmit={onLogin}
          footer={
            signupConfig?.enabled === false ? (
              <>New sign ups are currently disabled.</>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-orange-600 hover:underline">
                  Sign up
                </Link>
              </>
            )
          }
        >
          <AuthField label="Email" name="email" type="email" required autoComplete="email" />
          <AuthField
            label="Login token"
            name="token"
            required
            autoComplete="one-time-code"
            placeholder="e.g. ABCD-EFGH"
            hint="Copy the token from your email. Hyphens are optional."
          />
        </AuthForm>
      </main>
    </>
  );
}

