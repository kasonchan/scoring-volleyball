"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";
import { AuthField, AuthForm } from "@/components/AuthForm";
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
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!form) return;

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save profile");

    const updated = data.user as PublicUser;
    setUser(updated);
    const refreshed = (await refreshUser()) ?? updated;
    const nextForm = userToForm(refreshed);
    setForm(nextForm);
    setFormKey((k) => k + 1);
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
