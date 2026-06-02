import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { namespaceAppPath } from "@/lib/namespace-paths";
import { assertMatchInNamespace, ensureMatchSpectatorToken } from "@/lib/queries";

function appOrigin(): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ??
    process.env.VERCEL_URL?.replace(/^(?!https?:\/\/)/, "https://") ??
    "http://localhost:3000"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;

  try {
    const { id: matchId } = await params;
    assertMatchInNamespace(matchId, ctxOrErr.ns.id);
    const token = ensureMatchSpectatorToken(matchId, ctxOrErr.ns.id);
    const path = `${namespaceAppPath(ctxOrErr.ns.slug, `spectator/${matchId}`)}?t=${encodeURIComponent(token)}`;
    const url = `${appOrigin()}${path}`;

    return NextResponse.json({
      url,
      token,
      path,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build spectator link" },
      { status: 400 }
    );
  }
}
