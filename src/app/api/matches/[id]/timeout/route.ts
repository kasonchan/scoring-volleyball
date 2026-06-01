import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { callTimeout } from "@/lib/queries";
import { TimeoutInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(request, params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as TimeoutInput;
    if (!body.team) {
      return NextResponse.json({ error: "Team is required" }, { status: 400 });
    }
    const match = callTimeout(matchId, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to call timeout" },
      { status: 400 }
    );
  }
}
