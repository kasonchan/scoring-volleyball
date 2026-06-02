import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  isNamespaceError,
  resolveNamespaceFromRequest,
} from "@/lib/namespace-api";
import { assertMatchInNamespace } from "@/lib/queries";
import { isNamespaceMember } from "@/lib/namespace-members";
import { getNamespaceBySlug, Namespace } from "@/lib/namespaces";
import { namespaceAppPath } from "@/lib/namespace-paths";
import { getSessionUser } from "@/lib/session";
import type { PublicUser } from "@/lib/users";

export type NamespaceMemberContext = {
  ns: Namespace;
  user: PublicUser;
};

/** GET /api/matches and GET /api/matches/:id — spectator read-only, no login. */
export function isPublicSpectatorMatchApi(request: Request): boolean {
  if (request.method !== "GET") return false;
  const pathname = new URL(request.url).pathname;
  if (pathname === "/api/matches") return true;
  return /^\/api\/matches\/[^/]+$/.test(pathname);
}

export async function requireNamespaceMember(
  request: Request
): Promise<NamespaceMemberContext | NextResponse> {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!isNamespaceMember(user.id, nsOrErr.id)) {
    return NextResponse.json(
      { error: "Join this namespace to use admin, scorer, and referee tools" },
      { status: 403 }
    );
  }
  return { ns: nsOrErr, user };
}

export function isMemberContextError(
  result: NamespaceMemberContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

export type NamespaceMemberMatchContext = NamespaceMemberContext & {
  matchId: string;
};

export async function requireNamespaceMemberAndMatch(
  request: Request,
  params: Promise<{ id: string }>
): Promise<NamespaceMemberMatchContext | NextResponse> {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  const { id: matchId } = await params;
  try {
    assertMatchInNamespace(matchId, ctxOrErr.ns.id);
    return { ...ctxOrErr, matchId };
  } catch {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
}

export function isMemberMatchContextError(
  result: NamespaceMemberMatchContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/** Redirect unauthenticated or non-members away from protected namespace pages. */
export async function requireJoinedNamespaceForPage(
  slug: string,
  section: "admin" | "scorer" | "referee"
): Promise<void> {
  const ns = getNamespaceBySlug(slug);
  if (!ns) redirect("/");

  const returnTo = namespaceAppPath(slug, section);
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!isNamespaceMember(user.id, ns.id)) {
    const joinUrl = `/${slug}?join=1&next=${encodeURIComponent(returnTo)}`;
    redirect(joinUrl);
  }
}
