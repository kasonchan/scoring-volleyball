"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PublicUser } from "@/lib/users";

type AuthContextValue = {
  user: PublicUser | null | undefined;
  refreshUser: () => Promise<PublicUser | null>;
  setUser: (user: PublicUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSessionUser(): Promise<PublicUser | null> {
  const res = await fetch(`/api/auth/me?t=${Date.now()}`, { cache: "no-store" });
  if (res.status === 401) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  const refreshUser = useCallback(async () => {
    const next = await fetchSessionUser();
    setUser(next);
    return next;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, refreshUser, setUser }),
    [user, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
