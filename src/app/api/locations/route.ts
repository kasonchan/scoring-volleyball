import { NextResponse } from "next/server";
import { isMemberContextError, requireNamespaceMember } from "@/lib/namespace-access";
import { createLocation, getAllLocations } from "@/lib/queries";
import { LocationInput } from "@/lib/types";

export async function GET(request: Request) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  const locations = await getAllLocations(ctxOrErr.ns.id);
  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const ctxOrErr = await requireNamespaceMember(request);
  if (isMemberContextError(ctxOrErr)) return ctxOrErr;
  try {
    const body = (await request.json()) as LocationInput;
    const location = await createLocation(ctxOrErr.ns.id, body);
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create location" },
      { status: 400 }
    );
  }
}
