import { NextResponse } from "next/server";
import { setMatchRotation } from "@/lib/queries";
import { SetRotationInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as SetRotationInput;
    const match = setMatchRotation(id, body);
    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set rotation" },
      { status: 400 }
    );
  }
}
