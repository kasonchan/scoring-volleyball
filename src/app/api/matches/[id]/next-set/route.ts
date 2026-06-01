import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { startNextSet } from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(request, params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const match = startNextSet(matchId);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start next set" },
      { status: 400 }
    );
  }
}
