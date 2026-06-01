import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { startRally } from "@/lib/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const match = startRally(matchId);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start rally" },
      { status: 400 }
    );
  }
}
