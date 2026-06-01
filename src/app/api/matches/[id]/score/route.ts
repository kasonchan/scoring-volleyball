import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { scorePoint } from "@/lib/queries";
import { ServingTeam } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(request, params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as { team: ServingTeam };
    if (body.team !== "home" && body.team !== "away") {
      return NextResponse.json({ error: "Team must be 'home' or 'away'" }, { status: 400 });
    }
    const match = scorePoint(matchId, body.team);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to score point" },
      { status: 400 }
    );
  }
}
