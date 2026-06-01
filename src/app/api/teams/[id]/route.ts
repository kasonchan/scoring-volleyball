import { NextResponse } from "next/server";
import { isNamespaceError, resolveNamespaceFromRequest } from "@/lib/namespace-api";
import { deleteTeam, getTeam, updateTeam } from "@/lib/queries";
import { UpdateTeamInput } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id } = await params;
  const team = getTeam(id, nsOrErr.id);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json(team);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  try {
    const { id } = await params;
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
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id } = await params;
  const team = getTeam(id, nsOrErr.id);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  const deleted = deleteTeam(id);
  if (!deleted) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
