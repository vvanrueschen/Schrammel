import { NextRequest, NextResponse } from "next/server";
import { cleanupWorstSongs } from "@/lib/db";

export async function POST(request: NextRequest) {
  const cleanupToken = process.env.CLEANUP_SECRET_TOKEN;
  const providedToken = request.headers.get("X-Cleanup-Token");

  if (!cleanupToken || !providedToken || providedToken !== cleanupToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupWorstSongs(3);
  return NextResponse.json(result);
}
