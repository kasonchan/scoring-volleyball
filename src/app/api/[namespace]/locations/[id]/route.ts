import { NextResponse } from "next/server";
import { isNamespaceError, resolveNamespaceFromParams } from "@/lib/namespace-api";
import { deleteLocation, getLocation, updateLocation } from "@/lib/queries";
import { LocationInput } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id } = await params;
  const location = getLocation(id, nsOrErr.id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json(location);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  try {
    const { id } = await params;
    const body = (await request.json()) as LocationInput;
    const location = updateLocation(id, body);
    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update location" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; id: string }> }
) {
  const nsOrErr = await resolveNamespaceFromParams(params);
  if (isNamespaceError(nsOrErr)) return nsOrErr;
  const { id } = await params;
  const location = getLocation(id, nsOrErr.id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  const deleted = deleteLocation(id);
  if (!deleted) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
