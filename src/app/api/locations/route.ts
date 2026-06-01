import { NextResponse } from "next/server";
import { isNamespaceError, resolveNamespaceFromRequest } from "@/lib/namespace-api";
import { createLocation, getAllLocations } from "@/lib/queries";
import { LocationInput } from "@/lib/types";

export async function GET(request: Request) {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const locations = getAllLocations(nsOrErr.id);
  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const nsOrErr = await resolveNamespaceFromRequest(request);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  try {
    const body = (await request.json()) as LocationInput;
    const location = createLocation(nsOrErr.id, body);
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create location" },
      { status: 400 }
    );
  }
}
