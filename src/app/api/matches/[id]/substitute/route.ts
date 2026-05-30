import { NextResponse } from "next/server";
import { substitutePlayer } from "@/lib/queries";
import { SubstituteInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as SubstituteInput;
    if (!body.team || !body.position || !body.playerInId) {
      return NextResponse.json({ error: "Team, position, and substitute player are required" }, { status: 400 });
    }
    const match = substitutePlayer(id, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to substitute player" },
      { status: 400 }
    );
  }
}
