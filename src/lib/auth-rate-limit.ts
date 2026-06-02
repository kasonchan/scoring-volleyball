import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export type AuthRateLimitAction = "signup" | "request-token" | "login" | "email-change";

type LimitConfig = { limit: number; windowMs: number };

const AUTH_RATE_LIMITS: Record<
  AuthRateLimitAction,
  { ip: LimitConfig; email: LimitConfig }
> = {
  signup: {
    ip: { limit: 10, windowMs: 60 * 60 * 1000 },
    email: { limit: 3, windowMs: 60 * 60 * 1000 },
  },
  "request-token": {
    ip: { limit: 20, windowMs: 15 * 60 * 1000 },
    email: { limit: 5, windowMs: 15 * 60 * 1000 },
  },
  login: {
    ip: { limit: 30, windowMs: 15 * 60 * 1000 },
    email: { limit: 15, windowMs: 15 * 60 * 1000 },
  },
  "email-change": {
    ip: { limit: 10, windowMs: 15 * 60 * 1000 },
    email: { limit: 5, windowMs: 15 * 60 * 1000 },
  },
};

function tooManyRequests(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

/**
 * Returns a 429 response when limits are exceeded, otherwise null.
 */
export function authRateLimitResponse(
  request: Request,
  action: AuthRateLimitAction,
  email?: string
): NextResponse | null {
  const config = AUTH_RATE_LIMITS[action];
  const ip = getClientIp(request);

  const ipKey = `auth:${action}:ip:${ip}`;
  const ipResult = consumeRateLimit(ipKey, config.ip.limit, config.ip.windowMs);
  if (!ipResult.allowed) {
    return tooManyRequests(ipResult.retryAfterSec);
  }

  if (email?.trim()) {
    const normalized = email.trim().toLowerCase();
    const emailKey = `auth:${action}:email:${normalized}`;
    const emailResult = consumeRateLimit(
      emailKey,
      config.email.limit,
      config.email.windowMs
    );
    if (!emailResult.allowed) {
      return tooManyRequests(emailResult.retryAfterSec);
    }
  }

  return null;
}
