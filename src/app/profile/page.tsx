"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { AuthField, AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui";
import type { PublicUser } from "@/lib/users";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  handle: string;
};

function userToForm(user: PublicUser): ProfileFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    handle: user.handle,
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: sessionUser, setUser, refreshUser } = useAuth();
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [emailTokenSent, setEmailTokenSent] = useState(false);
  const [emailTokenError, setEmailTokenError] = useState("");
  const [sendingEmailToken, setSendingEmailToken] = useState(false);

  useEffect(() => {
    if (sessionUser === undefined) return;
    if (sessionUser === null) {
      router.replace("/login");
      return;
    }
    setForm(userToForm(sessionUser));
  }, [sessionUser, router]);

  function updateField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setSaved(false);
    if (field === "email") {
      setEmailTokenSent(false);
      setEmailVerificationToken("");
      setEmailTokenError("");
    }
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  const emailChanging =
    sessionUser !== null &&
    sessionUser !== undefined &&
    form !== null &&
    form.email.trim().toLowerCase() !== sessionUser.email.trim().toLowerCase();

  async function onSendEmailVerification() {
    if (!form) return;
    setEmailTokenError("");
    setSendingEmailToken(true);
    try {
      const res = await fetch("/api/auth/me/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send verification token");
      setEmailTokenSent(true);
    } catch (err) {
      setEmailTokenError(err instanceof Error ? err.message : "Could not send verification token");
    } finally {
      setSendingEmailToken(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!form || !sessionUser) return;

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ...(emailChanging ? { emailVerificationToken } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save profile");

    const updated = data.user as PublicUser;
    setUser(updated);
    const refreshed = (await refreshUser()) ?? updated;
    const nextForm = userToForm(refreshed);
    setForm(nextForm);
    setFormKey((k) => k + 1);
    setEmailVerificationToken("");
    setEmailTokenSent(false);
    setSaved(true);
    router.refresh();
  }

  if (sessionUser === undefined || !form) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-md flex-1 px-4 py-12 text-center text-slate-600">
          Loading profile…
        </main>
      </>
    );
  }

  if (sessionUser === null) return null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md flex-1 px-4 py-12">
        <div key={formKey}>
          <AuthForm
            title="Your profile"
            description="Update your name, email, and handle. Changes are saved to your account."
            submitLabel="Save changes"
            onSubmit={onSubmit}
            footer={
              <Link href="/" className="font-medium text-orange-600 hover:underline">
                ← Back to home
              </Link>
            }
          >
            {saved ? (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                Profile saved.
              </p>
            ) : null}
            <AuthField
              label="First name"
              name="firstName"
              required
              autoComplete="given-name"
              value={form.firstName}
              onChange={(v) => updateField("firstName", v)}
            />
            <AuthField
              label="Last name"
              name="lastName"
              required
              autoComplete="family-name"
              value={form.lastName}
              onChange={(v) => updateField("lastName", v)}
            />
            <AuthField
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(v) => updateField("email", v)}
            />
            {emailChanging ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-sm text-amber-950">
                  Changing your email requires a verification token sent to the new address.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={sendingEmailToken}
                  onClick={onSendEmailVerification}
                >
                  {sendingEmailToken ? "Sending…" : "Send verification token"}
                </Button>
                {emailTokenError ? (
                  <p className="text-sm text-red-600">{emailTokenError}</p>
                ) : null}
                {emailTokenSent ? (
                  <p className="text-sm text-green-700">
                    Token sent. Check your new inbox, then enter it below.
                  </p>
                ) : null}
                <AuthField
                  label="Email verification token"
                  name="emailVerificationToken"
                  required
                  autoComplete="one-time-code"
                  value={emailVerificationToken}
                  onChange={setEmailVerificationToken}
                  placeholder="e.g. ABCD-EFGH"
                  hint="From the email sent to your new address."
                />
              </div>
            ) : null}
            <AuthField
              label="Handle"
              name="handle"
              required
              autoComplete="username"
              value={form.handle}
              onChange={(v) => updateField("handle", v)}
              hint="Lowercase letters, numbers, and underscores (3–30 characters)."
            />
          </AuthForm>
        </div>
      </main>
    </>
  );
}
