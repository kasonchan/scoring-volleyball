import { NextResponse } from "next/server";
import { NAMESPACE_SLUG_HEADER } from "./constants";
import { assertMatchInNamespace } from "./queries";
import { getNamespaceBySlug, Namespace } from "./namespaces";

export function getNamespaceSlugFromRequest(request: Request): string | null {
  const header = request.headers.get(NAMESPACE_SLUG_HEADER);
  if (header?.trim()) return header.trim();
  const query = new URL(request.url).searchParams.get("namespace");
  if (query?.trim()) return query.trim();
  return null;
}

export async function resolveNamespaceFromRequest(
  request: Request
): Promise<Namespace | NextResponse> {
  const slug = getNamespaceSlugFromRequest(request);
  if (!slug) {
    return NextResponse.json(
      {
        error: `Namespace required (${NAMESPACE_SLUG_HEADER} header or namespace query param)`,
      },
      { status: 400 }
    );
  }
  const ns = getNamespaceBySlug(slug);
  if (!ns) {
    return NextResponse.json({ error: "Namespace not found" }, { status: 404 });
  }
  return ns;
}

export function isNamespaceError(
  result: Namespace | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

export async function resolveNamespaceAndMatch(
  request: Request,
  params: Promise<{ id: string }>
): Promise<{ ns: Namespace; matchId: string } | NextResponse> {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id: matchId } = await params;
  try {
    assertMatchInNamespace(matchId, nsOrErr.id);
    return { ns: nsOrErr, matchId };
  } catch {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
}

export function isMatchContextError(
  result: { ns: Namespace; matchId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
