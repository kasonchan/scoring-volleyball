import { NextResponse } from "next/server";
import { listNamespacesWithMembership } from "@/lib/namespace-members";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  const namespaces = await listNamespacesWithMembership(user?.id ?? null, {
    publicDirectory: true,
  });
  return NextResponse.json({ namespaces });
}
