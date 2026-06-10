import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { createTeam, getAllTeams } from "@/lib/queries";
import { CreateTeamInput } from "@/lib/types";

export async function GET(request: Request) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  const teams = await getAllTeams(ctxOrErr.ns.id);
  return NextResponse.json(teams);
}

export async function POST(request: Request) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  try {
    const body = (await request.json()) as CreateTeamInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }
    if (!body.players?.length) {
      return NextResponse.json({ error: "At least one player is required" }, { status: 400 });
    }
    const team = await createTeam(ctxOrErr.ns.id, body);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create team" },
      { status: 400 }
    );
  }
}
