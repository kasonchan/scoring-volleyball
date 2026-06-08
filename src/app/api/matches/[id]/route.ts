import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { applySpectatorMatchView } from "@/lib/spectator-match";
import {
  isSpectatorViewError,
  resolveSpectatorMatchReadAccess,
} from "@/lib/spectator-access";
import { deleteMatch, getMatch, updateMatch } from "@/lib/queries";
import { UpdateMatchInput } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await resolveSpectatorMatchReadAccess(request, id);
  if (isSpectatorViewError(access)) return access;
  const match = await getMatch(id, access.ns.id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json(applySpectatorMatchView(match, access.redacted));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateMatchInput;
    if (!body.homeTeamId || !body.awayTeamId) {
      return NextResponse.json({ error: "Both teams are required" }, { status: 400 });
    }
    const match = await updateMatch(ctxOrErr.ns.id, id, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update match" },
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
  const match = await getMatch(id, ctxOrErr.ns.id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  const deleted = await deleteMatch(id);
  if (!deleted) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
