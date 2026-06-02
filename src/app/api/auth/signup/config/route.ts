import { NextResponse } from "next/server";
import { getSignupConfig } from "@/lib/signup-guard";

export async function GET() {
  return NextResponse.json(getSignupConfig());
}
