import { NextResponse } from "next/server";
import { joinAllNamespaces, listNamespacesWithMembership } from "@/lib/namespace-members";
import { getSessionUser } from "@/lib/session";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  joinAllNamespaces(user.id);
  const namespaces = listNamespacesWithMembership(user.id, { publicDirectory: true });
  return NextResponse.json({ namespaces });
}
