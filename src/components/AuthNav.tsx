"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { LogoutButton } from "@/components/LogoutButton";
import { useSignupConfig } from "@/hooks/use-signup-config";

export function AuthNav() {
  const { user } = useAuth();
  const signupConfig = useSignupConfig();

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
        {signupConfig?.enabled !== false ? (
          <Link
            href="/signup"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600"
          >
            Sign up
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-l border-slate-200 pl-2 ml-2">
      <Link
        href="/profile"
        className="hidden sm:inline text-sm text-slate-600 hover:text-slate-900"
      >
        <span className="font-medium text-slate-900">
          {user.firstName} {user.lastName}
        </span>
        <span className="text-slate-400"> @{user.handle}</span>
      </Link>
      <Link
        href="/profile"
        className="sm:hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Profile
      </Link>
      <LogoutButton />
    </div>
  );
}
