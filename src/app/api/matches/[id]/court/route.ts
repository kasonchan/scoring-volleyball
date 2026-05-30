import { NextResponse } from "next/server";
import { setSetCourtSwapped } from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { courtSwapped?: boolean };
    if (typeof body.courtSwapped !== "boolean") {
      return NextResponse.json({ error: "courtSwapped is required" }, { status: 400 });
    }
    const match = setSetCourtSwapped(id, body.courtSwapped);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update court layout" },
      { status: 400 }
    );
  }
}
