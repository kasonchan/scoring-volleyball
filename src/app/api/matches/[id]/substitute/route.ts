import { NextResponse } from "next/server";
import { isMemberMatchContextError, requireNamespaceMemberAndMatch } from "@/lib/namespace-access";
import { substitutePlayer } from "@/lib/queries";
import { SubstituteInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireNamespaceMemberAndMatch(request, params);
  if (isMemberMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as SubstituteInput;
    if (!body.team || !body.position || !body.playerInId) {
      return NextResponse.json({ error: "Team, position, and substitute player are required" }, { status: 400 });
    }
    const match = await substitutePlayer(matchId, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to substitute player" },
      { status: 400 }
    );
  }
}
