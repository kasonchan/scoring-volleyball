import { NextResponse } from "next/server";
import { getAllNamespaces } from "@/lib/namespaces";

export async function GET() {
  const namespaces = getAllNamespaces();
  return NextResponse.json(namespaces);
}
