import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { liberoOut } from "@/lib/queries";
import { LiberoOutInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as LiberoOutInput;
    if (!body.team) {
      return NextResponse.json({ error: "Team is required" }, { status: 400 });
    }
    const match = liberoOut(matchId, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to libero out" },
      { status: 400 }
    );
  }
}
