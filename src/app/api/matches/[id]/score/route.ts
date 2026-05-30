import { NextResponse } from "next/server";
import { scorePoint } from "@/lib/queries";
import { ServingTeam } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { team: ServingTeam };
    if (body.team !== "home" && body.team !== "away") {
      return NextResponse.json({ error: "Team must be 'home' or 'away'" }, { status: 400 });
    }
    const match = scorePoint(id, body.team);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to score point" },
      { status: 400 }
    );
  }
}
