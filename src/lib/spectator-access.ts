import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { isNamespaceError, resolveNamespaceFromRequest } from "@/lib/namespace-api";
import {
  namespaceAllowsAnonymousSpectator,
  namespaceRequiresSpectatorLink,
  type Namespace,
} from "@/lib/namespaces";
import { verifyMatchSpectatorToken } from "@/lib/queries";

export type SpectatorMatchView = {
  ns: Namespace;
  /** When true, strip player names from the payload. */
  redacted: boolean;
};

function getSpectatorTokenFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("t") ?? url.searchParams.get("spectatorToken");
  if (fromQuery?.trim()) return fromQuery.trim();
  const fromHeader = request.headers.get("x-spectator-token");
  return fromHeader?.trim() ?? null;
}

/** Access control for GET /api/matches (list). */
export async function resolveSpectatorMatchListAccess(
  request: Request
): Promise<SpectatorMatchView | NextResponse> {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;

  if (namespaceAllowsAnonymousSpectator(nsOrErr)) {
    return { ns: nsOrErr, redacted: true };
  }

  const memberOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(memberOrErr)) return memberOrErr;
  return { ns: memberOrErr.ns, redacted: false };
}

/** Access control for GET /api/matches/:id. */
export async function resolveSpectatorMatchReadAccess(
  request: Request,
  matchId: string
): Promise<SpectatorMatchView | NextResponse> {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;

  if (namespaceAllowsAnonymousSpectator(nsOrErr)) {
    return { ns: nsOrErr, redacted: true };
  }

  if (namespaceRequiresSpectatorLink(nsOrErr)) {
    const token = getSpectatorTokenFromRequest(request);
    if (token && verifyMatchSpectatorToken(matchId, nsOrErr.id, token)) {
      return { ns: nsOrErr, redacted: true };
    }
    const memberOrErr = await requireNamespaceMember(request);
    if (isMemberContextError(memberOrErr)) {
      return NextResponse.json(
        {
          error:
            "Sign in, join this namespace, or open this match with a valid spectator link",
        },
        { status: 403 }
      );
    }
    return { ns: memberOrErr.ns, redacted: false };
  }

  const memberOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(memberOrErr)) return memberOrErr;
  return { ns: memberOrErr.ns, redacted: false };
}

export function isSpectatorViewError(
  result: SpectatorMatchView | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
