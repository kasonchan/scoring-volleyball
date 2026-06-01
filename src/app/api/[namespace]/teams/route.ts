import { NextResponse } from "next/server";
import { isNamespaceError, resolveNamespaceFromParams } from "@/lib/namespace-api";
import { createTeam, getAllTeams } from "@/lib/queries";
import { CreateTeamInput } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ namespace: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const teams = getAllTeams(nsOrErr.id);
  return NextResponse.json(teams);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ namespace: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  try {
    const body = (await request.json()) as CreateTeamInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }
    if (!body.players?.length) {
      return NextResponse.json({ error: "At least one player is required" }, { status: 400 });
    }
    const team = createTeam(nsOrErr.id, body);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create team" },
      { status: 400 }
    );
  }
}
