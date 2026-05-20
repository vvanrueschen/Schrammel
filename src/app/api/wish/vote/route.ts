import { NextRequest, NextResponse } from "next/server";
import { voteOnWish } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const wishId = body.get("wishId") as string;
  const vote = body.get("vote") as string;

  if (!wishId || !vote) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const value = vote === "+" ? 1 : -1;
  const voterIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

  const result = await voteOnWish(parseInt(wishId, 10), value, voterIp);
  return NextResponse.json({ message: result.message, success: result.success });
}
