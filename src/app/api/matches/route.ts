import { NextResponse } from "next/server";
import { isNamespaceError, resolveNamespaceFromRequest } from "@/lib/namespace-api";
import { createMatch, getAllMatches } from "@/lib/queries";
import { CreateMatchInput } from "@/lib/types";

export async function GET(request: Request) {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const matches = getAllMatches(nsOrErr.id);
  return NextResponse.json(matches);
}

export async function POST(request: Request) {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  try {
    const body = (await request.json()) as CreateMatchInput;
    if (!body.homeTeamId || !body.awayTeamId) {
      return NextResponse.json({ error: "Both teams are required" }, { status: 400 });
    }
    const match = createMatch(nsOrErr.id, body);
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create match" },
      { status: 400 }
    );
  }
}
