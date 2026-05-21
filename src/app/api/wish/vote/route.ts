import { NextRequest, NextResponse } from "next/server";
import { voteOnWish } from "@/lib/db";
import { broadcastUpdate } from "@/lib/events";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const wishId = body.get("wishId") as string;
  const vote = body.get("vote") as string;
  const deviceId = body.get("deviceId") as string;

  if (!wishId || !vote || !deviceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const value = vote === "+" ? 1 : -1;

  const result = await voteOnWish(parseInt(wishId, 10), value, deviceId);

  if (result.success) {
    broadcastUpdate();
  }

  return NextResponse.json({ message: result.message, success: result.success });
}
