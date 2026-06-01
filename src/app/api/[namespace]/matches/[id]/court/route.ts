import { NextResponse } from "next/server";
import { isMatchContextError, resolveNamespaceAndMatch } from "@/lib/namespace-api";
import { setSetCourtSwapped } from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const ctx = await resolveNamespaceAndMatch(params);
  if (isMatchContextError(ctx)) return ctx;
  try {
    const { matchId } = ctx;
    const body = (await request.json()) as { courtSwapped?: boolean };
    if (typeof body.courtSwapped !== "boolean") {
      return NextResponse.json({ error: "courtSwapped is required" }, { status: 400 });
    }
    const match = setSetCourtSwapped(matchId, body.courtSwapped);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update court layout" },
      { status: 400 }
    );
  }
}
