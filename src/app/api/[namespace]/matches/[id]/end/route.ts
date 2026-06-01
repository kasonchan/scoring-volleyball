import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { endMatch } from "@/lib/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const match = endMatch(matchId);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to end match" },
      { status: 400 }
    );
  }
}
