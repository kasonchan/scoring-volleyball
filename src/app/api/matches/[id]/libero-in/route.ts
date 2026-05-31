import { NextResponse } from "next/server";
import { liberoIn } from "@/lib/queries";
import { LiberoInInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as LiberoInInput;
    if (!body.team || !body.liberoId || !body.position) {
      return NextResponse.json({ error: "Team, libero, and position are required" }, { status: 400 });
    }
    const match = liberoIn(id, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to libero in" },
      { status: 400 }
    );
  }
}
