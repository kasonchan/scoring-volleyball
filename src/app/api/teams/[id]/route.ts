import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { deleteTeam, getTeam, updateTeam } from "@/lib/queries";
import { UpdateTeamInput } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  const { id } = await params;
  const team = getTeam(id, ctxOrErr.ns.id);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json(team);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  try {
    const { id } = await params;
    if (!getTeam(id, ctxOrErr.ns.id)) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const body = (await request.json()) as UpdateTeamInput;
    const team = updateTeam(id, body);
    return NextResponse.json(team);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update team" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  const { id } = await params;
  const team = getTeam(id, ctxOrErr.ns.id);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  const deleted = deleteTeam(id);
  if (!deleted) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
