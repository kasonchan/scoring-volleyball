import { NextResponse } from "next/server";
import { assertMatchInNamespace } from "./queries";
import { getNamespaceBySlug, Namespace } from "./namespaces";

export async function resolveNamespaceFromParams(
  params: Promise<{ namespace: string }>
): Promise<Namespace | NextResponse> {
  const { namespace: slug } = await params;
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
  params: Promise<{ namespace: string; id: string }>
): Promise<{ ns: Namespace; matchId: string } | NextResponse> {
  const nsOrErr = await resolveNamespaceFromParams(params);
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
