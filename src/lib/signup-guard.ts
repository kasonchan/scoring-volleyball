import { getClientIp } from "@/lib/rate-limit";

/** Common disposable / relay domains — extend as needed. */
const BLOCKED_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
]);

export type SignupConfig = {
  enabled: boolean;
  turnstileSiteKey: string | null;
  inviteRequired: boolean;
};

export function isSignupDisabled(): boolean {
  const value = (process.env.SIGNUP_DISABLED ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function getSignupConfig(): SignupConfig {
  return {
    enabled: !isSignupDisabled(),
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null,
    inviteRequired: Boolean(process.env.SIGNUP_INVITE_CODES?.trim()),
  };
}

export function assertSignupEnabled(): void {
  if (isSignupDisabled()) {
    throw new Error("Sign up is currently disabled");
  }
}

function getAllowedEmailDomains(): Set<string> | null {
  const raw = process.env.SIGNUP_ALLOWED_EMAIL_DOMAINS;
  if (!raw?.trim()) return null;
  const domains = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return domains.length > 0 ? new Set(domains) : null;
}

function getInviteCodes(): Set<string> | null {
  const raw = process.env.SIGNUP_INVITE_CODES;
  if (!raw?.trim()) return null;
  const codes = raw.split(",").map((c) => c.trim()).filter(Boolean);
  return codes.length > 0 ? new Set(codes) : null;
}

export function assertSignupEmailAllowed(email: string): void {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1];
  if (!domain || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Invalid email address");
  }

  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    throw new Error("Signups from this email provider are not allowed");
  }

  const allowed = getAllowedEmailDomains();
  if (allowed && !allowed.has(domain)) {
    throw new Error("Sign up is limited to approved email domains");
  }
}

export function assertSignupInviteCode(inviteCode: string | undefined): void {
  const codes = getInviteCodes();
  if (!codes) return;
  const value = inviteCode?.trim();
  if (!value || !codes.has(value)) {
    throw new Error("A valid invite code is required to sign up");
  }
}

export async function verifySignupTurnstile(
  request: Request,
  turnstileToken: string | undefined
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Sign up verification is not configured");
    }
    return;
  }

  if (!turnstileToken?.trim()) {
    throw new Error("Complete the verification challenge before signing up");
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: turnstileToken.trim(),
      remoteip: getClientIp(request),
    }),
  });

  if (!response.ok) {
    throw new Error("Verification check failed");
  }

  const data = (await response.json()) as { success?: boolean };
  if (!data.success) {
    throw new Error("Verification failed. Please try again.");
  }
}

/** Honeypot field — bots often fill hidden inputs. */
export function isSignupHoneypotTriggered(website: string | undefined): boolean {
  return Boolean(website?.trim());
}
