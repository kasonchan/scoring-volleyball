"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import type { PublicUser } from "@/lib/users";

export function AuthNav() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <div className="w-20 border-l border-slate-200 pl-2 ml-2" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-2">
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg px-3 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-l border-slate-200 pl-2 ml-2">
      <span className="hidden sm:inline text-sm text-slate-600">
        <span className="font-medium text-slate-900">
          {user.firstName} {user.lastName}
        </span>
        <span className="text-slate-400"> @{user.handle}</span>
      </span>
      <LogoutButton />
    </div>
  );
}
