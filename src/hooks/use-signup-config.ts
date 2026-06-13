"use client";

import { useEffect, useState } from "react";

export type SignupConfig = {
  enabled: boolean;
  turnstileSiteKey: string | null;
  inviteRequired: boolean;
};

const DEFAULT_CONFIG: SignupConfig = {
  enabled: true,
  turnstileSiteKey: null,
  inviteRequired: false,
};

export function useSignupConfig(): SignupConfig | null {
  const [config, setConfig] = useState<SignupConfig | null>(null);

  useEffect(() => {
    fetch("/api/auth/signup/config")
      .then((r) => r.json())
      .then((data: SignupConfig) => setConfig(data))
      .catch(() => setConfig(DEFAULT_CONFIG));
  }, []);

  return config;
}
