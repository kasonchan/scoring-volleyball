import { NextResponse } from "next/server";
import { listNamespacesWithMembership } from "@/lib/namespace-members";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  const namespaces = listNamespacesWithMembership(user?.id ?? null);
  return NextResponse.json({ namespaces });
}
