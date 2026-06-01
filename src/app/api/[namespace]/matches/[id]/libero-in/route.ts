import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { liberoIn } from "@/lib/queries";
import { LiberoInInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as LiberoInInput;
    if (!body.team || !body.playerInId || !body.position) {
      return NextResponse.json({ error: "Team, player in, and position are required" }, { status: 400 });
    }
    const match = liberoIn(matchId, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to libero in" },
      { status: 400 }
    );
  }
}
