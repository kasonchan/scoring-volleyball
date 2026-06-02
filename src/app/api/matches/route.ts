import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { applySpectatorMatchView } from "@/lib/spectator-match";
import {
  isSpectatorViewError,
  resolveSpectatorMatchListAccess,
} from "@/lib/spectator-access";
import { createMatch, getAllMatches } from "@/lib/queries";
import { CreateMatchInput } from "@/lib/types";

export async function GET(request: Request) {
  const access = await resolveSpectatorMatchListAccess(request);
  if (isSpectatorViewError(access)) return access;
  const matches = getAllMatches(access.ns.id).map((m) =>
    applySpectatorMatchView(m, access.redacted)
  );
  return NextResponse.json(matches);
}

export async function POST(request: Request) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  try {
    const body = (await request.json()) as CreateMatchInput;
    if (!body.homeTeamId || !body.awayTeamId) {
      return NextResponse.json({ error: "Both teams are required" }, { status: 400 });
    }
    const match = createMatch(ctxOrErr.ns.id, body);
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create match" },
      { status: 400 }
    );
  }
}
