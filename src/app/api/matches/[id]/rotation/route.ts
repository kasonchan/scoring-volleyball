import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { setMatchRotation } from "@/lib/queries";
import { SetRotationInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(request, params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as SetRotationInput;
    const match = setMatchRotation(matchId, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set rotation" },
      { status: 400 }
    );
  }
}
