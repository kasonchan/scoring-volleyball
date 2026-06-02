import { NextResponse } from "next/server";
import { isMemberMatchContextError, requireNamespaceMemberAndMatch } from "@/lib/namespace-access";
import { endMatch } from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireNamespaceMemberAndMatch(request, params);
  if (isMemberMatchContextError(ctx)) return ctx;
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
