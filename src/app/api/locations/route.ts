import { NextResponse } from "next/server";
import { createLocation, getAllLocations } from "@/lib/queries";
import { LocationInput } from "@/lib/types";

export async function GET() {
  const locations = getAllLocations();
  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LocationInput;
    const location = createLocation(body);
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create location" },
      { status: 400 }
    );
  }
}
