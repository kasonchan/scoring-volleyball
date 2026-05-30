import { NextResponse } from "next/server";
import { deleteTeam, getTeam } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const team = getTeam(id);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json(team);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteTeam(id);
  if (!deleted) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
