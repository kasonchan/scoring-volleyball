import { NextResponse } from "next/server";
import { startRally } from "@/lib/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const match = startRally(id);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start rally" },
      { status: 400 }
    );
  }
}
