import { NextResponse } from "next/server";
import { isNamespaceError, resolveNamespaceFromParams } from "@/lib/namespace-api";
import { deleteMatch, getMatch, updateMatch } from "@/lib/queries";
import { UpdateMatchInput } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id } = await params;
  const match = getMatch(id, nsOrErr.id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json(match);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateMatchInput;
    if (!body.homeTeamId || !body.awayTeamId) {
      return NextResponse.json({ error: "Both teams are required" }, { status: 400 });
    }
    const match = updateMatch(nsOrErr.id, id, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update match" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id } = await params;
  const match = getMatch(id, nsOrErr.id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  const deleted = deleteMatch(id);
  if (!deleted) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
