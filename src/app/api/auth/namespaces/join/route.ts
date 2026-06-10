import { NextResponse } from "next/server";
import { joinNamespace, listNamespacesWithMembership } from "@/lib/namespace-members";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { slug?: string };
    if (!body.slug?.trim()) {
      return NextResponse.json({ error: "Namespace slug is required" }, { status: 400 });
    }

    await joinNamespace(user.id, body.slug.trim());
    const namespaces = await listNamespacesWithMembership(user.id, { publicDirectory: true });
    return NextResponse.json({ namespaces });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join namespace" },
      { status: 400 }
    );
  }
}
